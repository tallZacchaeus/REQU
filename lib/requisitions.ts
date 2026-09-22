import { q, tx } from "./db"
import { canSee, canEdit, canTransition, visibilityClause, STAGE_ON_ARRIVAL, type Actor, type Subject } from "./authz"
import type { Requisition, RequisitionStatus, StageKey } from "./types"

/**
 * Reads and writes requisitions in the shape `lib/types.ts` defines, so the screens that
 * were written against the prototype's store keep working unchanged.
 */

const SELECT = `
  select r.id, r.reference, r.programme, r.programme_date, r.location, r.purpose,
         r.status, r.payment_ref, r.submitted_at, r.created_at,
         r.requester_id, r.department_id,
         d.name  as department_name,
         p.full_name as requester_name, p.initials as requester_initials,
         pd.name as requester_department, p.scope as requester_unit
    from requisitions r
    left join departments d  on d.id = r.department_id
    join people p            on p.id = r.requester_id
    left join departments pd on pd.id = p.department_id`

interface Row {
  id: string; reference: string; programme: string; programme_date: Date | null
  location: string | null; purpose: string | null; status: RequisitionStatus
  payment_ref: string | null; submitted_at: Date | null; created_at: Date
  requester_id: number; department_id: number | null; department_name: string | null
  requester_name: string; requester_initials: string | null
  requester_department: string | null; requester_unit: string | null
}

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : undefined)

/** Everything hanging off a requisition, fetched per id rather than per row. */
async function hydrate(rows: Row[]): Promise<Requisition[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  const [items, attachments, comments, activity, stages, recons, actuals] = await Promise.all([
    q<{ id: string; requisition_id: string; description: string; amount: string }>(
      "select id, requisition_id, description, amount from expense_items where requisition_id = any($1) order by sort_order, id", [ids]),
    q<{ id: string; requisition_id: string; name: string; kind: string; byte_size: string }>(
      "select id, requisition_id, name, kind, byte_size from attachments where requisition_id = any($1) order by created_at", [ids]),
    q<{ id: string; requisition_id: string; body: string; requested_changes: string[]; created_at: Date; author: string; role: string | null }>(
      `select c.id, c.requisition_id, c.body, c.requested_changes, c.created_at,
              p.full_name as author, p.title as role
         from comments c join people p on p.id = c.author_id
        where c.requisition_id = any($1) order by c.created_at`, [ids]),
    q<{ id: string; requisition_id: string; action: string; at: Date; actor: string | null }>(
      `select a.id, a.requisition_id, a.action, a.at, p.full_name as actor
         from activity a left join people p on p.id = a.actor_id
        where a.requisition_id = any($1) order by a.at`, [ids]),
    q<{ requisition_id: string; stage: StageKey; completed_at: Date }>(
      "select requisition_id, stage, completed_at from requisition_stages where requisition_id = any($1)", [ids]),
    q<{ requisition_id: string; note: string | null; submitted_at: Date }>(
      "select requisition_id, note, submitted_at from reconciliations where requisition_id = any($1)", [ids]),
    q<{ requisition_id: string; expense_item_id: string; amount: string }>(
      "select requisition_id, expense_item_id, amount from reconciliation_actuals where requisition_id = any($1)", [ids]),
  ])

  const by = <T extends { requisition_id: string }>(list: T[], id: string) => list.filter((x) => x.requisition_id === id)

  return rows.map((r) => {
    const recon = recons.find((x) => x.requisition_id === r.id)
    const mine = by(actuals, r.id)
    return {
      id: r.id,
      reference: r.reference,
      programme: r.programme,
      programmeDate: iso(r.programme_date)?.slice(0, 10) ?? "",
      location: r.location ?? "",
      department: r.department_name ?? "",
      purpose: r.purpose ?? "",
      requester: {
        name: r.requester_name,
        initials: r.requester_initials ?? "",
        department: r.requester_department ?? "",
        unit: r.requester_unit ?? "",
      },
      items: by(items, r.id).map((i) => ({ id: i.id, description: i.description, amount: Number(i.amount) })),
      attachments: by(attachments, r.id).map((a) => ({
        id: a.id, name: a.name, kind: a.kind as never,
        size: `${Math.max(1, Math.round(Number(a.byte_size) / 1024))} KB`,
      })),
      comments: by(comments, r.id).map((c) => ({
        id: c.id, author: c.author, role: c.role ?? "", date: new Date(c.created_at).toISOString(),
        body: c.body, ...(c.requested_changes?.length ? { requestedChanges: c.requested_changes } : {}),
      })),
      activity: by(activity, r.id).map((a) => ({
        id: String(a.id), date: new Date(a.at).toISOString(), actor: a.actor ?? "System", action: a.action,
      })),
      status: r.status,
      stageDates: Object.fromEntries(
        by(stages, r.id).map((s) => [s.stage, new Date(s.completed_at).toISOString()]),
      ) as Requisition["stageDates"],
      ...(recon
        ? {
            reconciliation: {
              actuals: Object.fromEntries(mine.map((a) => [a.expense_item_id, Number(a.amount)])),
              receipts: by(attachments, r.id).filter((a) => a.kind === "receipt").map((a) => ({
                id: a.id, name: a.name, kind: "receipt" as const,
                size: `${Math.max(1, Math.round(Number(a.byte_size) / 1024))} KB`,
              })),
              note: recon.note ?? "",
              submittedAt: new Date(recon.submitted_at).toISOString(),
            },
          }
        : {}),
      ...(r.payment_ref ? { paymentRef: r.payment_ref } : {}),
      ...(iso(r.submitted_at) ? { submittedAt: iso(r.submitted_at)! } : {}),
      createdAt: new Date(r.created_at).toISOString(),
    }
  })
}

/** Everything this person may see, newest first. The scope is SQL, not a filter afterwards. */
export async function listFor(actor: Actor): Promise<Requisition[]> {
  const v = visibilityClause(actor)
  const rows = await q<Row>(`${SELECT} where ${v.sql} order by r.created_at desc`, v.params)
  return hydrate(rows)
}

/** One requisition, or null when it does not exist *or* this person may not see it. */
export async function getFor(actor: Actor, id: string): Promise<Requisition | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await q<Row>(`${SELECT} where r.id = $1`, [id])
  const row = rows[0]
  if (!row) return null
  const subject: Subject = { requesterId: row.requester_id, departmentId: row.department_id, status: row.status }
  // Same answer for "not yours" as for "does not exist": otherwise the difference between
  // the two tells a stranger which reference numbers are real.
  if (!canSee(actor, subject)) return null
  return (await hydrate([row]))[0] ?? null
}

export async function subjectOf(id: string): Promise<Subject | null> {
  const rows = await q<{ requester_id: number; department_id: number | null; status: RequisitionStatus }>(
    "select requester_id, department_id, status from requisitions where id=$1", [id])
  const r = rows[0]
  return r ? { requesterId: r.requester_id, departmentId: r.department_id, status: r.status } : null
}

/** The next reference in the year's run, allocated inside the caller's transaction. */
async function nextReference(client: { query: (t: string, p?: unknown[]) => Promise<{ rows: { max: string | null }[] }> }) {
  const year = new Date().getFullYear()
  const r = await client.query(
    "select max(reference) as max from requisitions where reference like $1", [`REQ-${year}-%`])
  const last = Number(r.rows[0]?.max?.split("-").pop() ?? 0)
  return `REQ-${year}-${String(last + 1).padStart(3, "0")}`
}

export interface DraftInput {
  programme: string; programmeDate?: string | null; location?: string | null; purpose?: string | null
  items: { description: string; amount: number }[]
}

export async function createDraft(actor: Actor, input: DraftInput) {
  if (actor.role !== "hod") throw Object.assign(new Error("Only a Head of Department raises requisitions."), { status: 403 })
  return tx(async (c) => {
    const reference = await nextReference(c as never)
    const ins = await c.query<{ id: string }>(
      `insert into requisitions(reference, programme, programme_date, location, purpose, department_id, requester_id, status)
       values ($1,$2,$3,$4,$5,$6,$7,'draft') returning id`,
      [reference, input.programme, input.programmeDate || null, input.location ?? null,
       input.purpose ?? null, actor.departmentId, actor.id],
    )
    const id = ins.rows[0]!.id
    for (const [i, item] of (input.items ?? []).entries()) {
      await c.query("insert into expense_items(requisition_id, description, amount, sort_order) values ($1,$2,$3,$4)",
        [id, item.description, Math.max(0, Math.round(item.amount || 0)), i])
    }
    await c.query("insert into activity(requisition_id, actor_id, action) values ($1,$2,'created')", [id, actor.id])
    return id
  })
}

/** Replace the editable fields and lines. Refused unless this person may edit right now. */
export async function saveEdits(actor: Actor, id: string, input: DraftInput) {
  const subject = await subjectOf(id)
  if (!subject || !canSee(actor, subject)) throw Object.assign(new Error("Not found."), { status: 404 })
  if (!canEdit(actor, subject)) throw Object.assign(new Error("This requisition can no longer be edited."), { status: 403 })

  await tx(async (c) => {
    await c.query(
      `update requisitions set programme=$2, programme_date=$3, location=$4, purpose=$5, updated_at=now() where id=$1`,
      [id, input.programme, input.programmeDate || null, input.location ?? null, input.purpose ?? null])
    await c.query("delete from expense_items where requisition_id=$1", [id])
    for (const [i, item] of (input.items ?? []).entries()) {
      await c.query("insert into expense_items(requisition_id, description, amount, sort_order) values ($1,$2,$3,$4)",
        [id, item.description, Math.max(0, Math.round(item.amount || 0)), i])
    }
  })
}

export interface MoveInput {
  to: RequisitionStatus
  comment?: string
  requestedChanges?: string[]
  paymentRef?: string
}

/**
 * Move a requisition, or refuse. Everything that follows from a move — the stage stamp, the
 * activity line, the comment when one is required — is written here rather than accepted
 * from the browser, because a client that can write its own history can write any history.
 */
export async function move(actor: Actor, id: string, input: MoveInput) {
  const subject = await subjectOf(id)
  if (!subject) throw Object.assign(new Error("Not found."), { status: 404 })

  const verdict = canTransition(actor, subject, input.to)
  if (!verdict.ok) {
    const status = verdict.reason === "not-visible" ? 404 : 403
    const message =
      verdict.reason === "not-visible" ? "Not found."
      : verdict.reason === "not-owner" ? "Only the person who raised this can do that."
      : verdict.reason === "wrong-role" ? "That is not yours to do."
      : "That is not a move this requisition can make from where it is."
    throw Object.assign(new Error(message), { status })
  }

  // Returning something without saying what to change is the complaint the office made
  // about the old paper process; the rule belongs here, not in a form.
  if (input.to === "changes_requested" && !(input.requestedChanges?.length || input.comment?.trim())) {
    throw Object.assign(new Error("Say what needs to change before returning it."), { status: 400 })
  }

  // A reconciliation is the receipts. Without them it is an assertion that the money was
  // spent properly, which is the thing this system exists to replace.
  if (input.to === "reconciliation_review") {
    const receipts = await q<{ n: string }>(
      "select count(*) as n from attachments where requisition_id=$1 and kind='receipt' and scanned_at is not null",
      [id])
    if (Number(receipts[0]?.n ?? 0) === 0) {
      throw Object.assign(
        new Error("Attach at least one receipt before filing the reconciliation."),
        { status: 400 },
      )
    }
  }

  await tx(async (c) => {
    const guarded = await c.query(
      "update requisitions set status=$2, updated_at=now() where id=$1 and status=$3",
      [id, input.to, subject.status])
    // Someone else moved it between our check and our write. Refusing is the only honest
    // outcome: the decision was made against a state that no longer exists.
    if (guarded.rowCount !== 1) {
      throw Object.assign(new Error("Somebody else has just changed this. Open it again to see where it is now."), { status: 409 })
    }

    if (input.to === "under_review" && subject.status === "draft") {
      await c.query("update requisitions set submitted_at=coalesce(submitted_at, now()) where id=$1", [id])
    }
    if (input.paymentRef && input.to === "disbursed") {
      await c.query("update requisitions set payment_ref=$2 where id=$1", [id, input.paymentRef.trim()])
    }

    const stage = STAGE_ON_ARRIVAL[input.to]
    if (stage) {
      await c.query(
        "insert into requisition_stages(requisition_id, stage) values ($1,$2) on conflict (requisition_id, stage) do update set completed_at=now()",
        [id, stage])
    }
    if (input.comment?.trim() || input.requestedChanges?.length) {
      await c.query(
        "insert into comments(requisition_id, author_id, body, requested_changes) values ($1,$2,$3,$4)",
        [id, actor.id, input.comment?.trim() || "Returned for changes.", input.requestedChanges ?? []])
    }
    await c.query("insert into activity(requisition_id, actor_id, action) values ($1,$2,$3)", [id, actor.id, verdict.action])
  })
}
