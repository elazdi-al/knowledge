# knowledge

Course notes in MDX (`notes/`) and the Next.js site that renders them (`site/`).
The site is a static export, served by a Cloudflare Worker that also answers
search and gates the private CTF course.

## Run

```sh
cd site
bun install
bun run dev    # http://localhost:3000, rereads ../notes on every request
```

| Command                      | Does                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| `bun run build`              | Static export to `out/`, with the search index               |
| `bun run preview`            | Build, then serve `out/` and the Worker with `wrangler dev`  |
| `bun run deploy`             | Build, then `wrangler deploy`                                |
| `bun run typecheck`          | `tsc --noEmit`                                               |
| `bun run verify <note.mdx>`  | Render one note; fails on MDX errors and unknown components  |

The CTF password is a secret: `wrangler secret put CTF_PASSWORD`, or
`.dev.vars` locally.

## Notes

`notes/<course>/<slug>.mdx` is served at `/notes/<course>/<slug>`. Notes sort
by path, numbers numerically (`l2` before `l10`). Each course is a homepage
tab, named by the shared title prefix (`Theory of Computation: Lecture 1`).

```md
---
title: "Data Intensive Systems: Lecture 9"   # required
created: 2026-06-21                          # shown under the title
draft: true                                  # left out of the build
---
```

`tags` and `updated` are parsed but not shown. Schema: `site/src/lib/notes.ts`.

The body is GitHub-flavored Markdown. Math is `$...$` and `$$...$$`, never
`\(...\)` or `\[...\]`. A `---` line renders as an idea break. How to write a
note: `RULES.md`.

## Figures

Notes import nothing. Every component is registered in
`site/src/mdx-components.tsx`. Figures compose primitives from the engine in
`site/src/components/figure/` (`Row`, `Col`, `Graph`, `Node`, `Cells`, ...),
which lays out, routes and renders one static SVG on the server. `$...$` in a
label is typeset by MathJax. Colours are the `--dg-*` tokens in
`site/src/app/diagram-tokens.css`.

Scripts, from `site/`:

- `bun scripts/shoot-figures.tsx [course/slug ...]` screenshots every figure,
  light and dark, to `/tmp/figures`. Needs `bun run dev` and Playwright's
  Chromium.
- `bun scripts/gen-font-metrics.mjs` regenerates the glyph widths that size
  figure boxes. Rerun only after changing its glyph list.

## Search

Cmd/Ctrl-K. In production the Worker (`site/worker/index.ts`) serves
`GET /api/search?q=`, rate limited per IP and edge cached. In dev the browser
runs the same engine (`site/src/lib/search-core.ts`).

## Stack

Next.js 16, React 19, Tailwind 4, MDX with KaTeX and Shiki, Base UI and cmdk,
Cloudflare Workers, Bun.
