import type { Requisition } from "./types"

/**
 * Everything the browser receives is already scoped to what the signed-in person may see,
 * so a list needs no further filtering. This stays only because screens still call it, and
 * it must never be mistaken for a permission check: lib/authz.ts on the server is that.
 */
export const isMine = (_r: Requisition) => true

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
