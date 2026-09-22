import { q } from "./db"
import { send, mailerConfigured } from "./mailer"
import type { RequisitionStatus } from "./types"
import type { Role } from "./data"

/**
 * Telling people something is waiting on them.
 *
 * The complaint about the old process was never that decisions were wrong — it was that
 * nobody knew where a request had got to, and things sat for weeks because the person who
 * had to act did not know they had to act. So: one message, to whoever it now waits on,
 * saying plainly what has happened and what they need to do.
 *
 * Nothing here may ever fail a move. By the time this runs the decision is committed; an
 * unreachable mail server is a message not sent, not an approval undone.
 */

interface Audience {
  /** Roles that should hear about it, because it is now their turn. */
  roles?: Role[]
  /** Whether the person who raised it should hear about it. */
  owner?: boolean
  subject: (programme: string) => string
  intro: (who: string, programme: string) => string
  line?: string
}

const ON_ARRIVAL: Partial<Record<RequisitionStatus, Audience>> = {
  under_review: {
    roles: ["ayp"],
    subject: (p) => `For your recommendation: ${p}`,
    intro: (who, p) => `${who} has submitted “${p}” and it is waiting for your recommendation.`,
  },
  awaiting_approval: {
    roles: ["nyp"],
    subject: (p) => `For your approval: ${p}`,
    intro: (who, p) => `${who} has recommended “${p}”. It now needs your approval.`,
  },
  approved: {
    roles: ["finance"], owner: true,
    subject: (p) => `Approved: ${p}`,
    intro: (who, p) => `${who} has approved “${p}”. Finance can now process the payment.`,
  },
  disbursed: {
    owner: true,
    subject: (p) => `Funds released: ${p}`,
    intro: (who, p) => `${who} has released the funds for “${p}”.`,
    line: "Keep every receipt. The requisition is not closed until they are filed and accepted.",
  },
  changes_requested: {
    owner: true,
    subject: (p) => `Changes needed: ${p}`,
    intro: (who, p) => `${who} has sent “${p}” back to you with changes.`,
    line: "Open it to see exactly what needs changing, then submit it again.",
  },
  rejected: {
    owner: true,
    subject: (p) => `Not approved: ${p}`,
    intro: (who, p) => `${who} has not approved “${p}”.`,
    line: "The reason is on the requisition.",
  },
  reconciliation_review: {
    roles: ["finance"],
    subject: (p) => `Receipts filed: ${p}`,
    intro: (who, p) => `${who} has filed the reconciliation and receipts for “${p}”.`,
  },
  reconciled: {
    owner: true,
    subject: (p) => `Closed: ${p}`,
    intro: (who, p) => `${who} has accepted the reconciliation for “${p}”. It is now closed.`,
  },
}

const money = (naira: number) => `₦${naira.toLocaleString("en-NG")}`

/**
 * Tell whoever needs to know. Never throws: the caller has already committed the decision,
 * and a failure to send must not look like a failure to approve.
 */
export async function announce(requisitionId: string, arrivedAt: RequisitionStatus, actorId: number) {
  try {
    const plan = ON_ARRIVAL[arrivedAt]
    if (!plan || !mailerConfigured()) return

    const rows = await q<{
      reference: string; programme: string; total: string
      requester_email: string; requester_name: string; actor_name: string
    }>(
      `select r.reference, r.programme,
              coalesce((select sum(amount) from expense_items e where e.requisition_id = r.id), 0) as total,
              p.email as requester_email, p.full_name as requester_name,
              a.full_name as actor_name
         from requisitions r
         join people p on p.id = r.requester_id
         left join people a on a.id = $2
        where r.id = $1`, [requisitionId, actorId])
    const r = rows[0]
    if (!r) return

    const to = new Set<string>()
    if (plan.owner) to.add(r.requester_email)
    if (plan.roles?.length) {
      const holders = await q<{ email: string }>(
        "select email from people where role = any($1) and active", [plan.roles])
      for (const h of holders) to.add(h.email)
    }
    // Nobody needs an email about something they just did themselves.
    const actor = await q<{ email: string }>("select email from people where id=$1", [actorId])
    if (actor[0]) to.delete(actor[0].email)
    if (to.size === 0) return

    const base = process.env.APP_URL ?? "https://requisition.rccgyayang.org"
    const lines = [
      `${r.reference} · ${money(Number(r.total))} · raised by ${r.requester_name}`,
      ...(plan.line ? [plan.line] : []),
    ]

    await Promise.allSettled(
      [...to].map((address) =>
        send(
          address,
          plan.subject(r.programme),
          plan.intro(r.actor_name ?? "Somebody", r.programme),
          lines,
          { label: "Open the requisition", url: `${base}/requisitions/${requisitionId}` },
        ),
      ),
    )
  } catch (e) {
    console.error("[notify] could not send:", (e as Error).message)
  }
}
