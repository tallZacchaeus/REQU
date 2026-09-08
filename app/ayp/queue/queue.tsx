"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Inbox } from "lucide-react"

import { MicroLabel, Money } from "@/components/app/primitives"
import { ReviewCard } from "@/components/app/review-card"
import {
  byLongestWaiting,
  isAwaitingReview,
  visibleToAyp,
  wasRecommended,
  wasReturned,
} from "@/lib/review"
import { useRequisitions } from "@/lib/store"
import { requisitionTotal, type Requisition } from "@/lib/types"
import { cn } from "@/lib/utils"

const FILTERS: { key: string; label: string; match: (r: Requisition) => boolean }[] = [
  { key: "awaiting", label: "Awaiting you", match: isAwaitingReview },
  { key: "recommended", label: "Recommended", match: wasRecommended },
  { key: "returned", label: "Returned", match: wasReturned },
  { key: "rejected", label: "Rejected", match: (r) => r.status === "rejected" },
  { key: "all", label: "All", match: () => true },
]

export function ReviewQueue() {
  const { requisitions } = useRequisitions()
  const params = useSearchParams()
  const initial = params.get("filter")
  const [active, setActive] = useState(
    FILTERS.some((f) => f.key === initial) ? (initial as string) : "awaiting",
  )

  const visible = requisitions.filter(visibleToAyp)
  const filter = FILTERS.find((f) => f.key === active) ?? FILTERS[0]
  // Oldest first while triaging; newest first once you are looking back.
  const rows = visible
    .filter(filter.match)
    .sort(active === "awaiting" ? byLongestWaiting : (a, b) => -byLongestWaiting(a, b))
  const value = rows.reduce((sum, r) => sum + requisitionTotal(r), 0)

  return (
    <>
      <header className="border-hairline bg-card sticky top-0 z-20 border-b">
        <div className="flex h-14 items-center px-4">
          <h1 className="text-ink text-[17px] font-semibold tracking-[-0.01em]">Review Queue</h1>
        </div>

        <div className="overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1.5">
            {FILTERS.map((f) => {
              const count = visible.filter(f.match).length
              const selected = f.key === active
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActive(f.key)}
                  aria-pressed={selected}
                  className={cn(
                    "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-all duration-200 active:scale-95",
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-card"
                      : "border-hairline bg-card text-ink-soft hover:border-ink-faint/40 hover:text-ink",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "text-[11.5px] tabular-nums",
                      selected ? "text-primary-foreground/70" : "text-ink-faint",
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-8">
        <div className="mb-2.5 flex items-baseline justify-between">
          <MicroLabel>
            {rows.length} requisition{rows.length === 1 ? "" : "s"}
          </MicroLabel>
          {rows.length > 0 && (
            <span className="text-ink-soft text-[12px]">
              Total <Money value={value} size="sm" className="text-[13px]" />
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="border-hairline animate-fade mt-6 flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
            <Inbox className="text-ink-faint size-6" strokeWidth={1.6} aria-hidden />
            <p className="text-ink mt-3 text-[14px] font-semibold">Nothing here</p>
            <p className="text-ink-soft mt-1 text-[13px] leading-[1.5]">
              No requisitions match the <span className="text-ink font-medium">{filter.label}</span>{" "}
              filter.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((requisition, index) => (
              <ReviewCard
                key={requisition.id}
                requisition={requisition}
                className="animate-rise"
                style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
