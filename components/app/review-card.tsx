import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { formatDateShort } from "@/lib/format"
import { STATUS } from "@/lib/status"
import { waitingDays } from "@/lib/review"
import { requisitionTotal, type Requisition } from "@/lib/types"
import { cn } from "@/lib/utils"

import { Money, StatusBadge } from "./primitives"

/**
 * The reviewer's unit of work. Leads with *who is asking* and *how long they
 * have waited* — the two things a queue is triaged on.
 */
export function ReviewCard({
  requisition,
  className,
  style,
}: {
  requisition: Requisition
  className?: string
  style?: React.CSSProperties
}) {
  const days = waitingDays(requisition)
  const awaiting = requisition.status === "under_review"
  const stale = awaiting && days >= 7

  return (
    <Link
      href={`/ayp/requisitions/${requisition.id}`}
      style={style}
      className={cn(
        "card-flat tap-card group hover:border-ink-faint/30 flex cursor-pointer items-start gap-3 px-3.5 py-3.5",
        className,
      )}
    >
      <span
        className="bg-muted text-ink-soft mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold"
        aria-hidden
      >
        {requisition.requester.initials}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="text-ink block truncate text-[14.5px] leading-tight font-semibold">
              {requisition.programme}
            </span>
            <span className="text-ink-soft mt-1 block truncate text-[12px]">
              {requisition.requester.name} · {requisition.requester.unit}
            </span>
          </span>
          <StatusBadge status={requisition.status} className="mt-0.5 shrink-0" />
        </span>

        <span className="border-hairline mt-2.5 flex items-end justify-between gap-2 border-t pt-2.5">
          <Money value={requisitionTotal(requisition)} size="md" />
          <span
            className={cn(
              "shrink-0 text-[11.5px]",
              stale ? "text-st-action font-semibold" : "text-ink-faint",
            )}
          >
            {awaiting ? (
              <>
                {days === 0 ? "Submitted today" : `Waiting ${days} day${days === 1 ? "" : "s"}`}
              </>
            ) : (
              <>
                {STATUS[requisition.status].label} ·{" "}
                {formatDateShort(requisition.submittedAt ?? requisition.createdAt)}
              </>
            )}
          </span>
        </span>
      </span>

      <ChevronRight
        className="text-ink-faint mt-3 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}
