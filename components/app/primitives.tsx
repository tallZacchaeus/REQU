import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatAmount } from "@/lib/format"
import { STATUS, TONE_CHIP, TONE_DOT, TONE_TEXT } from "@/lib/status"
import type { RequisitionStatus } from "@/lib/types"

/**
 * Currency is the subject of this app, so it gets its own component: the ₦ is
 * set smaller and lighter than the figure so the number carries the weight.
 */
export function Money({
  value,
  size = "md",
  className,
}: {
  value: number
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const scale = {
    sm: "text-[15px] font-semibold tracking-[-0.01em]",
    md: "amount-md",
    lg: "amount-lg",
  }[size]

  return (
    <span className={cn(scale, "text-ink inline-flex items-baseline gap-[0.12em]", className)}>
      <span className="text-ink-faint text-[0.72em] font-medium">₦</span>
      {formatAmount(value)}
    </span>
  )
}

/**
 * Dot + label for anything in a list. Only `changes_requested` earns a filled
 * chip, which is what makes it findable in a scroll of twenty rows.
 */
export function StatusBadge({
  status,
  forceChip = false,
  className,
}: {
  status: RequisitionStatus
  forceChip?: boolean
  className?: string
}) {
  const meta = STATUS[status]

  if (forceChip || meta.emphasis === "chip") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold",
          TONE_CHIP[meta.tone],
          className,
        )}
      >
        <span className={cn("size-1.5 rounded-full", TONE_DOT[meta.tone])} aria-hidden />
        {meta.label}
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold", className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[meta.tone])} aria-hidden />
      <span className={TONE_TEXT[meta.tone]}>{meta.label}</span>
    </span>
  )
}

export function MicroLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={cn("label-micro", className)}>{children}</p>
}

/** A titled block of content. The rule under the title is the detail layer. */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("card-flat overflow-hidden", className)}>
      <div className="border-hairline flex h-11 items-center justify-between border-b px-4">
        <MicroLabel>{title}</MicroLabel>
        {action}
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  )
}

/** Label above, value below — the standard record row for this app. */
export function DetailRow({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("py-2.5", className)}>
      <dt className="text-ink-faint text-[12px] font-medium">{label}</dt>
      <dd className="text-ink mt-0.5 text-[15px] leading-[1.45]">{value}</dd>
    </div>
  )
}

export function StickyFooter({
  children,
  note,
}: {
  children: React.ReactNode
  note?: React.ReactNode
}) {
  return (
    <div className="border-hairline bg-card sticky bottom-0 z-20 mt-auto border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-bar">
      {note && <p className="text-ink-soft mb-2.5 text-[12px] leading-[1.45]">{note}</p>}
      {children}
    </div>
  )
}

/** Native disclosure — keyboard and screen-reader behaviour for free. */
export function Disclosure({
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string
  meta?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={defaultOpen} className="card-flat group overflow-hidden">
      <summary className="hover:bg-muted/60 flex h-11 cursor-pointer list-none items-center justify-between px-4 transition-colors duration-200 [&::-webkit-details-marker]:hidden">
        <MicroLabel>{title}</MicroLabel>
        <span className="flex items-center gap-2">
          {meta && <span className="text-ink-faint text-[12px]">{meta}</span>}
          <ChevronDown
            className={cn(
              "text-ink-faint size-4 transition-transform duration-200 group-open:rotate-180",
            )}
            aria-hidden
          />
        </span>
      </summary>
      <div className="border-hairline border-t px-4 py-3.5">{children}</div>
    </details>
  )
}
