import { RequisitionDetail } from "./detail"

// Next 16: params is a Promise and must be awaited before use.
export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <RequisitionDetail id={id} />
}
