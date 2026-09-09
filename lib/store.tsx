"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { CURRENT_USER, SEED_REQUISITIONS } from "./data"
import type { Requester, Requisition } from "./types"

const STORAGE_KEY = "cwms.requisitions.v1"

interface StoreValue {
  requisitions: Requisition[]
  /** False until localStorage has been read, so screens can hold their shape. */
  hydrated: boolean
  getById: (id: string) => Requisition | undefined
  /** Inserts a new requisition or replaces an existing one by id. */
  upsert: (requisition: Requisition) => void
  nextReference: () => string
}

/**
 * Records written by an older build can be missing fields the current code
 * requires — `requester` and `stageDates` were both added after this store
 * shipped. Trusting the stored shape crashed the render, so everything read
 * back gets normalised at the boundary rather than guarded at every use site.
 *
 * Anything stored before requesters existed was raised by the HOD persona,
 * which makes that the correct backfill rather than a guess.
 */
const FALLBACK_REQUESTER: Requester = {
  name: CURRENT_USER.name,
  initials: CURRENT_USER.initials,
  department: CURRENT_USER.department,
  unit: CURRENT_USER.unit,
}

function normalise(value: unknown): Requisition[] {
  if (!Array.isArray(value)) throw new Error("stored requisitions are not a list")

  return value
    .filter((r): r is Requisition => Boolean(r) && typeof r === "object" && "id" in r)
    .map((r) => ({
      ...r,
      requester: r.requester ?? FALLBACK_REQUESTER,
      items: r.items ?? [],
      attachments: r.attachments ?? [],
      comments: r.comments ?? [],
      activity: r.activity ?? [],
      stageDates: r.stageDates ?? {},
    }))
}

const StoreContext = createContext<StoreValue | null>(null)

export function RequisitionStore({ children }: { children: React.ReactNode }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>(SEED_REQUISITIONS)
  const [hydrated, setHydrated] = useState(false)

  // Read after mount only — reading during render would desync SSR markup.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      // Reading persisted state has to happen after mount: doing it during
      // render would desync the server-rendered markup. The rule's cascading-
      // render concern does not apply to a single one-shot hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setRequisitions(normalise(JSON.parse(stored)))
    } catch {
      // Corrupt, unreadable or unmigratable storage falls back to the seed set
      // rather than taking the whole app down.
    }
     
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requisitions))
    } catch {
      // Private mode / quota — the prototype still works for the session.
    }
  }, [requisitions, hydrated])

  const upsert = useCallback((requisition: Requisition) => {
    setRequisitions((current) => {
      const index = current.findIndex((r) => r.id === requisition.id)
      if (index === -1) return [requisition, ...current]
      const next = [...current]
      next[index] = requisition
      return next
    })
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      requisitions,
      hydrated,
      getById: (id) => requisitions.find((r) => r.id === id),
      upsert,
      nextReference: () => {
        const highest = requisitions.reduce((max, r) => {
          const n = Number(r.reference.split("-").pop())
          return Number.isFinite(n) && n > max ? n : max
        }, 0)
        return `REQ-${new Date().getFullYear()}-${String(highest + 1).padStart(4, "0")}`
      },
    }),
    [requisitions, hydrated, upsert],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useRequisitions() {
  const context = useContext(StoreContext)
  if (!context) throw new Error("useRequisitions must be used inside <RequisitionStore>")
  return context
}
