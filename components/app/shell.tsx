"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FileText, House, User } from "lucide-react"

import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

import { LogoMark } from "./logo"

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/requisitions", label: "Requisitions", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
]

/** Task flows take over the screen — no tab bar to escape through halfway. */
const FULLSCREEN = [/^\/requisitions\/new/, /^\/requisitions\/[^/]+\/submitted/, /^\/login/]

const isPublic = (pathname: string) => pathname.startsWith("/login")

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signedIn, hydrated } = useSession()

  useEffect(() => {
    if (!hydrated) return
    if (!signedIn && !isPublic(pathname)) router.replace("/login")
    if (signedIn && pathname === "/login") router.replace("/")
  }, [hydrated, signedIn, pathname, router])

  // Hold a brand splash rather than flashing a screen the visitor is about to
  // be redirected away from.
  if (!hydrated || (!signedIn && !isPublic(pathname))) {
    return (
      <div className="bg-canvas mx-auto flex min-h-dvh w-full max-w-[430px] items-center justify-center">
        <LogoMark className="text-primary animate-fade size-8" />
      </div>
    )
  }

  const showNav = !FULLSCREEN.some((pattern) => pattern.test(pathname))

  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-canvas",
        // On a desktop viewport the app keeps its phone column rather than
        // stretching into a layout it was never designed for.
        "lg:border-hairline lg:border-x",
      )}
    >
      <main className="flex flex-1 flex-col">{children}</main>
      {showNav && <BottomNav pathname={pathname} />}
    </div>
  )
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="border-hairline bg-card/95 sticky bottom-0 z-30 border-t backdrop-blur-sm"
    >
      <ul className="grid grid-cols-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 pt-2 transition-colors duration-200",
                  active ? "text-primary" : "text-ink-faint hover:text-ink-soft",
                )}
              >
                {/* The active tab is marked by a brand rule, not by colour alone. */}
                <span
                  className={cn(
                    "absolute top-0 h-[2.5px] w-9 rounded-full transition-colors duration-200",
                    active ? "bg-brand" : "bg-transparent",
                  )}
                  aria-hidden
                />
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.7} aria-hidden />
                <span className="text-[11px] leading-none font-medium tracking-[0.01em]">
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
