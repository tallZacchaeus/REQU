"use client"

import { ReviewerProfile } from "@/components/reviewer/profile"
import { FINANCE_CONFIG } from "@/lib/roles"

export default function Page() {
  return <ReviewerProfile config={FINANCE_CONFIG} />
}
