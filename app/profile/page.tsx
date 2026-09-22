"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  AtSign,
  Camera,
  Check,
  ChevronRight,
  Images,
  Lock,
  Pencil,
  Settings,
  Phone,
  Trash2,
  X,
} from "lucide-react"

import { LogoMark } from "@/components/app/logo"
import {
  ContactRow,
  Field,
  Group,
  ProfileStat,
  SheetAction,
} from "@/components/app/settings"
import { Sheet } from "@/components/app/sheet"
import { useToast } from "@/components/app/toast"
import { CURRENT_USER } from "@/lib/data"
import { useSession } from "@/lib/session"
import { isMine } from "@/lib/review"
import { useRequisitions } from "@/lib/store"

const CAN = [
  "Create and save draft requisitions",
  "Submit requisitions for review",
  "Track status and disbursement history",
  "Respond to requested changes",
  "Reconcile disbursed funds with receipts",
]

const CANNOT = [
  "Recommend or approve requisitions",
  "Disburse funds",
  "Sign off your own reconciliation",
  "Add other HODs or workers",
  "View other departments' requisitions",
]

export default function ProfilePage() {
  const { profile, updateProfile } = useSession()
  const { requisitions: all } = useRequisitions()
  const toast = useToast()
  const requisitions = all.filter(isMine)

  const [open, setOpen] = useState<string | null>("personal")
  const [editing, setEditing] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState(profile.phone)
  const [saved, setSaved] = useState(false)
  const [sheet, setSheet] = useState<"avatar" | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const submitted = requisitions.filter((r) => r.status !== "draft").length
  const disbursed = requisitions.filter((r) =>
    ["disbursed", "reconciliation_review", "reconciled"].includes(r.status),
  ).length
  const closed = requisitions.filter((r) => r.status === "reconciled").length

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
      {/* Same dark crown as the dashboard, so the two roots of the app match. */}
      <header className="header-deep rounded-b-[28px] px-5 pt-5 pb-16 md:rounded-2xl md:px-7 md:pt-6 md:pb-7 lg:px-8 lg:pt-7 lg:pb-8">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.09em] text-white/60 uppercase">
            <LogoMark className="size-4 text-white/80" />
            Your workspace
          </span>
          <span className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-white">
            {CURRENT_USER.roleShort}
          </span>
        </div>

        <div className="animate-rise mt-7 flex items-center gap-4 lg:mt-6">
          <button
            type="button"
            onClick={() => setSheet("avatar")}
            aria-label="Change profile photo"
            className="group relative shrink-0 cursor-pointer rounded-full"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                className="size-16 rounded-full object-cover ring-2 ring-white/25"
              />
            ) : (
              <span className="bg-brand/25 flex size-16 items-center justify-center rounded-full text-[19px] font-semibold tracking-[-0.01em] text-white ring-2 ring-white/25 transition-all duration-200 group-hover:ring-white/45">
                {CURRENT_USER.initials}
              </span>
            )}
            <span className="bg-brand absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full ring-[3px] ring-[#123a68] transition-transform duration-200 group-hover:scale-105 group-active:scale-90">
              <Camera className="size-3 text-white" strokeWidth={2.4} aria-hidden />
            </span>
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-[21px] leading-tight font-semibold tracking-[-0.025em] text-white">
              {CURRENT_USER.name}
            </h1>
            <p className="mt-1 truncate text-[12.5px] text-white/65">
              {CURRENT_USER.role} · {CURRENT_USER.department}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-white/45">{profile.email}</p>
          </div>
        </div>
      </header>

      {/* Straddles the crown's edge — the seam between the two grounds. */}
      <div className="-mt-9 px-4 lg:mt-5 md:px-0">
        <div className="card-flat grid grid-cols-3 shadow-raised">
          <ProfileStat label="Submitted" value={submitted} className="border-hairline border-r" />
          <ProfileStat label="Disbursed" value={disbursed} className="border-hairline border-r" />
          <ProfileStat label="Closed" value={closed} />
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
            <Field label="Full name" value={CURRENT_USER.name} locked />
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
            <Field
              label="Department / Unit"
              value={`${CURRENT_USER.department} · ${CURRENT_USER.unit}`}
              locked
            />
          </dl>
          <p className="text-ink-faint border-hairline mt-3 flex items-start gap-1.5 border-t pt-3 text-[11.5px] leading-[1.5]">
            <Lock className="mt-px size-3 shrink-0" strokeWidth={2} aria-hidden />
            Locked fields are maintained by your provincial administrator.
          </p>
        </Group>

        <Group
          title="Role & Responsibilities"
          open={open === "role"}
          onToggle={() => toggle("role")}
        >
          <dl className="divide-hairline divide-y">
            <Field label="Role" value={CURRENT_USER.role} />
            <Field label="Department" value={CURRENT_USER.department} />
            <Field label="Area" value={CURRENT_USER.area} />
            <Field label="Parish" value={CURRENT_USER.parish} />
          </dl>
          <p className="text-ink-soft border-hairline mt-3 border-t pt-3 text-[12px] leading-[1.5]">
            You raise, track and reconcile requisitions for this department. Recommendation and
            approval sit with the ANYP and NYP, and Finance disburses the funds.
          </p>
        </Group>

        <Group
          title="Contact Information"
          meta="How reviewers reach you"
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
            {CAN.map((item) => (
              <p key={item} className="flex gap-2.5 text-[13.5px] leading-[1.45]">
                <Check
                  className="text-st-good mt-0.5 size-4 shrink-0"
                  strokeWidth={2.4}
                  aria-hidden
                />
                <span className="text-ink">{item}</span>
              </p>
            ))}
            {CANNOT.map((item) => (
              <p key={item} className="flex gap-2.5 text-[13.5px] leading-[1.45]">
                <X className="text-ink-faint mt-0.5 size-4 shrink-0" strokeWidth={2.4} aria-hidden />
                <span className="text-ink-faint">{item}</span>
              </p>
            ))}
          </div>
        </Group>

        <div className="space-y-3.5">
          {/* Account controls moved to Settings; this is the way there on a
              phone, where five tabs will not fit. */}
          <Link
            href="/settings"
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

          <p className="text-ink-faint pt-1 text-center font-mono text-[11px]">
            Requisition · RCCG YAYA
          </p>
        </div>
      </div>

      <Sheet open={sheet === "avatar"} onClose={() => setSheet(null)} title="Profile photo">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              if (avatar) URL.revokeObjectURL(avatar)
              setAvatar(URL.createObjectURL(file))
            }
            event.target.value = ""
            setSheet(null)
          }}
        />
        <SheetAction
          icon={Camera}
          label="Take a photo"
          onClick={() => fileInput.current?.click()}
        />
        <SheetAction
          icon={Images}
          label="Choose from library"
          onClick={() => fileInput.current?.click()}
        />
        {avatar && (
          <SheetAction
            icon={Trash2}
            label="Remove photo"
            destructive
            onClick={() => {
              URL.revokeObjectURL(avatar)
              setAvatar(null)
              setSheet(null)
            }}
          />
        )}
      </Sheet>
    </>
  )
}
