import { NextResponse, type NextRequest } from "next/server"

/**
 * The content security policy, issued fresh for every request with a nonce.
 *
 * Two things have to be true for this to work, and both were missed the first time:
 *
 *   1. The export is named `proxy`. A default export registers and runs, but Next does not
 *      treat it as the convention, so the nonce never reaches the renderer.
 *   2. Pages must be dynamically rendered. Next stamps nonces during server rendering by
 *      reading this header off the request — a statically prerendered page was built long
 *      before any request existed, so there is nothing to stamp. See the root layout, which
 *      opts the whole app into dynamic rendering for exactly this reason.
 *
 * Get either wrong and the header is perfectly formed while the framework's own scripts go
 * out unnonced — which blocks them, and leaves the app frozen on its first frame.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const isDev = process.env.NODE_ENV === "development"

  const csp = [
    "default-src 'self'",
    // strict-dynamic lets the nonced bootstrap load the chunks it needs. React's debugger
    // needs eval in development and nowhere else.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles keep 'unsafe-inline' rather than a nonce. Tailwind and Next both inject style
    // tags, the risk from CSS is far smaller than from script, and a broken stylesheet is
    // an outage too.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ")

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  // Next reads the policy from the request to learn which nonce to use.
  requestHeaders.set("Content-Security-Policy", csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  return response
}

export const config = {
  // Static assets are files, not documents; they need no policy and no nonce.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
