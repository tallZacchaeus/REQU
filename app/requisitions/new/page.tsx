import { Suspense } from "react"

import { ScreenHeader } from "@/components/app/screen-header"

import { NewRequisitionFlow } from "./flow"

export default function NewRequisitionPage() {
  return (
    <Suspense fallback={<ScreenHeader title="New Requisition" back="/requisitions" />}>
      <NewRequisitionFlow />
    </Suspense>
  )
}
