import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages serves the static export from out/.
  output: "export",
  trailingSlash: false,

  // next/image cannot run its server-side optimizer in a static export.
  // R2-served images already arrive with Cloudflare's caching, so this is
  // a sensible default.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
    ],
  },

  // The note collection lives in ../notes (a sibling of site/). The build
  // reads it via fs in server components. Telling Next to trace that path
  // keeps file-tracing accurate on Vercel-style builds.
  outputFileTracingIncludes: {
    "/notes/**": ["../notes/**/*"],
    "/": ["../notes/**/*"],
    "/tags/**": ["../notes/**/*"],
  },

  experimental: {
    mdxRs: false,
  },

  pageExtensions: ["ts", "tsx"],
};

export default nextConfig;
