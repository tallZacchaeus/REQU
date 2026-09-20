import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { personFromSession, SESSION_COOKIE } from "@/lib/auth"

export const runtime = "nodejs"

/** Who is signed in. The screens still read the browser in this phase; see 06. */
export async function GET() {
  const jar = await cookies()
  const person = await personFromSession(jar.get(SESSION_COOKIE)?.value)
  if (!person) return NextResponse.json({ signedIn: false }, { status: 401 })
  return NextResponse.json({
    signedIn: true,
    person: {
      id: person.id,
      email: person.email,
      name: person.full_name,
      shortName: person.short_name,
      initials: person.initials,
      role: person.role,
      title: person.title,
      scope: person.scope,
    },
  })
}
