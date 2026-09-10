"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Bell, CircleCheck, Clock, TriangleAlert } from "lucide-react"

import { deskFor } from "@/lib/desk"
import { formatDateShort } from "@/lib/format"
import { STATUS } from "@/lib/status"
import { useRequisitions } from "@/lib/store"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

/**
 * Derived, not stored: what is waiting on this person right now, then the most
 * recent things that happened on records they can see. Nothing invented.
 */
function useFeed() {
  const { requisitions } = useRequisitions()
  const { role } = useSession()
  const desk = useMemo(() => deskFor(role), [role])

  return useMemo(() => {
    const visible = requisitions.filter(desk.visible)
    const waiting = visible
      .filter(desk.needsMe)
      .sort((a, b) => (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt))

    const recent = visible
      .flatMap((r) => r.activity.map((entry) => ({ entry, requisition: r })))
      .sort((a, b) => b.entry.date.localeCompare(a.entry.date))
      .slice(0, 5)

    return { waiting, recent, hrefFor: desk.hrefFor }
  }, [requisitions, desk])
}

export function NotificationBell({
  open,
  onToggle,
  onDark = false,
}: {
  open: boolean
  onToggle: () => void
  onDark?: boolean
}) {
  const { waiting } = useFeed()

  return (
    <button
      type="button"
      aria-label={
        waiting.length ? `Notifications, ${waiting.length} need you` : "Notifications"
      }
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        "press relative flex size-10 cursor-pointer items-center justify-center rounded-xl",
        onDark
          ? "text-white/75 hover:bg-white/10 hover:text-white"
          : "border-hairline bg-card text-ink-soft hover:border-ink-faint/40 hover:text-ink border",
      )}
    >
      <Bell className="size-[18px]" strokeWidth={1.9} aria-hidden />
      {waiting.length > 0 && (
        <span
          className={cn(
            "bg-st-bad absolute top-1.5 right-1.5 size-2 rounded-full",
            onDark ? "ring-2 ring-[#123a68]" : "ring-card ring-2",
          )}
        />
      )}
    </button>
  )
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { waiting, recent, hrefFor } = useFeed()
  const panel = useRef<HTMLDivElement>(null)

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div
        ref={panel}
        className="border-hairline bg-card animate-rise absolute top-full right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border shadow-raised"
      >
        <div className="border-hairline flex h-11 items-center justify-between border-b px-4">
          <p className="label-micro">Notifications</p>
          {waiting.length > 0 && (
            <span className="bg-st-bad-bg text-st-bad rounded-md px-1.5 py-0.5 text-[11px] font-bold">
              {waiting.length}
            </span>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {waiting.length > 0 && (
            <ul className="border-hairline divide-hairline divide-y border-b">
              {waiting.map((r) => {
                const returned = r.status === "changes_requested"
                const Icon = returned ? TriangleAlert : Clock
                return (
                  <li key={r.id}>
                    <Link
                      href={hrefFor(r)}
                      onClick={onClose}
                      className="hover:bg-muted/60 flex cursor-pointer gap-3 px-4 py-3 transition-colors duration-150"
                    >
                      <span className="bg-st-action-bg text-st-action mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="size-3.5" strokeWidth={2.2} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="text-ink block truncate text-[13.5px] font-semibold">
                          {r.programme}
                        </span>
                        <span className="text-ink-soft mt-0.5 block text-[12px] leading-[1.45]">
                          {STATUS[r.status].detail}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="label-micro px-4 pt-3 pb-1.5">Recent activity</p>
          {recent.length === 0 ? (
            <p className="text-ink-faint px-4 pb-4 text-[12.5px]">Nothing yet.</p>
          ) : (
            <ul className="pb-2">
              {recent.map(({ entry, requisition }) => (
                <li key={`${requisition.id}-${entry.id}`}>
                  <Link
                    href={hrefFor(requisition)}
                    onClick={onClose}
                    className="hover:bg-muted/60 flex cursor-pointer gap-3 px-4 py-2.5 transition-colors duration-150"
                  >
                    <CircleCheck
                      className="text-ink-faint mt-0.5 size-3.5 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="text-ink block text-[12.5px] leading-[1.45]">
                        <span className="font-medium">{entry.action}</span> ·{" "}
                        <span className="text-ink-soft">{requisition.programme}</span>
                      </span>
                      <span className="text-ink-faint block text-[11.5px]">
                        {entry.actor} · {formatDateShort(entry.date)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

/** Crown-header bell that owns its own panel state. */
export function MobileBell() {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <NotificationBell open={open} onToggle={() => setOpen((o) => !o)} onDark />
      <NotificationPanel open={open} onClose={() => setOpen(false)} />
    </span>
  )
}
