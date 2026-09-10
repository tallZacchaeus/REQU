"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Paperclip, ReceiptText, Trash2, TriangleAlert, Upload } from "lucide-react"

import { AmountField, TextAreaField } from "@/components/app/fields"
import { AnimatedMoney } from "@/components/app/motion"
import { SkeletonRows } from "@/components/app/motion"
import { MicroLabel, Money, StickyFooter } from "@/components/app/primitives"
import { ScreenHeader } from "@/components/app/screen-header"
import { useToast } from "@/components/app/toast"
import { isoToday, newId } from "@/lib/ids"
import { isMine } from "@/lib/review"
import { useRequisitions } from "@/lib/store"
import { requisitionTotal, type Attachment, type Requisition } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ReconcileForm({ id }: { id: string }) {
  const { getById, hydrated } = useRequisitions()
  const found = getById(id)
  const requisition = found && isMine(found) ? found : undefined

  if (!hydrated || !requisition) {
    return (
      <>
        <ScreenHeader title="Reconciliation" back={`/requisitions/${id}`} />
        {!hydrated ? (
          <div className="px-4 pt-5">
            <SkeletonRows rows={3} />
          </div>
        ) : (
          <div className="px-4 py-16 text-center">
            <p className="text-ink text-[15px] font-semibold">Requisition not found</p>
            <Link
              href="/requisitions"
              className="text-primary mt-2 inline-block text-[13px] font-semibold hover:underline"
            >
              Back to my requisitions
            </Link>
          </div>
        )}
      </>
    )
  }

  return <Form key={requisition.id} requisition={requisition} />
}

function Form({ requisition }: { requisition: Requisition }) {
  const router = useRouter()
  const { upsert } = useRequisitions()
  const toast = useToast()

  const disbursed = requisitionTotal(requisition)
  // Pre-filled with the budget: most lines land on it, so the HOD only edits
  // the ones that moved.
  const [actuals, setActuals] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      requisition.items.map((item) => [
        item.id,
        requisition.reconciliation?.actuals[item.id] ?? item.amount,
      ]),
    ),
  )
  const [receipts, setReceipts] = useState<Attachment[]>(requisition.reconciliation?.receipts ?? [])
  const [note, setNote] = useState(requisition.reconciliation?.note ?? "")
  const [showErrors, setShowErrors] = useState(false)
  const [pending, setPending] = useState(false)

  const spent = useMemo(
    () => requisition.items.reduce((sum, item) => sum + (actuals[item.id] ?? 0), 0),
    [actuals, requisition.items],
  )
  const variance = disbursed - spent
  const overspent = variance < 0
  // An unexplained gap either way is what Finance will bounce it for.
  const needsNote = variance !== 0 && note.trim().length < 10
  const valid = spent > 0 && receipts.length > 0 && !needsNote

  function submit() {
    if (pending) return
    if (!valid) {
      setShowErrors(true)
      return
    }
    setPending(true)
    const today = isoToday()
    upsert({
      ...requisition,
      status: "reconciliation_review",
      reconciliation: { actuals, receipts, note: note.trim(), submittedAt: today },
      activity: [
        ...requisition.activity,
        {
          id: newId("e"),
          date: today,
          actor: "You",
          action: "Filed reconciliation",
        },
      ],
    })
    toast("Reconciliation filed — Finance will check your receipts")
    router.push(`/requisitions/${requisition.id}`)
  }

  return (
    <>
      <ScreenHeader title="Reconcile Funds" back={`/requisitions/${requisition.id}`} />

      <div className="flex-1 space-y-4 px-4 pt-4 pb-6 lg:mx-auto lg:w-full lg:max-w-[680px] lg:px-0">
        <div className="card-flat px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <MicroLabel>Amount Disbursed</MicroLabel>
            <span className="text-ink-faint font-mono text-[11.5px]">{requisition.reference}</span>
          </div>
          <Money value={disbursed} size="lg" className="mt-2 block" />
          <p className="text-ink-soft mt-1.5 text-[12.5px] leading-[1.5]">
            Enter what each line actually cost and attach the receipts. Finance checks this before
            the requisition is closed.
          </p>
        </div>

        <section className="card-flat overflow-hidden">
          <div className="border-hairline flex h-11 items-center justify-between border-b px-4">
            <MicroLabel>Actual Spend</MicroLabel>
            <span className="text-ink-faint text-[12px]">{requisition.items.length} lines</span>
          </div>
          <div className="divide-hairline divide-y px-4">
            {requisition.items.map((item, index) => {
              const actual = actuals[item.id] ?? 0
              const delta = actual - item.amount
              return (
                <div key={item.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-ink flex-1 text-[14px] leading-[1.4]">
                      <span className="text-ink-faint mr-2 font-mono text-[11.5px]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="shrink-0">
                      <p className="text-ink-faint text-[11px]">Budgeted</p>
                      <Money value={item.amount} size="sm" className="text-ink-soft" />
                    </div>
                    <AmountField
                      label={`Actual spend for ${item.description}`}
                      className="flex-1"
                      value={actual}
                      onValueChange={(value) =>
                        setActuals((current) => ({ ...current, [item.id]: value }))
                      }
                    />
                  </div>
                  {delta !== 0 && (
                    <p
                      className={cn(
                        "mt-1.5 text-right text-[11.5px] font-medium",
                        delta > 0 ? "text-st-action" : "text-st-good",
                      )}
                    >
                      {delta > 0 ? "Over by " : "Under by "}
                      <span className="tabular-nums">
                        ₦{Math.abs(delta).toLocaleString("en-NG")}
                      </span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* The number that closes the transaction. */}
        <div className="card-flat px-4 py-3.5">
          <dl className="divide-hairline divide-y">
            <div className="flex items-baseline justify-between gap-3 pb-2.5">
              <dt className="text-ink-soft text-[13px]">Disbursed</dt>
              <dd>
                <Money value={disbursed} size="sm" />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-ink-soft text-[13px]">Total spent</dt>
              <dd>
                <AnimatedMoney value={spent} size="sm" />
              </dd>
            </div>
          </dl>
          <div
            className={cn(
              "mt-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5",
              variance === 0 ? "bg-st-good-bg" : overspent ? "bg-st-action-bg" : "bg-st-motion-bg",
            )}
          >
            <span
              className={cn(
                "text-[12.5px] font-semibold",
                variance === 0 ? "text-st-good" : overspent ? "text-st-action" : "text-st-motion",
              )}
            >
              {variance === 0
                ? "Fully accounted for"
                : overspent
                  ? "Overspent"
                  : "To return to Finance"}
            </span>
            <span
              className={cn(
                "text-[15px] font-semibold tabular-nums",
                variance === 0 ? "text-st-good" : overspent ? "text-st-action" : "text-st-motion",
              )}
            >
              ₦{Math.abs(variance).toLocaleString("en-NG")}
            </span>
          </div>
        </div>

        <section>
          <MicroLabel className="mb-2">Receipts</MicroLabel>
          <label className="border-hairline hover:border-primary/40 hover:bg-card press-wide flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-6 py-7 text-center">
            <Upload className="text-ink-faint size-5" strokeWidth={1.7} aria-hidden />
            <span className="text-ink mt-2.5 text-[14px] font-semibold">Attach receipts</span>
            <span className="text-ink-faint mt-1 text-[12px]">
              One per expense line where possible
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,image/*"
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                setReceipts((current) => [
                  ...current,
                  ...files.map((file) => ({
                    id: newId("r"),
                    name: file.name,
                    size:
                      file.size > 1_048_576
                        ? `${(file.size / 1_048_576).toFixed(1)} MB`
                        : `${Math.max(1, Math.round(file.size / 1024))} KB`,
                    kind: "receipt" as const,
                  })),
                ])
                event.target.value = ""
              }}
            />
          </label>

          {receipts.length > 0 && (
            <ul className="card-flat divide-hairline mt-2.5 divide-y">
              {receipts.map((file) => (
                <li key={file.id} className="flex items-center gap-2.5 px-3.5 py-3">
                  <Paperclip
                    className="text-ink-faint size-4 shrink-0"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  <span className="text-ink min-w-0 flex-1 truncate text-[13.5px]">
                    {file.name}
                  </span>
                  <span className="text-ink-faint shrink-0 text-[11.5px]">{file.size}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setReceipts((c) => c.filter((r) => r.id !== file.id))}
                    className="text-ink-faint hover:text-st-bad press -mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.8} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showErrors && receipts.length === 0 && (
            <p className="text-st-bad mt-2 text-[12.5px]">
              At least one receipt is required to reconcile.
            </p>
          )}
        </section>

        <TextAreaField
          label="Reconciliation note"
          hint={variance !== 0 ? "Required" : "Optional"}
          rows={4}
          placeholder={
            overspent
              ? "Explain the overspend and how it was covered."
              : "Explain any unspent balance and when it was returned."
          }
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        {showErrors && needsNote && (
          <p className="text-st-bad -mt-2 flex items-start gap-1.5 text-[12.5px]">
            <TriangleAlert className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            The totals don&apos;t match what was disbursed — add a short note explaining the
            difference.
          </p>
        )}
      </div>

      <StickyFooter note="Finance reviews your receipts before this requisition is closed. You can't edit it once filed.">
        <button
          type="button"
          onClick={submit}
          aria-disabled={!valid || pending}
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition-colors duration-200",
            valid && !pending
              ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              : "bg-secondary text-ink-faint cursor-not-allowed",
          )}
        >
          {pending ? (
            <>
              <span
                className="border-ink-faint/40 border-t-ink-faint size-4 animate-spin rounded-full border-2"
                aria-hidden
              />
              Filing…
            </>
          ) : (
            <>
              <ReceiptText className="size-[17px]" strokeWidth={2.2} aria-hidden />
              Submit Reconciliation
            </>
          )}
        </button>
      </StickyFooter>
    </>
  )
}
