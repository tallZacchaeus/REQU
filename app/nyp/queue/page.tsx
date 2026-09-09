import { Suspense } from "react"

import { Queue } from "./queue-client"

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Queue />
    </Suspense>
  )
}
