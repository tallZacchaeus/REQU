"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { SEED_REQUISITIONS } from "./data"
import type { Requisition } from "./types"

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

const StoreContext = createContext<StoreValue | null>(null)

export function RequisitionStore({ children }: { children: React.ReactNode }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>(SEED_REQUISITIONS)
  const [hydrated, setHydrated] = useState(false)

  // Read after mount only — reading during render would desync SSR markup.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setRequisitions(JSON.parse(stored) as Requisition[])
    } catch {
      // Corrupt or unavailable storage just falls back to the seed set.
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
