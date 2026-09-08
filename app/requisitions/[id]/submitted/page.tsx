import { SubmittedConfirmation } from "./confirmation"

export default async function SubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SubmittedConfirmation id={id} />
}
