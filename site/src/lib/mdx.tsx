import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { bundledThemes, createHighlighter, type LanguageRegistration } from "shiki";
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

// Python's grammar scopes call names as meta.function-call.generic, which the
// GitHub themes leave uncolored. Give them the function color that JS and C
// calls already get, so Sage calls such as xgcd(a, b) stand out.
async function withPythonCalls(name: "github-light" | "github-dark-dimmed", color: string) {
  const theme = (await bundledThemes[name]()).default;
  const rule = { scope: "meta.function-call.generic.python", settings: { foreground: color } };
  return { ...theme, tokenColors: [...(theme.tokenColors ?? []), rule] };
}

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
          theme: {
            light: await withPythonCalls("github-light", "#6F42C1"),
            dark: await withPythonCalls("github-dark-dimmed", "#DCBDFB"),
          },
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
