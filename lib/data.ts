import type { Requester, Requisition } from "./types"

/** `super_admin` runs the platform. It takes no part in the workflow — see lib/authz.ts. */
export type Role = "hod" | "ayp" | "nyp" | "finance" | "super_admin"

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
export const DIRECTORY: Account[] = [
  {
    role: "hod",
    name: "Pastor David Adeyemi",
    shortName: "Pastor David",
    initials: "DA",
    email: "david.adeyemi@requ.org",
    title: "Head of Department",
    scope: "Youth & Young Adults · Central Province",
    phone: "+234 803 412 7788",
  },
  {
    role: "ayp",
    name: "Pastor Grace Ojo",
    shortName: "Pastor Grace",
    initials: "GO",
    email: "grace.ojo@requ.org",
    title: "Assistant National Youth Pastor",
    scope: "Youth & Young Adults · All Provinces",
    phone: "+234 802 771 3390",
  },
  {
    role: "nyp",
    name: "Pastor Emmanuel Bassey",
    shortName: "Pastor Emmanuel",
    initials: "EB",
    email: "emmanuel.bassey@requ.org",
    title: "National Youth Pastor",
    scope: "Youth & Young Adults · National",
    phone: "+234 805 220 1147",
  },
  {
    role: "finance",
    name: "Mrs Ngozi Eze",
    shortName: "Mrs Ngozi",
    initials: "NE",
    email: "ngozi.eze@requ.org",
    title: "Finance Officer",
    scope: "Finance · National Secretariat",
    phone: "+234 807 664 2210",
  },
]

export const FINANCE_USER = {
  name: "Mrs Ngozi Eze",
  shortName: "Mrs Ngozi",
  initials: "NE",
  role: "Finance Officer",
  roleShort: "FIN",
  email: "ngozi.eze@requ.org",
  phone: "+234 807 664 2210",
  department: "Finance",
  unit: "National Secretariat",
  area: "National Secretariat, Abuja",
}

export const accountFor = (email: string) =>
  DIRECTORY.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())

export const accountByRole = (role: Role) => DIRECTORY.find((a) => a.role === role) ?? DIRECTORY[0]

export const AYP_USER = {
  name: "Pastor Grace Ojo",
  shortName: "Pastor Grace",
  initials: "GO",
  role: "Assistant National Youth Pastor",
  roleShort: "ANYP",
  email: "grace.ojo@requ.org",
  phone: "+234 802 771 3390",
  department: "Youth & Young Adults",
  unit: "All Provinces",
  area: "National Secretariat, Abuja",
  approver: "Pastor Emmanuel Bassey",
  approverRole: "National Youth Pastor",
}

export const NYP_USER = {
  name: "Pastor Emmanuel Bassey",
  shortName: "Pastor Emmanuel",
  initials: "EB",
  role: "National Youth Pastor",
  roleShort: "NYP",
  email: "emmanuel.bassey@requ.org",
  phone: "+234 805 220 1147",
  department: "Youth & Young Adults",
  unit: "National",
  area: "National Secretariat, Abuja",
  recommender: "Pastor Grace Ojo",
  recommenderRole: "Assistant National Youth Pastor",
}

/** The HODs whose requisitions reach the ANYP. */
export const REQUESTERS: Record<string, Requester> = {
  david: {
    name: "Pastor David Adeyemi",
    initials: "DA",
    department: "Youth & Young Adults",
    unit: "Central Province",
  },
  ruth: {
    name: "Pastor Ruth Nwankwo",
    initials: "RN",
    department: "Youth & Young Adults",
    unit: "Lagos Province",
  },
  samuel: {
    name: "Pastor Samuel Okafor",
    initials: "SO",
    department: "Youth & Young Adults",
    unit: "Eastern Province",
  },
  halima: {
    name: "Pastor Halima Bello",
    initials: "HB",
    department: "Youth & Young Adults",
    unit: "Northern Province",
  },
}

export const CURRENT_USER = {
  name: "Pastor David Adeyemi",
  shortName: "Pastor David",
  role: "Head of Department",
  roleShort: "HOD",
  department: "Youth & Young Adults",
  unit: "Central Province",
  email: "david.adeyemi@requ.org",
  phone: "+234 803 412 7788",
  area: "Abuja Area 3",
  parish: "Living Faith Chapel, Wuse II",
  memberSince: "2019-03-01",
  reviewer: "Pastor Grace Ojo",
  reviewerRole: "Assistant National Youth Pastor",
  approver: "Pastor Emmanuel Bassey",
  approverRole: "National Youth Pastor",
  initials: "DA",
}

/**
 * The sample requisitions that lived here are gone: the screens read the database now.
 * Nothing in this file should ever describe a real person or a real figure again — what
 * remains is shape and labelling only, and the role constants the reviewer screens use
 * until those are read from the session too.
 */
