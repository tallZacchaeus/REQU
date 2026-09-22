import type { RequisitionStatus } from "./types"
import type { Role } from "./data"

/**
 * Who may see what, and who may move what where. These are the rules the browser used to
 * apply while drawing screens; here they are the rules, and the server applies them to
 * every request.
 *
 * Deliberately pure and free of database or request objects, so they can be tested
 * exhaustively and read by someone deciding whether they are correct.
 */

export interface Actor {
  id: number
  role: Role
  departmentId: number | null
}

/** Only what the rules need, so callers cannot accidentally depend on more. */
export interface Subject {
  requesterId: number
  departmentId: number | null
  status: RequisitionStatus
}

/**
 * Every legal move: from → to, and the single role permitted to make it.
 *
 * Read this table as the definition of the workflow. Anything absent is refused, which is
 * the right default when the end of the process is a payment.
 */
export const TRANSITIONS: ReadonlyArray<{
  from: RequisitionStatus
  to: RequisitionStatus
  role: Role
  /** Only the person who raised it, not merely anyone holding the role. */
  ownerOnly?: true
  action: string
}> = [
  { from: "draft", to: "under_review", role: "hod", ownerOnly: true, action: "submitted" },
  { from: "changes_requested", to: "under_review", role: "hod", ownerOnly: true, action: "resubmitted" },
  { from: "disbursed", to: "reconciliation_review", role: "hod", ownerOnly: true, action: "filed a reconciliation" },

  { from: "under_review", to: "awaiting_approval", role: "ayp", action: "recommended" },
  { from: "under_review", to: "changes_requested", role: "ayp", action: "returned for changes" },

  { from: "awaiting_approval", to: "approved", role: "nyp", action: "approved" },
  { from: "awaiting_approval", to: "rejected", role: "nyp", action: "rejected" },
  { from: "awaiting_approval", to: "changes_requested", role: "nyp", action: "returned for changes" },

  { from: "approved", to: "with_finance", role: "finance", action: "taken up by Finance" },
  { from: "with_finance", to: "disbursed", role: "finance", action: "disbursed" },
  { from: "reconciliation_review", to: "reconciled", role: "finance", action: "reconciliation accepted" },
  { from: "reconciliation_review", to: "changes_requested", role: "finance", action: "reconciliation queried" },
]

/** The stage stamped as complete when a move lands on a status. */
export const STAGE_ON_ARRIVAL: Partial<Record<RequisitionStatus, string>> = {
  under_review: "submitted",
  awaiting_approval: "recommended",
  approved: "approval",
  disbursed: "disbursement",
  reconciled: "reconciled",
}

const REVIEWERS: ReadonlyArray<Role> = ["ayp", "nyp", "finance"]
export const isReviewer = (role: Role) => REVIEWERS.includes(role)

/**
 * The platform administrator. Sees everything so they can answer "where has my requisition
 * gone?", and can do nothing to it: no role appears against them in TRANSITIONS, and they
 * fail canEdit like every other non-owner. An administrator who could approve would put back
 * the very hole this workflow exists to close.
 *
 * Drafts are included in what they can see. They have direct access to the database in any
 * case, so hiding drafts in the interface would be a courtesy rather than a control — and
 * it is better that this is written down than quietly true.
 */
export const isAdmin = (role: Role) => role === "super_admin"

/**
 * May this person open this requisition at all?
 *
 * A HOD sees their own work and their department's. Reviewers see everything that has been
 * submitted — but never a draft, which belongs to the person still writing it.
 */
export function canSee(actor: Actor, r: Subject): boolean {
  // Registered but not yet given a role. Proving you hold a church mailbox is not the same
  // as being anybody in this workflow.
  if (actor.role === "pending") return false
  if (isAdmin(actor.role)) return true
  if (isReviewer(actor.role)) return r.status !== "draft"
  if (actor.role === "hod") {
    if (r.requesterId === actor.id) return true
    return actor.departmentId !== null && r.departmentId === actor.departmentId
  }
  return false
}

/** Editing figures is the owner's alone, and only while it is theirs to change. */
export function canEdit(actor: Actor, r: Subject): boolean {
  return (
    actor.role === "hod" &&
    r.requesterId === actor.id &&
    (r.status === "draft" || r.status === "changes_requested")
  )
}

export type TransitionRefusal =
  | { ok: false; reason: "not-visible" | "no-such-move" | "wrong-role" | "not-owner" }

export type TransitionVerdict = { ok: true; action: string } | TransitionRefusal

/**
 * May this person move this requisition to that status? The order of the checks matters:
 * a person who cannot see a requisition is told the same thing whatever they asked for.
 */
export function canTransition(actor: Actor, r: Subject, to: RequisitionStatus): TransitionVerdict {
  if (!canSee(actor, r)) return { ok: false, reason: "not-visible" }

  const moves = TRANSITIONS.filter((t) => t.from === r.status && t.to === to)
  if (moves.length === 0) return { ok: false, reason: "no-such-move" }

  const forRole = moves.find((t) => t.role === actor.role)
  if (!forRole) return { ok: false, reason: "wrong-role" }

  if (forRole.ownerOnly && r.requesterId !== actor.id) return { ok: false, reason: "not-owner" }
  return { ok: true, action: forRole.action }
}

/** What this person could do with it right now — used to decide which buttons to draw. */
export function allowedTransitions(actor: Actor, r: Subject): RequisitionStatus[] {
  return TRANSITIONS.filter((t) => canTransition(actor, r, t.to).ok && t.from === r.status).map((t) => t.to)
}

/** A SQL fragment scoping a list to what the actor may see. Parameters: $1 = actor id, $2 = department. */
export function visibilityClause(actor: Actor) {
  if (actor.role === "pending") return { sql: "false", params: [] as unknown[] }
  if (isAdmin(actor.role)) return { sql: "true", params: [] as unknown[] }
  if (isReviewer(actor.role)) return { sql: "r.status <> 'draft'", params: [] as unknown[] }
  if (actor.role === "hod") {
    return {
      sql: "(r.requester_id = $1 or (r.department_id is not null and r.department_id = $2))",
      params: [actor.id, actor.departmentId] as unknown[],
    }
  }
  // An unknown role sees nothing. Failing closed is the only safe default here.
  return { sql: "false", params: [] as unknown[] }
}
