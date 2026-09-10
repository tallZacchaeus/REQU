"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AtSign,
  Check,
  ChevronRight,
  Pencil,
  Phone,
  Settings,
  X,
} from "lucide-react"

import { LogoMark } from "@/components/app/logo"
import {
  ContactRow,
  Field,
  Group,
  ProfileStat,
} from "@/components/app/settings"
import { useToast } from "@/components/app/toast"
import { visibleToReviewer } from "@/lib/review"
import type { ReviewerConfig } from "@/lib/roles"
import { useSession } from "@/lib/session"
import { useRequisitions } from "@/lib/store"

export function ReviewerProfile({ config }: { config: ReviewerConfig }) {
  const { profile, updateProfile } = useSession()
  const { requisitions } = useRequisitions()
  const toast = useToast()
  const person = config.person

  const [open, setOpen] = useState<string | null>("personal")
  const [editing, setEditing] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState(profile.phone)
  const [saved, setSaved] = useState(false)

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
          {/* Account controls live in Settings; this is the way there on a
              phone, where five tabs will not fit. */}
          <Link
            href={`${config.home}/settings`}
            className="card-flat tap-card hover:border-ink-faint/40 group flex w-full cursor-pointer items-center gap-3 px-4 py-3.5"
          >
            <Settings className="text-ink-faint size-4 shrink-0" strokeWidth={2} aria-hidden />
            <span className="min-w-0 flex-1 text-left">
              <span className="text-ink block text-[14px] font-semibold">Settings</span>
              <span className="text-ink-faint block text-[12px]">
                Notifications, security and sign out
              </span>
            </span>
            <ChevronRight
              className="text-ink-faint size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </>
  )
}
