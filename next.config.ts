import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone puts the server and only the dependencies it actually uses into one
  // folder, so the runtime image does not carry node_modules around.
  output: "standalone",
};

export default nextConfig;
