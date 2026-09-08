import { ReconcileForm } from "./form"

export default async function ReconcilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReconcileForm id={id} />
}
