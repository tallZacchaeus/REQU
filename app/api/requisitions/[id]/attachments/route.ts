import { NextResponse } from "next/server"
import { store, MAX_BYTES, ACCEPTED_DESCRIPTION } from "@/lib/attachments"
import { subjectOf } from "@/lib/requisitions"
import { canSee, canEdit } from "@/lib/authz"
import { requireActor, isResponse, fail } from "@/lib/api-actor"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const KINDS = ["proposal", "quotation", "receipt", "other"] as const

/**
 * Attach a document. Who may attach what depends on where the requisition is: the owner
 * adds proposals and quotations while it is still theirs to edit, and receipts once the
 * money has been paid and they are accounting for it.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const who = await requireActor()
  if (isResponse(who)) return who
  const { id } = await ctx.params

  const subject = await subjectOf(id)
  if (!subject || !canSee(who.actor, subject)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  const kind = String(form?.get("kind") ?? "other")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to attach." }, { status: 400 })
  }
  if (!KINDS.includes(kind as (typeof KINDS)[number])) {
    return NextResponse.json({ error: "That is not a kind of document we file." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `That file is larger than 10 MB. ${ACCEPTED_DESCRIPTION}.` }, { status: 413 })
  }

  // A receipt belongs to the accounting-for stage; everything else to the drafting stage.
  const allowed =
    kind === "receipt"
      ? subject.requesterId === who.actor.id &&
        (subject.status === "disbursed" || subject.status === "reconciliation_review")
      : canEdit(who.actor, subject)
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          kind === "receipt"
            ? "Receipts can be attached once the money has been paid out, by the person who raised it."
            : "This requisition can no longer be changed.",
      },
      { status: 403 },
    )
  }

  try {
    const saved = await store({
      requisitionId: id,
      uploadedBy: who.actor.id,
      kind: kind as (typeof KINDS)[number],
      filename: file.name,
      bytes: Buffer.from(await file.arrayBuffer()),
    })
    return NextResponse.json({ attachment: saved }, { status: 201 })
  } catch (e) { return fail(e) }
}
