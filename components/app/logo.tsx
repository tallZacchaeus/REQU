import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * The parish emblem, the same mark the mail application uses. One organisation should
 * look like one organisation: somebody who signs in to their church email and then to
 * Requisition should not wonder whether they are in the right place.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo.png"
      alt=""
      width={96}
      height={96}
      className={cn("size-6 object-contain", className)}
      priority
    />
  )
}

export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "btn-gradient relative flex size-14 items-center justify-center rounded-2xl text-white",
        // A tinted drop rather than a grey one — the mark reads as lit.
        "shadow-[0_14px_30px_-10px_rgb(18_58_104_/_0.6)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/30" aria-hidden />
      {/* White behind the emblem: its gold wreath disappears against the brand gradient. */}
      <span className="flex size-10 items-center justify-center rounded-xl bg-white">
        <LogoMark className="size-8" />
      </span>
    </span>
  )
}

export function Wordmark() {
  return (
    <span className="flex flex-col">
      <span className="text-ink text-[15px] leading-none font-bold tracking-[0.1em]">Requisition</span>
      <span className="text-ink-faint mt-1.5 text-[10.5px] leading-none font-medium tracking-[0.06em]">
        Youth &amp; Young Adults
      </span>
    </span>
  )
}
