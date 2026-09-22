"use client"

import Link from "next/link"
import { Check } from "lucide-react"

import { MicroLabel, Money, StatusBadge } from "@/components/app/primitives"
import { useRequisitions } from "@/lib/store"
import { requisitionTotal } from "@/lib/types"

export function SubmittedConfirmation({ id }: { id: string }) {
  const { getById } = useRequisitions()
  const requisition = getById(id)

  if (!requisition) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <Link
          href="/requisitions"
          className="text-primary text-[14px] font-semibold hover:underline"
        >
          Back to my requisitions
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pt-16 pb-8">
      <div className="flex flex-col items-center text-center">
        <span className="bg-st-good/10 flex size-14 items-center justify-center rounded-full">
          <span className="bg-st-good flex size-9 items-center justify-center rounded-full">
            <Check className="size-5 text-white" strokeWidth={3} aria-hidden />
          </span>
        </span>
        <h1 className="text-ink mt-5 text-[22px] leading-tight font-semibold tracking-[-0.02em]">
          Requisition submitted
        </h1>
        <p className="text-ink-soft mt-2 max-w-[300px] text-[13.5px] leading-[1.55]">
          Your request has been sent to the Assistant National Youth Pastor for recommendation,
          for recommendation.
        </p>
      </div>

      {/* The receipt. Everything they would want to screenshot, in one block. */}
      <div className="card-flat mt-8">
        <div className="border-hairline flex h-11 items-center justify-between border-b px-4">
          <MicroLabel>Request ID</MicroLabel>
          <span className="text-ink font-mono text-[12.5px] font-medium">
            {requisition.reference}
          </span>
        </div>
        <div className="space-y-3.5 px-4 py-4">
          <div>
            <MicroLabel>Programme</MicroLabel>
            <p className="text-ink mt-1 text-[15px] font-semibold">{requisition.programme}</p>
          </div>
          <div>
            <MicroLabel>Amount</MicroLabel>
            <Money value={requisitionTotal(requisition)} size="lg" className="mt-1 block" />
          </div>
          <div>
            <MicroLabel>Current status</MicroLabel>
            <div className="mt-1.5">
              <StatusBadge status={requisition.status} forceChip />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-2.5 pt-10">
        <Link
          href={`/requisitions/${requisition.id}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 w-full cursor-pointer items-center justify-center rounded-lg text-[15px] font-semibold transition-colors duration-200"
        >
          Track request
        </Link>
        <Link
          href="/"
          className="text-ink-soft hover:bg-muted hover:text-ink flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-[14px] font-semibold transition-colors duration-200"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
