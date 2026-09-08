"use client"

import { useEffect } from "react"

import { cn } from "@/lib/utils"

/** Bottom sheet scoped to the app column, dismissed by backdrop or Escape. */
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade absolute inset-0 cursor-pointer bg-ink/45 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "bg-card relative mt-auto w-full max-w-[430px] rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]",
          "[animation:sheet-up_.32s_cubic-bezier(.22,1,.36,1)_both]",
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1">
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
