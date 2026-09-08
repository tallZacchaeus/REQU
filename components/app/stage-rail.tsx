import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import { STAGE_COUNT } from "@/lib/status"
import type { Stage } from "@/lib/types"

/**
 * The answer to "where is my request right now?". Completed stages carry a
 * solid rail, the live stage is lifted out on its own row, and anything the
 * request has not reached yet is dimmed so it cannot be misread as progress.
 */
export function StageRail({ stages, rejected = false }: { stages: Stage[]; rejected?: boolean }) {
  return (
    <ol className="relative">
      {stages.map((stage, index) => {
        const last = index === stages.length - 1
        const done = stage.state === "done"
        const current = stage.state === "current"
        const blocked = stage.state === "blocked"

        return (
          <li key={stage.key} className="relative flex gap-3">
            {/* Rail column */}
            <div className="flex w-5 shrink-0 flex-col items-center">
              <Marker state={stage.state} rejected={rejected} />
              {!last && (
                <span
                  className={cn("w-px flex-1", done ? "bg-primary" : "bg-hairline")}
                  aria-hidden
                />
              )}
            </div>

            {/* Content column */}
            <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-5")}>
              <div
                className={cn(
                  current || blocked
                    ? cn(
                        "-mt-1 rounded-lg border px-3 py-2",
                        blocked ? "border-st-action/30 bg-st-action-bg" : "border-primary/20 bg-st-motion-bg",
                      )
                    : "",
                )}
              >
                <p
                  className={cn(
                    "text-[14px] leading-tight font-semibold",
                    stage.state === "pending" ? "text-ink-faint" : "text-ink",
                  )}
                >
                  {blocked ? "Returned for changes" : stage.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px] leading-tight",
                    stage.state === "pending" ? "text-ink-faint/70" : "text-ink-soft",
                  )}
                >
                  {stage.actor}
                  {stage.date && <> · {formatDate(stage.date)}</>}
                  {stage.state === "pending" && <> · Pending</>}
                  {current && <> · In progress</>}
                </p>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Marker({ state, rejected }: { state: Stage["state"]; rejected: boolean }) {
  if (state === "done") {
    return (
      <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full">
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </span>
    )
  }

  if (state === "blocked") {
    return (
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full text-white",
          rejected ? "bg-st-bad" : "bg-st-action",
        )}
      >
        <X className="size-3" strokeWidth={3} aria-hidden />
      </span>
    )
  }

  if (state === "current") {
    return (
      <span className="ring-primary/20 bg-card flex size-5 shrink-0 items-center justify-center rounded-full ring-4">
        <span className="border-primary size-5 rounded-full border-[3px]" aria-hidden />
      </span>
    )
  }

  return <span className="border-hairline bg-card size-5 shrink-0 rounded-full border-2" aria-hidden />
}

/**
 * Five-segment meter for list cards — progress at a glance without spending
 * the vertical space a full rail needs.
 */
export function StageMeter({
  stage,
  tone = "motion",
  className,
}: {
  stage: number
  tone?: "motion" | "good" | "action" | "bad" | "neutral"
  className?: string
}) {
  const fill = {
    motion: "bg-primary",
    good: "bg-st-good",
    action: "bg-st-action",
    bad: "bg-st-bad",
    neutral: "bg-st-neutral",
  }[tone]

  return (
    <div className={cn("flex gap-[3px]", className)} aria-hidden>
      {Array.from({ length: STAGE_COUNT }, (_, i) => (
        <span
          key={i}
          className={cn("h-[3px] flex-1 rounded-full", i < stage ? fill : "bg-hairline")}
        />
      ))}
    </div>
  )
}
