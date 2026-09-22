"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { LogoTile } from "@/components/app/logo"
import { useSession } from "@/lib/session"

/**
 * Where a newly registered person waits. They have proved they hold a church mailbox and
 * nothing more, so there is nothing here to show them — only a clear explanation of what
 * happens next, and no impression that something is broken.
 */
export default function PendingPage() {
  const router = useRouter()
  const { account, role, hydrated, signedIn, signOut } = useSession()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!hydrated) return
    if (!signedIn) router.replace("/login")
    else if (role !== "pending") router.replace("/")
  }, [hydrated, signedIn, role, router])

  async function checkAgain() {
    setChecking(true)
    // A reload is the honest way to ask: the role lives on the server.
    window.location.reload()
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <LogoTile />
      <h1 className="text-ink mt-6 text-[19px] font-semibold">You are registered</h1>
      <p className="text-ink-soft mt-3 text-[14px] leading-relaxed">
        Your account is set up{account?.email ? <> for <span className="text-ink font-medium">{account.email}</span></> : null},
        but it has not been given a part to play yet.
      </p>
      <p className="text-ink-soft mt-3 text-[14px] leading-relaxed">
        Someone in the church office needs to say whether you raise requisitions for a
        department, review them, approve them, or handle payments. Ask them to do that, and
        this page will let you through as soon as they have.
      </p>

      <div className="mt-7 flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={checkAgain}
          disabled={checking}
          className="btn-gradient press w-full rounded-xl py-3 text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {checking ? "Checking…" : "Check again"}
        </button>
        <button
          type="button"
          onClick={signOut}
          className="text-ink-faint hover:text-ink-soft press w-full rounded-xl py-2.5 text-[13px] font-medium"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}
