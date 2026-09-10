"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  TrendingDown,
  TrendingUp,
  Megaphone,
  Plus,
} from "lucide-react"

import { AreaTrend, MonthlyBars, ShareBar } from "@/components/app/charts"
import { LogoMark } from "@/components/app/logo"
import { MicroLabel, Money, StatusBadge } from "@/components/app/primitives"
import { MobileBell } from "@/components/app/notifications"
import { MobileSearchButton } from "@/components/app/topbar"
import { RequisitionCard } from "@/components/app/requisition-card"
import { RequisitionRow } from "@/components/app/requisition-row"
import { formatDate } from "@/lib/format"
import { monthlySeries, shareSplit, trend } from "@/lib/series"
import { requisitionTotal } from "@/lib/types"
import { CURRENT_USER } from "@/lib/data"
import { isMine } from "@/lib/review"
import { useRequisitions } from "@/lib/store"
import { cn } from "@/lib/utils"


/* Disbursed means the money is out and the receipts are not in — the HOD is
   the only one who can move it, so it belongs with changes-requested. */
const NEEDS_HOD = ["changes_requested", "disbursed"]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  const [flow, setFlow] = useState<"requested" | "disbursed">("requested")
  const { requisitions: all } = useRequisitions()
  const requisitions = all.filter(isMine)

  const needsAction = requisitions.filter((r) => NEEDS_HOD.includes(r.status))

  const recent = [...requisitions]
    .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))
    .slice(0, 4)

  const months = monthlySeries(requisitions)
  const shares = shareSplit(requisitions)
  const swing = trend(months)
  const requestedTotal = months.reduce((sum, m) => sum + m.requested, 0)
  const liveTotal = shares.reduce((sum, s) => sum + s.value, 0)

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = [...requisitions]
    .filter((r) => r.programmeDate >= today && r.status !== "rejected")
    .sort((a, b) => a.programmeDate.localeCompare(b.programmeDate))
    .slice(0, 4)

  return (
    <>
      {/* ---- Dark crown: identity, greeting and the one thing needing you ---- */}
      <header className="header-deep rounded-b-[28px] px-4 pt-4 pb-14 md:rounded-2xl md:px-7 md:pt-6 md:pb-7 lg:px-8 lg:pt-7 lg:pb-8">
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/15">
              <LogoMark className="size-[18px]" />
            </span>
            <span className="text-[15px] leading-none font-bold tracking-[0.12em] text-white">
              REQU
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <MobileSearchButton />
            <MobileBell />
            <Link
              href="/profile"
              aria-label="Your profile"
              className="press group flex cursor-pointer items-center gap-0.5"
            >
              <span className="bg-brand/25 flex size-9 items-center justify-center rounded-full text-[12.5px] font-semibold text-white ring-2 ring-white/25 transition-all duration-200 group-hover:ring-white/50">
                {CURRENT_USER.initials}
              </span>
              <ChevronDown className="size-3.5 text-white/50" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="animate-rise mt-7 lg:mt-0">
          <p className="text-[13.5px] text-white/65" suppressHydrationWarning>
            {greeting()},
          </p>
          <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.025em] text-white lg:text-[30px]">
            {CURRENT_USER.shortName}
          </h1>
          <p className="mt-1.5 text-[12.5px] text-white/55">
            {CURRENT_USER.department} · {CURRENT_USER.unit}
          </p>
        </div>

        {needsAction.length > 0 && (
          <Link
            href={`/requisitions/${needsAction[0].id}`}
            style={{ animationDelay: "80ms" }}
            className="on-deep-panel animate-rise press-wide group mt-5 flex cursor-pointer items-center gap-3 px-3.5 py-3 hover:bg-white/16 lg:mt-6"
          >
            <span className="bg-brand/25 flex size-9 shrink-0 items-center justify-center rounded-lg text-white">
              <Megaphone className="size-[17px]" strokeWidth={2} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] leading-tight font-semibold text-white">
                {needsAction.length} requisition{needsAction.length > 1 ? "s need" : " needs"} your
                attention
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-white/60">
                {needsAction[0].programme} —{" "}
                {needsAction[0].status === "disbursed" ? "reconciliation due" : "changes requested"}
              </span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-white/70 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        )}
      </header>

      {/* ---- Overview: what was asked for, and where it sits ---- */}
      <div className="-mt-9 grid gap-2.5 px-4 md:px-0 lg:mt-5 lg:grid-cols-2 lg:gap-4">
        <section className="card-flat animate-rise px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <MicroLabel>Requested</MicroLabel>
              <Money value={requestedTotal} size="lg" className="mt-1 block" />
            </div>
            {swing !== null && (
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold",
                  swing >= 0 ? "bg-st-good-bg text-st-good" : "bg-st-bad-bg text-st-bad",
                )}
              >
                {swing >= 0 ? (
                  <TrendingUp className="size-3.5" strokeWidth={2.4} aria-hidden />
                ) : (
                  <TrendingDown className="size-3.5" strokeWidth={2.4} aria-hidden />
                )}
                {Math.abs(swing)}%
              </span>
            )}
          </div>
          <p className="text-ink-soft mt-0.5 text-[12px]">Across {months.length} months</p>
          <div className="mt-1">
            <AreaTrend points={months} />
          </div>
        </section>

        <section
          className="card-flat animate-rise px-4 py-3.5"
          style={{ animationDelay: "70ms" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <MicroLabel>Where it sits</MicroLabel>
              <Money value={liveTotal} size="lg" className="mt-1 block" />
            </div>
            <Link
              href="/reports"
              className="text-brand-ink press hover:bg-muted shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold"
            >
              Reports
            </Link>
          </div>
          <p className="text-ink-soft mt-0.5 mb-3 text-[12px]">
            Everything still moving through the workflow
          </p>
          <ShareBar shares={shares} />
        </section>
      </div>

      <div className="grid gap-2.5 px-4 pt-2.5 md:px-0 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-4 lg:pt-4">
        <section className="card-flat animate-rise px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-ink text-[15px] font-semibold tracking-[-0.01em]">
                Requisition flow
              </h2>
              <p className="text-ink-soft mt-0.5 text-[12.5px]">
                {flow === "requested" ? "Raised each month" : "Paid out each month"}
              </p>
            </div>
            {/* One measure at a time — two scales on one axis would lie. */}
            <div className="bg-muted flex shrink-0 rounded-lg p-0.5">
              {(["requested", "disbursed"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFlow(key)}
                  aria-pressed={flow === key}
                  className={cn(
                    "press cursor-pointer rounded-md px-2.5 py-1.5 text-[12.5px] font-medium capitalize",
                    flow === key ? "bg-card text-ink shadow-card" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {key === "requested" ? "Requested" : "Disbursed"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <MonthlyBars points={months} field={flow} />
          </div>
        </section>

        <section className="card-flat animate-rise overflow-hidden" style={{ animationDelay: "70ms" }}>
          <div className="border-hairline flex h-11 items-center justify-between border-b px-4">
            <MicroLabel>Upcoming programmes</MicroLabel>
            <span className="text-ink-faint text-[12px]">{upcoming.length}</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-ink-soft px-4 py-6 text-[13px]">
              Nothing scheduled ahead of today.
            </p>
          ) : (
            <ul className="divide-hairline divide-y">
              {upcoming.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/requisitions/${r.id}`}
                    className="hover:bg-muted/50 press group flex cursor-pointer items-center gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block truncate text-[13.5px] font-semibold">
                        {r.programme}
                      </span>
                      <span className="text-ink-faint mt-0.5 flex items-center gap-1 text-[11.5px]">
                        <CalendarDays className="size-3" strokeWidth={2} aria-hidden />
                        {formatDate(r.programmeDate)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Money value={requisitionTotal(r)} size="sm" className="block" />
                      <StatusBadge status={r.status} className="mt-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="px-4 pt-5 pb-8 md:px-0 lg:pt-6">
        <Link
          href="/requisitions/new"
          className="btn-gradient press-wide group mb-6 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[15.5px] font-semibold text-white shadow-raised hover:brightness-110 lg:h-11 lg:w-fit lg:px-6"
        >
          <Plus className="size-[18px]" strokeWidth={2.6} aria-hidden />
          New Requisition
          <ArrowRight
            className="size-[17px] transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden
          />
        </Link>

        <section className="mt-7 lg:mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-ink text-[17px] font-semibold tracking-[-0.02em]">
              Recent Requests
            </h2>
            <Link
              href="/requisitions"
              className="text-primary hover:text-primary/80 press group flex cursor-pointer items-center gap-1 text-[12.5px] font-semibold"
            >
              View all
              <ChevronRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>

          <div className="space-y-2.5 md:hidden">
            {recent.map((requisition, index) => (
              <RequisitionCard
                key={requisition.id}
                requisition={requisition}
                style={{ animationDelay: `${index * 60}ms` }}
                className="animate-rise"
              />
            ))}
          </div>

          <div className="hidden space-y-1.5 md:block">
            {recent.map((requisition) => (
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
        </section>
      </div>
    </>
  )
}
