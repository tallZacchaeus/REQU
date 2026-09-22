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
            // Next needs inline and eval for its own runtime in development; in production
            // it needs neither for scripts, but its styles are injected inline.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === "production"
                ? "script-src 'self'"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              // Nothing here should ever be framed, embed a plugin, or post a form away.
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
