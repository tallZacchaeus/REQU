import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"

interface ScreenHeaderProps {
  title: string
  /** Renders a back affordance pointing at this route. */
  back?: string
  action?: React.ReactNode
  className?: string
}

export function ScreenHeader({ title, back, action, className }: ScreenHeaderProps) {
  return (
    <header
      className={cn(
        "border-hairline bg-card/90 sticky top-0 z-20 flex h-14 items-center gap-1 border-b px-2 backdrop-blur-sm",
        className,
      )}
    >
      {back ? (
        <Link
          href={back}
          aria-label="Go back"
          className="text-ink-soft hover:bg-muted hover:text-ink press group flex size-10 cursor-pointer items-center justify-center rounded-lg"
        >
          <ChevronLeft
            className="size-5 transition-transform duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="text-ink flex-1 truncate text-[17px] font-semibold tracking-[-0.01em]">
        {title}
      </h1>
      {action}
    </header>
  )
}
