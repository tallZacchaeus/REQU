"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { LogoMark } from "@/components/app/logo"
import { CURRENT_USER } from "@/lib/data"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

type Phase = "verifying" | "welcome"

export default function VerifyPage() {
  const router = useRouter()
  const { completeSignIn } = useSession()
  const [phase, setPhase] = useState<Phase>("verifying")

  useEffect(() => {
    // Three beats: the check runs, it resolves, then the app takes over. The
    // held pause on "welcome" is what makes the hand-off feel deliberate.
    const toWelcome = setTimeout(() => {
      completeSignIn()
      setPhase("welcome")
    }, 1300)
    const toApp = setTimeout(() => router.replace("/"), 2300)
    return () => {
      clearTimeout(toWelcome)
      clearTimeout(toApp)
    }
  }, [completeSignIn, router])

  return (
    <main className="canvas-lift flex min-h-dvh flex-col items-center justify-center px-8">
      <div className="relative flex size-16 items-center justify-center">
        {phase === "verifying" ? (
          <>
            <span
              className="border-hairline border-t-brand size-16 animate-spin rounded-full border-2"
              style={{ animationDuration: "1.1s" }}
              aria-hidden
            />
            <LogoMark className="text-primary absolute size-6" />
          </>
        ) : (
          <span className="animate-rise bg-st-good flex size-16 items-center justify-center rounded-full">
            <svg viewBox="0 0 32 32" className="size-8" fill="none" aria-hidden>
              <path
                d="M8 16.5 13.5 22 24 11"
                stroke="white"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="[animation:draw_.5s_cubic-bezier(.22,1,.36,1)_both]"
                style={{ strokeDasharray: 1 }}
              />
            </svg>
          </span>
        )}
      </div>

      <p
        className={cn(
          "mt-7 text-[18px] font-semibold tracking-[-0.02em] transition-colors duration-300",
          phase === "welcome" ? "text-ink" : "text-ink-soft",
        )}
        aria-live="polite"
      >
        {phase === "verifying" ? "Verifying your link…" : `Welcome back, ${CURRENT_USER.shortName}`}
      </p>
      <p className="text-ink-faint mt-2 text-center text-[13px] leading-[1.5]">
        {phase === "verifying"
          ? "This link is single-use and expires shortly."
          : "Taking you to your requisitions."}
      </p>
    </main>
  )
}
