"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import type { Requisition, RequisitionStatus } from "./types"

/**
 * Requisitions, from the server. Nothing is kept in the browser: what a person may see and
 * what they may do with it are decided server-side on every request, and a copy held here
 * would only be a stale one that a reader might act on.
 */
interface StoreValue {
  requisitions: Requisition[]
  /** False until the first fetch returns, so screens can hold their shape. */
  hydrated: boolean
  getById: (id: string) => Requisition | undefined
  /** Re-read from the server; used after anything that changes a requisition. */
  refresh: () => Promise<void>
  /** Save the editable fields of a draft or a returned requisition. */
  saveDraft: (id: string, input: DraftInput) => Promise<void>
  /** Raise a new one. Returns its id. */
  create: (input: DraftInput) => Promise<string>
  /** Ask for a move. The server decides whether it is allowed. */
  moveTo: (id: string, to: RequisitionStatus, extra?: MoveExtra) => Promise<void>
}

export interface DraftInput {
  programme: string
  programmeDate?: string | null
  location?: string | null
  purpose?: string | null
  items: { description: string; amount: number }[]
}

export interface MoveExtra {
  comment?: string
  requestedChanges?: string[]
  paymentRef?: string
}

const StoreContext = createContext<StoreValue | null>(null)

/** Turns a failed request into the server's own message, which is written for the reader. */
async function must(res: Response) {
  if (res.ok) return res
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  throw new Error(body.error ?? "Something went wrong. Please try again.")
}

export function RequisitionStore({ children }: { children: React.ReactNode }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [hydrated, setHydrated] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/requisitions", { cache: "no-store" })
      if (res.status === 401) {
        setRequisitions([])
        return
      }
      const body = (await must(res).then((r) => r.json())) as { requisitions: Requisition[] }
      setRequisitions(body.requisitions ?? [])
    } catch {
      // A failed read leaves the last good list rather than blanking the screen.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const create = useCallback(async (input: DraftInput) => {
    const res = await must(await fetch("/api/requisitions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    }))
    const { id } = (await res.json()) as { id: string }
    await refresh()
    return id
  }, [refresh])

  const saveDraft = useCallback(async (id: string, input: DraftInput) => {
    await must(await fetch(`/api/requisitions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    }))
    await refresh()
  }, [refresh])

  const moveTo = useCallback(async (id: string, to: RequisitionStatus, extra: MoveExtra = {}) => {
    await must(await fetch(`/api/requisitions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, ...extra }),
    }))
    await refresh()
  }, [refresh])

  const value = useMemo<StoreValue>(
    () => ({
      requisitions,
      hydrated,
      getById: (id) => requisitions.find((r) => r.id === id),
      refresh,
      saveDraft,
      create,
      moveTo,
    }),
    [requisitions, hydrated, refresh, saveDraft, create, moveTo],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useRequisitions() {
  const context = useContext(StoreContext)
  if (!context) throw new Error("useRequisitions must be used inside <RequisitionStore>")
  return context
}
