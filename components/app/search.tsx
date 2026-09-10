"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CornerDownLeft, Search as SearchIcon } from "lucide-react"

import { deskFor, matchesQuery } from "@/lib/desk"
import { formatDateShort } from "@/lib/format"
import { useRequisitions } from "@/lib/store"
import { useSession } from "@/lib/session"
import { requisitionTotal } from "@/lib/types"
import { cn } from "@/lib/utils"

import { Money, StatusBadge } from "./primitives"

/** The bar's search field. Opens the palette; ⌘K does the same from anywhere. */
export function SearchTrigger({ onOpen, label }: { onOpen: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="border-hairline bg-canvas hover:border-ink-faint/40 hover:bg-card press flex h-10 w-full max-w-[440px] cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-left"
    >
      <SearchIcon className="text-ink-faint size-4 shrink-0" strokeWidth={2} aria-hidden />
      <span className="text-ink-faint flex-1 truncate text-[13.5px]">{label}</span>
      <kbd className="border-hairline bg-card text-ink-faint hidden h-6 items-center rounded-md border px-1.5 font-sans text-[11px] font-medium sm:flex">
        ⌘K
      </kbd>
    </button>
  )
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { requisitions } = useRequisitions()
  const { role } = useSession()
  const desk = useMemo(() => deskFor(role), [role])

  const [query, setQuery] = useState("")
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const results = useMemo(
    () =>
      requisitions
        .filter(desk.visible)
        .filter((r) => matchesQuery(r, query))
        .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))
        .slice(0, 8),
    [requisitions, desk, query],
  )

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  const go = (index: number) => {
    const hit = results[index]
    if (!hit) return
    onClose()
    setQuery("")
    router.push(desk.hrefFor(hit))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="bg-ink/40 animate-fade absolute inset-0 cursor-pointer backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search requisitions"
        className="bg-card border-hairline animate-rise relative w-full max-w-[560px] overflow-hidden rounded-2xl border shadow-raised"
      >
        <div className="border-hairline flex h-13 items-center gap-3 border-b px-4">
          <SearchIcon className="text-ink-faint size-[18px] shrink-0" strokeWidth={2} aria-hidden />
          <input
            ref={input}
            value={query}
            placeholder="Programme, reference, person or status…"
            onChange={(event) => {
              setQuery(event.target.value)
              setCursor(0)
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose()
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setCursor((c) => Math.min(c + 1, results.length - 1))
              }
              if (event.key === "ArrowUp") {
                event.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              }
              if (event.key === "Enter") go(cursor)
            }}
            className="text-ink placeholder:text-ink-faint/80 h-full flex-1 bg-transparent text-[15px] outline-none"
          />
          <kbd className="border-hairline text-ink-faint hidden h-6 items-center rounded-md border px-1.5 font-sans text-[11px] sm:flex">
            Esc
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="text-ink-soft px-3 py-8 text-center text-[13.5px]">
              Nothing matches <span className="text-ink font-medium">{query}</span>.
            </p>
          ) : (
            <ul>
              {results.map((r, index) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => go(index)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150",
                      index === cursor ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block truncate text-[14px] font-semibold">
                        {r.programme}
                      </span>
                      <span className="text-ink-faint mt-0.5 block truncate text-[11.5px]">
                        <span className="font-mono">{r.reference}</span> · {r.requester.name} ·{" "}
                        {formatDateShort(r.submittedAt ?? r.createdAt)}
                      </span>
                    </span>
                    <Money value={requisitionTotal(r)} size="sm" className="shrink-0" />
                    <StatusBadge status={r.status} className="hidden shrink-0 sm:inline-flex" />
                    {index === cursor && (
                      <CornerDownLeft
                        className="text-ink-faint size-3.5 shrink-0"
                        strokeWidth={2}
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="border-hairline text-ink-faint border-t px-4 py-2.5 text-[11.5px]">
          Arrow keys to move · Enter to open · Esc to close
        </p>
      </div>
    </div>
  )
}
