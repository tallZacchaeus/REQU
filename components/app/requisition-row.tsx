import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { formatDateShort } from "@/lib/format"
import { STATUS, type StatusTone } from "@/lib/status"
import { waitingDays } from "@/lib/review"
import { requisitionTotal, type Requisition } from "@/lib/types"
import { cn } from "@/lib/utils"

import { Money, StatusBadge } from "./primitives"

const TONE_TILE: Record<StatusTone, string> = {
  neutral: "bg-st-neutral-bg text-st-neutral",
  motion: "bg-st-motion-bg text-st-motion",
  action: "bg-st-action-bg text-st-action",
  good: "bg-st-good-bg text-st-good",
  bad: "bg-st-bad-bg text-st-bad",
}

/** Desktop grid template, shared by the header and every row beneath it. */
const COLUMNS = [
  "grid items-center gap-3",
  // Tablet drops the requester column; the width is not there for six.
  "grid-cols-[minmax(0,2fr)_minmax(0,1fr)_88px_136px_28px]",
  "lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_92px_150px_28px] lg:gap-4",
].join(" ")

export function RequisitionRowHeader({ requesterLabel }: { requesterLabel: string }) {
  return (
    <div className={cn(COLUMNS, "text-ink-faint px-4 pb-2")}>
      <span className="label-micro">Programme</span>
      <span className="label-micro hidden lg:block">{requesterLabel}</span>
      <span className="label-micro text-right">Amount</span>
      <span className="label-micro">Submitted</span>
      <span className="label-micro">Status</span>
      <span />
    </div>
  )
}

/**
 * The desktop rendering of a requisition. A row rather than a card: on a wide
 * screen a reviewer scans down a single column of aligned values, and cards
 * side by side break that scan.
 */
export function RequisitionRow({
  requisition,
  href,
  showRequester = true,
  showWait = false,
}: {
  requisition: Requisition
  href: string
  showRequester?: boolean
  showWait?: boolean
}) {
  const meta = STATUS[requisition.status]
  const days = waitingDays(requisition)
  const stale = showWait && days >= 7

  return (
    <Link
      href={href}
      className={cn(
        COLUMNS,
        "card-flat group hover:border-ink-faint/30 cursor-pointer px-4 py-3 transition-[border-color,background-color] duration-200 hover:bg-muted/40",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn("size-2 shrink-0 rounded-full", TONE_TILE[meta.tone].split(" ")[0])}
          aria-hidden
        />
        <span className="min-w-0">
          <span className="text-ink block truncate text-[14.5px] leading-tight font-semibold">
            {requisition.programme}
          </span>
          <span className="text-ink-faint mt-1 block font-mono text-[11px] tracking-tight">
            {requisition.reference}
          </span>
        </span>
      </span>

      <span className="hidden min-w-0 lg:block">
        {showRequester ? (
          <>
            <span className="text-ink block truncate text-[13.5px]">
              {requisition.requester.name}
            </span>
            <span className="text-ink-faint mt-0.5 block truncate text-[11.5px]">
              {requisition.requester.unit}
            </span>
          </>
        ) : (
          <span className="text-ink-soft block truncate text-[13px]">
            {requisition.location || requisition.department}
          </span>
        )}
      </span>

      <span className="text-right">
        <Money value={requisitionTotal(requisition)} size="sm" />
      </span>

      <span className="text-ink-soft text-[12.5px] tabular-nums">
        {requisition.submittedAt
          ? formatDateShort(requisition.submittedAt)
          : formatDateShort(requisition.createdAt)}
        {stale && (
          <span className="text-st-action mt-0.5 block text-[11px] font-semibold">
            {days}d wait
          </span>
        )}
      </span>

      <span>
        <StatusBadge status={requisition.status} />
      </span>

      {/* Opening the record is the only action here — decisions happen inside. */}
      <span
        className="text-ink-faint group-hover:text-primary flex size-7 items-center justify-center rounded-md transition-colors duration-200"
        aria-hidden
      >
        <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
