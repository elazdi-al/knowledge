import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { createHighlighter, type LanguageRegistration } from "shiki";
import { useMDXComponents } from "@/mdx-components";

// Relational schema notation, `Students(sid: string, ...)`, colored with the
// same scopes SQL gives table names and column types.
const schemaLang: LanguageRegistration = {
  name: "schema",
  scopeName: "source.schema",
  repository: {},
  patterns: [
    { match: "(:)\\s*([A-Za-z_]\\w*)", captures: { 2: { name: "storage.type" } } },
    { match: "\\b[A-Za-z_]\\w*(?=\\()", name: "entity.name.function" },
  ],
};

export async function renderMDX(source: string) {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    baseUrl: import.meta.url,
    remarkPlugins: [remarkFrontmatter, remarkGfm, remarkMath],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
          properties: { className: ["heading-anchor"] },
        },
      ],
      [
        rehypePrettyCode,
        {
          theme: { light: "github-light", dark: "github-dark-dimmed" },
          keepBackground: false,
          defaultLang: "plaintext",
          getHighlighter: (options: Parameters<typeof createHighlighter>[0]) =>
            createHighlighter({ ...options, langs: [...options.langs, schemaLang] }),
        },
      ],
      rehypeKatex,
    ],
  });

  return <Content components={useMDXComponents({})} />;
}
