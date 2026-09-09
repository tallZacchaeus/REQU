import { AYP_USER, NYP_USER } from "./data"
import type { Requisition, RequisitionStatus, StageKey } from "./types"

/**
 * The AYP and NYP desks are the same screens with different authority. Rather
 * than a third copy of every view, each reviewing role is described once here
 * and the shared components read from it.
 */
export interface ActionSpec {
  key: "advance" | "changes" | "reject"
  /** Button label on the detail screen. */
  label: string
  sheetTitle: string
  blurb: (r: Requisition) => string
  confirmLabel: string
  tone: "primary" | "warn" | "danger"
  nextStatus: RequisitionStatus
  /** Stage stamped as complete when this action is taken. */
  stamp?: StageKey
  activity: string
  /** A comment the reviewer may add; required for anything sent backwards. */
  commentLabel: string
  commentPlaceholder: string
  commentRequired: boolean
  /** Numbered change points — only meaningful when sending back. */
  wantsPoints: boolean
  defaultComment?: string
}

/** Only what the shared reviewer screens actually render. */
export interface ReviewerPerson {
  name: string
  shortName: string
  initials: string
  role: string
  roleShort: string
  email: string
  phone: string
  department: string
  unit: string
  area: string
}

export interface ReviewerConfig {
  role: "ayp" | "nyp"
  person: ReviewerPerson
  home: string
  queueHref: string
  profileHref: string
  detailHref: (id: string) => string
  deskLabel: string
  queueTitle: string
  /** "awaiting your recommendation" / "awaiting your approval" */
  awaitingCopy: string
  /** Label for the pile this desk has already cleared. */
  clearedLabel: string
  /** Sits on this desk right now. */
  awaits: (r: Requisition) => boolean
  /** Has already passed this desk. */
  cleared: (r: Requisition) => boolean
  boundary: string
  can: string[]
  cannot: string[]
  primary: ActionSpec
  secondary: ActionSpec
  destructive?: ActionSpec
}

const requestChanges = (returnsTo: (r: Requisition) => string): ActionSpec => ({
  key: "changes",
  label: "Request changes",
  sheetTitle: "Request changes",
  blurb: (r) =>
    `This goes back to ${returnsTo(r)}. Be specific — they can only fix what you name.`,
  confirmLabel: "Send back",
  tone: "warn",
  nextStatus: "changes_requested",
  activity: "Requested changes",
  commentLabel: "Your comment",
  commentPlaceholder: "Explain what is unclear or missing.",
  commentRequired: true,
  wantsPoints: true,
})

export const AYP_CONFIG: ReviewerConfig = {
  role: "ayp",
  person: AYP_USER,
  home: "/ayp",
  queueHref: "/ayp/queue",
  profileHref: "/ayp/profile",
  detailHref: (id) => `/ayp/requisitions/${id}`,
  deskLabel: "Review Desk",
  queueTitle: "Review Queue",
  awaitingCopy: "awaiting your recommendation",
  clearedLabel: "Recommended",
  awaits: (r) => r.status === "under_review",
  cleared: (r) =>
    [
      "recommended",
      "awaiting_approval",
      "approved",
      "with_finance",
      "disbursed",
      "reconciliation_review",
      "reconciled",
    ].includes(r.status),
  boundary:
    "As Assistant National Youth Pastor you recommend or return requisitions. Final approval rests with the National Youth Pastor, and disbursement with Finance and Treasury.",
  can: [
    "Review requisitions from every province",
    "Recommend requisitions to the National Youth Pastor",
    "Return requisitions to the HOD with specific changes",
    "See the full expense breakdown and attachments",
  ],
  cannot: [
    "Give final approval",
    "Disburse funds",
    "Raise a requisition of your own",
    "Edit an HOD's figures directly",
    "Sign off a reconciliation",
  ],
  primary: {
    key: "advance",
    label: "Recommend",
    sheetTitle: "Recommend requisition",
    blurb: () => `This goes to ${AYP_USER.approver} for approval.`,
    confirmLabel: "Recommend",
    tone: "primary",
    nextStatus: "awaiting_approval",
    stamp: "recommended",
    activity: "Recommended",
    commentLabel: "Note for the NYP",
    commentPlaceholder: "Anything the approver should know.",
    commentRequired: false,
    wantsPoints: false,
    defaultComment:
      "Reviewed and in order. Recommending to the National Youth Pastor for approval.",
  },
  secondary: requestChanges((r) => r.requester.name),
}

export const NYP_CONFIG: ReviewerConfig = {
  role: "nyp",
  person: NYP_USER,
  home: "/nyp",
  queueHref: "/nyp/queue",
  profileHref: "/nyp/profile",
  detailHref: (id) => `/nyp/requisitions/${id}`,
  deskLabel: "Approval Desk",
  queueTitle: "Approval Queue",
  awaitingCopy: "awaiting your approval",
  clearedLabel: "Approved",
  awaits: (r) => r.status === "awaiting_approval" || r.status === "recommended",
  cleared: (r) =>
    ["approved", "with_finance", "disbursed", "reconciliation_review", "reconciled"].includes(
      r.status,
    ),
  boundary:
    "As National Youth Pastor you give the final approval on departmental spend. Disbursement is carried out by Finance and Treasury, and the HOD accounts for the funds afterwards.",
  can: [
    "Approve requisitions recommended by the AYP",
    "Return a requisition to the HOD for changes",
    "Reject a requisition outright",
    "See the AYP's recommendation and the full breakdown",
  ],
  cannot: [
    "Disburse funds",
    "Raise a requisition of your own",
    "Edit an HOD's figures directly",
    "Approve without an AYP recommendation",
    "Sign off a reconciliation",
  ],
  primary: {
    key: "advance",
    label: "Approve",
    sheetTitle: "Approve requisition",
    blurb: () => "Approved requisitions pass to Finance for verification and disbursement.",
    confirmLabel: "Approve",
    tone: "primary",
    nextStatus: "approved",
    stamp: "approval",
    activity: "Approved",
    commentLabel: "Note for Finance",
    commentPlaceholder: "Any condition attached to this approval.",
    commentRequired: false,
    wantsPoints: false,
    defaultComment: "Approved. Passing to Finance for verification.",
  },
  secondary: requestChanges((r) => r.requester.name),
  destructive: {
    key: "reject",
    label: "Reject",
    sheetTitle: "Reject requisition",
    blurb: () =>
      "Rejection ends this requisition. The HOD would have to raise a fresh one, so use Request changes if it can be fixed.",
    confirmLabel: "Reject requisition",
    tone: "danger",
    nextStatus: "rejected",
    activity: "Rejected",
    commentLabel: "Reason for rejection",
    commentPlaceholder: "Explain why this cannot be approved.",
    commentRequired: true,
    wantsPoints: false,
  },
}

export const CONFIGS = { ayp: AYP_CONFIG, nyp: NYP_CONFIG } as const
