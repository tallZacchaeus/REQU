"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Paperclip, Plus, Trash2, Upload } from "lucide-react"

import { AmountField, SelectField, TextAreaField, TextField } from "@/components/app/fields"
import { DetailRow, MicroLabel, Money, StickyFooter } from "@/components/app/primitives"
import { ScreenHeader } from "@/components/app/screen-header"
import { CURRENT_USER } from "@/lib/data"
import { amountInWords, formatDate } from "@/lib/format"
import { useRequisitions } from "@/lib/store"
import type { Attachment, ExpenseItem, Requisition } from "@/lib/types"
import { cn } from "@/lib/utils"

const STEPS = ["Programme", "Expenses", "Documents", "Review"] as const

const UNITS = [
  "Central Province",
  "Lagos Province",
  "Eastern Province",
  "Northern Province",
]

const blankItem = (): ExpenseItem => ({
  id: `i${Math.random().toString(36).slice(2, 9)}`,
  description: "",
  amount: 0,
})

export function NewRequisitionFlow() {
  const params = useSearchParams()
  const { getById, hydrated } = useRequisitions()
  const editId = params.get("edit")

  // Field state is seeded once from `existing`, so the record has to be the
  // stored one before the form mounts — otherwise a cold-loaded edit link
  // would initialise from the seed set and silently discard saved changes.
  if (!hydrated) {
    return (
      <>
        <ScreenHeader title="New Requisition" back="/requisitions" />
        <div className="flex-1" />
      </>
    )
  }

  return <Flow existing={editId ? getById(editId) : undefined} />
}

function Flow({ existing }: { existing?: Requisition }) {
  const router = useRouter()
  const { upsert, nextReference } = useRequisitions()

  const [step, setStep] = useState(0)
  const [programme, setProgramme] = useState(existing?.programme ?? "")
  const [programmeDate, setProgrammeDate] = useState(existing?.programmeDate ?? "")
  const [location, setLocation] = useState(existing?.location ?? "")
  const [unit, setUnit] = useState(CURRENT_USER.unit)
  const [purpose, setPurpose] = useState(existing?.purpose ?? "")
  const [items, setItems] = useState<ExpenseItem[]>(
    existing?.items.length ? existing.items : [blankItem(), blankItem()],
  )
  const [attachments, setAttachments] = useState<Attachment[]>(existing?.attachments ?? [])
  const [showErrors, setShowErrors] = useState(false)
  // Navigation to the confirmation route is async; without this the submit
  // button sits inert after the press and invites a second submission.
  const [pending, setPending] = useState<"draft" | "submit" | null>(null)

  const total = useMemo(() => items.reduce((sum, i) => sum + i.amount, 0), [items])
  const filledItems = items.filter((i) => i.description.trim() && i.amount > 0)

  const stepValid = [
    Boolean(programme.trim() && programmeDate && purpose.trim()),
    filledItems.length > 0,
    true,
    true,
  ][step]

  const isResubmit = Boolean(existing && existing.status === "changes_requested")
  const isDraft = Boolean(existing && existing.status === "draft")

  function next() {
    if (!stepValid) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo({ top: 0 })
  }

  function back() {
    if (step === 0) {
      router.push(existing ? `/requisitions/${existing.id}` : "/requisitions")
      return
    }
    setStep((s) => s - 1)
    window.scrollTo({ top: 0 })
  }

  function saveDraft() {
    if (pending) return
    setPending("draft")
    const record = compose("draft")
    upsert(record)
    router.push("/requisitions")
  }

  function submit() {
    if (pending) return
    setPending("submit")
    const record = compose("under_review")
    upsert(record)
    router.push(`/requisitions/${record.id}/submitted`)
  }

  function compose(status: Requisition["status"]): Requisition {
    const today = new Date().toISOString().slice(0, 10)
    const base: Requisition = existing ?? {
      id: `req-${Math.random().toString(36).slice(2, 8)}`,
      reference: nextReference(),
      programme: "",
      programmeDate: "",
      location: "",
      department: CURRENT_USER.department,
      purpose: "",
      items: [],
      attachments: [],
      comments: [],
      activity: [],
      status: "draft",
      stageDates: {},
      createdAt: today,
    }

    const submitting = status !== "draft"
    return {
      ...base,
      programme: programme.trim(),
      programmeDate,
      location: location.trim(),
      department: `${CURRENT_USER.department} · ${unit}`,
      purpose: purpose.trim(),
      items: filledItems,
      attachments,
      status,
      stageDates: submitting ? { ...base.stageDates, submitted: today } : base.stageDates,
      submittedAt: submitting ? today : base.submittedAt,
      activity: [
        ...base.activity,
        {
          id: `e${Math.random().toString(36).slice(2, 8)}`,
          date: today,
          actor: "You",
          action: submitting
            ? isResubmit
              ? "Resubmitted after changes"
              : "Submitted for review"
            : "Saved draft",
        },
      ],
    }
  }

  return (
    <>
      <ScreenHeader
        title={isResubmit ? "Edit & Resubmit" : existing ? "Edit Draft" : "New Requisition"}
        back={existing ? `/requisitions/${existing.id}` : "/requisitions"}
        action={
          !isResubmit && (
            <button
              type="button"
              onClick={saveDraft}
              disabled={!programme.trim() || pending !== null}
              className="text-primary hover:bg-muted mr-1 h-9 cursor-pointer rounded-lg px-2.5 text-[13.5px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending === "draft" ? "Saving…" : "Save draft"}
            </button>
          )
        }
      />

      {/* A rule that fills, not a row of numbered circles. */}
      <div className="border-hairline bg-card sticky top-14 z-10 border-b px-4 pt-2.5 pb-3">
        <div className="mb-2 flex items-baseline justify-between">
          <MicroLabel>
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </MicroLabel>
          {step === 1 && total > 0 && <Money value={total} size="sm" />}
        </div>
        <div className="bg-hairline h-[3px] w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-6">
        {step === 0 && (
          <div className="space-y-4">
            <TextField
              label="Programme / Project name"
              placeholder="e.g. Youth Convention 2026"
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
              autoFocus
            />
            <TextField
              label="Programme date"
              type="date"
              value={programmeDate}
              onChange={(e) => setProgrammeDate(e.target.value)}
            />
            <TextField
              label="Location"
              placeholder="e.g. National Auditorium, Abuja"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            {/* Department is fixed to the HOD's own — they cannot raise for others. */}
            <div>
              <p className="text-ink mb-1.5 text-[13px] font-semibold">Department</p>
              <div className="border-hairline bg-muted text-ink-soft flex h-11 items-center rounded-lg border px-3 text-[15px]">
                {CURRENT_USER.department}
              </div>
              <p className="text-ink-faint mt-1.5 text-[11.5px]">
                Locked to your assigned department.
              </p>
            </div>

            <SelectField label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </SelectField>

            <TextAreaField
              label="Purpose / Description"
              hint={`${purpose.length}/400`}
              maxLength={400}
              placeholder="Explain what these funds are needed for and how they will be used."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />

            {showErrors && !stepValid && (
              <p className="text-st-bad text-[12.5px]">
                Programme name, date and purpose are required to continue.
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <MicroLabel className="mb-2.5">Expense Items</MicroLabel>

            <div className="space-y-2.5">
              {items.map((item, index) => (
                <div key={item.id} className="card-flat px-3 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-ink-faint font-mono text-[11px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove item ${index + 1}`}
                        onClick={() => setItems((c) => c.filter((i) => i.id !== item.id))}
                        className="text-ink-faint hover:bg-muted hover:text-st-bad -mr-1 flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors duration-200"
                      >
                        <Trash2 className="size-4" strokeWidth={1.8} aria-hidden />
                      </button>
                    )}
                  </div>
                  <TextField
                    label={`Item ${index + 1} description`}
                    className="[&>div]:sr-only"
                    placeholder="e.g. Venue rental & setup"
                    value={item.description}
                    onChange={(e) =>
                      setItems((c) =>
                        c.map((i) => (i.id === item.id ? { ...i, description: e.target.value } : i)),
                      )
                    }
                  />
                  <AmountField
                    label={`Item ${index + 1} amount`}
                    className="mt-2"
                    value={item.amount}
                    onValueChange={(amount) =>
                      setItems((c) => c.map((i) => (i.id === item.id ? { ...i, amount } : i)))
                    }
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setItems((c) => [...c, blankItem()])}
              className="border-hairline text-primary hover:border-primary/40 hover:bg-card mt-2.5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-[14px] font-semibold transition-colors duration-200"
            >
              <Plus className="size-4" strokeWidth={2.4} aria-hidden />
              Add another item
            </button>

            <div className="card-flat mt-4 px-4 py-3.5">
              <div className="flex items-end justify-between gap-3">
                <MicroLabel>Total Requested</MicroLabel>
                <Money value={total} size="lg" />
              </div>
              <div className="border-hairline mt-3 border-t pt-3">
                <MicroLabel className="mb-1">Amount in words</MicroLabel>
                <p className="text-ink text-[13.5px] leading-[1.5] italic">
                  {total > 0 ? amountInWords(total) : "—"}
                </p>
              </div>
            </div>

            {showErrors && !stepValid && (
              <p className="text-st-bad mt-3 text-[12.5px]">
                Add at least one item with a description and an amount.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-ink text-[13px] font-semibold">Supporting documents</p>
              <p className="text-ink-soft mt-1 text-[12.5px] leading-[1.5]">
                Proposals, quotations or any document that supports the request. Optional, but a
                quotation usually speeds up recommendation.
              </p>
            </div>

            <label className="border-hairline hover:border-primary/40 hover:bg-card flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors duration-200">
              <Upload className="text-ink-faint size-5" strokeWidth={1.7} aria-hidden />
              <span className="text-ink mt-2.5 text-[14px] font-semibold">Tap to attach files</span>
              <span className="text-ink-faint mt-1 text-[12px]">PDF, JPG or PNG</span>
              <input
                type="file"
                multiple
                accept=".pdf,image/*"
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? [])
                  setAttachments((current) => [
                    ...current,
                    ...files.map((file) => ({
                      id: `a${Math.random().toString(36).slice(2, 8)}`,
                      name: file.name,
                      size:
                        file.size > 1_048_576
                          ? `${(file.size / 1_048_576).toFixed(1)} MB`
                          : `${Math.max(1, Math.round(file.size / 1024))} KB`,
                      kind: "other" as const,
                    })),
                  ])
                  event.target.value = ""
                }}
              />
            </label>

            {attachments.length > 0 && (
              <ul className="card-flat divide-hairline divide-y">
                {attachments.map((file) => (
                  <li key={file.id} className="flex items-center gap-2.5 px-3.5 py-3">
                    <Paperclip className="text-ink-faint size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                    <span className="text-ink min-w-0 flex-1 truncate text-[13.5px]">{file.name}</span>
                    <span className="text-ink-faint shrink-0 text-[11.5px]">{file.size}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setAttachments((c) => c.filter((a) => a.id !== file.id))}
                      className="text-ink-faint hover:text-st-bad -mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-200"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.8} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="card-flat px-4 py-4">
              <MicroLabel>Total Requested</MicroLabel>
              <Money value={total} size="lg" className="mt-1.5 block" />
              <p className="text-ink-soft mt-1 text-[12.5px] leading-[1.5] italic">
                {amountInWords(total)}
              </p>
            </div>

            <ReviewBlock title="Programme Details" onEdit={() => setStep(0)}>
              <dl className="divide-hairline divide-y">
                <DetailRow label="Programme / Project" value={programme || "—"} />
                <DetailRow
                  label="Programme date"
                  value={programmeDate ? formatDate(programmeDate) : "—"}
                />
                <DetailRow label="Location" value={location || "—"} />
                <DetailRow label="Department / Unit" value={`${CURRENT_USER.department} · ${unit}`} />
                <DetailRow label="Purpose" value={purpose || "—"} />
              </dl>
            </ReviewBlock>

            <ReviewBlock title="Expense Breakdown" onEdit={() => setStep(1)}>
              <table className="w-full">
                <tbody className="divide-hairline divide-y">
                  {filledItems.map((item, index) => (
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
                      <MicroLabel>Total</MicroLabel>
                    </td>
                    <td className="pt-3 text-right">
                      <Money value={total} size="md" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </ReviewBlock>

            <ReviewBlock title={`Attachments (${attachments.length})`} onEdit={() => setStep(2)}>
              {attachments.length === 0 ? (
                <p className="text-ink-faint py-1 text-[13px]">No documents attached.</p>
              ) : (
                <ul className="divide-hairline divide-y">
                  {attachments.map((file) => (
                    <li key={file.id} className="flex items-center gap-2.5 py-2.5">
                      <Paperclip className="text-ink-faint size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                      <span className="text-ink min-w-0 flex-1 truncate text-[13.5px]">
                        {file.name}
                      </span>
                      <span className="text-ink-faint shrink-0 text-[11.5px]">{file.size}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ReviewBlock>
          </div>
        )}
      </div>

      <StickyFooter
        note={
          step === 3
            ? `Once submitted, this request goes to ${CURRENT_USER.reviewer}, your ${CURRENT_USER.reviewerRole}, for recommendation. You will not be able to edit it unless it is returned to you.`
            : undefined
        }
      >
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={back}
            disabled={pending !== null}
            className="border-input text-ink hover:bg-muted h-12 cursor-pointer rounded-lg border px-4 text-[14.5px] font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            onClick={step === 3 ? submit : next}
            aria-disabled={!stepValid || pending !== null}
            className={cn(
              "flex h-12 flex-1 items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition-colors duration-200",
              stepValid && !pending
                ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                : "bg-secondary text-ink-faint cursor-not-allowed",
            )}
          >
            {pending === "submit" && (
              <span
                className="border-ink-faint/40 border-t-ink-faint size-4 animate-spin rounded-full border-2"
                aria-hidden
              />
            )}
            {pending === "submit"
              ? "Submitting…"
              : step === 3
                ? isResubmit
                  ? "Resubmit Requisition"
                  : "Submit Requisition"
                : step === 2
                  ? "Review Request"
                  : "Continue"}
          </button>
        </div>
      </StickyFooter>
    </>
  )
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <section className="card-flat overflow-hidden">
      <div className="border-hairline flex h-11 items-center justify-between border-b px-4">
        <MicroLabel>{title}</MicroLabel>
        <button
          type="button"
          onClick={onEdit}
          className="text-primary hover:bg-muted -mr-2 h-8 cursor-pointer rounded-md px-2 text-[12.5px] font-semibold transition-colors duration-200"
        >
          Edit
        </button>
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  )
}
