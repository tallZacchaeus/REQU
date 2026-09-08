import { CURRENT_USER } from "./data"
import type { Requisition, RequisitionStatus } from "./types"

/**
 * An HOD only ever sees their own department's requisitions. The AYP reviews
 * across all of them, which is why the two sides filter differently.
 */
export const isMine = (r: Requisition) => r.requester.name === CURRENT_USER.name

/** Everything sitting on the AYP's desk right now. */
export const AWAITING_AYP: RequisitionStatus[] = ["under_review"]

/** Anything that has already passed the AYP's desk on its way up. */
export const PASSED_AYP: RequisitionStatus[] = [
  "recommended",
  "awaiting_approval",
  "approved",
  "with_finance",
  "disbursed",
  "reconciliation_review",
  "reconciled",
]

export const isAwaitingReview = (r: Requisition) => AWAITING_AYP.includes(r.status)
export const wasRecommended = (r: Requisition) => PASSED_AYP.includes(r.status)
export const wasReturned = (r: Requisition) => r.status === "changes_requested"

/** Drafts never leave the HOD's device, so the AYP must never see them. */
export const visibleToAyp = (r: Requisition) => r.status !== "draft"

/** Oldest first — a reviewer works the back of the queue, not the front. */
export const byLongestWaiting = (a: Requisition, b: Requisition) =>
  (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt)

/** Days a requisition has been waiting on the reviewer. */
export function waitingDays(r: Requisition, now = new Date()) {
  const from = r.submittedAt ?? r.createdAt
  return Math.max(0, Math.round((now.getTime() - new Date(from).getTime()) / 86_400_000))
}
