import Link from "next/link"
import { Calendar, ChevronRight, FileText } from "lucide-react"

import { formatDateShort } from "@/lib/format"
import { STATUS, type StatusTone } from "@/lib/status"
import { requisitionTotal, type Requisition } from "@/lib/types"
import { cn } from "@/lib/utils"

import { Money, StatusBadge } from "./primitives"
import { StageMeter } from "./stage-rail"

/** Tile tint restates the status family, so a scan reads by colour alone. */
const TONE_TILE: Record<StatusTone, string> = {
  neutral: "bg-st-neutral-bg text-st-neutral",
  motion: "bg-st-motion-bg text-st-motion",
  action: "bg-st-action-bg text-st-action",
  good: "bg-st-good-bg text-st-good",
  bad: "bg-st-bad-bg text-st-bad",
}

export function RequisitionCard({
  requisition,
  className,
  style,
}: {
  requisition: Requisition
  className?: string
  style?: React.CSSProperties
}) {
  const meta = STATUS[requisition.status]
  const total = requisitionTotal(requisition)
  const href =
    requisition.status === "draft"
      ? `/requisitions/new?edit=${requisition.id}`
      : `/requisitions/${requisition.id}`

  return (
    <Link
      href={href}
      style={style}
      className={cn(
        "card-flat tap-card group hover:border-ink-faint/30 flex cursor-pointer items-start gap-3 px-3.5 py-3.5",
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
          TONE_TILE[meta.tone],
        )}
        aria-hidden
      >
        <FileText className="size-[18px]" strokeWidth={1.9} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="text-ink block truncate text-[14.5px] leading-tight font-semibold">
              {requisition.programme}
            </span>
            <span className="text-ink-faint mt-1 block font-mono text-[11px] tracking-tight">
              {requisition.reference}
            </span>
          </span>
          <StatusBadge status={requisition.status} className="mt-0.5 shrink-0" />
        </span>

        <span className="mt-2 flex items-end justify-between gap-2">
          <Money value={total} size="md" />
          <span className="text-ink-faint flex shrink-0 items-center gap-1 text-[11.5px]">
            <Calendar className="size-3" strokeWidth={2} aria-hidden />
            {requisition.submittedAt
              ? `Sub. ${formatDateShort(requisition.submittedAt)}`
              : `Created ${formatDateShort(requisition.createdAt)}`}
          </span>
        </span>

        <StageMeter stage={meta.stage} tone={meta.tone} className="mt-2.5" />
      </span>

      <ChevronRight
        className="text-ink-faint mt-3 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}
