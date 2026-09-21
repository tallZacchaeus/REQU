import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { personFromSession, SESSION_COOKIE } from "./auth"
import type { Actor } from "./authz"

/**
 * The signed-in person as the rules see them, or a 401. Every route begins here: an
 * endpoint that takes the caller's word for who they are is the whole vulnerability.
 */
export async function requireActor(): Promise<{ actor: Actor; name: string } | NextResponse> {
  const jar = await cookies()
  const person = await personFromSession(jar.get(SESSION_COOKIE)?.value)
  if (!person) return NextResponse.json({ error: "Please sign in." }, { status: 401 })
  return { actor: { id: person.id, role: person.role, departmentId: person.department_id }, name: person.full_name }
}

export const isResponse = (v: unknown): v is NextResponse => v instanceof NextResponse

/** Turns the errors thrown by the data layer into the status they carry. */
export function fail(e: unknown) {
  const status = (e as { status?: number }).status ?? 500
  const message = status === 500 ? "Something went wrong." : (e as Error).message
  if (status === 500) console.error("[api]", e)
  return NextResponse.json({ error: message }, { status })
}
