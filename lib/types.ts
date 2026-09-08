export type RequisitionStatus =
  | "draft"
  | "under_review"
  | "recommended"
  | "awaiting_approval"
  | "approved"
  | "with_finance"
  | "disbursed"
  | "changes_requested"
  | "rejected"
  /* Funds are out. The transaction is not closed until the HOD accounts
     for what was actually spent. */
  | "reconciliation_review"
  | "reconciled"

/** The five fixed stages every requisition travels through. */
export type StageKey =
  | "submitted"
  | "recommended"
  | "approval"
  | "finance"
  | "disbursed"
  | "reconciled"

export type StageState = "done" | "current" | "pending" | "blocked"

export interface Stage {
  key: StageKey
  label: string
  /** Role that owns the stage — the HOD never owns anything past `submitted`. */
  actor: string
  state: StageState
  /** ISO date, present only once the stage has actually completed. */
  date?: string
  note?: string
}

export interface ExpenseItem {
  id: string
  description: string
  /** Kobo-free whole naira. Zero means "not yet filled in". */
  amount: number
}

export interface Attachment {
  id: string
  name: string
  /** Human-readable, e.g. "1.2 MB". */
  size: string
  kind: "proposal" | "quotation" | "receipt" | "other"
}

/** Who raised the requisition. The AYP reviews across several of these. */
export interface Requester {
  name: string
  initials: string
  department: string
  unit: string
}

/** What a line item actually cost, against what was requested for it. */
export interface Reconciliation {
  /** Actual spend keyed by expense item id. */
  actuals: Record<string, number>
  receipts: Attachment[]
  note: string
  submittedAt: string
}

export interface Comment {
  id: string
  author: string
  role: string
  date: string
  body: string
  /** Set when the comment is the reason a requisition was returned. */
  requestedChanges?: string[]
}

export interface ActivityEntry {
  id: string
  date: string
  actor: string
  action: string
}

export interface Requisition {
  id: string
  reference: string
  programme: string
  programmeDate: string
  location: string
  department: string
  purpose: string
  requester: Requester
  items: ExpenseItem[]
  attachments: Attachment[]
  comments: Comment[]
  activity: ActivityEntry[]
  status: RequisitionStatus
  /** Completion dates recorded per stage; absent means the stage is not done. */
  stageDates: Partial<Record<StageKey, string>>
  reconciliation?: Reconciliation
  submittedAt?: string
  createdAt: string
}

export const requisitionTotal = (r: Pick<Requisition, "items">) =>
  r.items.reduce((sum, item) => sum + item.amount, 0)

/** Total actually spent. Falls back to the budget for unfilled lines. */
export const reconciledTotal = (r: Pick<Requisition, "items" | "reconciliation">) =>
  r.items.reduce((sum, item) => sum + (r.reconciliation?.actuals[item.id] ?? 0), 0)

/** Positive means unspent funds to return; negative means an overspend. */
export const reconciliationVariance = (
  r: Pick<Requisition, "items" | "reconciliation">,
) => requisitionTotal(r) - reconciledTotal(r)
