import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { destroySession, SESSION_COOKIE } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST() {
  const jar = await cookies()
  await destroySession(jar.get(SESSION_COOKIE)?.value)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 })
  return res
}
