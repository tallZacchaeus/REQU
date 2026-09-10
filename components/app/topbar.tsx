"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, ClipboardCheck, Plus } from "lucide-react"

import { type Role } from "@/lib/data"
import { deskFor } from "@/lib/desk"
import { useRequisitions } from "@/lib/store"
import { cn } from "@/lib/utils"

import { LogoMark } from "./logo"
import { NotificationBell, NotificationPanel } from "./notifications"
import { SearchPalette, SearchTrigger } from "./search"

/**
 * Desktop chrome. The brand block sits over the sidebar column so the two line
 * up, and the rest of the bar carries the three things that belong at the top
 * of every screen: find something, see what needs you, do the main thing.
 */
export function TopBar({ role }: { role: Role }) {
  const { requisitions } = useRequisitions()
  const desk = useMemo(() => deskFor(role), [role])
  const [search, setSearch] = useState(false)
  const [bell, setBell] = useState(false)

  const waiting = requisitions.filter(desk.visible).filter(desk.needsMe).length

  // ⌘K from anywhere, the shortcut the field advertises.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearch(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <header className="border-hairline bg-card sticky top-0 z-30 hidden h-16 shrink-0 items-center border-b lg:flex">
        <Link
          href={desk.cta.kind === "create" ? "/" : `/${role}`}
          className="border-hairline hover:bg-muted/40 press flex h-16 w-[248px] shrink-0 cursor-pointer items-center gap-2.5 border-r px-4"
        >
          <span className="btn-gradient flex size-9 shrink-0 items-center justify-center rounded-xl text-white">
            <LogoMark className="size-[18px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-ink text-[14px] leading-none font-bold tracking-[0.12em]">
              REQU
            </span>
            <span className="text-ink-faint mt-1.5 truncate text-[10.5px] leading-none font-medium tracking-[0.05em]">
              Requisition Management
            </span>
          </span>
          <ChevronDown className="text-ink-faint size-4 shrink-0" aria-hidden />
        </Link>

        <div className="flex flex-1 items-center gap-4 px-6">
          <SearchTrigger label={desk.searchLabel} onOpen={() => setSearch(true)} />

          <div className="ml-auto flex items-center gap-2.5">
            <div className="relative">
              <NotificationBell open={bell} onToggle={() => setBell((b) => !b)} />
              <NotificationPanel open={bell} onClose={() => setBell(false)} />
            </div>

            <Link
              href={desk.cta.href}
              className="btn-gradient press flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-[14px] font-semibold text-white hover:brightness-110"
            >
              {desk.cta.kind === "create" ? (
                <>
                  <Plus className="size-[17px]" strokeWidth={2.6} aria-hidden />
                  {desk.cta.label}
                </>
              ) : (
                <>
                  <ClipboardCheck className="size-[17px]" strokeWidth={2.2} aria-hidden />
                  {desk.cta.label}
                  {waiting > 0 && (
                    <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[11.5px] font-bold">
                      {waiting}
                    </span>
                  )}
                </>
              )}
            </Link>

          </div>
        </div>
      </header>

      <SearchPalette open={search} onClose={() => setSearch(false)} />
    </>
  )
}

/** Mobile keeps ⌘-less search reachable from the crown headers. */
export function MobileSearchButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className={cn(
          "press relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white",
          className,
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.9" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </button>
      <SearchPalette open={open} onClose={() => setOpen(false)} />
    </>
  )
}
