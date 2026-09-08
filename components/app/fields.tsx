"use client"

import { useId } from "react"

import { cn } from "@/lib/utils"

const CONTROL =
  "w-full rounded-lg border border-input bg-card px-3 text-[16px] text-ink placeholder:text-ink-faint/80 transition-colors duration-200 focus:border-primary focus:outline-none disabled:opacity-50"

function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-ink text-[13px] font-semibold">
        {children}
      </label>
      {hint && <span className="text-ink-faint text-[12px]">{hint}</span>}
    </div>
  )
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function TextField({ label, hint, className, ...props }: FieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      {/* 16px type and a 44px box: no iOS zoom-on-focus, comfortable target. */}
      <input id={id} className={cn(CONTROL, "h-11")} {...props} />
    </div>
  )
}

export function TextAreaField({
  label,
  hint,
  className,
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div className={className}>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <textarea id={id} rows={rows} className={cn(CONTROL, "resize-none py-2.5 leading-[1.5]")} {...props} />
    </div>
  )
}

export function SelectField({
  label,
  hint,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div className={className}>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <select id={id} className={cn(CONTROL, "h-11 cursor-pointer appearance-none")} {...props}>
        {children}
      </select>
    </div>
  )
}

/** Naira input: the symbol lives in the box so the field reads as money. */
export function AmountField({
  value,
  onValueChange,
  label,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number
  onValueChange: (value: number) => void
  label: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="border-input bg-card focus-within:border-primary flex h-11 items-center rounded-lg border transition-colors duration-200">
        <span className="text-ink-faint border-input flex h-full w-9 items-center justify-center border-r text-[14px] font-medium">
          ₦
        </span>
        <input
          id={id}
          inputMode="numeric"
          value={value ? value.toLocaleString("en-NG") : ""}
          placeholder="0"
          onChange={(event) => {
            const digits = event.target.value.replace(/[^\d]/g, "")
            onValueChange(digits ? Number(digits) : 0)
          }}
          className="text-ink placeholder:text-ink-faint/80 h-full w-full bg-transparent px-3 text-right text-[16px] font-semibold outline-none"
          {...props}
        />
      </div>
    </div>
  )
}
