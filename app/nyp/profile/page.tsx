"use client"

import { ReviewerProfile } from "@/components/reviewer/profile"
import { NYP_CONFIG } from "@/lib/roles"

export default function Page() {
  return <ReviewerProfile config={NYP_CONFIG} />
}
