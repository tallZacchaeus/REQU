"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  Paperclip,
  Plus,
  ThumbsUp,
  Trash2,
  Undo2,
} from "lucide-react";

import {
  DetailRow,
  Disclosure,
  MicroLabel,
  Money,
  Section,
  StatusBadge,
  StickyFooter,
} from "@/components/app/primitives";
import { ScreenHeader } from "@/components/app/screen-header";
import { Sheet } from "@/components/app/sheet";
import { StageRail } from "@/components/app/stage-rail";
import { amountInWords, formatDate } from "@/lib/format";
import { isoToday, newId } from "@/lib/ids";
import { waitingDays } from "@/lib/review";
import type { ActionSpec, ReviewerConfig } from "@/lib/roles";
import { buildStages, STATUS } from "@/lib/status";
import { useRequisitions } from "@/lib/store";
import { requisitionTotal, type Requisition } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReviewerDetail({
  id,
  config,
}: {
  id: string;
  config: ReviewerConfig;
}) {
  const { getById, hydrated } = useRequisitions();
  const requisition = getById(id);

  if (!hydrated || !requisition || requisition.status === "draft") {
    return (
      <>
        <ScreenHeader title="Review Requisition" back={config.queueHref} />
        <div className="px-4 py-16 text-center">
          <p className="text-ink text-[15px] font-semibold">
            {hydrated ? "Requisition not available" : "Loading…"}
          </p>
          {hydrated && (
            <Link
              href={config.queueHref}
              className="text-primary mt-2 inline-block text-[13px] font-semibold hover:underline"
            >
              Back to the queue
            </Link>
          )}
        </div>
      </>
    );
  }

  return (
    <Detail key={requisition.id} requisition={requisition} config={config} />
  );
}

function Detail({
  requisition,
  config,
}: {
  requisition: Requisition;
  config: ReviewerConfig;
}) {
  const router = useRouter();
  const { upsert } = useRequisitions();
  const [open, setOpen] = useState<ActionSpec | null>(null);
  const [comment, setComment] = useState("");
  const [points, setPoints] = useState<string[]>([""]);
  const [showErrors, setShowErrors] = useState(false);
  const [pending, setPending] = useState(false);

  const total = requisitionTotal(requisition);
  const meta = STATUS[requisition.status];
  const stages = buildStages(requisition.status, requisition.stageDates);
  const actionable = config.awaits(requisition);
  const days = waitingDays(requisition);

  function closeSheet() {
    setOpen(null);
    setComment("");
    setPoints([""]);
    setShowErrors(false);
  }

  function commit(action: ActionSpec) {
    const body = comment.trim();
    const list = points.map((p) => p.trim()).filter(Boolean);
    if (
      (action.commentRequired && body.length < 10) ||
      (action.wantsPoints && list.length === 0)
    ) {
      setShowErrors(true);
      return;
    }
    if (pending) return;
    setPending(true);

    const today = isoToday();
    upsert({
      ...requisition,
      status: action.nextStatus,
      stageDates: action.stamp
        ? { ...requisition.stageDates, [action.stamp]: today }
        : requisition.stageDates,
      comments: [
        ...requisition.comments,
        {
          id: newId("c"),
          author: config.person.name,
          role: config.person.role,
          date: today,
          body: body || action.defaultComment || action.activity,
          ...(action.wantsPoints ? { requestedChanges: list } : {}),
        },
      ],
      activity: [
        ...requisition.activity,
        {
          id: newId("e"),
          date: today,
          actor: config.person.name,
          action: action.activity,
        },
      ],
    });
    router.push(config.queueHref);
  }

  const actions = [config.primary, config.secondary, config.destructive].filter(
    Boolean,
  ) as ActionSpec[];

  return (
    <>
      <ScreenHeader title="Review Requisition" back={config.queueHref} />

      <div className="flex-1 px-4 pt-4 pb-6 lg:px-0 lg:pt-0">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
          {/* ---- Left: the case being made ---- */}
          <div className="space-y-4">
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
                    days >= 7
                      ? "bg-st-action-bg text-st-action"
                      : "bg-muted text-ink-soft",
                  )}
                >
                  {days === 0 ? "Today" : `${days}d wait`}
                </span>
              )}
            </div>

            <div className="card-flat px-4 py-4 lg:hidden">
              <Hero
                requisition={requisition}
                total={total}
                actionable={actionable}
                detail={meta.detail}
              />
            </div>

            <Disclosure title="Programme Details" defaultOpen>
              <dl className="divide-hairline divide-y">
                <DetailRow
                  label="Programme / Project"
                  value={requisition.programme}
                />
                <DetailRow
                  label="Programme date"
                  value={formatDate(requisition.programmeDate)}
                />
                <DetailRow label="Location" value={requisition.location} />
                <DetailRow
                  label="Department / Unit"
                  value={requisition.department}
                />
                <DetailRow label="Purpose" value={requisition.purpose} />
              </dl>
            </Disclosure>

            {/* Open by default: nobody should sign off a figure they didn't read. */}
            <Disclosure
              title="Expense Breakdown"
              meta={`${requisition.items.length} items`}
              defaultOpen
            >
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

            <Disclosure
              title="Attachments"
              meta={`${requisition.attachments.length}`}
            >
              {requisition.attachments.length === 0 ? (
                <p className="text-ink-faint py-1 text-[13px]">
                  No documents attached — worth asking for a quotation.
                </p>
              ) : (
                <ul className="divide-hairline divide-y">
                  {requisition.attachments.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center gap-2.5 py-2.5"
                    >
                      <Paperclip
                        className="text-ink-faint size-4 shrink-0"
                        strokeWidth={1.8}
                        aria-hidden
                      />
                      <span className="text-ink min-w-0 flex-1 truncate text-[13.5px]">
                        {file.name}
                      </span>
                      <span className="text-ink-faint shrink-0 text-[11.5px]">
                        {file.size}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Disclosure>

            {requisition.comments.length > 0 && (
              <Disclosure
                title="Review History"
                meta={`${requisition.comments.length}`}
                defaultOpen={config.role === "nyp"}
              >
                <ul className="space-y-3">
                  {requisition.comments.map((c) => (
                    <li key={c.id} className="bg-muted rounded-lg px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-ink text-[13px] font-semibold">
                          {c.author}
                        </p>
                        <p className="text-ink-faint shrink-0 text-[11.5px]">
                          {formatDate(c.date)}
                        </p>
                      </div>
                      <p className="text-ink-faint text-[11.5px]">{c.role}</p>
                      <p className="text-ink mt-1.5 text-[13.5px] leading-[1.5]">
                        {c.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            )}

            <p className="text-ink-faint px-1 text-[11.5px] leading-[1.5] lg:hidden">
              {config.boundary}
            </p>
          </div>

          {/* ---- Right on desktop: the decision ---- */}
          <aside className="hidden lg:sticky lg:top-6 lg:block lg:space-y-4">
            <div className="card-flat px-4 py-4">
              <Hero
                requisition={requisition}
                total={total}
                actionable={actionable}
                detail={meta.detail}
              />
            </div>

            <Section title="Approval Workflow">
              <StageRail
                stages={stages}
                rejected={requisition.status === "rejected"}
              />
            </Section>

            {actionable ? (
              <div className="card-flat space-y-2.5 px-4 py-4">
                {actions.map((action) => (
                  <ActionButton
                    key={action.key}
                    action={action}
                    onClick={() => setOpen(action)}
                  />
                ))}
                <p className="text-ink-faint pt-1 text-[11.5px] leading-[1.5]">
                  {config.boundary}
                </p>
              </div>
            ) : (
              <p className="card-flat text-ink-soft flex items-center justify-center gap-2 px-4 py-3.5 text-[13px]">
                <Check
                  className="text-st-good size-4"
                  strokeWidth={2.4}
                  aria-hidden
                />
                Already actioned
              </p>
            )}
          </aside>
        </div>

        <div className="mt-4 lg:hidden">
          <Section title="Approval Workflow">
            <StageRail
              stages={stages}
              rejected={requisition.status === "rejected"}
            />
          </Section>
        </div>
      </div>

      {/* Mobile keeps the decision pinned to the thumb. */}
      {actionable ? (
        <StickyFooter
          className="lg:hidden"
          note={config.primary.blurb(requisition)}
        >
          {/* The decision leads on its own row. Three abreast on a 390px
                screen left every label under 115px and truncating. */}
          <div className="space-y-2.5">
            <ActionButton
              action={config.primary}
              onClick={() => setOpen(config.primary)}
            />
            <div className="flex gap-2.5">
              {actions.slice(1).map((action) => (
                <ActionButton
                  key={action.key}
                  action={action}
                  compact
                  onClick={() => setOpen(action)}
                />
              ))}
            </div>
          </div>
        </StickyFooter>
      ) : (
        <StickyFooter className="lg:hidden">
          <p className="text-ink-soft flex items-center justify-center gap-2 py-1 text-[13px]">
            <Check
              className="text-st-good size-4"
              strokeWidth={2.4}
              aria-hidden
            />
            You have already actioned this requisition.
          </p>
        </StickyFooter>
      )}

      <Sheet
        open={open !== null}
        onClose={closeSheet}
        title={open?.sheetTitle ?? ""}
      >
        {open && (
          <>
            <p className="text-ink-soft text-[13.5px] leading-[1.55]">
              <span className="text-ink font-medium">
                {requisition.programme}
              </span>{" "}
              — <Money value={total} size="sm" />. {open.blurb(requisition)}
            </p>

            <label className="mt-4 block">
              <span className="text-ink mb-1.5 block text-[13px] font-semibold">
                {open.commentLabel}{" "}
                {!open.commentRequired && (
                  <span className="text-ink-faint font-normal">(optional)</span>
                )}
              </span>
              <textarea
                rows={3}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={open.commentPlaceholder}
                className={cn(
                  "bg-card text-ink placeholder:text-ink-faint/80 w-full resize-none rounded-lg border px-3 py-2.5 text-[16px] leading-[1.5] transition-[border-color,box-shadow] duration-200 outline-none focus:ring-3",
                  showErrors &&
                    open.commentRequired &&
                    comment.trim().length < 10
                    ? "border-st-bad focus:border-st-bad focus:ring-st-bad/15"
                    : "border-input focus:border-brand focus:ring-brand/20",
                )}
              />
            </label>

            {open.wantsPoints && (
              <div className="mt-4">
                <MicroLabel className="mb-2">What needs to change</MicroLabel>
                <div className="space-y-2">
                  {points.map((value, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="bg-st-action/15 text-st-action flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                        {index + 1}
                      </span>
                      <input
                        value={value}
                        onChange={(event) =>
                          setPoints((c) =>
                            c.map((v, i) =>
                              i === index ? event.target.value : v,
                            ),
                          )
                        }
                        placeholder="e.g. Attach a second quotation"
                        className="border-input bg-card text-ink placeholder:text-ink-faint/80 focus:border-brand focus:ring-brand/20 h-11 w-full rounded-lg border px-3 text-[16px] transition-[border-color,box-shadow] duration-200 outline-none focus:ring-3"
                      />
                      {points.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove point ${index + 1}`}
                          onClick={() =>
                            setPoints((c) => c.filter((_, i) => i !== index))
                          }
                          className="text-ink-faint hover:text-st-bad flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-200"
                        >
                          <Trash2
                            className="size-3.5"
                            strokeWidth={1.8}
                            aria-hidden
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {points.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setPoints((c) => [...c, ""])}
                    className="border-hairline text-primary hover:border-primary/40 mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed text-[13.5px] font-semibold transition-colors duration-200"
                  >
                    <Plus className="size-3.5" strokeWidth={2.4} aria-hidden />
                    Add another point
                  </button>
                )}
              </div>
            )}

            {showErrors && (
              <p className="text-st-bad mt-3 text-[12.5px]">
                {open.wantsPoints
                  ? "Add a comment and at least one specific change."
                  : "Add a short reason before continuing."}
              </p>
            )}

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={closeSheet}
                className="border-input text-ink hover:bg-muted h-12 flex-1 cursor-pointer rounded-lg border text-[14.5px] font-semibold transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => commit(open)}
                disabled={pending}
                className={cn(
                  "flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-[14.5px] font-semibold transition-[opacity,background-color,transform] duration-200 active:scale-[0.99] disabled:opacity-60",
                  open.tone === "primary" &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                  open.tone === "warn" &&
                    "bg-st-action text-white hover:opacity-90",
                  open.tone === "danger" &&
                    "bg-st-bad text-white hover:opacity-90",
                )}
              >
                {open.confirmLabel}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}

function Hero({
  requisition,
  total,
  actionable,
  detail,
}: {
  requisition: Requisition;
  total: number;
  actionable: boolean;
  detail: string;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink-faint font-mono text-[11.5px] tracking-tight">
          {requisition.reference}
        </p>
        <StatusBadge
          status={requisition.status}
          forceChip
          className="shrink-0"
        />
      </div>
      <h2 className="text-ink mt-2 text-[17px] leading-tight font-semibold tracking-[-0.015em]">
        {requisition.programme}
      </h2>
      <Money value={total} size="lg" className="mt-2 block" />
      <p className="text-ink-soft mt-1 text-[12.5px] leading-[1.45]">
        {actionable ? "Awaiting your decision" : detail}
      </p>
    </>
  );
}

const ICONS = { advance: ThumbsUp, changes: Undo2, reject: Ban };

function ActionButton({
  action,
  onClick,
  compact = false,
}: {
  action: ActionSpec;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = ICONS[action.key];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg text-[14px] font-semibold transition-[background-color,border-color,transform] duration-200 active:scale-[0.99]",
        compact ? "flex-1" : "w-full",
        action.tone === "primary" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
        action.tone === "warn" &&
          "border-st-action/35 text-st-action hover:bg-st-action-bg border",
        action.tone === "danger" &&
          "border-st-bad/35 text-st-bad hover:bg-st-bad-bg border",
      )}
    >
      <Icon className="size-4" strokeWidth={2.2} aria-hidden />
      {action.label}
    </button>
  );
}
