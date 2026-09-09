import { Detail } from "./detail-client"

// Next 16: params is a Promise and must be awaited before use.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <Detail id={id} />
}
