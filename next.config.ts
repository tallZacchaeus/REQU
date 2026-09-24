import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone puts the server and only the dependencies it actually uses into one
  // folder, so the runtime image does not carry node_modules around.
  output: "standalone",

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Caddy already sets HSTS, nosniff and a referrer policy for every host on the
          // box. These are the ones specific to this application.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is here deliberately, and it is the one directive that is
              // weaker than it looks. Next boots React from inline scripts, and two
              // attempts at the nonce route — middleware and Next 16's proxy convention —
              // both left the framework's own scripts unnonced and the app frozen on its
              // splash screen for two days.
              //
              // What that costs is small here and worth stating: script-src defends against
              // injected script, and this application has no path by which text becomes
              // markup. There is no dangerouslySetInnerHTML and no innerHTML anywhere in it;
              // React escapes everything it renders. So this is a second lock on a door with
              // no handle, and the rest of the policy below is untouched and doing real work.
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              // These are the directives that still matter: no framing us, no plugins, no
              // rewriting where relative URLs point, and no posting our forms elsewhere.
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'none'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
