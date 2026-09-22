import { formatDate } from "./format"
import { STATUS } from "./status"
import {
  reconciledTotal,
  reconciliationVariance,
  requisitionTotal,
  type Requisition,
} from "./types"

/** RFC 4180: quote anything containing a comma, quote or newline. */
function cell(value: string | number) {
  const text = String(value ?? "")
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const COLUMNS = [
  "Reference",
  "Programme",
  "Raised by",
  "Unit",
  "Programme date",
  "Submitted",
  "Status",
  "Requested",
  "Actually spent",
  "Variance",
  "Payment reference",
] as const

/**
 * One row per requisition, with the figures unformatted so a spreadsheet can
 * sum them. Currency symbols and thousands separators would make every amount
 * a string.
 */
export function requisitionsToCsv(rows: Requisition[]) {
  const lines = [COLUMNS.join(",")]

  for (const r of rows) {
    const requested = requisitionTotal(r)
    const spent = r.reconciliation ? reconciledTotal(r) : ""
    const variance = r.reconciliation ? reconciliationVariance(r) : ""
    lines.push(
      [
        r.reference,
        r.programme,
        r.requester.name,
        r.requester.unit,
        r.programmeDate,
        r.submittedAt ?? "",
        STATUS[r.status].label,
        requested,
        spent,
        variance,
        r.paymentRef ?? "",
      ]
        .map(cell)
        .join(","),
    )
  }

  return lines.join("\n")
}

/** Triggers a save without a round trip; the data is already on the device. */
export function downloadCsv(filename: string, csv: string) {
  // A BOM so Excel opens the naira sign and any accented name correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const reportFilename = (label: string) =>
  `requisition-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${formatDate(
    new Date().toISOString(),
  )
    .replace(/\s/g, "-")
    .toLowerCase()}.csv`
