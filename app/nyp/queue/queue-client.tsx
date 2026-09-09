"use client"

import { ReviewerQueue } from "@/components/reviewer/queue"
import { NYP_CONFIG } from "@/lib/roles"

export function Queue() {
  return <ReviewerQueue config={NYP_CONFIG} />
}
