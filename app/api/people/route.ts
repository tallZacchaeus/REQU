import { NextResponse } from "next/server"
import { q } from "@/lib/db"
import { isAdmin } from "@/lib/authz"
import { requireActor, isResponse, fail } from "@/lib/api-actor"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Everyone who has registered. Administrators only — this is the staff list. */
export async function GET() {
  const who = await requireActor()
  if (isResponse(who)) return who
  if (!isAdmin(who.actor.role)) {
    return NextResponse.json({ error: "That is not yours to see." }, { status: 403 })
  }
  try {
    const people = await q(
      `select p.id, p.email, p.full_name as "fullName", p.role, p.title,
              p.department_id as "departmentId", d.name as "department",
              p.active, p.registered_at as "registeredAt", p.approved_at as "approvedAt",
              a.full_name as "approvedBy"
         from people p
         left join departments d on d.id = p.department_id
         left join people a on a.id = p.approved_by
        order by (p.role = 'pending') desc, p.registered_at desc`)
    const departments = await q("select id, name from departments order by name")
    return NextResponse.json({ people, departments })
  } catch (e) { return fail(e) }
}
