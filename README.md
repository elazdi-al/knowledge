# knowledge

Course notes written in MDX, and the site that renders them. The notes live in
`notes/`. `site/` is a Next.js 16 app that exports them as static HTML. A
Cloudflare Worker serves that export and answers search queries.

On a note page you can highlight passages, which the browser keeps in
IndexedDB, and copy the note's source as Markdown.

## Repository layout

```
knowledge/
├── notes/
│   ├── data-intensive-systems/   one .mdx file per lecture
│   └── theory-of-computation/
├── RULES.md                      how to write a note
└── site/
    ├── src/app/                  routes: home, notes/[...slug], search-index.json
    ├── src/components/           page chrome and the components notes use
    ├── src/components/figure/    the static figure engine: primitives, layout, routing, SVG
    ├── src/lib/                  note loader, MDX pipeline, search engine
    ├── src/mdx-components.tsx    components every note can use
    ├── worker/index.ts           the Worker that serves /api/search
    ├── scripts/                  helper scripts
    └── wrangler.toml             Worker and static asset config
```

## Run the site

```sh
cd site
bun install
bun run dev
```

Open <http://localhost:3000>. In development the loader reads `../notes` on
every request, so a saved edit shows up when you refresh the page. Nothing
watches the files.

Run these from `site/` as well:

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `bun run build`     | Exports the site to `site/out/`, with `search-index.json`.   |
| `bun run preview`   | Builds, then `wrangler dev` serves `out/` and the Worker.    |
| `bun run deploy`    | Builds, then `wrangler deploy` publishes the Worker.         |
| `bun run typecheck` | Runs `tsc --noEmit`.                                         |

## Add a note

Create an `.mdx` file in a course folder under `notes/`. Its path inside
`notes/` becomes the URL, so `notes/data-intensive-systems/l9.mdx` is served at
`/notes/data-intensive-systems/l9`. The homepage shows one tab per course
folder and lists its notes by path, comparing numbers as numbers, so `l2`
comes before `l10`. Titles in a course share a prefix (`Theory of
Computation: Lecture 1`): the prefix names the tab and the rest labels the note. The loader also picks
up `.md` files. Both compile as MDX.

Every note starts with YAML frontmatter:

```md
---
title: "Data Intensive Systems: Lecture 9"
description: "Query optimization as cost-based search."
tags: ["Data intensive systems"]
created: 2026-06-21
updated: 2026-06-22
---
```

The zod schema in `site/src/lib/notes.ts` accepts these fields:

| Field         | Type     | Required | Effect                                           |
| ------------- | -------- | -------- | ------------------------------------------------ |
| `title`       | string   | yes      | Page title and homepage entry.                   |
| `description` | string   | no       | Page meta description and search text.           |
| `tags`        | string[] | no       | Parsed. The site does not show them.             |
| `created`     | date     | no       | Shown as the date under the title.               |
| `updated`     | date     | no       | Parsed. The site does not show it.               |
| `draft`       | boolean  | no       | `true` leaves the note out of the build.         |

The body is GitHub-flavored Markdown with KaTeX math (`$...$` inline, `$$...$$`
for blocks). Shiki highlights code blocks at build time. Headings get anchor
links.

To check one note without a full build, run `bun run verify` with its path
(see the helper scripts below).

## Components in notes

Notes never import anything. `site/src/mdx-components.tsx` registers every
component, so a new one goes there. The notes use these:

- `Split` lays out its `Pane` children side by side on wide screens and
  stacks them on narrow ones.
- `Automaton` draws a finite automaton in the textbook style.
- Course figures (`BPlusTree`, `IndexMap`, `PageLayout`, `ERDiagram`,
  `HashDiagram`, `QueryTree`, `TuringTape`, `TuringTrace`, and the figures in
  the `*Schemas.tsx` files) are thin adapters over the figure engine in
  `site/src/components/figure/`. They compose primitives (`Row`, `Col`,
  `Grid`, `Group`, `Graph`, `Node`, `Cells`, `Table`, `Edge`, ...); the engine
  lays them out, routes the connectors, and renders one static SVG on the
  server. A note can also write `<Diagram>` with those primitives directly.
  Colours are the OKLCH `--dg-*` tokens in `site/src/app/diagram-tokens.css`,
  light and dark.
- A `---` line in the body renders as `IdeaBreak`, a short row of dashes
  between ideas.

`RULES.md` covers how to write a note: structure, concept blocks, examples,
and what to leave out. It bans callout boxes.

## Search

Press Cmd-K on a Mac, or Ctrl-K elsewhere, to open the command menu. It
searches note titles plus the concepts and sections inside each note.

`bun run build` writes `search-index.json` into `out/`. In production the
Worker in `site/worker/index.ts` builds the search engine from that file and
answers `GET /api/search?q=...`. It caps each IP at 30 requests per 10 seconds
and caches answers at the edge. The public `/search-index.json` path returns
404. Under `bun run dev` there is no Worker, so the browser runs the same
engine from `site/src/lib/search-core.ts` against the live index route.

## Helper scripts

Run these from `site/`:

- `bun run verify ../notes/data-intensive-systems/l9.mdx` compiles and renders
  one note the way the site does. It fails on MDX syntax errors and unknown
  components.
- `bun scripts/shoot-figures.tsx [course/slug ...]` screenshots every figure,
  light and dark, into `/tmp/figures`. It needs `bun run dev` running and
  Playwright's headless Chromium.
- `bun scripts/gen-font-metrics.mjs` downloads Inter and regenerates
  `src/components/figure/font-metrics.ts`, the glyph widths that size figure
  boxes. Rerun it only when the glyph list in the script changes.

## Stack

- Next.js 16 with the App Router and `output: "export"`, React 19, TypeScript.
- Tailwind CSS 4. The palette and prose styles live in
  `site/src/app/globals.css`. Text sits in a 33rem reading measure
  (`--container-measure`, about 70 characters at 16px); figures, code, splits
  and display math break out to the 660px page width (`--container-page`).
- Inter (with its `opsz` optical-size axis) and JetBrains Mono, loaded
  through `next/font` in `site/src/app/layout.tsx`.
- `@mdx-js/mdx` with remark-gfm, remark-math, rehype-katex,
  rehype-pretty-code (Shiki), rehype-slug, and rehype-autolink-headings, wired
  up in `site/src/lib/mdx.tsx`.
- cmdk and Base UI for the command menu and tooltips.
- Cloudflare Workers with static assets, deployed with Wrangler.
- Bun for installs and scripts.
