"use client"

import Link from "next/link"
import { Bell, ChevronRight, Plus, TriangleAlert } from "lucide-react"

import { MicroLabel } from "@/components/app/primitives"
import { RequisitionCard } from "@/components/app/requisition-card"
import { CURRENT_USER } from "@/lib/data"
import { useRequisitions } from "@/lib/store"

const IN_FLIGHT = ["under_review", "recommended", "awaiting_approval", "with_finance"]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  const { requisitions } = useRequisitions()

  const pending = requisitions.filter((r) => IN_FLIGHT.includes(r.status)).length
  const approved = requisitions.filter(
    (r) => r.status === "approved" || r.status === "disbursed",
  ).length
  const needsAction = requisitions.filter((r) => r.status === "changes_requested")
  const drafts = requisitions.filter((r) => r.status === "draft").length

  const recent = [...requisitions]
    .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))
    .slice(0, 3)

  return (
    <>
      <header className="border-hairline bg-card sticky top-0 z-20 flex h-14 items-center justify-between border-b px-4">
        <span className="text-ink text-[15px] font-semibold tracking-[-0.01em]">
          Requisition Portal
        </span>
        <button
          type="button"
          aria-label="Notifications"
          className="text-ink-soft hover:bg-muted relative -mr-2 flex size-10 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200"
        >
          <Bell className="size-[19px]" strokeWidth={1.8} aria-hidden />
          {needsAction.length > 0 && (
            <span className="bg-st-action ring-card absolute top-2 right-2 size-2 rounded-full ring-2" />
          )}
        </button>
      </header>

      <div className="space-y-5 px-4 pt-5 pb-8">
        {/* Greeting — plain on the canvas, so the first card below has lift. */}
        <div>
          <p className="text-ink-soft text-[13px]" suppressHydrationWarning>
            {greeting()}
          </p>
          <h2 className="text-ink mt-0.5 text-[22px] leading-tight font-semibold tracking-[-0.02em]">
            {CURRENT_USER.shortName}
          </h2>
          <p className="text-ink-faint mt-1 text-[12.5px]">
            {CURRENT_USER.department} · {CURRENT_USER.unit}
          </p>
        </div>

        {/* The one thing only the HOD can unblock gets the only warm colour. */}
        {needsAction.length > 0 && (
          <Link
            href={`/requisitions/${needsAction[0].id}`}
            className="border-st-action/25 bg-st-action-bg hover:border-st-action/45 flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors duration-200"
          >
            <TriangleAlert className="text-st-action size-[18px] shrink-0" strokeWidth={2} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-st-action text-[13.5px] leading-tight font-semibold">
                {needsAction.length} requisition{needsAction.length > 1 ? "s need" : " needs"} your
                attention
              </p>
              <p className="text-st-action/80 mt-0.5 truncate text-[12px]">
                {needsAction[0].programme} — changes requested
              </p>
            </div>
            <ChevronRight className="text-st-action/60 size-4 shrink-0" aria-hidden />
          </Link>
        )}

        {/* Counts as a single ruled block, not four floating tiles. */}
        <div className="card-flat grid grid-cols-2">
          <Stat label="In progress" value={pending} className="border-hairline border-r border-b" />
          <Stat label="Approved" value={approved} className="border-hairline border-b" />
          <Stat label="Needs action" value={needsAction.length} className="border-hairline border-r" accent={needsAction.length > 0} />
          <Stat label="Drafts" value={drafts} />
        </div>

        <Link
          href="/requisitions/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition-colors duration-200"
        >
          <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden />
          New Requisition
        </Link>

        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <MicroLabel>Recent Requests</MicroLabel>
            <Link
              href="/requisitions"
              className="text-primary cursor-pointer text-[12.5px] font-semibold hover:underline"
            >
              View all
            </Link>
          </div>
          {recent.map((requisition) => (
            <RequisitionCard key={requisition.id} requisition={requisition} />
          ))}
        </section>
      </div>
    </>
  )
}

function Stat({
  label,
  value,
  className,
  accent = false,
}: {
  label: string
  value: number
  className?: string
  accent?: boolean
}) {
  return (
    <div className={`px-4 py-3.5 ${className ?? ""}`}>
      <p
        className={`text-[26px] leading-none font-semibold tracking-[-0.03em] ${
          accent ? "text-st-action" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="text-ink-soft mt-1.5 text-[12.5px]">{label}</p>
    </div>
  )
}
