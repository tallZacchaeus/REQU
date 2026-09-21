import { NextResponse } from "next/server"
import { getFor, saveEdits, move } from "@/lib/requisitions"
import { requireActor, isResponse, fail } from "@/lib/api-actor"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const who = await requireActor()
  if (isResponse(who)) return who
  const { id } = await ctx.params
  try {
    const requisition = await getFor(who.actor, id)
    if (!requisition) return NextResponse.json({ error: "Not found." }, { status: 404 })
    return NextResponse.json({ requisition })
  } catch (e) { return fail(e) }
}

/**
 * Edits and moves both land here, because the screens save a requisition as a whole.
 * Only the editable fields are read from the body, and a status change is put through the
 * transition rules — never applied because the browser asked for it.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const who = await requireActor()
  if (isResponse(who)) return who
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Nothing to save." }, { status: 400 })

  try {
    if (body.programme !== undefined || body.items !== undefined) {
      await saveEdits(who.actor, id, {
        programme: String(body.programme ?? "").trim(),
        programmeDate: body.programmeDate ?? null,
        location: body.location ?? null,
        purpose: body.purpose ?? null,
        items: Array.isArray(body.items) ? body.items : [],
      })
    }
    if (body.to) {
      await move(who.actor, id, {
        to: body.to,
        comment: body.comment,
        requestedChanges: body.requestedChanges,
        paymentRef: body.paymentRef,
      })
    }
    const requisition = await getFor(who.actor, id)
    return NextResponse.json({ requisition })
  } catch (e) { return fail(e) }
}
