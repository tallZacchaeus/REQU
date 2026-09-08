import { Suspense } from "react"

import { RequisitionsList } from "./list"

export default function RequisitionsPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <RequisitionsList />
    </Suspense>
  )
}
