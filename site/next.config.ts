import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A Cloudflare Worker serves out/ as static assets (see wrangler.toml).
  output: "export",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
