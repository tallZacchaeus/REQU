import { Suspense } from "react"

import { ReviewQueue } from "./queue"

export default function AypQueuePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <ReviewQueue />
    </Suspense>
  )
}
