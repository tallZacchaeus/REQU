"use client"

import Link from "next/link"
import { ArrowRight, Bell, ChevronDown, ChevronRight, ClipboardCheck, CircleCheck, Undo2, Wallet } from "lucide-react"

import { LogoMark } from "@/components/app/logo"
import { Money } from "@/components/app/primitives"
import { ReviewCard } from "@/components/app/review-card"
import { AYP_USER } from "@/lib/data"
import {
  byLongestWaiting,
  isAwaitingReview,
  visibleToAyp,
  waitingDays,
  wasRecommended,
  wasReturned,
} from "@/lib/review"
import { useRequisitions } from "@/lib/store"
import { requisitionTotal } from "@/lib/types"
import { cn } from "@/lib/utils"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function AypDashboard() {
  const { requisitions } = useRequisitions()

  const visible = requisitions.filter(visibleToAyp)
  const queue = visible.filter(isAwaitingReview).sort(byLongestWaiting)
  const recommended = visible.filter(wasRecommended).length
  const returned = visible.filter(wasReturned).length
  const queueValue = queue.reduce((sum, r) => sum + requisitionTotal(r), 0)
  const oldest = queue[0]
  const total = visible.length || 1

  return (
    <>
      <header className="header-deep rounded-b-[28px] px-4 pt-4 pb-14">
        <div className="flex items-center justify-between gap-3">
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
              <span className="block">Review Desk</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-white/75 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <Bell className="size-[18px]" strokeWidth={1.9} aria-hidden />
              {queue.length > 0 && (
                <span className="bg-st-action absolute top-1.5 right-1.5 size-2 rounded-full ring-2 ring-[#123a68]" />
              )}
            </button>
            <Link
              href="/ayp/profile"
              aria-label="Your profile"
              className="group flex cursor-pointer items-center gap-0.5"
            >
              <span className="bg-brand/25 flex size-9 items-center justify-center rounded-full text-[12.5px] font-semibold text-white ring-2 ring-white/25 transition-all duration-200 group-hover:ring-white/50">
                {AYP_USER.initials}
              </span>
              <ChevronDown className="size-3.5 text-white/50" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="animate-rise mt-7">
          <p className="text-[13.5px] text-white/65" suppressHydrationWarning>
            {greeting()},
          </p>
          <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.025em] text-white">
            {AYP_USER.shortName}
          </h1>
          <p className="mt-1.5 text-[12.5px] text-white/55">
            {AYP_USER.role} · {AYP_USER.unit}
          </p>
        </div>

        {oldest ? (
          <Link
            href="/ayp/queue"
            style={{ animationDelay: "80ms" }}
            className="on-deep-panel animate-rise group mt-5 flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors duration-200 hover:bg-white/16"
          >
            <span className="bg-brand/25 flex size-9 shrink-0 items-center justify-center rounded-lg text-white">
              <ClipboardCheck className="size-[17px]" strokeWidth={2} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] leading-tight font-semibold text-white">
                {queue.length} awaiting your recommendation
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
          <div className="on-deep-panel animate-rise mt-5 flex items-center gap-3 px-3.5 py-3">
            <span className="bg-st-good/30 flex size-9 shrink-0 items-center justify-center rounded-lg text-white">
              <CircleCheck className="size-[17px]" strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[13.5px] font-semibold text-white">
              Your queue is clear
            </span>
          </div>
        )}
      </header>

      <div className="-mt-9 grid grid-cols-2 gap-2.5 px-4">
        <Tile
          icon={ClipboardCheck}
          label="Awaiting you"
          tone="action"
          href="/ayp/queue?filter=awaiting"
          delay={0}
          value={queue.length}
          share={queue.length / total}
        />
        <Tile
          icon={Wallet}
          label="Value in queue"
          tone="motion"
          href="/ayp/queue?filter=awaiting"
          delay={60}
          money={queueValue}
          share={queue.length ? 1 : 0}
        />
        <Tile
          icon={CircleCheck}
          label="Recommended"
          tone="good"
          href="/ayp/queue?filter=recommended"
          delay={120}
          value={recommended}
          share={recommended / total}
        />
        <Tile
          icon={Undo2}
          label="Returned"
          tone="neutral"
          href="/ayp/queue?filter=returned"
          delay={180}
          value={returned}
          share={returned / total}
        />
      </div>

      <div className="px-4 pt-6 pb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-ink text-[17px] font-semibold tracking-[-0.02em]">
            Awaiting your review
          </h2>
          <Link
            href="/ayp/queue"
            className="text-primary group flex cursor-pointer items-center gap-1 text-[12.5px] font-semibold"
          >
            View all
            <ChevronRight
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="border-hairline flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
            <CircleCheck className="text-st-good size-6" strokeWidth={1.7} aria-hidden />
            <p className="text-ink mt-3 text-[14px] font-semibold">Nothing waiting on you</p>
            <p className="text-ink-soft mt-1 text-[13px] leading-[1.5]">
              Every submitted requisition has been actioned.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {queue.slice(0, 4).map((requisition, index) => (
              <ReviewCard
                key={requisition.id}
                requisition={requisition}
                className="animate-rise"
                style={{ animationDelay: `${index * 60}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const TONES = {
  motion: { tile: "bg-st-motion-bg text-st-motion", bar: "bg-st-motion" },
  good: { tile: "bg-st-good-bg text-st-good", bar: "bg-st-good" },
  action: { tile: "bg-st-action-bg text-st-action", bar: "bg-st-action" },
  neutral: { tile: "bg-st-neutral-bg text-st-neutral", bar: "bg-st-neutral" },
} as const

function Tile({
  icon: Icon,
  label,
  tone,
  href,
  delay,
  value,
  money,
  share,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  tone: keyof typeof TONES
  href: string
  delay: number
  value?: number
  money?: number
  share: number
}) {
  const styles = TONES[tone]
  const pct = Math.round(share * 100)

  return (
    <Link
      href={href}
      style={{ animationDelay: `${delay}ms` }}
      className="card-flat tap-card animate-rise group hover:border-ink-faint/30 cursor-pointer px-3.5 py-3"
    >
      <div className="flex items-start justify-between">
        <span className={cn("flex size-9 items-center justify-center rounded-xl", styles.tile)} aria-hidden>
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <ChevronRight
          className="text-ink-faint size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      {money === undefined ? (
        <p className="text-ink mt-2 text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
          {value}
        </p>
      ) : (
        <Money value={money} size="md" className="mt-2.5 block" />
      )}
      <p className="text-ink-soft mt-1 text-[12.5px]">{label}</p>

      <div className="bg-hairline mt-2.5 h-[3px] w-full overflow-hidden rounded-full">
        <span
          className={cn("animate-grow block h-full origin-left rounded-full", styles.bar)}
          style={{ width: `${Math.max(pct, share > 0 ? 12 : 0)}%`, animationDelay: `${delay + 150}ms` }}
          aria-hidden
        />
      </div>
    </Link>
  )
}
