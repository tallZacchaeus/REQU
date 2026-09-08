import Link from "next/link"

import { formatDateShort } from "@/lib/format"
import { STATUS } from "@/lib/status"
import { requisitionTotal, type Requisition } from "@/lib/types"

import { Money, StatusBadge } from "./primitives"
import { StageMeter } from "./stage-rail"

export function RequisitionCard({ requisition }: { requisition: Requisition }) {
  const meta = STATUS[requisition.status]
  const total = requisitionTotal(requisition)
  const href =
    requisition.status === "draft"
      ? `/requisitions/new?edit=${requisition.id}`
      : `/requisitions/${requisition.id}`

  return (
    <Link
      href={href}
      className="card-flat hover:border-ink-faint/40 block cursor-pointer px-4 py-3.5 transition-colors duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-ink truncate text-[15px] leading-tight font-semibold">
            {requisition.programme}
          </h3>
          <p className="text-ink-faint mt-1 font-mono text-[11px] tracking-tight">
            {requisition.reference}
          </p>
        </div>
        <StatusBadge status={requisition.status} className="mt-0.5 shrink-0" />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <Money value={total} size="md" />
        <p className="text-ink-soft text-right text-[12px] leading-tight">
          {requisition.submittedAt ? (
            <>Sub. {formatDateShort(requisition.submittedAt)}</>
          ) : (
            <>Created {formatDateShort(requisition.createdAt)}</>
          )}
          <span className="text-ink-faint block">
            Event {formatDateShort(requisition.programmeDate)}
          </span>
        </p>
      </div>

      <StageMeter stage={meta.stage} tone={meta.tone} className="mt-3" />
    </Link>
  )
}
