import { cn } from "@/lib/utils"

/**
 * Three ascending bars — the approval chain a requisition climbs. Geometric
 * rather than illustrative, so it holds up at 20px in a header.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-6", className)} aria-hidden>
      <rect x="3" y="13" width="4" height="8" rx="1.6" fill="currentColor" opacity="0.45" />
      <rect x="10" y="9" width="4" height="12" rx="1.6" fill="currentColor" opacity="0.72" />
      <rect x="17" y="4" width="4" height="17" rx="1.6" fill="currentColor" />
    </svg>
  )
}

export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground relative flex size-12 items-center justify-center rounded-xl",
        className,
      )}
    >
      <LogoMark className="size-6" />
    </span>
  )
}

export function Wordmark() {
  return (
    <span className="flex flex-col">
      <span className="text-ink text-[15px] leading-none font-bold tracking-[0.14em]">CWMS</span>
      <span className="text-ink-faint mt-1.5 text-[10.5px] leading-none font-medium tracking-[0.06em]">
        Youth &amp; Young Adults
      </span>
    </span>
  )
}
