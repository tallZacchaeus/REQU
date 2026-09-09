"use client"

import { ReviewerDashboard } from "@/components/reviewer/dashboard"
import { FINANCE_CONFIG } from "@/lib/roles"

export default function Page() {
  return <ReviewerDashboard config={FINANCE_CONFIG} />
}
