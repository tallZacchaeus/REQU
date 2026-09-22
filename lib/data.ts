import type { Requester, Requisition } from "./types"

/** `super_admin` runs the platform. It takes no part in the workflow — see lib/authz.ts. */
/**
 * `pending` is where everybody starts: registered, but not yet anybody. It can see nothing
 * and do nothing until an administrator says what they are.
 */
export type Role = "pending" | "hod" | "ayp" | "nyp" | "finance" | "super_admin"

export interface Account {
  role: Role
  name: string
  shortName: string
  initials: string
  email: string
  title: string
  scope: string
  phone: string
}

/**
 * Sign-in is passwordless, so the address *is* the identity — it decides
 * which side of the workflow you land on.
 */
/**
 * How each role is named to a person. The app used to carry four invented officers with
 * names, parishes and phone numbers; who somebody is now comes from their session, and the
 * only thing this file still decides is what to call their role.
 */
export const ROLE_LABEL: Record<Role, string> = {
  pending: "Not yet assigned",
  hod: "Head of Department",
  ayp: "Assistant National Youth Pastor",
  nyp: "National Youth Pastor",
  finance: "Finance",
  super_admin: "Administrator",
}

export const ROLE_SHORT: Record<Role, string> = {
  pending: "NEW",
  hod: "HOD",
  ayp: "ANYP",
  nyp: "NYP",
  finance: "FIN",
  super_admin: "ADMIN",
}

/** An empty account, for the moment before the session has loaded. */
export const NOBODY: Account = {
  role: "pending", name: "", shortName: "", initials: "",
  email: "", title: "", scope: "", phone: "",
}
