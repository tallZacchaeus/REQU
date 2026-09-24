import { NextResponse, type NextRequest } from "next/server"

/**
 * The content security policy, issued per request with a nonce.
 *
 * It lived in next.config.ts as a static header with `script-src 'self'`, which blocked
 * Next's own inline bootstrap scripts: the page server-rendered, React never took over, and
 * every visitor sat looking at the splash screen for ever. A policy that is present and
 * correct can still be entirely wrong for the application it guards.
 *
 * A nonce is the fix rather than 'unsafe-inline'. Next stamps the nonce onto the scripts it
 * injects when it sees one in the policy on the incoming request, so the framework's own
 * code runs and anything injected into the page still does not.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")

  const csp = [
    "default-src 'self'",
    // strict-dynamic lets the nonced bootstrap load the chunks it needs, without opening
    // the door to anything that was not put there by us.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
    // Tailwind and Next inject styles inline; there is no nonce path for those.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ")

  const headers = new Headers(request.headers)
  headers.set("x-nonce", nonce)
  // Next reads the policy from the request to know which nonce to stamp on its scripts.
  headers.set("Content-Security-Policy", csp)

  const response = NextResponse.next({ request: { headers } })
  response.headers.set("Content-Security-Policy", csp)
  return response
}

export const config = {
  // Everything except static assets, which are files rather than documents.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
