"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AtSign,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Images,
  KeyRound,
  Lock,
  LogOut,
  Monitor,
  Pencil,
  Phone,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"

import { LogoMark } from "@/components/app/logo"
import { MicroLabel } from "@/components/app/primitives"
import { Sheet } from "@/components/app/sheet"
import { Switch } from "@/components/app/switch"
import { CURRENT_USER } from "@/lib/data"
import { maskEmail, useSession } from "@/lib/session"
import { useRequisitions } from "@/lib/store"
import { cn } from "@/lib/utils"

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
  const router = useRouter()
  const { profile, updateProfile, signOut } = useSession()
  const { requisitions } = useRequisitions()

  const [open, setOpen] = useState<string | null>("personal")
  const [editing, setEditing] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState(profile.phone)
  const [saved, setSaved] = useState(false)
  const [sheet, setSheet] = useState<"avatar" | "security" | "signout" | null>(null)
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
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <>
      {/* Same dark crown as the dashboard, so the two roots of the app match. */}
      <header className="header-deep rounded-b-[28px] px-5 pt-5 pb-16">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.09em] text-white/60 uppercase">
            <LogoMark className="size-4 text-white/80" />
            Your workspace
          </span>
          <span className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-white">
            {CURRENT_USER.roleShort}
          </span>
        </div>

        <div className="animate-rise mt-7 flex items-center gap-4">
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
      <div className="-mt-9 px-4">
        <div className="card-flat grid grid-cols-3 shadow-raised">
          <Stat label="Submitted" value={submitted} className="border-hairline border-r" />
          <Stat label="Disbursed" value={disbursed} className="border-hairline border-r" />
          <Stat label="Closed" value={closed} />
        </div>
      </div>

      <div className="space-y-3.5 px-4 pt-5 pb-8">

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
            You raise, track and reconcile requisitions for this department. Recommendation,
            approval and disbursement sit with the AYP, NYP and Finance; Treasury signs off the
            reconciliation.
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
          title="Notification Preferences"
          open={open === "notify"}
          onToggle={() => toggle("notify")}
        >
          <div className="divide-hairline divide-y">
            <ToggleRow
              label="Status changes"
              hint="When a requisition is recommended, approved or returned."
              checked={profile.notifyStatus}
              onChange={(value) => updateProfile({ notifyStatus: value })}
            />
            <ToggleRow
              label="Reviewer comments"
              hint="When the AYP or NYP leaves a comment."
              checked={profile.notifyComments}
              onChange={(value) => updateProfile({ notifyComments: value })}
            />
            <ToggleRow
              label="Weekly digest"
              hint="A Monday summary of everything in flight."
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
            {CAN.map((item) => (
              <p key={item} className="flex gap-2.5 text-[13.5px] leading-[1.45]">
                <Check className="text-st-good mt-0.5 size-4 shrink-0" strokeWidth={2.4} aria-hidden />
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

        <p className="text-ink-faint pt-1 text-center font-mono text-[11px]">
          CWMS · Youth &amp; Young Adults · MVP
        </p>
      </div>

      {/* ---- Sheets ---- */}
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
        <SheetAction icon={Camera} label="Take a photo" onClick={() => fileInput.current?.click()} />
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
          You&apos;ll need a fresh sign-in link to get back in. Drafts stay saved.
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

/* -------------------------------------------------------------------- */

function Stat({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className={cn("px-3 py-3.5 text-center", className)}>
      <p className="text-ink text-[24px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      <p className="text-ink-soft mt-1.5 text-[12px]">{label}</p>
    </div>
  )
}

/**
 * Same shape as the disclosure on the requisition detail screen — h-11 header,
 * micro-label, rotating chevron — but controlled, because the header carries
 * the edit action.
 */
function Group({
  title,
  meta,
  open,
  onToggle,
  action,
  children,
}: {
  title: string
  meta?: string
  open: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="card-flat overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onToggle()
          }
        }}
        className="hover:bg-muted/60 flex h-11 cursor-pointer items-center justify-between gap-2 px-4 transition-colors duration-200 select-none"
      >
        <MicroLabel>{title}</MicroLabel>
        <span className="flex items-center gap-2">
          {action}
          {meta && !action && <span className="text-ink-faint text-[12px]">{meta}</span>}
          <ChevronDown
            className={cn(
              "text-ink-faint size-4 shrink-0 transition-transform duration-300",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </div>

      {/* 0fr -> 1fr animates the real content height with nothing measured. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-hairline border-t px-4 py-3">{children}</div>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, locked = false }: { label: string; value: string; locked?: boolean }) {
  return (
    <div className="py-2.5">
      <dt className="text-ink-faint flex items-center gap-1.5 text-[12px] font-medium">
        {label}
        {locked && <Lock className="size-3" strokeWidth={2.2} aria-label="Read only" />}
      </dt>
      <dd className={cn("mt-0.5 text-[15px] leading-[1.45]", locked ? "text-ink-soft" : "text-ink")}>
        {value}
      </dd>
    </div>
  )
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: string
  href: string
}) {
  return (
    <a
      href={href}
      className="border-hairline hover:border-ink-faint/40 mb-2 flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors duration-200 last:mb-0"
    >
      <Icon className="text-ink-faint size-4 shrink-0" strokeWidth={1.9} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="text-ink-faint block text-[11.5px]">{label}</span>
        <span className="text-ink block truncate text-[14px]">{value}</span>
      </span>
      <ChevronRight className="text-ink-faint size-4 shrink-0" aria-hidden />
    </a>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-ink text-[14px] font-medium">{label}</p>
        <p className="text-ink-faint mt-0.5 text-[12px] leading-[1.45]">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

function SheetAction({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-muted flex h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-[14.5px] font-medium transition-colors duration-200",
        destructive ? "text-st-bad" : "text-ink",
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.9} />
      {label}
    </button>
  )
}

function SheetRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-ink-soft text-[13px]">{label}</dt>
      <dd className="text-ink text-right text-[13px] font-medium">{value}</dd>
    </div>
  )
}
