"use client"

import { ReviewerQueue } from "@/components/reviewer/queue"
import { AYP_CONFIG } from "@/lib/roles"

export function Queue() {
  return <ReviewerQueue config={AYP_CONFIG} />
}
