import { NextResponse } from "next/server"
import { q } from "@/lib/db"
import { isAdmin } from "@/lib/authz"
import { requireActor, isResponse, fail } from "@/lib/api-actor"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ROLES = ["pending", "hod", "ayp", "nyp", "finance", "super_admin"]

/**
 * Give somebody a part to play, correct their name, or switch them off.
 *
 * Who granted it and when are recorded: an account that gained the power to approve money
 * should carry the record of who gave it that power.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const who = await requireActor()
  if (isResponse(who)) return who
  if (!isAdmin(who.actor.role)) {
    return NextResponse.json({ error: "Only an administrator can do that." }, { status: 403 })
  }
  const { id } = await ctx.params
  const personId = Number(id)
  if (!Number.isInteger(personId)) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const body = (await req.json().catch(() => null)) as
    | { role?: string; fullName?: string; department?: string | null; active?: boolean }
    | null
  if (!body) return NextResponse.json({ error: "Nothing to change." }, { status: 400 })

  if (body.role && !ROLES.includes(body.role)) {
    return NextResponse.json({ error: "That is not a role." }, { status: 400 })
  }
  // An administrator removing their own administrator rights would lock the last one out.
  if (personId === who.actor.id && body.role && body.role !== "super_admin") {
    return NextResponse.json(
      { error: "You cannot change your own role. Ask the other administrator." },
      { status: 400 },
    )
  }
  if (personId === who.actor.id && body.active === false) {
    return NextResponse.json({ error: "You cannot switch off your own account." }, { status: 400 })
  }

  try {
    let departmentId: number | null | undefined
    if (body.department !== undefined) {
      if (!body.department) departmentId = null
      else {
        const d = await q<{ id: number }>(
          "insert into departments(name) values ($1) on conflict (name) do update set name=excluded.name returning id",
          [body.department.trim()])
        departmentId = d[0]!.id
      }
    }

    await q(
      `update people set
         role          = coalesce($2, role),
         full_name     = coalesce($3, full_name),
         department_id = case when $5::boolean then $4::int else department_id end,
         active        = coalesce($6, active),
         approved_by   = case when $2 is not null and $2 <> 'pending' then $7 else approved_by end,
         approved_at   = case when $2 is not null and $2 <> 'pending' then now() else approved_at end
       where id = $1`,
      [personId, body.role ?? null, body.fullName?.trim() || null,
       departmentId ?? null, departmentId !== undefined, body.active ?? null, who.actor.id])

    const rows = await q(
      `select p.id, p.email, p.full_name as "fullName", p.role, p.active, d.name as "department"
         from people p left join departments d on d.id = p.department_id where p.id=$1`, [personId])
    if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 })
    return NextResponse.json({ person: rows[0] })
  } catch (e) { return fail(e) }
}
