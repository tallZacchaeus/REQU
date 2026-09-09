"use client"

import { ReviewerQueue } from "@/components/reviewer/queue"
import { FINANCE_CONFIG } from "@/lib/roles"

export function Queue() {
  return <ReviewerQueue config={FINANCE_CONFIG} />
}
