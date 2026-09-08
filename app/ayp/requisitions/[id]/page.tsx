import { ReviewDetail } from "./review"

export default async function AypReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReviewDetail id={id} />
}
