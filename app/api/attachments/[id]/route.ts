import { NextResponse } from "next/server"
import { load, remove } from "@/lib/attachments"
import { subjectOf } from "@/lib/requisitions"
import { canSee, canEdit } from "@/lib/authz"
import { requireActor, isResponse, fail } from "@/lib/api-actor"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Hand back a document, if the caller may see the requisition it belongs to.
 *
 * Always as a download and never inline: a PDF or an image rendered in the page is a
 * document the browser has been asked to interpret, and these arrive from people.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const who = await requireActor()
  if (isResponse(who)) return who
  const { id } = await ctx.params

  try {
    const file = await load(id)
    if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 })

    const subject = await subjectOf(file.requisition_id)
    if (!subject || !canSee(who.actor, subject)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.content_type,
        "Content-Length": String(file.bytes.length),
        "Content-Disposition": `attachment; filename="${file.name}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (e) { return fail(e) }
}

/** Remove one, while the requisition is still the owner's to change. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const who = await requireActor()
  if (isResponse(who)) return who
  const { id } = await ctx.params
  try {
    const file = await load(id)
    if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 })
    const subject = await subjectOf(file.requisition_id)
    if (!subject || !canSee(who.actor, subject)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 })
    }
    const mayRemove =
      canEdit(who.actor, subject) ||
      (subject.requesterId === who.actor.id && subject.status === "disbursed")
    if (!mayRemove) {
      return NextResponse.json({ error: "This can no longer be changed." }, { status: 403 })
    }
    await remove(id)
    return NextResponse.json({ ok: true })
  } catch (e) { return fail(e) }
}
