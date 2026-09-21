import { CONFIGS } from "./roles"
import { isMine, visibleToReviewer } from "./review"
import { STATUS } from "./status"
import type { Requisition } from "./types"
import type { Role } from "./data"

/**
 * What the top bar needs to know for whoever is signed in: what they can see,
 * where a record opens for them, and what their one primary action is.
 */
export interface Desk {
  /** Records this role is allowed to search and be notified about. */
  visible: (r: Requisition) => boolean
  hrefFor: (r: Requisition) => string
  /** Sitting on this desk right now, waiting on this person. */
  needsMe: (r: Requisition) => boolean
  cta: { label: string; href: string; kind: "create" | "queue" }
  searchLabel: string
}

const HOD_NEEDS_ME = ["changes_requested", "disbursed"]

export function deskFor(role: Role): Desk {
  if (role === "hod") {
    return {
      visible: isMine,
      hrefFor: (r) =>
        r.status === "draft" ? `/requisitions/new?edit=${r.id}` : `/requisitions/${r.id}`,
      needsMe: (r) => HOD_NEEDS_ME.includes(r.status),
      cta: { label: "New Requisition", href: "/requisitions/new", kind: "create" },
      searchLabel: "Search your requisitions",
    }
  }

  // Only the three reviewer roles have a desk. An administrator is not one of them, and
  // indexing CONFIGS with their role would hand back undefined at runtime.
  const config = CONFIGS[role as keyof typeof CONFIGS]
  if (!config) {
    return {
      visible: () => true,
      hrefFor: (r) => `/requisitions/${r.id}`,
      needsMe: () => false,
      cta: { label: "Requisitions", href: "/requisitions", kind: "queue" },
      searchLabel: "Search every requisition",
    }
  }
  return {
    visible: visibleToReviewer,
    hrefFor: (r) => config.detailHref(r.id),
    needsMe: config.awaits,
    cta: { label: config.queueTitle, href: config.queueHref, kind: "queue" },
    searchLabel: "Search requisitions",
  }
}

/** Free-text match over the fields someone would actually type. */
export function matchesQuery(r: Requisition, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    r.programme,
    r.reference,
    r.requester.name,
    r.requester.unit,
    r.location,
    STATUS[r.status].label,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q)
}
