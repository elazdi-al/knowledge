import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages serves the static export from out/.
  output: "export",
  trailingSlash: false,
};

export default nextConfig;
