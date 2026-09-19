/**
 * Loads the reference data a fresh database needs, and — only outside production — the
 * prototype's sample requisitions so the screens have something to show.
 *
 * Reads lib/data.ts rather than restating any of it, so there is one source of truth
 * for the accounts and sample records while the prototype and the real thing overlap.
 *
 *   npm run db:seed              reference data only
 *   npm run db:seed -- --samples reference data plus the 14 sample requisitions
 */
import { DIRECTORY, SEED_REQUISITIONS } from "../lib/data"
import { pool, tx } from "../lib/db"
import type { Requisition } from "../lib/types"

const WANT_SAMPLES = process.argv.includes("--samples")

/** Every department named anywhere in the prototype, so no seeded row points at nothing. */
function departmentNames() {
  const names = new Set<string>()
  for (const a of DIRECTORY) if (a.scope) names.add(a.scope.split("·")[0]!.trim())
  for (const r of SEED_REQUISITIONS as Requisition[]) {
    if (r.department) names.add(r.department.trim())
    if (r.requester?.department) names.add(r.requester.department.trim())
  }
  return [...names].filter(Boolean).sort()
}

async function main() {
  await tx(async (c) => {
    for (const [i, name] of departmentNames().entries()) {
      await c.query(
        `insert into departments(name, sort_order) values ($1,$2)
         on conflict (name) do update set sort_order = excluded.sort_order`,
        [name, (i + 1) * 10],
      )
    }

    for (const a of DIRECTORY) {
      const dept = a.scope?.split("·")[0]?.trim() || null
      await c.query(
        `insert into people(email, full_name, short_name, initials, role, title, scope, phone, department_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,(select id from departments where name=$9))
         on conflict (email) do update set
           full_name=excluded.full_name, short_name=excluded.short_name, initials=excluded.initials,
           role=excluded.role, title=excluded.title, scope=excluded.scope, phone=excluded.phone,
           department_id=excluded.department_id`,
        [a.email.toLowerCase(), a.name, a.shortName, a.initials, a.role, a.title, a.scope, a.phone, dept],
      )
    }
  })

  const counts = async () => ({
    departments: Number((await pool.query("select count(*) from departments")).rows[0].count),
    people: Number((await pool.query("select count(*) from people")).rows[0].count),
    requisitions: Number((await pool.query("select count(*) from requisitions")).rows[0].count),
  })
  console.log("[seed] reference data:", await counts())

  if (!WANT_SAMPLES) {
    console.log("[seed] sample requisitions skipped (pass --samples to load them)")
    return
  }
  if (process.env.NODE_ENV === "production") {
    // Sample requisitions are invented programmes with invented sums. They must never
    // reach a database anyone is filing real requests in.
    console.log("[seed] refusing to load samples with NODE_ENV=production")
    return
  }

  for (const r of SEED_REQUISITIONS as Requisition[]) {
    await tx(async (c) => {
      const who = await c.query<{ id: number }>("select id from people where full_name=$1 limit 1", [
        r.requester.name,
      ])
      const requester =
        who.rows[0]?.id ??
        (
          await c.query<{ id: number }>(
            `insert into people(email, full_name, initials, role, department_id)
             values ($1,$2,$3,'hod',(select id from departments where name=$4))
             on conflict (email) do update set full_name=excluded.full_name returning id`,
            [
              `${r.requester.name.toLowerCase().replace(/[^a-z]+/g, ".")}@requ.org`,
              r.requester.name,
              r.requester.initials,
              r.requester.department,
            ],
          )
        ).rows[0]!.id

      const ins = await c.query<{ id: string }>(
        `insert into requisitions(reference, programme, programme_date, location, purpose,
                                  department_id, requester_id, status, payment_ref, submitted_at, created_at)
         values ($1,$2,$3,$4,$5,(select id from departments where name=$6),$7,$8,$9,$10,$11)
         on conflict (reference) do nothing returning id`,
        [r.reference, r.programme, r.programmeDate || null, r.location, r.purpose,
         r.department, requester, r.status, r.paymentRef ?? null, r.submittedAt ?? null, r.createdAt],
      )
      const id = ins.rows[0]?.id
      if (!id) return // already seeded

      for (const [i, item] of r.items.entries()) {
        await c.query(
          "insert into expense_items(requisition_id, description, amount, sort_order) values ($1,$2,$3,$4)",
          [id, item.description, item.amount, i],
        )
      }
      for (const a of r.attachments ?? []) {
        await c.query(
          "insert into attachments(requisition_id, name, kind, byte_size) values ($1,$2,$3,0)",
          [id, a.name, a.kind],
        )
      }
      for (const cm of r.comments ?? []) {
        const author = await c.query<{ id: number }>("select id from people where full_name=$1 limit 1", [cm.author])
        await c.query(
          `insert into comments(requisition_id, author_id, body, requested_changes, created_at)
           values ($1, coalesce($2,$3), $4, $5, $6)`,
          [id, author.rows[0]?.id ?? null, requester, cm.body, cm.requestedChanges ?? [], cm.date],
        )
      }
      for (const ev of r.activity ?? []) {
        const actor = await c.query<{ id: number }>("select id from people where full_name=$1 limit 1", [ev.actor])
        await c.query("insert into activity(requisition_id, actor_id, action, at) values ($1,$2,$3,$4)", [
          id, actor.rows[0]?.id ?? null, ev.action, ev.date,
        ])
      }
      for (const [stage, date] of Object.entries(r.stageDates ?? {})) {
        if (date) {
          await c.query(
            "insert into requisition_stages(requisition_id, stage, completed_at) values ($1,$2,$3) on conflict do nothing",
            [id, stage, date],
          )
        }
      }
      if (r.reconciliation) {
        await c.query(
          "insert into reconciliations(requisition_id, note, submitted_at) values ($1,$2,$3) on conflict do nothing",
          [id, r.reconciliation.note, r.reconciliation.submittedAt],
        )
        const items = await c.query<{ id: string; sort_order: number }>(
          "select id, sort_order from expense_items where requisition_id=$1 order by sort_order",
          [id],
        )
        for (const [i, original] of r.items.entries()) {
          const actual = r.reconciliation.actuals[original.id]
          const row = items.rows[i]
          if (actual !== undefined && row) {
            await c.query(
              "insert into reconciliation_actuals(requisition_id, expense_item_id, amount) values ($1,$2,$3) on conflict do nothing",
              [id, row.id, actual],
            )
          }
        }
      }
    })
  }
  console.log("[seed] with samples:", await counts())
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error("[seed]", e)
    process.exit(1)
  })
