"use client"

import { useMemo } from "react"

import { buildReport } from "@/lib/reports"
import { TONE_DOT } from "@/lib/status"
import { useRequisitions } from "@/lib/store"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

import { CountUp } from "./motion"
import { MicroLabel, Money } from "./primitives"

export function Reports() {
  const { requisitions } = useRequisitions()
  const { role } = useSession()
  const report = useMemo(() => buildReport(role, requisitions), [role, requisitions])

  const bandTotal = report.bands.reduce((total, band) => total + band.count, 0) || 1
  const splitTop = report.splits[0]?.value || 1

  return (
    <>
      <header className="px-4 pt-5 pb-4 md:px-0 md:pt-0">
        <h1 className="text-ink text-[20px] font-semibold tracking-[-0.025em] lg:text-[24px]">
          {report.title}
        </h1>
        <p className="text-ink-soft mt-1 text-[13.5px] leading-[1.5]">{report.blurb}</p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 px-4 md:px-0 lg:grid-cols-4 lg:gap-4">
        {report.figures.map((figure, index) => (
          <div
            key={figure.label}
            style={{ animationDelay: `${index * 60}ms` }}
            className="card-flat animate-rise px-3.5 py-3 lg:px-4 lg:py-4"
          >
            <MicroLabel>{figure.label}</MicroLabel>
            <p className="text-ink mt-2 text-[24px] leading-none font-semibold tracking-[-0.03em]">
              {figure.money ? (
                <Money value={figure.value} size="md" />
              ) : (
                <CountUp value={figure.value} />
              )}
            </p>
            {figure.hint && <p className="text-ink-faint mt-1.5 text-[12px]">{figure.hint}</p>}
          </div>
        ))}
      </div>

      <div className="px-4 pt-5 pb-8 md:px-0 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:pt-6">
        {/* Where everything currently sits. Bars are share of count, and the
            money beside each band is the value in that state. */}
        <section className="card-flat mb-3.5 overflow-hidden lg:mb-0">
          <div className="border-hairline flex h-11 items-center justify-between border-b px-4">
            <MicroLabel>Where things stand</MicroLabel>
            <span className="text-ink-faint text-[12px]">{bandTotal} total</span>
          </div>
          <ul className="divide-hairline divide-y px-4">
            {report.bands.map((band) => (
              <li key={band.label} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink flex items-center gap-2 text-[13.5px]">
                    <span
                      className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[band.tone])}
                      aria-hidden
                    />
                    {band.label}
                  </span>
                  <span className="text-ink-soft shrink-0 text-[12.5px] tabular-nums">
                    {band.count}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="bg-hairline h-[3px] flex-1 overflow-hidden rounded-full">
                    <span
                      className={cn(
                        "animate-grow block h-full origin-left rounded-full",
                        TONE_DOT[band.tone],
                      )}
                      style={{ width: `${Math.max((band.count / bandTotal) * 100, 6)}%` }}
                      aria-hidden
                    />
                  </div>
                  <Money value={band.value} size="sm" className="text-ink-soft shrink-0" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-3.5">
          <section className="card-flat overflow-hidden">
            <div className="border-hairline flex h-11 items-center border-b px-4">
              <MicroLabel>{report.splitTitle}</MicroLabel>
            </div>
            <ul className="divide-hairline divide-y px-4">
              {report.splits.map((split) => (
                <li key={split.label} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-ink block truncate text-[13.5px] font-medium">
                        {split.label}
                      </span>
                      <span className="text-ink-faint block truncate text-[11.5px]">
                        {split.sub}
                      </span>
                    </span>
                    <Money value={split.value} size="sm" className="shrink-0" />
                  </div>
                  <div className="bg-hairline mt-2 h-[3px] w-full overflow-hidden rounded-full">
                    <span
                      className="bg-primary animate-grow block h-full origin-left rounded-full"
                      style={{ width: `${Math.max((split.value / splitTop) * 100, 6)}%` }}
                      aria-hidden
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {report.variance && (
            <section className="card-flat px-4 py-4">
              <MicroLabel>Reconciled</MicroLabel>
              <p className="text-ink-soft mt-2 text-[13px] leading-[1.5]">
                {report.variance.closed} requisition
                {report.variance.closed === 1 ? "" : "s"} closed with receipts accepted.
              </p>
              <dl className="divide-hairline mt-3 divide-y">
                <div className="flex items-baseline justify-between gap-3 pb-2.5">
                  <dt className="text-ink-soft text-[13px]">Budgeted</dt>
                  <dd>
                    <Money value={report.variance.budget} size="sm" />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-ink-soft text-[13px]">Actually spent</dt>
                  <dd>
                    <Money value={report.variance.spent} size="sm" />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-2.5">
                  <dt className="text-st-good text-[13px] font-semibold">Returned</dt>
                  <dd className="text-st-good text-[15px] font-semibold tabular-nums">
                    ₦{Math.abs(report.variance.budget - report.variance.spent).toLocaleString("en-NG")}
                  </dd>
                </div>
              </dl>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
