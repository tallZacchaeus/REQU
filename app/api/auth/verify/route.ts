import { NextResponse } from "next/server"
import { redeemLoginToken, sealSessionId, SESSION_COOKIE } from "@/lib/auth"
import type { Role } from "@/lib/data"

export const runtime = "nodejs"

/** Where each role lands once signed in. */
const HOME: Record<Role, string> = { hod: "/", ayp: "/ayp", nyp: "/nyp", finance: "/finance", super_admin: "/" }

/**
 * Where to send people afterwards. Taken from APP_URL, not from the request: behind a
 * reverse proxy the request's own origin is the container's internal address, and a person
 * arriving from their email would be redirected somewhere that does not exist.
 */
const base = () => process.env.APP_URL ?? new URL("https://requisition.rccgyayang.org").origin

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  if (!token) return NextResponse.redirect(new URL("/login?error=invalid", base()))

  const result = await redeemLoginToken(token, {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  })
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/login?error=${result.reason}`, base()))
  }

  const res = NextResponse.redirect(new URL(HOME[result.person.role] ?? "/", base()))
  res.cookies.set(SESSION_COOKIE, sealSessionId(result.sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, not Strict: this cookie is set during a navigation that began in a mail client,
    // and Strict would withhold it on the redirect that follows.
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  })
  return res
}
