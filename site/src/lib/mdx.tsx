import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { bundledThemes, createHighlighter, type LanguageRegistration } from "shiki";
import { normalizeMathDelimiters } from "@/lib/math-delimiters";
import { rehypeMath } from "@/lib/rehype-math";
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

// Loaded once: rehype-pretty-code keys its shared highlighter on the themes' JSON.
const themes = Promise.all([withPythonCalls("github-light", "#6F42C1"), withPythonCalls("github-dark-dimmed", "#DCBDFB")]);

async function compile(source: string) {
  const [light, dark] = await themes;
  const { default: Content } = await evaluate(normalizeMathDelimiters(source), {
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
      rehypeMath,
      [
        rehypePrettyCode,
        {
          theme: { light, dark },
          keepBackground: false,
          defaultLang: "plaintext",
          getHighlighter: (options: Parameters<typeof createHighlighter>[0]) =>
            createHighlighter({ ...options, langs: [...options.langs, schemaLang, gdbLang] }),
        },
      ],
    ],
  });
  return Content;
}

// Compiled output depends only on the source, so an unchanged note skips the pipeline.
const compiled = new Map<string, ReturnType<typeof compile>>();

export async function renderMDX(source: string) {
  let content = compiled.get(source);
  if (!content) compiled.set(source, (content = compile(source)));
  const Content = await content;
  return <Content components={useMDXComponents({})} />;
}
