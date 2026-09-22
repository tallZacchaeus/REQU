import { NextResponse } from "next/server"
import { listFor, createDraft } from "@/lib/requisitions"
import { requireActor, isResponse, fail, withinWriteLimit } from "@/lib/api-actor"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const who = await requireActor()
  if (isResponse(who)) return who
  try {
    return NextResponse.json({ requisitions: await listFor(who.actor) })
  } catch (e) { return fail(e) }
}

export async function POST(req: Request) {
  const who = await requireActor()
  if (isResponse(who)) return who
  const limited = await withinWriteLimit(who.actor.id)
  if (limited) return limited
  const body = await req.json().catch(() => null)
  if (!body?.programme?.trim()) {
    return NextResponse.json({ error: "Give the programme a name." }, { status: 400 })
  }
  try {
    const id = await createDraft(who.actor, {
      programme: String(body.programme).trim(),
      programmeDate: body.programmeDate ?? null,
      location: body.location ?? null,
      purpose: body.purpose ?? null,
      items: Array.isArray(body.items) ? body.items : [],
    })
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) { return fail(e) }
}
