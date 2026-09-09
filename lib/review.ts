import { CURRENT_USER } from "./data"
import type { Requisition } from "./types"

/**
 * An HOD only ever sees their own department's requisitions. The AYP reviews
 * across all of them, which is why the two sides filter differently.
 */
export const isMine = (r: Requisition) => r.requester.name === CURRENT_USER.name

/** Drafts never leave the HOD's device, so no reviewer may see them. */
export const visibleToReviewer = (r: Requisition) => r.status !== "draft"

/** Oldest first — a reviewer works the back of the queue, not the front. */
export const byLongestWaiting = (a: Requisition, b: Requisition) =>
  (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt)

/** Days a requisition has been waiting on the reviewer. */
export function waitingDays(r: Requisition, now = new Date()) {
  const from = r.submittedAt ?? r.createdAt
  return Math.max(0, Math.round((now.getTime() - new Date(from).getTime()) / 86_400_000))
}
