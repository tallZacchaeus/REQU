"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { type Account, type Role } from "./data"

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

export const HOME_FOR: Record<Role, string> = {
  // Registered, but not yet anybody: there is nothing to show them but an explanation.
  pending: "/pending",
  hod: "/",
  ayp: "/ayp",
  nyp: "/nyp",
  finance: "/finance",
  // The administrator has no desk of their own; they look at the same overview.
  super_admin: "/",
}

const SessionContext = createContext<SessionValue | null>(null)

/** What /api/me returns. */
interface Me {
  signedIn: boolean
  person?: {
    id: number; email: string; name: string; shortName: string | null
    initials: string | null; role: Role; title: string | null; scope: string | null
  }
}

/** The signed-in person as the rest of the app expects to see them. */
function toAccount(p: NonNullable<Me["person"]>): Account {
  return {
    role: p.role,
    name: p.name,
    shortName: p.shortName ?? p.name.split(" ")[0] ?? p.name,
    initials: p.initials ?? p.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    email: p.email,
    title: p.title ?? "",
    scope: p.scope ?? "",
    phone: "",
  } as Account
}

/**
 * Who is signed in comes from the server, every time. Nothing about identity is kept in the
 * browser any more: a role held in localStorage was a role anybody could edit, which was
 * tolerable in a prototype and is not once the workflow releases money.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/me", { cache: "no-store" })
      const body = (await r.json()) as Me
      if (body.signedIn && body.person) {
        const a = toAccount(body.person)
        setAccount(a)
        setProfile({ phone: "", email: a.email, notifyStatus: true, notifyComments: true, notifyDigest: false })
      } else {
        setAccount(null)
        setProfile(null)
      }
    } catch {
      setAccount(null)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const requestLink = useCallback((email: string) => setPendingEmail(email), [])

  /** The link itself signs people in, server-side; this just re-reads who that turned out to be. */
  const completeSignIn = useCallback(() => { void load() }, [load])

  const signOut = useCallback(() => {
    void fetch("/api/auth/signout", { method: "POST" }).finally(() => {
      setAccount(null)
      setProfile(null)
      window.location.href = "/login"
    })
  }, [])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((c) => (c ? { ...c, ...patch } : c))
  }, [])

  const value = useMemo<SessionValue>(() => {
    const role: Role = account?.role ?? "hod"
    return {
      signedIn: !!account,
      role,
      account: (account ?? {
        role: "hod", name: "", shortName: "", initials: "", email: "", title: "", scope: "", phone: "",
      }) as Account,
      pendingEmail,
      profile: profile ?? { phone: "", email: "", notifyStatus: true, notifyComments: true, notifyDigest: false },
      hydrated,
      home: HOME_FOR[role],
      requestLink,
      completeSignIn,
      signOut,
      updateProfile,
    }
  }, [account, pendingEmail, profile, hydrated, requestLink, completeSignIn, signOut, updateProfile])

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
