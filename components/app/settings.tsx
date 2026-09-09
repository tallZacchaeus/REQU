"use client"

import { ChevronDown, ChevronRight, Lock } from "lucide-react"

import { cn } from "@/lib/utils"

import { MicroLabel } from "./primitives"
import { Switch } from "./switch"

export function ProfileStat({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className={cn("px-3 py-3.5 text-center", className)}>
      <p className="text-ink text-[24px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      <p className="text-ink-soft mt-1.5 text-[12px]">{label}</p>
    </div>
  )
}

/**
 * Same shape as the disclosure on the requisition detail screen — h-11 header,
 * micro-label, rotating chevron — but controlled, because the header can carry
 * an action such as Edit.
 */
export function Group({
  title,
  meta,
  open,
  onToggle,
  action,
  children,
}: {
  title: string
  meta?: string
  open: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="card-flat overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onToggle()
          }
        }}
        className="hover:bg-muted/60 flex h-11 cursor-pointer items-center justify-between gap-2 px-4 transition-colors duration-200 select-none"
      >
        <MicroLabel>{title}</MicroLabel>
        <span className="flex items-center gap-2">
          {action}
          {meta && !action && <span className="text-ink-faint text-[12px]">{meta}</span>}
          <ChevronDown
            className={cn(
              "text-ink-faint size-4 shrink-0 transition-transform duration-300",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </div>

      {/* 0fr -> 1fr animates the real content height with nothing measured. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-hairline border-t px-4 py-3">{children}</div>
        </div>
      </div>
    </section>
  )
}

export function Field({
  label,
  value,
  locked = false,
}: {
  label: string
  value: string
  locked?: boolean
}) {
  return (
    <div className="py-2.5">
      <dt className="text-ink-faint flex items-center gap-1.5 text-[12px] font-medium">
        {label}
        {locked && <Lock className="size-3" strokeWidth={2.2} aria-label="Read only" />}
      </dt>
      <dd
        className={cn("mt-0.5 text-[15px] leading-[1.45]", locked ? "text-ink-soft" : "text-ink")}
      >
        {value}
      </dd>
    </div>
  )
}

export function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: string
  href: string
}) {
  return (
    <a
      href={href}
      className="border-hairline hover:border-ink-faint/40 mb-2 flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors duration-200 last:mb-0"
    >
      <Icon className="text-ink-faint size-4 shrink-0" strokeWidth={1.9} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="text-ink-faint block text-[11.5px]">{label}</span>
        <span className="text-ink block truncate text-[14px]">{value}</span>
      </span>
      <ChevronRight className="text-ink-faint size-4 shrink-0" aria-hidden />
    </a>
  )
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-ink text-[14px] font-medium">{label}</p>
        <p className="text-ink-faint mt-0.5 text-[12px] leading-[1.45]">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

export function SheetAction({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-muted flex h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-[14.5px] font-medium transition-colors duration-200",
        destructive ? "text-st-bad" : "text-ink",
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.9} />
      {label}
    </button>
  )
}

export function SheetRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-ink-soft text-[13px]">{label}</dt>
      <dd className="text-ink text-right text-[13px] font-medium">{value}</dd>
    </div>
  )
}
