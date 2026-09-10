"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { Check, Info, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

type Tone = "good" | "info" | "warn"

interface Toast {
  id: number
  message: string
  tone: Tone
  leaving?: boolean
}

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null)

const ICONS = { good: Check, info: Info, warn: TriangleAlert }
const TONES: Record<Tone, string> = {
  good: "border-st-good/25 bg-st-good-bg text-st-good",
  info: "border-hairline bg-card text-ink",
  warn: "border-st-action/25 bg-st-action-bg text-st-action",
}

let nextId = 0

/**
 * Actions that navigate away used to land silently on another screen. A toast
 * carries the confirmation across the transition.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, tone: Tone = "good") => {
    const id = nextId++
    setToasts((current) => [...current, { id, message, tone }])
    // Two timers: one starts the exit, the second unmounts once it has run.
    setTimeout(
      () => setToasts((c) => c.map((t) => (t.id === id ? { ...t, leaving: true } : t))),
      3200,
    )
    setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3500)
  }, [])

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end lg:px-0"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone]
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-[380px] items-center gap-2.5 rounded-xl border px-3.5 py-3 shadow-raised",
                TONES[toast.tone],
                toast.leaving ? "animate-toast-out" : "animate-toast-in",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2.4} aria-hidden />
              <span className="text-[13.5px] leading-tight font-medium">{toast.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const push = useContext(ToastContext)
  if (!push) throw new Error("useToast must be used inside <ToastProvider>")
  return push
}
