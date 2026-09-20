"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, Clock, Mail, ShieldCheck } from "lucide-react"

import { LogoMark, LogoTile } from "@/components/app/logo"
import { MicroLabel } from "@/components/app/primitives"
import { DIRECTORY } from "@/lib/data"
import { isValidEmail, maskEmail, useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

type Status = "idle" | "sending" | "sent"

const RESEND_SECONDS = 45

const STEPS = [
  "Enter the email address on your worker record",
  "Tap the secure link we send you",
  "You land straight in your workspace",
]

export default function LoginPage() {
  const router = useRouter()
  const { requestLink, pendingEmail } = useSession()
  const [stage, setStage] = useState<"form" | "check">("form")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (status !== "idle") return

    const value = email.trim()
    if (!value) return setError("Enter the email address you registered with.")
    if (!isValidEmail(value)) return setError("That doesn't look like a valid email address.")

    setError(null)
    setStatus("sending")

    // Ask the server for a real link. It answers the same way whether or not the address
    // belongs to anybody, so there is nothing here to tell a stranger who works here.
    void fetch("/api/auth/request-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value }),
    })
      .then(async (r) => {
        if (r.ok) return
        const body = (await r.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? "We could not send the email just now. Please try again.")
        setStatus("idle")
      })
      .catch(() => {
        setError("Could not reach the server. Please try again in a moment.")
        setStatus("idle")
      })

    // Two beats: the send, then a held confirmation so the button resolves
    // before the screen changes under the reader.
    timers.current.push(
      setTimeout(() => {
        requestLink(value)
        setStatus("sent")
      }, 950),
      setTimeout(() => setStage("check"), 1500),
    )
  }

  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2 xl:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      {/* The panel stays put across both stages, so confirming does not drop
          the visitor back into a phone column on a wide screen. */}
      <div className="canvas-lift flex min-h-dvh flex-col px-5 py-10 sm:px-8 lg:min-h-0 lg:justify-center lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[420px] flex-1 lg:flex-none">
          {stage === "check" ? (
            <CheckEmail
              email={pendingEmail ?? email}
              onUseAnother={() => {
                setStage("form")
                setStatus("idle")
              }}
              onOpen={() => router.push("/login/verify")}
            />
          ) : (
            <SignInForm
              email={email}
              error={error}
              status={status}
              onEmail={(value) => {
                setEmail(value)
                if (error) setError(null)
              }}
              onSubmit={submit}
            />
          )}
        </div>

        <p className="text-ink-faint mx-auto w-full max-w-[420px] pt-8 text-center text-[12px] lg:text-left">
          Trouble signing in? Contact your provincial administrator.
        </p>
      </div>
    </main>
  )
}

function BrandPanel() {
  return (
    <aside className="header-deep hidden flex-col justify-between p-12 lg:flex xl:p-16">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/15">
          <LogoMark className="size-5" />
        </span>
        <span className="flex flex-col">
          <span className="text-[15px] leading-none font-bold tracking-[0.14em] text-white">
            REQU
          </span>
          <span className="mt-1.5 text-[10.5px] leading-none font-medium tracking-[0.06em] text-white/55">
            Youth &amp; Young Adults
          </span>
        </span>
      </div>

      <div>
        <p className="max-w-[420px] text-[34px] leading-[1.15] font-semibold tracking-[-0.03em] text-white">
          Every naira, from request to receipt.
        </p>
        <p className="mt-4 max-w-[380px] text-[14.5px] leading-[1.6] text-white/60">
          Raise a requisition, watch it move through recommendation, approval and disbursement,
          then close it with the receipts.
        </p>

        <ol className="mt-10 max-w-[400px] space-y-3.5">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3.5">
              <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[11.5px] text-white/70">
                {index + 1}
              </span>
              <span className="text-[13.5px] leading-[1.5] text-white/70">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[12px] text-white/40">
        REQU · Requisition management for Youth &amp; Young Adults
      </p>
    </aside>
  )
}

function SignInForm({
  email,
  error,
  status,
  onEmail,
  onSubmit,
}: {
  email: string
  error: string | null
  status: Status
  onEmail: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="animate-rise flex flex-col items-center text-center lg:items-start lg:text-left">
        <LogoTile className="lg:hidden" />
        <h1 className="text-ink mt-6 text-[28px] leading-[1.12] font-semibold tracking-[-0.03em] sm:text-[30px] lg:mt-0">
          Welcome back
        </h1>
        <p className="text-ink-soft mt-2.5 max-w-[300px] text-[14.5px] leading-[1.55]">
          Sign in to raise, review and track programme requisitions.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="card-flat animate-rise mt-7 px-4 py-4 shadow-raised sm:px-5"
        style={{ animationDelay: "80ms" }}
        noValidate
      >
        <EmailField
          value={email}
          error={error}
          disabled={status !== "idle"}
          onChange={onEmail}
        />
        <SubmitButton status={status} />
        <p className="text-ink-soft mt-3.5 flex items-start gap-2 text-[12px] leading-[1.5]">
          <ShieldCheck
            className="text-ink-faint mt-px size-3.5 shrink-0"
            strokeWidth={1.9}
            aria-hidden
          />
          <span>No password. We email a single-use link that expires in 15&nbsp;minutes.</span>
        </p>
      </form>

      {/* The desktop panel already tells this story. */}
      <section className="animate-rise mt-5 lg:hidden" style={{ animationDelay: "140ms" }}>
        <MicroLabel className="mb-2.5">How sign-in works</MicroLabel>
        <ol className="divide-hairline divide-y">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 py-2.5">
              <span className="text-ink-faint w-4 shrink-0 font-mono text-[11.5px] leading-[1.5]">
                {index + 1}
              </span>
              <span className="text-ink-soft text-[13px] leading-[1.5]">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Passwordless means the address picks the role, so the prototype has
          to hand you the identities to try. */}
      <section
        className="animate-rise border-hairline mt-5 rounded-xl border border-dashed px-4 py-3.5"
        style={{ animationDelay: "180ms" }}
      >
        <MicroLabel className="mb-2.5">Prototype accounts</MicroLabel>
        <div className="grid grid-cols-2 gap-2">
          {DIRECTORY.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => onEmail(account.email)}
              className="border-hairline bg-card hover:border-primary/40 hover:bg-muted/40 press flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-left"
            >
              <span className="bg-muted text-ink-soft flex size-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold">
                {account.initials}
              </span>
              <span className="min-w-0">
                <span className="text-ink block truncate text-[12.5px] leading-tight font-semibold">
                  {account.shortName}
                </span>
                <span className="text-ink-faint block truncate text-[10.5px] leading-tight">
                  {account.title}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function EmailField({
  value,
  error,
  disabled,
  onChange,
}: {
  value: string
  error: string | null
  disabled: boolean
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="mb-3">
      <label htmlFor={id} className="text-ink mb-1.5 block text-[13px] font-semibold">
        Email address
      </label>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="you@requ.org"
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "border-input bg-card text-ink placeholder:text-ink-faint/80 h-11 w-full rounded-lg border px-3 text-[16px] transition-[border-color,box-shadow] duration-200 outline-none disabled:opacity-60",
          error
            ? "border-st-bad focus:border-st-bad focus:ring-st-bad/15 focus:ring-3"
            : "focus:border-brand focus:ring-brand/20 focus:ring-3",
        )}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-st-bad animate-fade mt-2 text-[12.5px]">
          {error}
        </p>
      )}
    </div>
  )
}

function SubmitButton({ status }: { status: Status }) {
  return (
    <button
      type="submit"
      disabled={status !== "idle"}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition-all duration-200 active:scale-[0.99]",
        status === "sent"
          ? "bg-st-good text-white"
          : "btn-gradient cursor-pointer text-white hover:brightness-110 disabled:cursor-wait",
      )}
    >
      {status === "idle" && (
        <>
          Send login link
          <ArrowRight className="size-[17px]" strokeWidth={2.4} aria-hidden />
        </>
      )}
      {status === "sending" && (
        <>
          <span
            className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
            aria-hidden
          />
          Sending link…
        </>
      )}
      {status === "sent" && (
        <>
          <Check className="size-[17px]" strokeWidth={3} aria-hidden />
          Link sent
        </>
      )}
    </button>
  )
}

function CheckEmail({
  email,
  onUseAnother,
  onOpen,
}: {
  email: string
  onUseAnother: () => void
  onOpen: () => void
}) {
  const [left, setLeft] = useState(RESEND_SECONDS)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (left <= 0) return
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [left])

  return (
    <div className="animate-fade flex h-full flex-col justify-center">
      <div className="animate-rise flex flex-col items-center text-center lg:items-start lg:text-left">
        <span className="relative flex size-14 items-center justify-center">
          <span className="bg-brand/20 animate-pulse-ring absolute inset-0 rounded-2xl" aria-hidden />
          <span className="btn-gradient text-white relative flex size-14 items-center justify-center rounded-2xl shadow-[0_14px_30px_-10px_rgb(18_58_104_/_0.6)]">
            <Mail className="size-6" strokeWidth={1.8} aria-hidden />
          </span>
        </span>

        <h1 className="text-ink mt-6 text-[26px] leading-tight font-semibold tracking-[-0.025em] sm:text-[28px]">
          Check your email
        </h1>
        <p className="text-ink-soft mt-2.5 text-[14.5px] leading-[1.55]">
          We&apos;ve sent a secure sign-in link to
        </p>
        <p className="text-ink mt-2 font-mono text-[13.5px] font-medium">{maskEmail(email)}</p>
      </div>

      <div className="card-flat mt-6 px-4 py-3.5">
        <p className="text-ink-soft flex items-start gap-2.5 text-[12.5px] leading-[1.5]">
          <Clock className="text-ink-faint mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          The link expires in 15 minutes and can only be used once. Keep this screen open while you
          check your inbox.
        </p>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="btn-gradient text-white mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[15px] font-semibold shadow-raised transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.99]"
      >
        <Mail className="size-[17px]" strokeWidth={2.2} aria-hidden />
        Open email app
      </button>

      <div className="mt-4 text-center lg:text-left">
        {left > 0 ? (
          <div>
            <p className="text-ink-faint text-[13px]">
              Didn&apos;t receive it? Resend in{" "}
              <span className="text-ink-soft font-mono font-medium tabular-nums">
                0:{String(left).padStart(2, "0")}
              </span>
            </p>
            <div className="bg-hairline mt-2 h-[3px] w-full overflow-hidden rounded-full">
              <span
                className="bg-brand block h-full rounded-full transition-[width] duration-1000 ease-linear"
                style={{ width: `${(left / RESEND_SECONDS) * 100}%` }}
                aria-hidden
              />
            </div>
          </div>
        ) : resent ? (
          <p className="text-st-good animate-fade text-[13px] font-medium">
            Link resent — check your inbox again.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => {
              setResent(true)
              setLeft(RESEND_SECONDS)
            }}
            className="text-brand-ink animate-fade cursor-pointer text-[13.5px] font-semibold hover:underline"
          >
            Didn&apos;t receive it? Resend link
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onUseAnother}
        className="text-ink-soft hover:text-ink mt-4 h-11 w-full cursor-pointer text-[13.5px] font-medium transition-colors duration-200"
      >
        Wrong address? Use a different email
      </button>

      <p className="text-ink-faint/80 mt-3 text-center text-[11px] leading-[1.5] lg:text-left">
        Prototype — &ldquo;Open email app&rdquo; continues as though you tapped the link.
      </p>
    </div>
  )
}
