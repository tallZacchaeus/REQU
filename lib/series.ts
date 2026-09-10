import { requisitionTotal, type Requisition } from "./types"

export interface MonthPoint {
  key: string
  label: string
  requested: number
  disbursed: number
  count: number
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** The last `span` months, oldest first, with zeroes where nothing happened. */
export function monthlySeries(rows: Requisition[], span = 8, now = new Date()): MonthPoint[] {
  const points: MonthPoint[] = []
  for (let back = span - 1; back >= 0; back--) {
    const date = new Date(now.getFullYear(), now.getMonth() - back, 1)
    points.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: MONTHS[date.getMonth()],
      requested: 0,
      disbursed: 0,
      count: 0,
    })
  }

  const index = new Map(points.map((point) => [point.key, point]))
  for (const r of rows) {
    const total = requisitionTotal(r)
    const raised = index.get((r.submittedAt ?? r.createdAt).slice(0, 7))
    if (raised) {
      raised.requested += total
      raised.count += 1
    }
    const paid = r.stageDates.disbursement && index.get(r.stageDates.disbursement.slice(0, 7))
    if (paid) paid.disbursed += total
  }

  return points
}

/**
 * A three-way split of where the money currently sits. Three segments, not
 * eleven: a stacked bar stops being readable long before that, and these three
 * are the only distinction a dashboard needs to make.
 */
export interface Share {
  key: "action" | "motion" | "settled"
  label: string
  value: number
  count: number
}

const NEEDS_ACTION = ["changes_requested", "disbursed"]
const SETTLED = ["approved", "with_finance", "reconciliation_review", "reconciled"]

export function shareSplit(rows: Requisition[]): Share[] {
  const live = rows.filter((r) => r.status !== "draft" && r.status !== "rejected")
  const bucket = (keys: string[]) => live.filter((r) => keys.includes(r.status))
  const moving = live.filter(
    (r) => !NEEDS_ACTION.includes(r.status) && !SETTLED.includes(r.status),
  )

  // Amber sits before blue and green after it, so the two hues that separate
  // least under colour-vision deficiency are never adjacent in the bar.
  return [
    { key: "action", label: "Needs action", ...tally(bucket(NEEDS_ACTION)) },
    { key: "motion", label: "In review", ...tally(moving) },
    { key: "settled", label: "Approved & paid", ...tally(bucket(SETTLED)) },
  ]
}

function tally(rows: Requisition[]) {
  return { value: rows.reduce((sum, r) => sum + requisitionTotal(r), 0), count: rows.length }
}

/** Percentage change between the last two months, for the trend chip. */
export function trend(points: MonthPoint[], field: "requested" | "disbursed" = "requested") {
  const [previous, latest] = points.slice(-2)
  if (!previous || !latest || previous[field] === 0) return null
  return Math.round(((latest[field] - previous[field]) / previous[field]) * 100)
}
