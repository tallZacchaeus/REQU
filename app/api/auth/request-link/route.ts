import { NextResponse } from "next/server"
import { createLoginToken, withinLimit, sweep } from "@/lib/auth"
import { sendSignInLink, mailerConfigured } from "@/lib/mailer"

export const runtime = "nodejs"

const clientIp = (r: Request) =>
  r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined

/**
 * Ask for a sign-in link. Answers the same way whether or not the address belongs to
 * anybody: an endpoint that says "no such person" is a way to enumerate the church's staff.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null
  const email = body?.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Enter your email address." }, { status: 400 })
  }

  const ip = clientIp(req)
  // Per address and, more loosely, per connection: a whole church office can share one
  // internet connection, so a tight per-IP limit would lock out innocent people.
  const okEmail = await withinLimit(`link:${email}`, 5, 15)
  const okIp = await withinLimit(`link-ip:${ip ?? "unknown"}`, 30, 15)
  if (!okEmail || !okIp) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    )
  }

  const issued = await createLoginToken(email, ip)
  if (issued) {
    const base = process.env.APP_URL ?? "https://requisition.rccgyayang.org"
    const url = `${base}/api/auth/verify?token=${encodeURIComponent(issued.token)}`
    try {
      if (mailerConfigured()) {
        await sendSignInLink(issued.person.email, {
          name: issued.person.full_name,
          url,
          minutes: issued.minutes,
        })
      } else if (process.env.NODE_ENV !== "production") {
        // Without mail configured there is no way in at all in development, and a link
        // printed to the server's own log is visible only to whoever runs it.
        console.log(`[auth] sign-in link for ${issued.person.email}: ${url}`)
      }
    } catch (e) {
      console.error("[auth] could not send the sign-in link:", (e as Error).message)
      return NextResponse.json(
        { error: "We could not send the email just now. Please try again in a moment." },
        { status: 502 },
      )
    }
  }

  sweep().catch(() => undefined)
  return NextResponse.json({ ok: true })
}
