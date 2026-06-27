import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Cloudflare Pages serves the static export from out/.
  output: "export",
  trailingSlash: false,
  turbopack: {
    root: process.cwd(),
  },
};

/**
 * @next/mdx wires .md/.mdx through @mdx-js/loader at build time. We never
 * route directly to an MDX file - pages live under app/notes/[...slug]
 * and pull their content via dynamic import - so `pageExtensions` is
 * intentionally left at the default.
 *
 * Turbopack requires plugin options to be JSON-serializable; every plugin
 * here passes that constraint. The remark-frontmatter plugin tells the
 * compiler to ignore the YAML block at the top of each note (gray-matter
 * still parses it separately for the index/page metadata).
 */
const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: ["remark-frontmatter", "remark-gfm", "remark-math"],
    rehypePlugins: [
      "rehype-slug",
      [
        "rehype-autolink-headings",
        {
          behavior: "wrap",
          properties: { className: ["heading-anchor"] },
        },
      ],
      [
        "rehype-pretty-code",
        {
          theme: { light: "github-light", dark: "github-dark-dimmed" },
          keepBackground: false,
          defaultLang: "plaintext",
        },
      ],
      "rehype-katex",
    ],
  },
});

export default withMDX(nextConfig);
