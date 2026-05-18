import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { mdxComponents } from "@/components/mdx";
import type { Note } from "./notes";

/**
 * Compiles a note's body into a React element using next-mdx-remote.
 *
 * Pipeline order matters here:
 *   - remark-gfm:   tables, autolinks, task lists
 *   - remark-math:  recognise $...$ / $$...$$
 *   - rehype-slug:  give every heading an id (used by autolinks if added)
 *   - rehype-pretty-code:
 *                   Shiki-based highlighting; dual themes for light/dark
 *   - rehype-katex: render math to HTML+CSS
 */

const prettyCodeOptions = {
  theme: {
    light: "github-light",
    dark: "github-dark-dimmed",
  },
  keepBackground: false,
  defaultLang: "plaintext",
} as const;

export async function renderNote(note: Note) {
  const { content } = await compileMDX({
    source: note.body,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [
          rehypeSlug,
          [rehypePrettyCode, prettyCodeOptions],
          rehypeKatex,
        ],
        format: note.isMDX ? "mdx" : "md",
      },
      parseFrontmatter: false,
    },
  });
  return content;
}
