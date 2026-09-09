"use client"

import { ReviewerDetail } from "@/components/reviewer/detail"
import { FINANCE_CONFIG } from "@/lib/roles"

export function Detail({ id }: { id: string }) {
  return <ReviewerDetail id={id} config={FINANCE_CONFIG} />
}
