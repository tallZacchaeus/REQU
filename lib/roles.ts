import type { Requisition, RequisitionStatus, StageKey } from "./types"

/**
 * The ANYP and NYP desks are the same screens with different authority. Rather
 * than a third copy of every view, each reviewing role is described once here
 * and the shared components read from it.
 */
export interface ActionSpec {
  key: "advance" | "changes" | "reject" | "process"
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
  /** Payment reference, captured instead of numbered change points. */
  reference?: { label: string; placeholder: string }
  /** Some actions only make sense from certain states. */
  availableWhen?: (r: Requisition) => boolean
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
  role: "ayp" | "nyp" | "finance"
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
  /** Ordered; the first one available in the current state leads. */
  actions: ActionSpec[]
}

const requestChanges = (returnsTo: (r: Requisition) => string): ActionSpec => ({
  key: "changes",
  label: "Request changes",
  sheetTitle: "Request changes",
  blurb: (r) => `This goes back to ${returnsTo(r)}. Be specific — they can only fix what you name.`,
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
    "As Assistant National Youth Pastor you recommend or return requisitions. Final approval rests with the National Youth Pastor, and Finance disburses the funds.",
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
  actions: [
    {
      key: "advance",
      label: "Recommend",
      sheetTitle: "Recommend requisition",
      blurb: () => `This goes to the National Youth Pastor for approval.`,
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
    requestChanges((r) => r.requester.name),
  ],
}

export const NYP_CONFIG: ReviewerConfig = {
  role: "nyp",

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
    "As National Youth Pastor you give the final approval on departmental spend. Finance disburses approved funds, and the HOD accounts for them afterwards.",
  can: [
    "Approve requisitions recommended by the ANYP",
    "Return a requisition to the HOD for changes",
    "Reject a requisition outright",
    "See the ANYP's recommendation and the full breakdown",
  ],
  cannot: [
    "Disburse funds",
    "Raise a requisition of your own",
    "Edit an HOD's figures directly",
    "Approve without an ANYP recommendation",
    "Sign off a reconciliation",
  ],
  actions: [
    {
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
      defaultComment: "Approved. Passing to Finance for disbursement.",
    },
    requestChanges((r) => r.requester.name),
    {
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
  ],
}

export const FINANCE_CONFIG: ReviewerConfig = {
  role: "finance",

  home: "/finance",
  queueHref: "/finance/queue",
  profileHref: "/finance/profile",
  detailHref: (id) => `/finance/requisitions/${id}`,
  deskLabel: "Payments Desk",
  queueTitle: "Payment Queue",
  awaitingCopy: "awaiting disbursement",
  clearedLabel: "Disbursed",
  // Finance both pays out and checks the account that comes back.
  awaits: (r) => ["approved", "with_finance", "reconciliation_review"].includes(r.status),
  cleared: (r) => ["disbursed", "reconciled"].includes(r.status),
  boundary:
    "Finance pays approved requisitions and checks the account that comes back. Approval has already been given by the National Youth Pastor — Finance does not review the request again.",
  can: [
    "See requisitions approved by the National Youth Pastor",
    "Mark an approved requisition as being processed",
    "Record the disbursement with a payment reference",
    "Check receipts and close a reconciliation",
  ],
  cannot: [
    "Approve or reject a requisition",
    "Return a requisition to the HOD",
    "Change the approved amount",
    "Raise a requisition of your own",
    "Disburse anything the NYP has not approved",
  ],
  actions: [
    /* Reconciliation comes back to the same desk that paid it out. */
    {
      key: "advance",
      label: "Accept reconciliation",
      sheetTitle: "Accept reconciliation",
      blurb: () => "Accepting the receipts closes this requisition for good.",
      confirmLabel: "Accept and close",
      tone: "primary",
      nextStatus: "reconciled",
      stamp: "reconciled",
      activity: "Reconciliation accepted",
      commentLabel: "Note",
      commentPlaceholder: "Anything to record against the receipts.",
      commentRequired: false,
      wantsPoints: false,
      defaultComment: "Receipts checked and accepted.",
      availableWhen: (r) => r.status === "reconciliation_review",
    },
    {
      key: "advance",
      label: "Record disbursement",
      sheetTitle: "Record disbursement",
      blurb: (r) => `Funds go to ${r.requester.name}, who then accounts for them.`,
      confirmLabel: "Confirm disbursement",
      tone: "primary",
      nextStatus: "disbursed",
      stamp: "disbursement",
      activity: "Disbursed",
      commentLabel: "Note",
      commentPlaceholder: "Payment method or any condition.",
      commentRequired: false,
      wantsPoints: false,
      defaultComment: "Funds disbursed.",
      reference: { label: "Payment reference", placeholder: "e.g. TRF-2026-00184" },
      availableWhen: (r) => r.status === "approved" || r.status === "with_finance",
    },
    {
      key: "process",
      label: "Mark as processing",
      sheetTitle: "Mark as processing",
      blurb: () => "This tells the HOD that payment is in hand and being prepared.",
      confirmLabel: "Mark as processing",
      tone: "warn",
      nextStatus: "with_finance",
      activity: "Payment being processed",
      commentLabel: "Note",
      commentPlaceholder: "Expected payment date, if known.",
      commentRequired: false,
      wantsPoints: false,
      defaultComment: "Payment is being processed.",
      availableWhen: (r) => r.status === "approved",
    },
  ],
}

export const CONFIGS = { ayp: AYP_CONFIG, nyp: NYP_CONFIG, finance: FINANCE_CONFIG } as const
