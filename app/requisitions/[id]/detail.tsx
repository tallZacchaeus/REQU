"use client"

import Link from "next/link"
import { Paperclip, Pencil, ReceiptText, TriangleAlert } from "lucide-react"

import { ScreenHeader } from "@/components/app/screen-header"
import {
  DetailRow,
  Disclosure,
  MicroLabel,
  Money,
  Section,
  StatusBadge,
} from "@/components/app/primitives"
import { StageMeter, StageRail } from "@/components/app/stage-rail"
import { amountInWords, formatDate, durationSince } from "@/lib/format"
import { isMine } from "@/lib/review"
import { buildStages, STAGE_COUNT, STATUS } from "@/lib/status"
import { useRequisitions } from "@/lib/store"
import { reconciledTotal, reconciliationVariance, requisitionTotal } from "@/lib/types"
import { cn } from "@/lib/utils"

export function RequisitionDetail({ id }: { id: string }) {
  const { getById, hydrated } = useRequisitions()
  const found = getById(id)
  const requisition = found && isMine(found) ? found : undefined

  if (!requisition) {
    return (
      <>
        <ScreenHeader title="Requisition" back="/requisitions" />
        <div className="px-4 py-16 text-center">
          <p className="text-ink text-[15px] font-semibold">
            {hydrated ? "Requisition not found" : "Loading…"}
          </p>
          {hydrated && (
            <Link href="/requisitions" className="text-primary mt-2 inline-block text-[13px] font-semibold hover:underline">
              Back to my requisitions
            </Link>
          )}
        </div>
      </>
    )
  }

  const meta = STATUS[requisition.status]
  const total = requisitionTotal(requisition)
  const stages = buildStages(requisition.status, requisition.stageDates)
  const returnedComment = requisition.comments.find((c) => c.requestedChanges?.length)
  const isReturned = requisition.status === "changes_requested"
  const isRejected = requisition.status === "rejected"
  const live = stages.find((s) => s.state === "current" || s.state === "blocked")
  const reconciliation = requisition.reconciliation
  const spent = reconciledTotal(requisition)
  const variance = reconciliationVariance(requisition)
  // Time at the live stage runs from the last stage that actually completed,
  // not from an early one that happens to have a date.
  const enteredStageAt = Object.values(requisition.stageDates)
    .filter(Boolean)
    .sort()
    .at(-1)

  return (
    <>
      <ScreenHeader title={requisition.programme} back="/requisitions" />

      {/* Mobile keeps the summary on top; desktop moves it into a rail so
          the breakdown and the decision are visible at the same time. */}
      <div className="flex flex-col gap-4 px-4 pt-4 pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:px-0 lg:pt-0">
        <aside className="order-1 flex flex-col gap-4 lg:order-2 lg:sticky lg:top-6">
          {/* Amount first. It is the subject of the record, not a subtitle. */}
          <div className="card-flat px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-ink-faint font-mono text-[11.5px] tracking-tight">
                {requisition.reference}
              </p>
              <StatusBadge status={requisition.status} forceChip className="shrink-0" />
            </div>

            <Money value={total} size="lg" className="mt-2.5 block" />
            <p className="text-ink-soft mt-1 text-[12.5px] leading-[1.45]">{meta.detail}</p>

            <div className="border-hairline mt-3.5 border-t pt-3.5">
              <div className="mb-2 flex items-baseline justify-between">
                <MicroLabel>Stage {meta.stage + (isReturned || isRejected ? 0 : 1)} of {STAGE_COUNT}</MicroLabel>
                {live?.state === "current" && enteredStageAt && (
                  <span className="text-ink-faint text-[11.5px]">
                    {durationSince(enteredStageAt)} at this stage
                  </span>
                )}
              </div>
              <StageMeter stage={meta.stage} tone={meta.tone} />
            </div>
          </div>

          {/* Changes requested / rejected: the reviewer's words, verbatim. */}
          {isReturned && returnedComment && (
            <ReturnedNotice
              id={requisition.id}
              author={returnedComment.author}
              role={returnedComment.role}
              date={returnedComment.date}
              body={returnedComment.body}
              changes={returnedComment.requestedChanges ?? []}
            />
          )}

          {/* Money is out; the transaction only closes when it is accounted for. */}
          {requisition.status === "disbursed" && (
            <ReconcileNotice
              id={requisition.id}
              amount={total}
              date={requisition.stageDates.disbursed}
            />
          )}

          {isRejected && requisition.comments[0] && (
            <div className="border-st-bad/25 bg-st-bad-bg rounded-xl border px-4 py-3.5">
              <p className="text-st-bad flex items-center gap-2 text-[13.5px] font-semibold">
                <TriangleAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                Requisition rejected
              </p>
              <p className="text-ink mt-2 text-[13.5px] leading-[1.55]">
                &ldquo;{requisition.comments[0].body}&rdquo;
              </p>
              <p className="text-ink-soft mt-2 text-[12px]">
                {requisition.comments[0].author} · {formatDate(requisition.comments[0].date)}
              </p>
            </div>
          )}

          <Section title="Approval Workflow">
            <StageRail stages={stages} rejected={isRejected} />
          </Section>

        </aside>

        <div className="order-2 flex flex-col gap-4 lg:order-1">
          <Disclosure title="Programme Details" defaultOpen>
            <dl className="divide-hairline divide-y">
              <DetailRow label="Programme / Project" value={requisition.programme} />
              <DetailRow label="Programme date" value={formatDate(requisition.programmeDate)} />
              <DetailRow label="Location" value={requisition.location} />
              <DetailRow label="Department / Unit" value={requisition.department} />
              <DetailRow label="Purpose" value={requisition.purpose} />
            </dl>
          </Disclosure>

          <Disclosure title="Expense Breakdown" meta={`${requisition.items.length} items`}>
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

          {reconciliation && (
            <Disclosure
              title="Reconciliation"
              meta={requisition.status === "reconciled" ? "Closed" : "With Treasury"}
              defaultOpen={requisition.status !== "reconciled"}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-hairline border-b">
                    <th className="label-micro pb-2 text-left font-semibold">Line</th>
                    <th className="label-micro pb-2 text-right font-semibold">Budget</th>
                    <th className="label-micro pb-2 text-right font-semibold">Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-hairline divide-y">
                  {requisition.items.map((item) => {
                    const actual = reconciliation.actuals[item.id] ?? 0
                    return (
                      <tr key={item.id}>
                        <td className="text-ink py-2.5 pr-3 text-[13.5px] leading-[1.4]">
                          {item.description}
                        </td>
                        <td className="text-ink-faint py-2.5 text-right text-[13px] tabular-nums">
                          {item.amount.toLocaleString("en-NG")}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 pl-3 text-right text-[13.5px] font-semibold tabular-nums",
                            actual > item.amount ? "text-st-action" : "text-ink",
                          )}
                        >
                          {actual.toLocaleString("en-NG")}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-ink/15 border-t-2">
                    <td className="pt-3">
                      <MicroLabel>Total</MicroLabel>
                    </td>
                    <td className="text-ink-faint pt-3 text-right text-[13px] tabular-nums">
                      {total.toLocaleString("en-NG")}
                    </td>
                    <td className="pt-3 pl-3 text-right">
                      <Money value={spent} size="sm" />
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div
                className={cn(
                  "mt-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5",
                  variance === 0 ? "bg-st-good-bg" : variance < 0 ? "bg-st-action-bg" : "bg-st-motion-bg",
                )}
              >
                <span
                  className={cn(
                    "text-[12.5px] font-semibold",
                    variance === 0 ? "text-st-good" : variance < 0 ? "text-st-action" : "text-st-motion",
                  )}
                >
                  {variance === 0
                    ? "Fully accounted for"
                    : variance < 0
                      ? "Overspent"
                      : "Returned to Treasury"}
                </span>
                <span
                  className={cn(
                    "text-[15px] font-semibold tabular-nums",
                    variance === 0 ? "text-st-good" : variance < 0 ? "text-st-action" : "text-st-motion",
                  )}
                >
                  ₦{Math.abs(variance).toLocaleString("en-NG")}
                </span>
              </div>

              <MicroLabel className="mt-4 mb-2">Receipts ({reconciliation.receipts.length})</MicroLabel>
              <ul className="divide-hairline divide-y">
                {reconciliation.receipts.map((file) => (
                  <li key={file.id} className="flex items-center gap-2.5 py-2.5">
                    <Paperclip className="text-ink-faint size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                    <span className="text-ink min-w-0 flex-1 truncate text-[13.5px]">{file.name}</span>
                    <span className="text-ink-faint shrink-0 text-[11.5px]">{file.size}</span>
                  </li>
                ))}
              </ul>

              {reconciliation.note && (
                <>
                  <MicroLabel className="mt-4 mb-1.5">Note</MicroLabel>
                  <p className="text-ink text-[13.5px] leading-[1.55]">{reconciliation.note}</p>
                </>
              )}

              <p className="text-ink-faint border-hairline mt-3 border-t pt-3 text-[11.5px]">
                Filed {formatDate(reconciliation.submittedAt)}
              </p>
            </Disclosure>
          )}

          <Disclosure title="Attachments" meta={`${requisition.attachments.length}`}>
            {requisition.attachments.length === 0 ? (
              <p className="text-ink-faint py-1 text-[13px]">No documents attached.</p>
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

          <Disclosure
            title="Comments & Activity"
            meta={`${requisition.comments.length + requisition.activity.length}`}
          >
            {requisition.comments.length > 0 && (
              <ul className="mb-4 space-y-3">
                {requisition.comments.map((comment) => (
                  <li key={comment.id} className="bg-muted rounded-lg px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-ink text-[13px] font-semibold">{comment.author}</p>
                      <p className="text-ink-faint shrink-0 text-[11.5px]">
                        {formatDate(comment.date)}
                      </p>
                    </div>
                    <p className="text-ink-faint text-[11.5px]">{comment.role}</p>
                    <p className="text-ink mt-1.5 text-[13.5px] leading-[1.5]">{comment.body}</p>
                  </li>
                ))}
              </ul>
            )}

            <MicroLabel className="mb-2">History</MicroLabel>
            <ul className="space-y-2">
              {[...requisition.activity].reverse().map((entry) => (
                <li key={entry.id} className="flex gap-2.5 text-[13px]">
                  <span className="text-ink-faint w-[52px] shrink-0 text-[11.5px] tabular-nums">
                    {formatDate(entry.date).replace(/ \d{4}$/, "")}
                  </span>
                  <span className="text-ink flex-1">
                    {entry.action} <span className="text-ink-soft">· {entry.actor}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Disclosure>

          {/* Permission boundary, stated plainly rather than left implicit. */}
          <p className="text-ink-faint px-1 text-[11.5px] leading-[1.5]">
            As Head of Department you raise, track, revise and reconcile your own requisitions.
            Recommendation, approval and disbursement are carried out by the AYP, NYP and Finance;
            Treasury verifies the reconciliation that closes it.
          </p>
        </div>
      </div>
    </>
  )
}

function ReturnedNotice({
  id,
  author,
  role,
  date,
  body,
  changes,
}: {
  id: string
  author: string
  role: string
  date: string
  body: string
  changes: string[]
}) {
  return (
    <div className="border-st-action/25 bg-st-action-bg overflow-hidden rounded-xl border">
      <div className="border-st-action/15 flex items-center gap-2 border-b px-4 py-3">
        <TriangleAlert className="text-st-action size-4 shrink-0" strokeWidth={2.2} aria-hidden />
        <p className="text-st-action text-[13.5px] font-semibold">Changes requested</p>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-ink text-[13px] font-semibold">{author}</p>
          <p className="text-ink-soft shrink-0 text-[11.5px]">{formatDate(date)}</p>
        </div>
        <p className="text-ink-soft text-[11.5px]">{role}</p>

        <blockquote className="border-st-action/40 text-ink mt-2.5 border-l-2 pl-3 text-[13.5px] leading-[1.55]">
          {body}
        </blockquote>

        {changes.length > 0 && (
          <>
            <MicroLabel className="mt-4 mb-2">What needs to change</MicroLabel>
            <ol className="space-y-2">
              {changes.map((change, index) => (
                <li key={change} className="flex gap-2.5">
                  <span className="bg-st-action/15 text-st-action mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                    {index + 1}
                  </span>
                  <span className="text-ink text-[13.5px] leading-[1.5]">{change}</span>
                </li>
              ))}
            </ol>
          </>
        )}

        <Link
          href={`/requisitions/new?edit=${id}`}
          className="bg-st-action mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[14.5px] font-semibold text-white transition-opacity duration-200 hover:opacity-90"
        >
          <Pencil className="size-4" strokeWidth={2.2} aria-hidden />
          Edit &amp; Resubmit
        </Link>
      </div>
    </div>
  )
}

function ReconcileNotice({
  id,
  amount,
  date,
}: {
  id: string
  amount: number
  date?: string
}) {
  return (
    <div className="border-st-action/25 bg-st-action-bg overflow-hidden rounded-xl border">
      <div className="border-st-action/15 flex items-center gap-2 border-b px-4 py-3">
        <ReceiptText className="text-st-action size-4 shrink-0" strokeWidth={2.2} aria-hidden />
        <p className="text-st-action text-[13.5px] font-semibold">Reconciliation due</p>
      </div>

      <div className="px-4 py-3.5">
        <p className="text-ink text-[13.5px] leading-[1.55]">
          <Money value={amount} size="sm" /> was released to you
          {date && <> on {formatDate(date)}</>}. Record what each line actually cost and attach the
          receipts to close this requisition.
        </p>

        <Link
          href={`/requisitions/${id}/reconcile`}
          className="bg-st-action mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[14.5px] font-semibold text-white transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.99]"
        >
          <ReceiptText className="size-4" strokeWidth={2.2} aria-hidden />
          Reconcile funds
        </Link>
      </div>
    </div>
  )
}
