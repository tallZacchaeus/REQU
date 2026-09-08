"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ClipboardCheck, FileText, House, User } from "lucide-react"

import { type Role } from "@/lib/data"
import { HOME_FOR, useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

import { LogoMark } from "./logo"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  isActive: (pathname: string) => boolean
}

const NAV: Record<Role, NavItem[]> = {
  hod: [
    { href: "/", label: "Home", icon: House, isActive: (p) => p === "/" },
    {
      href: "/requisitions",
      label: "Requisitions",
      icon: FileText,
      isActive: (p) => p.startsWith("/requisitions"),
    },
    { href: "/profile", label: "Profile", icon: User, isActive: (p) => p === "/profile" },
  ],
  ayp: [
    { href: "/ayp", label: "Home", icon: House, isActive: (p) => p === "/ayp" },
    {
      href: "/ayp/queue",
      label: "Review",
      icon: ClipboardCheck,
      isActive: (p) => p.startsWith("/ayp/queue") || p.startsWith("/ayp/requisitions"),
    },
    { href: "/ayp/profile", label: "Profile", icon: User, isActive: (p) => p === "/ayp/profile" },
  ],
}

/** Task flows take over the screen — no tab bar to escape through halfway. */
const FULLSCREEN = [
  /^\/requisitions\/new/,
  /^\/requisitions\/[^/]+\/submitted/,
  /^\/requisitions\/[^/]+\/reconcile/,
  /^\/ayp\/requisitions\//,
  /^\/login/,
]

const isPublic = (pathname: string) => pathname.startsWith("/login")

/** Each role owns a slice of the route space and cannot wander into the other. */
function inOwnSpace(role: Role, pathname: string) {
  return role === "ayp" ? pathname.startsWith("/ayp") : !pathname.startsWith("/ayp")
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signedIn, role, hydrated } = useSession()

  const misrouted = signedIn && !isPublic(pathname) && !inOwnSpace(role, pathname)

  useEffect(() => {
    if (!hydrated) return
    if (!signedIn && !isPublic(pathname)) router.replace("/login")
    else if (signedIn && pathname === "/login") router.replace(HOME_FOR[role])
    else if (misrouted) router.replace(HOME_FOR[role])
  }, [hydrated, signedIn, pathname, role, misrouted, router])

  // Hold a brand splash rather than flashing a screen the visitor is about to
  // be redirected away from.
  if (!hydrated || (!signedIn && !isPublic(pathname)) || misrouted) {
    return (
      <div className="bg-canvas mx-auto flex min-h-dvh w-full max-w-[430px] items-center justify-center">
        <LogoMark className="text-primary animate-fade size-8" />
      </div>
    )
  }

  const showNav = signedIn && !FULLSCREEN.some((pattern) => pattern.test(pathname))

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
      {showNav && <BottomNav items={NAV[role]} pathname={pathname} />}
    </div>
  )
}

function BottomNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="border-hairline bg-card/95 sticky bottom-0 z-30 border-t backdrop-blur-sm"
    >
      <ul className="grid grid-cols-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname)
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
