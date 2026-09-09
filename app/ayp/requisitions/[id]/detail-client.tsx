"use client"

import { ReviewerDetail } from "@/components/reviewer/detail"
import { AYP_CONFIG } from "@/lib/roles"

export function Detail({ id }: { id: string }) {
  return <ReviewerDetail id={id} config={AYP_CONFIG} />
}
