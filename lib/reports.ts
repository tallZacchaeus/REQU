import type { Role } from "./data"
import { deskFor } from "./desk"
import { waitingDays } from "./review"
import { STATUS, type StatusTone } from "./status"
import {
  reconciledTotal,
  reconciliationVariance,
  requisitionTotal,
  type Requisition,
  type RequisitionStatus,
} from "./types"

export interface Figure {
  label: string
  value: number
  money?: boolean
  hint?: string
}

export interface Band {
  label: string
  count: number
  value: number
  tone: StatusTone
}

export interface Split {
  label: string
  sub: string
  count: number
  value: number
}

export interface Report {
  title: string
  blurb: string
  figures: Figure[]
  bands: Band[]
  splitTitle: string
  splits: Split[]
  /** Only meaningful once something has actually been reconciled. */
  variance: { closed: number; budget: number; spent: number } | null
}

const ORDER: RequisitionStatus[] = [
  "draft",
  "under_review",
  "recommended",
  "awaiting_approval",
  "changes_requested",
  "approved",
  "with_finance",
  "disbursed",
  "reconciliation_review",
  "reconciled",
  "rejected",
]

const sum = (rows: Requisition[]) => rows.reduce((total, r) => total + requisitionTotal(r), 0)

function bandsFrom(rows: Requisition[]): Band[] {
  return ORDER.map((status) => {
    const matching = rows.filter((r) => r.status === status)
    return {
      label: STATUS[status].label,
      count: matching.length,
      value: sum(matching),
      tone: STATUS[status].tone,
    }
  }).filter((band) => band.count > 0)
}

/** Everything here is counted off the store — no figure is invented. */
export function buildReport(role: Role, all: Requisition[]): Report {
  const desk = deskFor(role)
  const rows = all.filter(desk.visible)
  const waiting = rows.filter(desk.needsMe)

  const closed = rows.filter((r) => r.status === "reconciled")
  const variance = closed.length
    ? {
        closed: closed.length,
        budget: sum(closed),
        spent: closed.reduce((total, r) => total + reconciledTotal(r), 0),
      }
    : null

  const bands = bandsFrom(rows)

  if (role === "hod") {
    const disbursed = rows.filter((r) =>
      ["disbursed", "reconciliation_review", "reconciled"].includes(r.status),
    )
    return {
      title: "Your requisitions",
      blurb: "Everything you have raised, and where the money reached.",
      figures: [
        { label: "Raised", value: rows.length, hint: "All time" },
        { label: "Total requested", value: sum(rows), money: true },
        { label: "Received", value: sum(disbursed), money: true, hint: "Disbursed to you" },
        { label: "Awaiting you", value: waiting.length, hint: "Needs your action" },
      ],
      bands,
      splitTitle: "By programme",
      splits: [...rows]
        .sort((a, b) => requisitionTotal(b) - requisitionTotal(a))
        .slice(0, 6)
        .map((r) => ({
          label: r.programme,
          sub: STATUS[r.status].label,
          count: r.items.length,
          value: requisitionTotal(r),
        })),
      variance,
    }
  }

  // Reviewers and Finance are measured on throughput, not on their own spend.
  const cleared = rows.filter((r) => {
    const config = deskFor(role)
    return !config.needsMe(r) && r.status !== "draft"
  })
  const longest = waiting.length ? Math.max(...waiting.map((r) => waitingDays(r))) : 0
  const averageWait = waiting.length
    ? Math.round(waiting.reduce((total, r) => total + waitingDays(r), 0) / waiting.length)
    : 0

  const byUnit = new Map<string, Split>()
  for (const r of rows) {
    const key = r.requester.unit
    const entry = byUnit.get(key) ?? {
      label: key,
      sub: r.requester.department,
      count: 0,
      value: 0,
    }
    entry.count += 1
    entry.value += requisitionTotal(r)
    byUnit.set(key, entry)
  }

  return {
    title: role === "finance" ? "Your payments desk" : "Your review desk",
    blurb:
      role === "finance"
        ? "What you have paid out, and what is still waiting to be paid."
        : "What you have already actioned, and what is still waiting on you.",
    figures: [
      { label: "On your desk", value: waiting.length, hint: waiting.length ? `Longest ${longest} days` : "Clear" },
      { label: "Value waiting", value: sum(waiting), money: true },
      { label: "Actioned", value: cleared.length, hint: "You have dealt with these" },
      {
        label: "Average wait",
        value: averageWait,
        hint: averageWait === 1 ? "day waiting on you" : "days waiting on you",
      },
    ],
    bands,
    splitTitle: "By province",
    splits: [...byUnit.values()].sort((a, b) => b.value - a.value),
    variance,
  }
}

export const varianceOf = (r: Requisition) => reconciliationVariance(r)
