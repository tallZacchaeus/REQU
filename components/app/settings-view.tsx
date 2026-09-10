"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, LogOut, Monitor, ShieldCheck, SlidersHorizontal } from "lucide-react"

import { maskEmail, useSession } from "@/lib/session"

import { Group, SheetRow, ToggleRow } from "./settings"
import { MicroLabel } from "./primitives"
import { Sheet } from "./sheet"
import { useToast } from "./toast"

/**
 * Account-level controls, split out of Profile. Profile answers "who am I";
 * Settings answers "how does this thing behave for me".
 */
export function SettingsView() {
  const router = useRouter()
  const { profile, updateProfile, signOut, account } = useSession()
  const toast = useToast()

  const [open, setOpen] = useState<string | null>("notifications")
  const [sheet, setSheet] = useState<"security" | "signout" | null>(null)

  const toggle = (key: string) => setOpen((current) => (current === key ? null : key))

  return (
    <>
      <header className="px-4 pt-5 pb-4 md:px-0 md:pt-0">
        <h1 className="text-ink text-[20px] font-semibold tracking-[-0.025em] lg:text-[24px]">
          Settings
        </h1>
        <p className="text-ink-soft mt-1 text-[13.5px] leading-[1.5]">
          Signed in as {account.name} · {account.title}
        </p>
      </header>

      <div className="space-y-3.5 px-4 pb-8 md:px-0 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <Group
          title="Notification Preferences"
          open={open === "notifications"}
          onToggle={() => toggle("notifications")}
        >
          <div className="divide-hairline divide-y">
            <ToggleRow
              label="Status changes"
              hint="When a requisition moves to the next stage or comes back."
              checked={profile.notifyStatus}
              onChange={(value) => {
                updateProfile({ notifyStatus: value })
                toast(value ? "Status alerts on" : "Status alerts off", "info")
              }}
            />
            <ToggleRow
              label="Comments"
              hint="When someone leaves a comment on a requisition you can see."
              checked={profile.notifyComments}
              onChange={(value) => {
                updateProfile({ notifyComments: value })
                toast(value ? "Comment alerts on" : "Comment alerts off", "info")
              }}
            />
            <ToggleRow
              label="Weekly digest"
              hint="A Monday summary of everything outstanding."
              checked={profile.notifyDigest}
              onChange={(value) => {
                updateProfile({ notifyDigest: value })
                toast(value ? "Weekly digest on" : "Weekly digest off", "info")
              }}
            />
          </div>
        </Group>

        <div className="space-y-3.5">
          <Group
            title="Display"
            meta="System"
            open={open === "display"}
            onToggle={() => toggle("display")}
          >
            <div className="flex items-start gap-2.5 py-1">
              <SlidersHorizontal
                className="text-ink-faint mt-0.5 size-4 shrink-0"
                strokeWidth={2}
                aria-hidden
              />
              <p className="text-ink-soft text-[13px] leading-[1.5]">
                REQU follows your device for text size and reduced motion. Turn on Reduce Motion in
                your system settings and every animation here is suppressed.
              </p>
            </div>
          </Group>

          <button
            type="button"
            onClick={() => setSheet("security")}
            className="card-flat tap-card hover:border-ink-faint/40 group flex w-full cursor-pointer items-center gap-3 px-4 py-3.5"
          >
            <ShieldCheck className="text-ink-faint size-4 shrink-0" strokeWidth={2} aria-hidden />
            <span className="min-w-0 flex-1 text-left">
              <span className="text-ink block text-[14px] font-semibold">Security</span>
              <span className="text-ink-faint block text-[12px]">
                Passwordless · last sign-in today
              </span>
            </span>
          </button>

          <div className="card-flat px-4 py-4">
            <MicroLabel>Session</MicroLabel>
            <p className="text-ink-soft mt-2 text-[13px] leading-[1.5]">
              Signing out clears this device. Drafts and history stay where they are.
            </p>
            <button
              type="button"
              onClick={() => setSheet("signout")}
              className="border-st-bad/30 text-st-bad hover:bg-st-bad-bg press mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border text-[14px] font-semibold"
            >
              <LogOut className="size-4" strokeWidth={2} aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </div>

      <Sheet open={sheet === "security"} onClose={() => setSheet(null)} title="Security">
        <div className="border-hairline bg-muted mb-4 flex items-start gap-2.5 rounded-lg border px-3.5 py-3">
          <KeyRound className="text-ink-faint mt-px size-4 shrink-0" strokeWidth={2} aria-hidden />
          <p className="text-ink text-[13px] leading-[1.5]">
            This account is passwordless. You sign in with a single-use link sent to{" "}
            <span className="font-medium">{maskEmail(profile.email)}</span>.
          </p>
        </div>
        <dl className="divide-hairline divide-y">
          <SheetRow label="Sign-in method" value="Email magic link" />
          <SheetRow label="Link validity" value="15 minutes, single use" />
          <SheetRow label="Last sign-in" value="Today · Abuja, NG" />
        </dl>
        <div className="border-hairline mt-4 flex items-center gap-2.5 rounded-lg border px-3.5 py-3">
          <Monitor className="text-ink-faint size-4 shrink-0" strokeWidth={1.8} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-ink text-[13px] font-medium">This device</p>
            <p className="text-ink-faint text-[11.5px]">Active now</p>
          </div>
          <span className="bg-st-good size-2 rounded-full" aria-hidden />
        </div>
      </Sheet>

      <Sheet open={sheet === "signout"} onClose={() => setSheet(null)} title="Sign out?">
        <p className="text-ink-soft text-[13.5px] leading-[1.55]">
          You&apos;ll need a fresh sign-in link to get back in.
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => setSheet(null)}
            className="border-input text-ink hover:bg-muted press h-12 flex-1 cursor-pointer rounded-lg border text-[14.5px] font-semibold"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={() => {
              signOut()
              toast("Signed out", "info")
              router.replace("/login")
            }}
            className="bg-st-bad press h-12 flex-1 cursor-pointer rounded-lg text-[14.5px] font-semibold text-white"
          >
            Sign out
          </button>
        </div>
      </Sheet>
    </>
  )
}
