"use client"

import { cn } from "@/lib/utils"

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[27px] w-[46px] shrink-0 cursor-pointer rounded-full transition-colors duration-200",
        checked ? "bg-brand" : "bg-ink-faint/35",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] size-[21px] rounded-full bg-white shadow-sm",
          // Easing with a touch of overshoot — the knob settles rather than slides.
          "transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(.34,1.56,.64,1)]",
          checked ? "translate-x-[22px]" : "translate-x-[3px]",
        )}
        aria-hidden
      />
    </button>
  )
}
