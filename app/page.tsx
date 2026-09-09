"use client"

import Link from "next/link"
import {
  ArrowRight,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  FileText,
  Files,
  Megaphone,
  Plus,
} from "lucide-react"

import { LogoMark } from "@/components/app/logo"
import { RequisitionCard } from "@/components/app/requisition-card"
import { CURRENT_USER } from "@/lib/data"
import { isMine } from "@/lib/review"
import { useRequisitions } from "@/lib/store"
import { cn } from "@/lib/utils"

const IN_FLIGHT = [
  "under_review",
  "recommended",
  "awaiting_approval",
  "approved",
  "with_finance",
  "reconciliation_review",
]

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
  const { requisitions: all } = useRequisitions()
  const requisitions = all.filter(isMine)

  const pending = requisitions.filter((r) => IN_FLIGHT.includes(r.status)).length
  const closed = requisitions.filter((r) => r.status === "reconciled").length
  const needsAction = requisitions.filter((r) => NEEDS_HOD.includes(r.status))
  const drafts = requisitions.filter((r) => r.status === "draft").length
  const total = requisitions.length || 1

  const recent = [...requisitions]
    .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))
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
              CWMS
            </span>
            <span className="h-7 w-px shrink-0 bg-white/20" aria-hidden />
            <span className="min-w-0 text-[11.5px] leading-[1.35] text-white/65">
              Youth &amp; Young Adults
              <span className="block">Requisition Portal</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-white/75 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <Bell className="size-[18px]" strokeWidth={1.9} aria-hidden />
              {needsAction.length > 0 && (
                <span className="bg-st-action absolute top-1.5 right-1.5 size-2 rounded-full ring-2 ring-[#123a68]" />
              )}
            </button>
            <Link
              href="/profile"
              aria-label="Your profile"
              className="group flex cursor-pointer items-center gap-0.5"
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
            className="on-deep-panel animate-rise group mt-5 flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors duration-200 hover:bg-white/16 lg:mt-6"
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

      {/* ---- Stats straddle the crown's edge ---- */}
      <div className="-mt-9 grid grid-cols-2 gap-2.5 px-4 md:mt-5 md:gap-3 lg:grid-cols-4 lg:gap-4 md:px-0">
        <StatCard
          icon={FileText}
          value={pending}
          total={total}
          label="In progress"
          href="/requisitions?filter=review"
          tone="motion"
          delay={0}
        />
        <StatCard
          icon={CircleCheck}
          value={closed}
          total={total}
          label="Closed"
          href="/requisitions?filter=closed"
          tone="good"
          delay={60}
        />
        <StatCard
          icon={Clock}
          value={needsAction.length}
          total={total}
          label="Needs action"
          href="/requisitions?filter=action"
          tone="action"
          delay={120}
        />
        <StatCard
          icon={Files}
          value={drafts}
          total={total}
          label="Drafts"
          href="/requisitions?filter=drafts"
          tone="neutral"
          delay={180}
        />
      </div>

      <div className="px-4 pt-5 pb-8 md:px-0 lg:pt-6">
        <Link
          href="/requisitions/new"
          className="btn-gradient group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[15.5px] font-semibold text-white shadow-raised transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.99] lg:h-11 lg:w-fit lg:px-6"
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
              className="text-primary group flex cursor-pointer items-center gap-1 text-[12.5px] font-semibold"
            >
              View all
              <ChevronRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>

          <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {recent.map((requisition, index) => (
              <RequisitionCard
                key={requisition.id}
                requisition={requisition}
                style={{ animationDelay: `${index * 60}ms` }}
                className="animate-rise"
              />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

const TONE_STYLES = {
  motion: { tile: "bg-st-motion-bg text-st-motion", bar: "bg-st-motion" },
  good: { tile: "bg-st-good-bg text-st-good", bar: "bg-st-good" },
  action: { tile: "bg-st-action-bg text-st-action", bar: "bg-st-action" },
  neutral: { tile: "bg-st-neutral-bg text-st-neutral", bar: "bg-st-neutral" },
} as const

function StatCard({
  icon: Icon,
  value,
  total,
  label,
  href,
  tone,
  delay,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  value: number
  total: number
  label: string
  href: string
  tone: keyof typeof TONE_STYLES
  delay: number
}) {
  const styles = TONE_STYLES[tone]
  const share = Math.round((value / total) * 100)

  return (
    <Link
      href={href}
      style={{ animationDelay: `${delay}ms` }}
      className="card-flat tap-card animate-rise group hover:border-ink-faint/30 cursor-pointer px-3.5 py-3"
    >
      <div className="flex items-start justify-between">
        <span
          className={cn("flex size-9 items-center justify-center rounded-xl", styles.tile)}
          aria-hidden
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <ChevronRight
          className="text-ink-faint size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      <p className="text-ink mt-2 text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      <p className="text-ink-soft mt-1 text-[12.5px]">{label}</p>

      {/* Share of all requisitions, drawn in on mount. */}
      <div className="bg-hairline mt-2.5 h-[3px] w-full overflow-hidden rounded-full">
        <span
          className={cn("animate-grow block h-full origin-left rounded-full", styles.bar)}
          style={{
            width: `${Math.max(share, value > 0 ? 12 : 0)}%`,
            animationDelay: `${delay + 150}ms`,
          }}
          aria-hidden
        />
      </div>
    </Link>
  )
}
