"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "cwms.session.v1"

export interface Profile {
  phone: string
  email: string
  notifyStatus: boolean
  notifyComments: boolean
  notifyDigest: boolean
}

interface SessionValue {
  signedIn: boolean
  /** The address the link was sent to, kept across the two login screens. */
  pendingEmail: string | null
  profile: Profile
  hydrated: boolean
  requestLink: (email: string) => void
  completeSignIn: () => void
  signOut: () => void
  updateProfile: (patch: Partial<Profile>) => void
}

const DEFAULT_PROFILE: Profile = {
  phone: "+234 803 412 7788",
  email: "david.adeyemi@cwms.org",
  notifyStatus: true,
  notifyComments: true,
  notifyDigest: false,
}

interface Persisted {
  signedIn: boolean
  pendingEmail: string | null
  profile: Profile
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>({
    signedIn: false,
    pendingEmail: null,
    profile: DEFAULT_PROFILE,
  })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Persisted>
        setState((current) => ({
          signedIn: parsed.signedIn ?? current.signedIn,
          pendingEmail: parsed.pendingEmail ?? null,
          profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        }))
      }
    } catch {
      // Unreadable storage just leaves the visitor signed out.
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Session simply won't survive a reload.
    }
  }, [state, hydrated])

  const requestLink = useCallback((email: string) => {
    setState((c) => ({ ...c, pendingEmail: email }))
  }, [])

  const completeSignIn = useCallback(() => {
    setState((c) => ({ ...c, signedIn: true, pendingEmail: null }))
  }, [])

  const signOut = useCallback(() => {
    setState((c) => ({ ...c, signedIn: false, pendingEmail: null }))
  }, [])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((c) => ({ ...c, profile: { ...c.profile, ...patch } }))
  }, [])

  const value = useMemo<SessionValue>(
    () => ({ ...state, hydrated, requestLink, completeSignIn, signOut, updateProfile }),
    [state, hydrated, requestLink, completeSignIn, signOut, updateProfile],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error("useSession must be used inside <SessionProvider>")
  return context
}

/** "david.adeyemi@cwms.org" -> "da••••••••@cwms.org" */
export function maskEmail(email: string) {
  const [name, domain] = email.split("@")
  if (!domain) return email
  const head = name.slice(0, 2)
  return `${head}${"•".repeat(Math.max(3, name.length - 2))}@${domain}`
}

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
