"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FileText, Plus } from "lucide-react"

import { RequisitionCard } from "@/components/app/requisition-card"
import {
  RequisitionRow,
  RequisitionRowHeader,
} from "@/components/app/requisition-row"
import { isMine } from "@/lib/review"
import { useRequisitions } from "@/lib/store"
import type { RequisitionStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const FILTERS: { key: string; label: string; match: (s: RequisitionStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  {
    key: "action",
    label: "Needs action",
    match: (s) => s === "changes_requested" || s === "disbursed",
  },
  { key: "drafts", label: "Drafts", match: (s) => s === "draft" },
  {
    key: "review",
    label: "Under Review",
    match: (s) => s === "under_review" || s === "recommended" || s === "awaiting_approval",
  },
  { key: "approved", label: "Approved", match: (s) => s === "approved" || s === "with_finance" },
  {
    key: "disbursed",
    label: "Disbursed",
    match: (s) => s === "disbursed" || s === "reconciliation_review",
  },
  { key: "closed", label: "Closed", match: (s) => s === "reconciled" },
  { key: "rejected", label: "Rejected", match: (s) => s === "rejected" },
]

export function RequisitionsList() {
  const { requisitions: all } = useRequisitions()
  const requisitions = all.filter(isMine)
  const params = useSearchParams()
  // The dashboard stat cards deep-link straight into a filter.
  const initial = params.get("filter")
  const [active, setActive] = useState(
    FILTERS.some((f) => f.key === initial) ? (initial as string) : "all",
  )

  const filter = FILTERS.find((f) => f.key === active) ?? FILTERS[0]
  const visible = [...requisitions]
    .filter((r) => filter.match(r.status))
    .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))

  return (
    <>
      <header className="border-hairline bg-card sticky top-0 z-20 border-b lg:static lg:border-0 lg:bg-transparent">
        <div className="flex h-14 items-center justify-between px-4 lg:h-auto md:px-0 lg:pb-4">
          <h1 className="text-ink text-[17px] font-semibold tracking-[-0.01em] lg:text-[24px] lg:tracking-[-0.025em]">
            My Requisitions
          </h1>
          <Link
            href="/requisitions/new"
            className="btn-gradient -mr-1 flex h-9 cursor-pointer items-center gap-1.5 rounded-lg pr-3 pl-2.5 text-[13.5px] font-semibold text-white transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.97]"
          >
            <Plus className="size-4" strokeWidth={2.6} aria-hidden />
            New
          </Link>
        </div>

        {/* Filters scroll horizontally so the set never wraps into two rows. */}
        <div className="overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] lg:overflow-visible md:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1.5 lg:w-auto lg:flex-wrap">
            {FILTERS.map((f) => {
              const count = requisitions.filter((r) => f.match(r.status)).length
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

      <div className="px-4 pt-4 pb-8 md:px-0 lg:pt-6">
        <p className="label-micro mb-2.5">
          {visible.length} requisition{visible.length === 1 ? "" : "s"}
        </p>

        {visible.length === 0 ? (
          <div className="border-hairline animate-fade mt-6 flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
            <FileText className="text-ink-faint size-6" strokeWidth={1.6} aria-hidden />
            <p className="text-ink mt-3 text-[14px] font-semibold">Nothing here yet</p>
            <p className="text-ink-soft mt-1 text-[13px] leading-[1.5]">
              No requisitions match the <span className="text-ink font-medium">{filter.label}</span>{" "}
              filter.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2.5 md:hidden">
              {visible.map((requisition, index) => (
                <RequisitionCard
                  key={requisition.id}
                  requisition={requisition}
                  className="animate-rise"
                  style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
                />
              ))}
            </div>

            <div className="hidden md:block">
              <RequisitionRowHeader requesterLabel="Location" />
              <div className="space-y-1.5">
                {visible.map((requisition) => (
                  <RequisitionRow
                    key={requisition.id}
                    requisition={requisition}
                    href={
                      requisition.status === "draft"
                        ? `/requisitions/new?edit=${requisition.id}`
                        : `/requisitions/${requisition.id}`
                    }
                    showRequester={false}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
