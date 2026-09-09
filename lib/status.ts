import type { RequisitionStatus, Stage, StageKey } from "./types"

/**
 * Status is grouped by *meaning*, not by state name. Five families means the
 * eye can sort a list without reading it:
 *   neutral - nothing has happened yet
 *   motion  - moving through the workflow, nothing for the HOD to do
 *   action  - stopped, and only the HOD can restart it
 *   good    - finished well
 *   bad     - finished badly
 */
export type StatusTone = "neutral" | "motion" | "action" | "good" | "bad"

interface StatusMeta {
  label: string
  tone: StatusTone
  /** Where this status sits on the five-stage rail. */
  stage: number
  /** Only `action` states get a filled chip; everything else is a dot. */
  emphasis: "dot" | "chip"
  /** Shown on the detail screen under the amount. */
  detail: string
}

export const STATUS: Record<RequisitionStatus, StatusMeta> = {
  draft: {
    label: "Draft",
    tone: "neutral",
    stage: 0,
    emphasis: "dot",
    detail: "Not submitted yet",
  },
  under_review: {
    label: "Under ANYP Review",
    tone: "motion",
    stage: 1,
    emphasis: "dot",
    detail: "With your Assistant National Youth Pastor",
  },
  recommended: {
    label: "Recommended",
    tone: "motion",
    stage: 2,
    emphasis: "dot",
    detail: "Recommended by the ANYP, awaiting NYP approval",
  },
  awaiting_approval: {
    label: "Awaiting NYP Approval",
    tone: "motion",
    stage: 2,
    emphasis: "dot",
    detail: "With the National Youth Pastor",
  },
  approved: {
    label: "Approved",
    tone: "good",
    stage: 3,
    emphasis: "dot",
    detail: "Approved — with Finance for disbursement",
  },
  with_finance: {
    label: "With Finance",
    tone: "motion",
    stage: 3,
    emphasis: "dot",
    detail: "Finance is processing the payment",
  },
  /* Disbursed is no longer the end of the line: the money is out, and the
     HOD now owes an account of it. That makes it an action state. */
  disbursed: {
    label: "Disbursed",
    tone: "action",
    stage: 4,
    emphasis: "chip",
    detail: "Funds released — reconciliation due from you",
  },
  reconciliation_review: {
    label: "Reconciliation Filed",
    tone: "motion",
    stage: 4,
    emphasis: "dot",
    detail: "Treasury is checking your receipts",
  },
  reconciled: {
    label: "Reconciled",
    tone: "good",
    stage: 5,
    emphasis: "dot",
    detail: "Receipts accepted — this requisition is closed",
  },
  changes_requested: {
    label: "Changes Requested",
    tone: "action",
    stage: 1,
    emphasis: "chip",
    detail: "Returned to you — needs an edit before it can move on",
  },
  rejected: {
    label: "Rejected",
    tone: "bad",
    stage: 2,
    emphasis: "dot",
    detail: "Not approved",
  },
}

export const TONE_DOT: Record<StatusTone, string> = {
  neutral: "bg-st-neutral",
  motion: "bg-st-motion",
  action: "bg-st-action",
  good: "bg-st-good",
  bad: "bg-st-bad",
}

export const TONE_TEXT: Record<StatusTone, string> = {
  neutral: "text-st-neutral",
  motion: "text-st-motion",
  action: "text-st-action",
  good: "text-st-good",
  bad: "text-st-bad",
}

export const TONE_CHIP: Record<StatusTone, string> = {
  neutral: "bg-st-neutral-bg text-st-neutral",
  motion: "bg-st-motion-bg text-st-motion",
  action: "bg-st-action-bg text-st-action",
  good: "bg-st-good-bg text-st-good",
  bad: "bg-st-bad-bg text-st-bad",
}

/**
 * Each stage carries two labels. A stage that has not happened yet must not be
 * written in the past tense — "Approved" sitting on a pending step reads as if
 * the money is already cleared.
 */
const STAGE_DEFS: { key: StageKey; done: string; open: string; actor: string }[] = [
  { key: "submitted", done: "Submitted", open: "Submission", actor: "You" },
  {
    key: "recommended",
    done: "Recommended",
    open: "Recommendation",
    actor: "Assistant National Youth Pastor",
  },
  { key: "approval", done: "Approved", open: "Approval", actor: "National Youth Pastor" },
  { key: "disbursement", done: "Disbursed", open: "Disbursement", actor: "Finance" },
  { key: "reconciled", done: "Reconciled", open: "Reconciliation", actor: "You" },
]

/** Two stages change hands partway through, so their owner depends on state. */
function stageActor(key: StageKey, status: RequisitionStatus, fallback: string) {
  if (key === "disbursement") {
    if (status === "approved") return "Finance — queued for payment"
    if (status === "with_finance") return "Finance — processing payment"
    return fallback
  }
  if (key === "reconciled") {
    if (status === "disbursed") return "You — receipts outstanding"
    if (status === "reconciliation_review") return "Treasury"
    return "You & Treasury"
  }
  return fallback
}

/**
 * Builds the stage rail for a requisition. `dates` carries the real
 * completion dates that have been recorded so far; a stage without a date is
 * never shown as done.
 */
export function buildStages(
  status: RequisitionStatus,
  dates: Partial<Record<StageKey, string>> = {},
): Stage[] {
  const meta = STATUS[status]
  const halted = status === "changes_requested" || status === "rejected"

  return STAGE_DEFS.map((def, index) => {
    let state: Stage["state"]
    if (index < meta.stage) state = "done"
    else if (index === meta.stage) state = halted ? "blocked" : "current"
    else state = "pending"

    return {
      key: def.key,
      actor: stageActor(def.key, status, def.actor),
      label: state === "done" ? def.done : def.open,
      state,
      date: state === "done" ? dates[def.key] : undefined,
    }
  })
}

export const STAGE_COUNT = STAGE_DEFS.length
