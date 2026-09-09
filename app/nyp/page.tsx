"use client"

import { ReviewerDashboard } from "@/components/reviewer/dashboard"
import { NYP_CONFIG } from "@/lib/roles"

export default function Page() {
  return <ReviewerDashboard config={NYP_CONFIG} />
}
