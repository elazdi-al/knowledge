import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A Cloudflare Worker serves out/ as static assets (see wrangler.toml).
  output: "export",
  // MathJax resolves its default font through package `imports`, which Turbopack cannot follow; Node can.
  serverExternalPackages: ["@mathjax/src"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
