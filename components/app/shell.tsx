"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ClipboardCheck, FileText, House, User } from "lucide-react"

import { accountByRole, type Role } from "@/lib/data"
import { HOME_FOR, useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

import { LogoMark } from "./logo"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  isActive: (pathname: string) => boolean
}

/** The two reviewing desks navigate identically, only the root differs. */
function reviewerNav(root: string, queueLabel: string): NavItem[] {
  return [
    { href: root, label: "Home", icon: House, isActive: (p) => p === root },
    {
      href: `${root}/queue`,
      label: queueLabel,
      icon: ClipboardCheck,
      isActive: (p) => p.startsWith(`${root}/queue`) || p.startsWith(`${root}/requisitions`),
    },
    {
      href: `${root}/profile`,
      label: "Profile",
      icon: User,
      isActive: (p) => p === `${root}/profile`,
    },
  ]
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
  ayp: reviewerNav("/ayp", "Review"),
  nyp: reviewerNav("/nyp", "Approvals"),
  finance: reviewerNav("/finance", "Payments"),
}

/**
 * Task flows take over the phone screen — no tab bar to escape through
 * halfway. On desktop there is room for the sidebar to stay put.
 */
const FULLSCREEN = [
  /^\/requisitions\/new/,
  /^\/requisitions\/[^/]+\/submitted/,
  /^\/requisitions\/[^/]+\/reconcile/,
  /^\/(ayp|nyp|finance)\/requisitions\//,
  /^\/login/,
]

const isPublic = (pathname: string) => pathname.startsWith("/login")

const ROOTS: Record<Role, string> = {
  hod: "/",
  ayp: "/ayp",
  nyp: "/nyp",
  finance: "/finance",
}

const DESK_ROOTS = ["/ayp", "/nyp", "/finance"]

/** Each role owns a slice of the route space and cannot wander into another. */
function inOwnSpace(role: Role, pathname: string) {
  if (role === "hod") return !DESK_ROOTS.some((root) => pathname.startsWith(root))
  return pathname.startsWith(ROOTS[role])
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
      <div className="bg-canvas flex min-h-dvh items-center justify-center">
        <LogoMark className="text-primary animate-fade size-8" />
      </div>
    )
  }

  // Signed out, the login screens own the whole viewport at every size.
  if (!signedIn) return <main className="min-h-dvh">{children}</main>

  const showTabs = !FULLSCREEN.some((pattern) => pattern.test(pathname))

  return (
    <div className="bg-canvas min-h-dvh lg:flex">
      <Sidebar items={NAV[role]} pathname={pathname} role={role} />

      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col md:max-w-none lg:mx-0 lg:min-h-0 lg:flex-1">
        <main
          className={cn(
            "flex flex-1 flex-col",
            // Content starts a fixed gutter from the sidebar instead of being
            // centred in the remainder, which left a wide dead band beside it.
            "md:px-6 md:py-6 lg:w-full lg:max-w-[1360px] lg:px-8 lg:py-7 xl:px-10 2xl:mx-auto",
          )}
        >
          {/* Keyed on the route so each screen fades and lifts in rather than
              swapping instantly. */}
          <div key={pathname} className="animate-page flex flex-1 flex-col">
            {children}
          </div>
        </main>
        {showTabs && <BottomNav items={NAV[role]} pathname={pathname} />}
      </div>
    </div>
  )
}

/** Desktop only. Below lg the bottom tab bar carries navigation instead. */
function Sidebar({ items, pathname, role }: { items: NavItem[]; pathname: string; role: Role }) {
  const account = accountByRole(role)

  return (
    <aside className="border-hairline bg-card sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r px-4 py-6 lg:flex">
      <Link href={items[0].href} className="flex cursor-pointer items-center gap-2.5 px-2">
        <span className="btn-gradient flex size-9 items-center justify-center rounded-xl text-white">
          <LogoMark className="size-[18px]" />
        </span>
        <span className="flex flex-col">
          <span className="text-ink text-[14px] leading-none font-bold tracking-[0.12em]">
            REQU
          </span>
          <span className="text-ink-faint mt-1.5 text-[10.5px] leading-none font-medium tracking-[0.05em]">
            Youth &amp; Young Adults
          </span>
        </span>
      </Link>

      <nav aria-label="Primary" className="mt-8 flex-1">
        <ul className="space-y-1">
          {items.map(({ href, label, icon: Icon, isActive }) => {
            const active = isActive(pathname)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press relative flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-[14px] font-medium",
                    active
                      ? "bg-muted text-primary font-semibold"
                      : "text-ink-soft hover:bg-muted/60 hover:text-ink",
                  )}
                >
                  {/* Brand rule marks the active item, so it is not colour alone. */}
                  <span
                    className={cn(
                      "bg-brand absolute top-1/2 left-0 w-[3px] -translate-y-1/2 rounded-full transition-[height,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                      active ? "h-5 opacity-100" : "h-0 opacity-0",
                    )}
                    aria-hidden
                  />
                  <Icon
                    className="size-[19px] shrink-0"
                    strokeWidth={active ? 2.2 : 1.8}
                    aria-hidden
                  />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <Link
        href={items[items.length - 1].href}
        className="border-hairline hover:border-ink-faint/40 hover:bg-muted/50 press flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5"
      >
        <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold">
          {account.initials}
        </span>
        <span className="min-w-0">
          <span className="text-ink block truncate text-[12.5px] font-semibold">
            {account.shortName}
          </span>
          <span className="text-ink-faint block truncate text-[11px]">{account.title}</span>
        </span>
      </Link>
    </aside>
  )
}

function BottomNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="border-hairline bg-card/95 sticky bottom-0 z-30 border-t backdrop-blur-sm lg:hidden"
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
                  "press relative flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 pt-2",
                  active ? "text-primary" : "text-ink-faint hover:text-ink-soft",
                )}
              >
                <span
                  className={cn(
                    "bg-brand absolute top-0 h-[2.5px] rounded-full transition-[width,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    active ? "w-9 opacity-100" : "w-0 opacity-0",
                  )}
                  aria-hidden
                />
                <Icon
                  className={cn(
                    "size-[22px] transition-transform duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    active && "-translate-y-px scale-105",
                  )}
                  strokeWidth={active ? 2.2 : 1.7}
                  aria-hidden
                />
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
