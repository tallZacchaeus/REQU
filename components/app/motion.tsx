"use client"

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"

import { cn } from "@/lib/utils"

import { Money } from "./primitives"

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

const MOTION_QUERY = "(prefers-reduced-motion: reduce)"

/* matchMedia is an external store, so it is read as one rather than copied
   into state from an effect. */
const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(MOTION_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** Honours the system setting; everything here becomes a no-op when set. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  )
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Counts from `from` up to `value`. The server renders the real number, and
 * the count only rewinds once on the client — inside a layout effect, so the
 * final figure never flashes before the animation starts.
 */
export function useCountUp(value: number, { duration = 750, from = 0 } = {}) {
  const [display, setDisplay] = useState(value)
  const reduced = usePrefersReducedMotion()
  const previous = useRef(value)

  useIsoLayoutEffect(() => {
    const start = previous.current === value ? from : previous.current
    previous.current = value

    // A hidden tab throttles rAF, which would otherwise leave the figure
    // frozen at its starting point — wrong data, not just missing motion.
    if (reduced || start === value || document.hidden) {
      setDisplay(value)
      return
    }

    setDisplay(start)
    let frame = 0
    const began = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / duration)
      setDisplay(Math.round(start + (value - start) * easeOut(progress)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    // Belt and braces: whatever happens to the frame loop, the true value is
    // on screen shortly after the animation should have finished.
    const settle = setTimeout(() => setDisplay(value), duration + 250)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(settle)
    }
  }, [value, duration, from, reduced])

  return display
}

/** A metric that arrives at its value rather than appearing at it. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const display = useCountUp(value)
  return (
    <span className={cn("tabular-nums", className)}>{display.toLocaleString("en-NG")}</span>
  )
}

/**
 * Currency that rolls to a new figure and lifts a hair when it lands, so an
 * edit elsewhere on the form is visibly reflected in the total.
 */
export function AnimatedMoney({
  value,
  size = "md",
  className,
}: {
  value: number
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const display = useCountUp(value, { duration: 420 })
  // Keying on the target remounts the node, which restarts the CSS lift. No
  // effect and no state, so nothing cascades.
  return (
    <Money key={value} value={display} size={size} className={cn("animate-emphasis", className)} />
  )
}

/** Placeholder rows shown while persisted state is still being read. */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="card-flat flex items-center gap-3 px-4 py-3.5">
          <span className="skeleton size-10 shrink-0 rounded-full" />
          <span className="flex-1 space-y-2">
            <span className="skeleton block h-3 w-2/5" />
            <span className="skeleton block h-3 w-1/4" />
          </span>
          <span className="skeleton h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
