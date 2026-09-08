"use client"

import { Check, LogOut, Shield, X } from "lucide-react"

import { MicroLabel } from "@/components/app/primitives"
import { CURRENT_USER } from "@/lib/data"
import { useRequisitions } from "@/lib/store"

const CAN = [
  "Create and save draft requisitions",
  "Submit requisitions for review",
  "Track status and disbursement history",
  "Respond to requested changes",
]

const CANNOT = [
  "Recommend or approve requisitions",
  "Disburse funds",
  "Add other HODs or workers",
  "View other departments' requisitions",
]

export default function ProfilePage() {
  const { requisitions } = useRequisitions()
  const submitted = requisitions.filter((r) => r.status !== "draft").length

  return (
    <>
      <header className="border-hairline bg-card sticky top-0 z-20 flex h-14 items-center border-b px-4">
        <h1 className="text-ink text-[17px] font-semibold tracking-[-0.01em]">Profile</h1>
      </header>

      <div className="space-y-4 px-4 pt-5 pb-8">
        <div className="card-flat flex items-center gap-3.5 px-4 py-4">
          <span className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold">
            {CURRENT_USER.initials}
          </span>
          <div className="min-w-0">
            <p className="text-ink truncate text-[16px] font-semibold tracking-[-0.01em]">
              {CURRENT_USER.name}
            </p>
            <p className="text-ink-soft mt-0.5 text-[12.5px]">{CURRENT_USER.role}</p>
            <p className="text-ink-faint mt-0.5 text-[12px]">
              {CURRENT_USER.department} · {CURRENT_USER.unit}
            </p>
          </div>
        </div>

        <div className="card-flat">
          <div className="border-hairline flex h-11 items-center border-b px-4">
            <MicroLabel>Approval Line</MicroLabel>
          </div>
          <dl className="divide-hairline divide-y px-4">
            <div className="flex items-baseline justify-between gap-3 py-3">
              <dt className="text-ink-soft text-[13px]">Recommends</dt>
              <dd className="text-ink text-right text-[13.5px] font-medium">
                {CURRENT_USER.reviewer}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-3">
              <dt className="text-ink-soft text-[13px]">Approves</dt>
              <dd className="text-ink text-right text-[13.5px] font-medium">
                {CURRENT_USER.approver}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-3">
              <dt className="text-ink-soft text-[13px]">Requisitions submitted</dt>
              <dd className="text-ink text-right text-[13.5px] font-medium tabular-nums">
                {submitted}
              </dd>
            </div>
          </dl>
        </div>

        {/* Permissions stated openly — an admin system should be legible. */}
        <div className="card-flat">
          <div className="border-hairline flex h-11 items-center gap-2 border-b px-4">
            <Shield className="text-ink-faint size-3.5" strokeWidth={2} aria-hidden />
            <MicroLabel>Your Permissions</MicroLabel>
          </div>
          <div className="space-y-2 px-4 py-3.5">
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
        </div>

        <button
          type="button"
          className="border-hairline bg-card text-ink hover:border-st-bad/40 hover:text-st-bad flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border text-[14px] font-semibold transition-colors duration-200"
        >
          <LogOut className="size-4" strokeWidth={2} aria-hidden />
          Sign out
        </button>

        <p className="text-ink-faint pt-1 text-center font-mono text-[11px]">CWMS · MVP build</p>
      </div>
    </>
  )
}
