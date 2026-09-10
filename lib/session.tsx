"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { accountByRole, accountFor, type Account, type Role } from "./data"

const STORAGE_KEY = "requ.session.v1"
const LEGACY_KEY = "cwms.session.v1"

export interface Profile {
  phone: string
  email: string
  notifyStatus: boolean
  notifyComments: boolean
  notifyDigest: boolean
}

interface SessionValue {
  signedIn: boolean
  role: Role
  account: Account
  /** The address the link was sent to, kept across the two login screens. */
  pendingEmail: string | null
  profile: Profile
  hydrated: boolean
  /** Where this role's app starts. */
  home: string
  requestLink: (email: string) => void
  completeSignIn: () => void
  signOut: () => void
  updateProfile: (patch: Partial<Profile>) => void
}

interface Persisted {
  signedIn: boolean
  role: Role
  pendingEmail: string | null
  profile: Profile
}

const profileFor = (account: Account): Profile => ({
  phone: account.phone,
  email: account.email,
  notifyStatus: true,
  notifyComments: true,
  notifyDigest: false,
})

export const HOME_FOR: Record<Role, string> = {
  hod: "/",
  ayp: "/ayp",
  nyp: "/nyp",
  finance: "/finance",
}

const initial: Persisted = {
  signedIn: false,
  role: "hod",
  pendingEmail: null,
  profile: profileFor(accountByRole("hod")),
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(initial)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Persisted>
        const known: Role[] = ["hod", "ayp", "nyp", "finance"]
        const role: Role = known.includes(parsed.role as Role) ? (parsed.role as Role) : "hod"
        // Reading persisted state has to happen after mount: doing it during
        // render would desync the server-rendered markup. The rule's cascading-
        // render concern does not apply to a single one-shot hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({
          signedIn: parsed.signedIn ?? false,
          role,
          pendingEmail: parsed.pendingEmail ?? null,
          profile: { ...profileFor(accountByRole(role)), ...parsed.profile },
        })
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

  /**
   * Passwordless means the address is the credential *and* the role. An
   * address that is not on a worker record falls back to the HOD persona
   * rather than dead-ending the prototype.
   */
  const completeSignIn = useCallback(() => {
    setState((c) => {
      // Idempotent: pendingEmail is consumed on the first call, so a second
      // one would resolve nobody and silently downgrade the session.
      if (c.signedIn) return c
      const account = (c.pendingEmail && accountFor(c.pendingEmail)) || accountByRole("hod")
      return {
        signedIn: true,
        role: account.role,
        pendingEmail: null,
        profile: profileFor(account),
      }
    })
  }, [])

  const signOut = useCallback(() => {
    setState({ ...initial })
  }, [])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((c) => ({ ...c, profile: { ...c.profile, ...patch } }))
  }, [])

  const value = useMemo<SessionValue>(() => {
    const account = accountByRole(state.role)
    return {
      ...state,
      account,
      hydrated,
      home: HOME_FOR[state.role],
      requestLink,
      completeSignIn,
      signOut,
      updateProfile,
    }
  }, [state, hydrated, requestLink, completeSignIn, signOut, updateProfile])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error("useSession must be used inside <SessionProvider>")
  return context
}

/** "david.adeyemi@requ.org" -> "da••••••••@requ.org" */
export function maskEmail(email: string) {
  const [name, domain] = email.split("@")
  if (!domain) return email
  const head = name.slice(0, 2)
  return `${head}${"•".repeat(Math.max(3, name.length - 2))}@${domain}`
}

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
