"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Bottom sheet scoped to the app column. Dismissed by backdrop, Escape, or on
 * touch by dragging it down past a threshold.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  // Adjusting state during render on a prop change keeps the sheet mounted
  // through its exit animation without an effect that cascades renders.
  const [wasOpen, setWasOpen] = useState(open)
  const [mounted, setMounted] = useState(open)
  const [drag, setDrag] = useState(0)
  const dragFrom = useRef<number | null>(null)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setMounted(true)
      setDrag(0)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center",
        // Inert the moment it starts closing. If `animationend` never fires —
        // a throttled background tab will do it — the sheet must not be left
        // holding an invisible backdrop over the page.
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className={cn(
          "bg-ink/45 absolute inset-0 cursor-pointer backdrop-blur-[2px]",
          open ? "animate-fade" : "animate-toast-out",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onAnimationEnd={() => {
          if (!open) setMounted(false)
        }}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
        className={cn(
          "bg-card relative mt-auto w-full max-w-[430px] rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]",
          open ? "animate-sheet-in" : "animate-sheet-out",
          drag === 0 && "transition-transform duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "lg:mb-auto lg:self-center lg:rounded-2xl",
        )}
      >
        {/* The grabber is the drag handle, so the gesture starts where it looks
            like it should. */}
        <div
          className="flex cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
          onPointerDown={(event) => {
            dragFrom.current = event.clientY
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (dragFrom.current === null) return
            setDrag(Math.max(0, event.clientY - dragFrom.current))
          }}
          onPointerUp={() => {
            const travelled = drag
            dragFrom.current = null
            setDrag(0)
            if (travelled > 90) onClose()
          }}
        >
          <span className="bg-hairline h-1 w-9 rounded-full" aria-hidden />
        </div>
        <h2 className="text-ink border-hairline border-b px-5 pt-2 pb-3.5 text-[16px] font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        <div className="px-5 pt-4">{children}</div>
      </div>
    </div>
  )
}
