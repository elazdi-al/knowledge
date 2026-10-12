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

// GDB/pwndbg commands are neither shell scripts nor assembly. Keep their
// command names, registers, addresses, strings and comments distinct.
const gdbLang: LanguageRegistration = {
  name: "gdb",
  scopeName: "source.gdb",
  repository: {},
  patterns: [
    { match: "#.*$", name: "comment.line.number-sign" },
    { begin: '"', end: '"', name: "string.quoted.double", patterns: [{ match: "\\\\.", name: "constant.character.escape" }] },
    { match: "^\\s*[a-zA-Z][\\w-]*(?:/[a-zA-Z0-9]+)?", name: "entity.name.function" },
    { match: "\\$[a-zA-Z][\\w]*", name: "variable.language" },
    { match: "\\b(?:0x[0-9a-fA-F]+|[0-9]+)\\b", name: "constant.numeric" },
    { match: "[=*+/-]", name: "keyword.operator" },
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
            createHighlighter({ ...options, langs: [...options.langs, schemaLang, gdbLang] }),
        },
      ],
      rehypeKatex,
    ],
  });

  return <Content components={useMDXComponents({})} />;
}
