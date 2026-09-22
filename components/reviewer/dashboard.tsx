"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { LogoMark } from "@/components/app/logo"
import { ROLE_LABEL } from "@/lib/data"
import { MobileBell } from "@/components/app/notifications"
import { MobileSearchButton } from "@/components/app/topbar"
import { AreaTrend, MonthlyBars, ShareBar } from "@/components/app/charts"
import { MicroLabel, Money, StatusBadge } from "@/components/app/primitives"
import { deskSplit, monthlySeries, trend } from "@/lib/series"
import type { StageKey } from "@/lib/types"
import { byLongestWaiting, visibleToReviewer, waitingDays } from "@/lib/review"
import type { ReviewerConfig } from "@/lib/roles"
import { useSession } from "@/lib/session"
import { useRequisitions } from "@/lib/store"
import { requisitionTotal } from "@/lib/types"
import { cn } from "@/lib/utils"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function ReviewerDashboard({ config }: { config: ReviewerConfig }) {
  const { account, role } = useSession()
  const [flow, setFlow] = useState<"requested" | "cleared">("requested")
  const { requisitions } = useRequisitions()

  const visible = requisitions.filter(visibleToReviewer)
  const queue = visible.filter(config.awaits).sort(byLongestWaiting)
  const queueValue = queue.reduce((sum, r) => sum + requisitionTotal(r), 0)

  // Each desk clears at its own stage, so the flow chart counts that stamp.
  const stamp: StageKey =
    config.role === "ayp" ? "recommended" : config.role === "nyp" ? "approval" : "disbursement"
  const months = monthlySeries(visible, { stamp })
  const shares = deskSplit(visible, config.awaits, config.cleared)
  const swing = trend(months)
  const arrivedTotal = months.reduce((sum, m) => sum + m.requested, 0)
  const oldest = queue[0]

  return (
    <>
      <header className="header-deep rounded-b-[28px] px-4 pt-4 pb-14 md:rounded-2xl md:px-7 md:pt-6 md:pb-7 lg:px-8 lg:pt-7 lg:pb-8">
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/15">
              <LogoMark className="size-[18px]" />
            </span>
            <span className="text-[15px] leading-none font-bold tracking-[0.12em] text-white">
              Requisition
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <MobileSearchButton />
            <MobileBell />
            <Link
              href={config.profileHref}
              aria-label="Your profile"
              className="press group flex cursor-pointer items-center gap-0.5"
            >
              <span className="bg-brand/25 flex size-9 items-center justify-center rounded-full text-[12.5px] font-semibold text-white ring-2 ring-white/25 transition-all duration-200 group-hover:ring-white/50">
                {account.initials}
              </span>
              <ChevronDown className="size-3.5 text-white/50" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="animate-rise mt-7 lg:mt-0 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div>
            <p className="text-[13.5px] text-white/65" suppressHydrationWarning>
              {greeting()},
            </p>
            <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.025em] text-white lg:text-[30px]">
              {(account.shortName || account.name)}
            </h1>
            <p className="mt-1.5 text-[12.5px] text-white/55">
              {ROLE_LABEL[role]} · {account.scope}
            </p>
          </div>

          {oldest && (
            <p className="mt-4 hidden text-right lg:block">
              <span className="block text-[12px] tracking-[0.06em] text-white/50 uppercase">
                Longest wait
              </span>
              <span className="mt-1 block text-[15px] font-semibold text-white">
                {oldest.programme}
              </span>
              <span className="text-[12.5px] text-white/60">{waitingDays(oldest)} days</span>
            </p>
          )}
        </div>

        {oldest ? (
          <Link
            href={config.queueHref}
            style={{ animationDelay: "80ms" }}
            className="on-deep-panel animate-rise press-wide group mt-5 flex cursor-pointer items-center gap-3 px-3.5 py-3 hover:bg-white/16 lg:mt-6"
          >
            <span className="bg-brand/25 flex size-9 shrink-0 items-center justify-center rounded-lg text-white">
              <ClipboardCheck className="size-[17px]" strokeWidth={2} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] leading-tight font-semibold text-white">
                {queue.length} {config.awaitingCopy}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-white/60">
                Longest wait: {oldest.programme} — {waitingDays(oldest)} days
              </span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-white/70 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ) : (
          <div className="on-deep-panel animate-rise mt-5 flex items-center gap-3 px-3.5 py-3 lg:mt-6">
            <span className="bg-st-good/30 flex size-9 shrink-0 items-center justify-center rounded-lg text-white">
              <CircleCheck className="size-[17px]" strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[13.5px] font-semibold text-white">Your desk is clear</span>
          </div>
        )}
      </header>

      {/* Same two questions the HOD dashboard answers, asked of a desk:
          how much is arriving, and how much of it is yours. */}
      <div className="-mt-9 grid gap-2.5 px-4 md:px-0 lg:mt-5 lg:grid-cols-2 lg:gap-4">
        <section className="card-flat animate-rise px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <MicroLabel>Reaching your desk</MicroLabel>
              <Money value={arrivedTotal} size="lg" className="mt-1 block" />
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
          className="card-flat animate-rise flex flex-col px-4 py-3.5"
          style={{ animationDelay: "70ms" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <MicroLabel>Awaiting you</MicroLabel>
              <Money value={queueValue} size="lg" className="mt-1 block" />
            </div>
            <Link
              href={`${config.home}/reports`}
              className="text-brand-ink press hover:bg-muted shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold"
            >
              Reports
            </Link>
          </div>
          <p className="text-ink-soft mt-0.5 text-[12px]">
            {queue.length ? `${queue.length} ${config.awaitingCopy}` : "Nothing waiting on you"}
          </p>

          <div className="mt-auto pt-4">
            <MicroLabel className="mb-2.5">Breakdown</MicroLabel>
            <ShareBar shares={shares} />
          </div>
        </section>
      </div>

      <div className="grid gap-2.5 px-4 pt-2.5 md:px-0 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-4 lg:pt-4">
        <section className="card-flat animate-rise px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-ink text-[15px] font-semibold tracking-[-0.01em]">Desk flow</h2>
              <p className="text-ink-soft mt-0.5 text-[12.5px]">
                {flow === "requested" ? "Arrived each month" : "Cleared by you each month"}
              </p>
            </div>
            <div className="bg-muted flex shrink-0 rounded-lg p-0.5">
              {(["requested", "cleared"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFlow(key)}
                  aria-pressed={flow === key}
                  className={cn(
                    "press cursor-pointer rounded-md px-2.5 py-1.5 text-[12.5px] font-medium",
                    flow === key ? "bg-card text-ink shadow-card" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {key === "requested" ? "Arrived" : "Cleared"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <MonthlyBars points={months} field={flow} />
          </div>
        </section>

        <section
          className="card-flat animate-rise flex flex-col overflow-hidden"
          style={{ animationDelay: "70ms" }}
        >
          <div className="border-hairline flex h-11 shrink-0 items-center justify-between border-b px-4">
            <MicroLabel>Awaiting your review</MicroLabel>
            <Link
              href={config.queueHref}
              className="text-brand-ink press group flex cursor-pointer items-center gap-1 text-[12px] font-semibold"
            >
              View all
              <ChevronRight
                className="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
          {queue.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
              <CircleCheck className="text-st-good size-6" strokeWidth={1.7} aria-hidden />
              <p className="text-ink mt-3 text-[13.5px] font-semibold">Your desk is clear</p>
            </div>
          ) : (
            <ul className="divide-hairline flex-1 divide-y">
              {queue.slice(0, 4).map((r) => (
                <li key={r.id} className="flex">
                  <Link
                    href={config.detailHref(r.id)}
                    className="hover:bg-muted/50 press group flex flex-1 cursor-pointer items-center gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block truncate text-[13.5px] font-semibold">
                        {r.programme}
                      </span>
                      <span className="text-ink-faint mt-0.5 block truncate text-[11.5px]">
                        {r.requester.name} · {waitingDays(r)}d wait
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
    </>
  )
}
