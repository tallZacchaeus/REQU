"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock, Mail, ShieldCheck } from "lucide-react";

import { LogoTile } from "@/components/app/logo";
import { MicroLabel } from "@/components/app/primitives";
import { isValidEmail, maskEmail, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent";

const RESEND_SECONDS = 45;

const STEPS = [
  "Enter the email address on your worker record",
  "Tap the secure link we send you",
  "You land straight in your requisitions",
];

export default function LoginPage() {
  const router = useRouter();
  const { requestLink, pendingEmail } = useSession();
  const [stage, setStage] = useState<"form" | "check">("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status !== "idle") return;

    const value = email.trim();
    if (!value) return setError("Enter the email address you registered with.");
    if (!isValidEmail(value))
      return setError("That doesn't look like a valid email address.");

    setError(null);
    setStatus("sending");
    // Two beats: the send, then a held confirmation so the button resolves
    // before the screen changes under the reader.
    timers.current.push(
      setTimeout(() => {
        requestLink(value);
        setStatus("sent");
      }, 950),
      setTimeout(() => setStage("check"), 1500),
    );
  }

  if (stage === "check") {
    return (
      <CheckEmail
        email={pendingEmail ?? email}
        onUseAnother={() => {
          setStage("form");
          setStatus("idle");
        }}
        onOpen={() => router.push("/login/verify")}
      />
    );
  }

  return (
    <main className="canvas-lift flex min-h-dvh flex-col px-5 pt-12 pb-8">
      <div className="my-auto">
        <div className="animate-rise flex flex-col items-center text-center">
          <LogoTile />
          <h1 className="text-ink mt-6 text-[30px] leading-[1.12] font-semibold tracking-[-0.03em]">
            Welcome back
          </h1>
          <p className="text-ink-soft mt-2.5 max-w-[290px] text-[14.5px] leading-[1.55]">
            Sign in to raise and track requisitions for your department.
          </p>
        </div>

        {/* The form is a document surface like every other card in the app. */}
        <form
          onSubmit={submit}
          className="card-flat animate-rise mt-8 px-4 py-4 shadow-raised"
          style={{ animationDelay: "110ms" }}
          noValidate
        >
          <EmailField
            value={email}
            error={error}
            disabled={status !== "idle"}
            onChange={(value) => {
              setEmail(value);
              if (error) setError(null);
            }}
          />

          <SubmitButton status={status} />

          <p className="text-ink-soft mt-3.5 flex items-start gap-2 text-[12px] leading-[1.5]">
            <ShieldCheck
              className="text-ink-faint mt-px size-3.5 shrink-0"
              strokeWidth={1.9}
              aria-hidden
            />
            <span>
              No password. We email a single-use link that expires in
              15&nbsp;minutes.
            </span>
          </p>
        </form>

        {/* Real content in the middle rather than padding. */}
        <section
          className="animate-rise mt-5"
          style={{ animationDelay: "160ms" }}
        >
          <MicroLabel className="mb-2.5">How sign-in works</MicroLabel>
          <ol className="divide-hairline divide-y">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 py-2.5">
                <span className="text-ink-faint w-4 shrink-0 font-mono text-[11.5px] leading-[1.5]">
                  {index + 1}
                </span>
                <span className="text-ink-soft text-[13px] leading-[1.5]">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <p className="text-ink-faint pt-8 text-center text-[12px]">
        Trouble signing in? Contact your provincial administrator.
      </p>
    </main>
  );
}

function EmailField({
  value,
  error,
  disabled,
  onChange,
}: {
  value: string;
  error: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="mb-3">
      <label
        htmlFor={id}
        className="text-ink mb-1.5 block text-[13px] font-semibold"
      >
        Email address
      </label>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="you@cwms.org"
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "border-input bg-card text-ink placeholder:text-ink-faint/80 h-12 w-full rounded-lg border px-3 text-[16px] transition-[border-color,box-shadow] duration-200 outline-none disabled:opacity-60",
          // Sky is spent here — the one live, interactive moment on the screen.
          error
            ? "border-st-bad focus:border-st-bad focus:ring-st-bad/15 focus:ring-3"
            : "focus:border-brand focus:ring-brand/20 focus:ring-3",
        )}
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-st-bad animate-fade mt-2 text-[12.5px]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton({ status }: { status: Status }) {
  return (
    <button
      type="submit"
      disabled={status !== "idle"}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition-all duration-200 active:scale-[0.99]",
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
  );
}

function CheckEmail({
  email,
  onUseAnother,
  onOpen,
}: {
  email: string;
  onUseAnother: () => void;
  onOpen: () => void;
}) {
  const [left, setLeft] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  return (
    <main className="canvas-lift animate-fade flex min-h-dvh flex-col px-5 pt-16 pb-8">
      <div className="animate-rise mt-auto flex flex-col items-center text-center">
        <span className="relative flex size-14 items-center justify-center">
          <span
            className="bg-brand/20 animate-pulse-ring absolute inset-0 rounded-2xl"
            aria-hidden
          />
          <span className="btn-gradient relative flex size-14 items-center justify-center rounded-2xl text-white shadow-[0_14px_30px_-10px_rgb(18_58_104_/_0.6)]">
            <Mail className="size-6" strokeWidth={1.8} aria-hidden />
          </span>
        </span>

        <h1 className="text-ink mt-6 text-[26px] leading-tight font-semibold tracking-[-0.025em]">
          Check your email
        </h1>
        <p className="text-ink-soft mt-2.5 max-w-[290px] text-[14.5px] leading-[1.55]">
          We&apos;ve sent a secure sign-in link to
        </p>
        <p className="text-ink mt-2 font-mono text-[13.5px] font-medium">
          {maskEmail(email)}
        </p>
      </div>

      <div className="card-flat mt-7 px-4 py-3.5">
        <p className="text-ink-soft flex items-start gap-2.5 text-[12.5px] leading-[1.5]">
          <Clock
            className="text-ink-faint mt-px size-3.5 shrink-0"
            strokeWidth={2}
            aria-hidden
          />
          The link expires in 15 minutes and can only be used once. Keep this
          screen open while you check your inbox.
        </p>
      </div>

      <div className="mt-auto pt-10">
        <button
          type="button"
          onClick={onOpen}
          className="btn-gradient flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[15px] font-semibold text-white shadow-raised transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.99]"
        >
          <Mail className="size-[17px]" strokeWidth={2.2} aria-hidden />
          Open email app
        </button>

        <div className="mt-4 text-center">
          {left > 0 ? (
            <p className="text-ink-faint text-[13px]">
              Didn&apos;t receive it? Resend in{" "}
              <span className="text-ink-soft font-mono font-medium tabular-nums">
                0:{String(left).padStart(2, "0")}
              </span>
            </p>
          ) : resent ? (
            <p className="text-st-good animate-fade text-[13px] font-medium">
              Link resent — check your inbox again.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setResent(true);
                setLeft(RESEND_SECONDS);
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

        <p className="text-ink-faint/80 mt-3 text-center text-[11px] leading-[1.5]">
          Prototype — &ldquo;Open email app&rdquo; continues as though you
          tapped the link.
        </p>
      </div>
    </main>
  );
}
