"use client"

import { useId, useState } from "react"

import { formatAmount } from "@/lib/format"
import type { MonthPoint, Share } from "@/lib/series"
import { cn } from "@/lib/utils"

const SHARE_FILL: Record<Share["key"], string> = {
  action: "var(--color-st-action)",
  motion: "var(--color-st-motion)",
  settled: "var(--color-st-good)",
}

/**
 * Single-series area trend. One series means no legend — the card title names
 * it. A crosshair follows the pointer because an SVG chart on a page is an
 * interactive object, not a picture.
 */
export function AreaTrend({
  points,
  field = "requested",
  height = 132,
}: {
  points: MonthPoint[]
  field?: "requested" | "disbursed"
  height?: number
}) {
  const gradient = useId()
  const [hover, setHover] = useState<number | null>(null)

  const width = 320
  const pad = 8
  const peak = Math.max(...points.map((p) => p[field]), 1)
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0
  const x = (i: number) => pad + i * step
  const y = (v: number) => height - 22 - (v / peak) * (height - 44)

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p[field])}`).join(" ")
  const area = `${line} L${x(points.length - 1)},${height - 22} L${x(0)},${height - 22} Z`
  const active = hover === null ? null : points[hover]

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`${field} by month`}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#${gradient})`} />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" />

        {active && (
          <line
            x1={x(hover!)}
            x2={x(hover!)}
            y1={12}
            y2={height - 22}
            stroke="var(--hairline)"
            strokeWidth="1"
          />
        )}

        {points.map((p, i) => (
          <g key={p.key}>
            {hover === i && (
              <circle
                cx={x(i)}
                cy={y(p[field])}
                r="5"
                fill="var(--brand)"
                stroke="var(--card)"
                strokeWidth="2"
              />
            )}
            {/* Hit target far wider than the mark. */}
            <rect
              x={x(i) - step / 2}
              y={0}
              width={Math.max(step, 12)}
              height={height}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
            />
            <text
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              className="fill-ink-faint text-[9px]"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>

      {active && (
        <div className="border-hairline bg-card text-ink pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium shadow-card">
          {active.label} · <span className="tabular-nums">₦{formatAmount(active[field])}</span>
        </div>
      )}
    </div>
  )
}

/** Monthly magnitude. Rounded data-ends, anchored to the baseline. */
export function MonthlyBars({
  points,
  field,
  height = 160,
}: {
  points: MonthPoint[]
  field: "requested" | "disbursed"
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const peak = Math.max(...points.map((p) => p[field]), 1)
  const active = hover === null ? null : points[hover]

  return (
    <div className="relative">
      {/* Recessive grid: three rules, no box. */}
      <div className="relative flex items-end gap-1.5" style={{ height }}>
        {[0.25, 0.5, 0.75].map((line) => (
          <span
            key={line}
            className="border-hairline pointer-events-none absolute inset-x-0 border-t border-dashed"
            style={{ bottom: `${line * 100}%` }}
            aria-hidden
          />
        ))}

        {points.map((p, i) => {
          const share = p[field] / peak
          return (
            <button
              key={p.key}
              type="button"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${p.label}: ₦${formatAmount(p[field])}`}
              className="group relative flex h-full flex-1 cursor-pointer items-end"
            >
              <span
                className={cn(
                  "block w-full rounded-t-[4px] transition-[opacity,background-color] duration-200",
                  hover === i ? "bg-brand" : "bg-brand/35 group-hover:bg-brand",
                )}
                style={{ height: `${Math.max(share * 100, p[field] > 0 ? 3 : 0)}%` }}
              />
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex gap-1.5">
        {points.map((p, i) => (
          <span
            key={p.key}
            className={cn(
              "flex-1 text-center text-[10.5px] transition-colors duration-200",
              hover === i ? "text-ink font-semibold" : "text-ink-faint",
            )}
          >
            {p.label}
          </span>
        ))}
      </div>

      {active && (
        <div className="border-hairline bg-card text-ink pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium shadow-card">
          {active.label} · <span className="tabular-nums">₦{formatAmount(active[field])}</span>
          <span className="text-ink-faint"> · {active.count} raised</span>
        </div>
      )}
    </div>
  )
}

/**
 * Proportional split. Every segment is directly labelled with its own colour
 * dot, so identity never rests on the fill alone, and a 2px surface gap keeps
 * adjacent fills from reading as one block.
 */
export function ShareBar({ shares }: { shares: Share[] }) {
  const total = shares.reduce((sum, s) => sum + s.value, 0) || 1

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {shares.map((share) => (
          <div key={share.key} className="min-w-0">
            <p className="text-ink flex items-center gap-1.5 truncate text-[12.5px]">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: SHARE_FILL[share.key] }}
                aria-hidden
              />
              {share.label}
            </p>
            <p className="text-ink mt-1 text-[14px] font-semibold tabular-nums">
              ₦{formatAmount(share.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
        {shares.map((share) => (
          <span
            key={share.key}
            title={`${share.label}: ${share.count}`}
            className="animate-grow block h-full origin-left first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${Math.max((share.value / total) * 100, share.value > 0 ? 4 : 0)}%`,
              background: SHARE_FILL[share.key],
            }}
          />
        ))}
      </div>
    </div>
  )
}
