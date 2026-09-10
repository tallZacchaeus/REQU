"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AtSign,
  Check,
  ChevronRight,
  KeyRound,
  LogOut,
  Monitor,
  Pencil,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react"

import { LogoMark } from "@/components/app/logo"
import {
  ContactRow,
  Field,
  Group,
  ProfileStat,
  SheetRow,
  ToggleRow,
} from "@/components/app/settings"
import { Sheet } from "@/components/app/sheet"
import { useToast } from "@/components/app/toast"
import { visibleToReviewer } from "@/lib/review"
import type { ReviewerConfig } from "@/lib/roles"
import { maskEmail, useSession } from "@/lib/session"
import { useRequisitions } from "@/lib/store"

export function ReviewerProfile({ config }: { config: ReviewerConfig }) {
  const router = useRouter()
  const { profile, updateProfile, signOut } = useSession()
  const { requisitions } = useRequisitions()
  const toast = useToast()
  const person = config.person

  const [open, setOpen] = useState<string | null>("personal")
  const [editing, setEditing] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState(profile.phone)
  const [saved, setSaved] = useState(false)
  const [sheet, setSheet] = useState<"security" | "signout" | null>(null)

  const visible = requisitions.filter(visibleToReviewer)
  const cleared = visible.filter(config.cleared).length
  const returned = visible.filter((r) => r.status === "changes_requested").length
  const reviewed = cleared + returned

  const toggle = (key: string) => setOpen((current) => (current === key ? null : key))

  function save() {
    updateProfile({ phone: phoneDraft })
    toast("Phone number updated")
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <>
      <header className="header-deep rounded-b-[28px] px-5 pt-5 pb-16 md:rounded-2xl md:px-7 md:pt-6 md:pb-7 lg:px-8 lg:pt-7 lg:pb-8">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.09em] text-white/60 uppercase">
            <LogoMark className="size-4 text-white/80" />
            {config.deskLabel}
          </span>
          <span className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-white">
            {person.roleShort}
          </span>
        </div>

        <div className="animate-rise mt-7 flex items-center gap-4 lg:mt-6">
          <span className="bg-brand/25 flex size-16 shrink-0 items-center justify-center rounded-full text-[19px] font-semibold tracking-[-0.01em] text-white ring-2 ring-white/25">
            {person.initials}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[21px] leading-tight font-semibold tracking-[-0.025em] text-white">
              {person.name}
            </h1>
            <p className="mt-1 truncate text-[12.5px] text-white/65">{person.role}</p>
            <p className="mt-0.5 truncate text-[12px] text-white/45">{profile.email}</p>
          </div>
        </div>
      </header>

      <div className="-mt-9 px-4 lg:mt-5 md:px-0">
        <div className="card-flat grid grid-cols-3 shadow-raised">
          <ProfileStat label="Reviewed" value={reviewed} className="border-hairline border-r" />
          <ProfileStat
            label={config.clearedLabel}
            value={cleared}
            className="border-hairline border-r"
          />
          <ProfileStat label="Returned" value={returned} />
        </div>
      </div>

      <div className="space-y-3.5 px-4 pt-5 pb-8 md:px-0 lg:block lg:columns-2 lg:gap-4 lg:space-y-0 lg:pt-6 lg:[&>*]:mb-4 lg:[&>*]:break-inside-avoid">
        <Group
          title="Personal Information"
          open={open === "personal"}
          onToggle={() => toggle("personal")}
          action={
            open === "personal" &&
            (editing ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setPhoneDraft(profile.phone)
                    setEditing(false)
                  }}
                  className="text-ink-soft hover:bg-muted h-8 cursor-pointer rounded-md px-2 text-[12.5px] font-semibold transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    save()
                  }}
                  className="bg-primary text-primary-foreground h-8 cursor-pointer rounded-md px-3 text-[12.5px] font-semibold transition-transform duration-200 active:scale-95"
                >
                  Save
                </button>
              </span>
            ) : saved ? (
              <span className="text-st-good animate-fade flex items-center gap-1 text-[12px] font-semibold">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
                Saved
              </span>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setPhoneDraft(profile.phone)
                  setEditing(true)
                }}
                className="text-primary hover:bg-muted flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[12.5px] font-semibold transition-colors duration-200"
              >
                <Pencil className="size-3.5" strokeWidth={2.2} aria-hidden />
                Edit
              </button>
            ))
          }
        >
          <dl className="divide-hairline divide-y">
            <Field label="Full name" value={person.name} locked />
            <Field label="Email address" value={profile.email} locked />
            {editing ? (
              <div className="py-2.5">
                <dt className="text-ink-faint text-[12px] font-medium">Phone number</dt>
                <dd>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoFocus
                    value={phoneDraft}
                    onChange={(event) => setPhoneDraft(event.target.value)}
                    className="border-input bg-card text-ink focus:border-brand focus:ring-brand/20 mt-1.5 h-11 w-full rounded-lg border px-3 text-[16px] transition-[border-color,box-shadow] duration-200 outline-none focus:ring-3"
                  />
                </dd>
              </div>
            ) : (
              <Field label="Phone number" value={profile.phone} />
            )}
            <Field label="Office" value={person.area} locked />
          </dl>
        </Group>

        <Group
          title="Role & Responsibilities"
          open={open === "role"}
          onToggle={() => toggle("role")}
        >
          <dl className="divide-hairline divide-y">
            <Field label="Role" value={person.role} />
            <Field label="Department" value={person.department} />
            <Field label="Review scope" value={person.unit} />
          </dl>
          <p className="text-ink-soft border-hairline mt-3 border-t pt-3 text-[12px] leading-[1.5]">
            {config.boundary}
          </p>
        </Group>

        <Group
          title="Contact Information"
          meta="How HODs reach you"
          open={open === "contact"}
          onToggle={() => toggle("contact")}
        >
          <ContactRow
            icon={Phone}
            label="Phone"
            value={profile.phone}
            href={`tel:${profile.phone.replace(/\s/g, "")}`}
          />
          <ContactRow
            icon={AtSign}
            label="Email"
            value={profile.email}
            href={`mailto:${profile.email}`}
          />
        </Group>

        <Group
          title="Notification Preferences"
          open={open === "notify"}
          onToggle={() => toggle("notify")}
        >
          <div className="divide-hairline divide-y">
            <ToggleRow
              label="New arrivals"
              hint="When a requisition reaches your desk."
              checked={profile.notifyStatus}
              onChange={(value) => updateProfile({ notifyStatus: value })}
            />
            <ToggleRow
              label="Resubmissions"
              hint="When something you returned comes back."
              checked={profile.notifyComments}
              onChange={(value) => updateProfile({ notifyComments: value })}
            />
            <ToggleRow
              label="Weekly queue digest"
              hint="A Monday summary of what is still waiting."
              checked={profile.notifyDigest}
              onChange={(value) => updateProfile({ notifyDigest: value })}
            />
          </div>
        </Group>

        <Group
          title="What You Can Do"
          open={open === "permissions"}
          onToggle={() => toggle("permissions")}
        >
          <div className="space-y-2">
            {config.can.map((item) => (
              <p key={item} className="flex gap-2.5 text-[13.5px] leading-[1.45]">
                <Check
                  className="text-st-good mt-0.5 size-4 shrink-0"
                  strokeWidth={2.4}
                  aria-hidden
                />
                <span className="text-ink">{item}</span>
              </p>
            ))}
            {config.cannot.map((item) => (
              <p key={item} className="flex gap-2.5 text-[13.5px] leading-[1.45]">
                <X
                  className="text-ink-faint mt-0.5 size-4 shrink-0"
                  strokeWidth={2.4}
                  aria-hidden
                />
                <span className="text-ink-faint">{item}</span>
              </p>
            ))}
          </div>
        </Group>

        <div className="space-y-3.5">
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
            <ChevronRight
              className="text-ink-faint size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>

          <button
            type="button"
            onClick={() => setSheet("signout")}
            className="border-hairline bg-card text-ink hover:border-st-bad/40 hover:text-st-bad flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border text-[14px] font-semibold transition-colors duration-200"
          >
            <LogOut className="size-4" strokeWidth={2} aria-hidden />
            Sign out
          </button>
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
            className="border-input text-ink hover:bg-muted h-12 flex-1 cursor-pointer rounded-lg border text-[14.5px] font-semibold transition-colors duration-200"
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
            className="bg-st-bad h-12 flex-1 cursor-pointer rounded-lg text-[14.5px] font-semibold text-white transition-opacity duration-200 hover:opacity-90"
          >
            Sign out
          </button>
        </div>
      </Sheet>
    </>
  )
}
