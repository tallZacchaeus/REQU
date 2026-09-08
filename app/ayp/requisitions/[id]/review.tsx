"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Paperclip, Plus, ThumbsUp, Trash2, Undo2 } from "lucide-react"

import {
  DetailRow,
  Disclosure,
  MicroLabel,
  Money,
  Section,
  StatusBadge,
  StickyFooter,
} from "@/components/app/primitives"
import { ScreenHeader } from "@/components/app/screen-header"
import { Sheet } from "@/components/app/sheet"
import { StageRail } from "@/components/app/stage-rail"
import { AYP_USER } from "@/lib/data"
import { amountInWords, formatDate } from "@/lib/format"
import { waitingDays } from "@/lib/review"
import { buildStages, STATUS } from "@/lib/status"
import { isoToday, newId } from "@/lib/ids"
import { useRequisitions } from "@/lib/store"
import { requisitionTotal, type Requisition } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ReviewDetail({ id }: { id: string }) {
  const { getById, hydrated } = useRequisitions()
  const requisition = getById(id)

  if (!hydrated || !requisition || requisition.status === "draft") {
    return (
      <>
        <ScreenHeader title="Review Requisition" back="/ayp/queue" />
        <div className="px-4 py-16 text-center">
          <p className="text-ink text-[15px] font-semibold">
            {hydrated ? "Requisition not available" : "Loading…"}
          </p>
          {hydrated && (
            <Link
              href="/ayp/queue"
              className="text-primary mt-2 inline-block text-[13px] font-semibold hover:underline"
            >
              Back to the queue
            </Link>
          )}
        </div>
      </>
    )
  }

  return <Review key={requisition.id} requisition={requisition} />
}

function Review({ requisition }: { requisition: Requisition }) {
  const router = useRouter()
  const { upsert } = useRequisitions()
  const [sheet, setSheet] = useState<"recommend" | "changes" | null>(null)
  const [note, setNote] = useState("")
  const [comment, setComment] = useState("")
  const [changes, setChanges] = useState<string[]>([""])
  const [showErrors, setShowErrors] = useState(false)
  const [pending, setPending] = useState(false)

  const total = requisitionTotal(requisition)
  const meta = STATUS[requisition.status]
  const stages = buildStages(requisition.status, requisition.stageDates)
  const actionable = requisition.status === "under_review"
  const days = waitingDays(requisition)
  const today = isoToday()

  function recommend() {
    if (pending) return
    setPending(true)
    upsert({
      ...requisition,
      status: "awaiting_approval",
      stageDates: { ...requisition.stageDates, recommended: today },
      comments: [
        ...requisition.comments,
        {
          id: newId("c"),
          author: AYP_USER.name,
          role: AYP_USER.role,
          date: today,
          body:
            note.trim() ||
            "Reviewed and in order. Recommending to the National Youth Pastor for approval.",
        },
      ],
      activity: [
        ...requisition.activity,
        {
          id: newId("e"),
          date: today,
          actor: AYP_USER.name,
          action: "Recommended",
        },
      ],
    })
    router.push("/ayp/queue")
  }

  function requestChanges() {
    const items = changes.map((c) => c.trim()).filter(Boolean)
    if (comment.trim().length < 10 || items.length === 0) {
      setShowErrors(true)
      return
    }
    if (pending) return
    setPending(true)
    upsert({
      ...requisition,
      status: "changes_requested",
      comments: [
        ...requisition.comments,
        {
          id: newId("c"),
          author: AYP_USER.name,
          role: AYP_USER.role,
          date: today,
          body: comment.trim(),
          requestedChanges: items,
        },
      ],
      activity: [
        ...requisition.activity,
        {
          id: newId("e"),
          date: today,
          actor: AYP_USER.name,
          action: "Requested changes",
        },
      ],
    })
    router.push("/ayp/queue")
  }

  return (
    <>
      <ScreenHeader title="Review Requisition" back="/ayp/queue" />

      <div className="flex-1 space-y-4 px-4 pt-4 pb-6">
        {/* Who is asking comes first — the reviewer's frame, not the HOD's. */}
        <div className="card-flat flex items-center gap-3 px-4 py-3.5">
          <span className="bg-muted text-ink-soft flex size-11 shrink-0 items-center justify-center rounded-full text-[13.5px] font-semibold">
            {requisition.requester.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-ink truncate text-[15px] leading-tight font-semibold">
              {requisition.requester.name}
            </p>
            <p className="text-ink-soft mt-0.5 truncate text-[12px]">
              {requisition.requester.unit}
            </p>
          </div>
          {actionable && (
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[11.5px] font-semibold",
                days >= 7 ? "bg-st-action-bg text-st-action" : "bg-muted text-ink-soft",
              )}
            >
              {days === 0 ? "Today" : `${days}d wait`}
            </span>
          )}
        </div>

        <div className="card-flat px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-ink-faint font-mono text-[11.5px] tracking-tight">
              {requisition.reference}
            </p>
            <StatusBadge status={requisition.status} forceChip className="shrink-0" />
          </div>
          <h2 className="text-ink mt-2 text-[17px] leading-tight font-semibold tracking-[-0.015em]">
            {requisition.programme}
          </h2>
          <Money value={total} size="lg" className="mt-2 block" />
          <p className="text-ink-soft mt-1 text-[12.5px] leading-[1.45]">
            {actionable ? "Awaiting your recommendation" : meta.detail}
          </p>
        </div>

        <Disclosure title="Programme Details" defaultOpen>
          <dl className="divide-hairline divide-y">
            <DetailRow label="Programme / Project" value={requisition.programme} />
            <DetailRow label="Programme date" value={formatDate(requisition.programmeDate)} />
            <DetailRow label="Location" value={requisition.location} />
            <DetailRow label="Department / Unit" value={requisition.department} />
            <DetailRow label="Purpose" value={requisition.purpose} />
          </dl>
        </Disclosure>

        {/* Open by default: nobody should recommend a figure they didn't read. */}
        <Disclosure title="Expense Breakdown" meta={`${requisition.items.length} items`} defaultOpen>
          <table className="w-full">
            <tbody className="divide-hairline divide-y">
              {requisition.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="text-ink-faint w-6 py-2.5 align-top font-mono text-[11.5px]">
                    {index + 1}
                  </td>
                  <td className="text-ink py-2.5 pr-3 text-[14px] leading-[1.4]">
                    {item.description}
                  </td>
                  <td className="py-2.5 text-right align-top">
                    <Money value={item.amount} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-ink/15 border-t-2">
                <td colSpan={2} className="pt-3">
                  <MicroLabel>Total Requested</MicroLabel>
                </td>
                <td className="pt-3 text-right">
                  <Money value={total} size="md" />
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="text-ink-soft border-hairline mt-3 border-t pt-3 text-[12.5px] leading-[1.5] italic">
            {amountInWords(total)}
          </p>
        </Disclosure>

        <Disclosure title="Attachments" meta={`${requisition.attachments.length}`}>
          {requisition.attachments.length === 0 ? (
            <p className="text-ink-faint py-1 text-[13px]">
              No documents attached — worth asking for a quotation.
            </p>
          ) : (
            <ul className="divide-hairline divide-y">
              {requisition.attachments.map((file) => (
                <li key={file.id} className="flex items-center gap-2.5 py-2.5">
                  <Paperclip className="text-ink-faint size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                  <span className="text-ink min-w-0 flex-1 truncate text-[13.5px]">{file.name}</span>
                  <span className="text-ink-faint shrink-0 text-[11.5px]">{file.size}</span>
                </li>
              ))}
            </ul>
          )}
        </Disclosure>

        <Section title="Approval Workflow">
          <StageRail stages={stages} rejected={requisition.status === "rejected"} />
        </Section>

        {requisition.comments.length > 0 && (
          <Disclosure title="Review History" meta={`${requisition.comments.length}`}>
            <ul className="space-y-3">
              {requisition.comments.map((c) => (
                <li key={c.id} className="bg-muted rounded-lg px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-ink text-[13px] font-semibold">{c.author}</p>
                    <p className="text-ink-faint shrink-0 text-[11.5px]">{formatDate(c.date)}</p>
                  </div>
                  <p className="text-ink-faint text-[11.5px]">{c.role}</p>
                  <p className="text-ink mt-1.5 text-[13.5px] leading-[1.5]">{c.body}</p>
                </li>
              ))}
            </ul>
          </Disclosure>
        )}

        <p className="text-ink-faint px-1 text-[11.5px] leading-[1.5]">
          As Assistant National Youth Pastor you recommend or return requisitions. Final approval
          rests with the National Youth Pastor, and disbursement with Finance and Treasury.
        </p>
      </div>

      {actionable ? (
        <StickyFooter note={`Recommending sends this to ${AYP_USER.approver} for approval.`}>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setSheet("changes")}
              className="border-st-action/35 text-st-action hover:bg-st-action-bg flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border text-[14px] font-semibold transition-colors duration-200"
            >
              <Undo2 className="size-4" strokeWidth={2.2} aria-hidden />
              Request changes
            </button>
            <button
              type="button"
              onClick={() => setSheet("recommend")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-[14.5px] font-semibold transition-[background-color,transform] duration-200 active:scale-[0.99]"
            >
              <ThumbsUp className="size-4" strokeWidth={2.2} aria-hidden />
              Recommend
            </button>
          </div>
        </StickyFooter>
      ) : (
        <StickyFooter>
          <p className="text-ink-soft flex items-center justify-center gap-2 py-1 text-[13px]">
            <Check className="text-st-good size-4" strokeWidth={2.4} aria-hidden />
            You have already actioned this requisition.
          </p>
        </StickyFooter>
      )}

      {/* ---- Recommend ---- */}
      <Sheet open={sheet === "recommend"} onClose={() => setSheet(null)} title="Recommend requisition">
        <p className="text-ink-soft text-[13.5px] leading-[1.55]">
          <span className="text-ink font-medium">{requisition.programme}</span> —{" "}
          <Money value={total} size="sm" /> will go to {AYP_USER.approver} for approval.
        </p>

        <label className="mt-4 block">
          <span className="text-ink mb-1.5 block text-[13px] font-semibold">
            Note for the NYP <span className="text-ink-faint font-normal">(optional)</span>
          </span>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything the approver should know."
            className="border-input bg-card text-ink placeholder:text-ink-faint/80 focus:border-brand focus:ring-brand/20 w-full resize-none rounded-lg border px-3 py-2.5 text-[16px] leading-[1.5] transition-[border-color,box-shadow] duration-200 outline-none focus:ring-3"
          />
        </label>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => setSheet(null)}
            className="border-input text-ink hover:bg-muted h-12 flex-1 cursor-pointer rounded-lg border text-[14.5px] font-semibold transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={recommend}
            disabled={pending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-[14.5px] font-semibold transition-[background-color,transform] duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            <ThumbsUp className="size-4" strokeWidth={2.2} aria-hidden />
            Recommend
          </button>
        </div>
      </Sheet>

      {/* ---- Request changes ---- */}
      <Sheet open={sheet === "changes"} onClose={() => setSheet(null)} title="Request changes">
        <p className="text-ink-soft text-[13.5px] leading-[1.55]">
          This goes back to {requisition.requester.name}. Be specific — they can only fix what you
          name.
        </p>

        <label className="mt-4 block">
          <span className="text-ink mb-1.5 block text-[13px] font-semibold">Your comment</span>
          <textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Explain what is unclear or missing."
            className={cn(
              "bg-card text-ink placeholder:text-ink-faint/80 w-full resize-none rounded-lg border px-3 py-2.5 text-[16px] leading-[1.5] transition-[border-color,box-shadow] duration-200 outline-none focus:ring-3",
              showErrors && comment.trim().length < 10
                ? "border-st-bad focus:border-st-bad focus:ring-st-bad/15"
                : "border-input focus:border-brand focus:ring-brand/20",
            )}
          />
        </label>

        <div className="mt-4">
          <MicroLabel className="mb-2">What needs to change</MicroLabel>
          <div className="space-y-2">
            {changes.map((value, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="bg-st-action/15 text-st-action flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                  {index + 1}
                </span>
                <input
                  value={value}
                  onChange={(event) =>
                    setChanges((c) => c.map((v, i) => (i === index ? event.target.value : v)))
                  }
                  placeholder="e.g. Attach a second quotation"
                  className="border-input bg-card text-ink placeholder:text-ink-faint/80 focus:border-brand focus:ring-brand/20 h-11 w-full rounded-lg border px-3 text-[16px] transition-[border-color,box-shadow] duration-200 outline-none focus:ring-3"
                />
                {changes.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove point ${index + 1}`}
                    onClick={() => setChanges((c) => c.filter((_, i) => i !== index))}
                    className="text-ink-faint hover:text-st-bad flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-200"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.8} aria-hidden />
                  </button>
                )}
              </div>
            ))}
          </div>
          {changes.length < 4 && (
            <button
              type="button"
              onClick={() => setChanges((c) => [...c, ""])}
              className="border-hairline text-primary hover:border-primary/40 mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed text-[13.5px] font-semibold transition-colors duration-200"
            >
              <Plus className="size-3.5" strokeWidth={2.4} aria-hidden />
              Add another point
            </button>
          )}
        </div>

        {showErrors && (comment.trim().length < 10 || changes.every((c) => !c.trim())) && (
          <p className="text-st-bad mt-3 text-[12.5px]">
            Add a comment and at least one specific change.
          </p>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => setSheet(null)}
            className="border-input text-ink hover:bg-muted h-12 flex-1 cursor-pointer rounded-lg border text-[14.5px] font-semibold transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={requestChanges}
            disabled={pending}
            className="bg-st-action flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-[14.5px] font-semibold text-white transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
          >
            <Undo2 className="size-4" strokeWidth={2.2} aria-hidden />
            Send back
          </button>
        </div>
      </Sheet>
    </>
  )
}
