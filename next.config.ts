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
          // The policy is set per request in proxy.ts, because it carries a nonce.
        ],
      },
    ]
  },
};

export default nextConfig;
