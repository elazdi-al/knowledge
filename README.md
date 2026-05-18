# knowledge

A local-first, typography-first knowledge renderer.

You write Markdown in `notes/`. A Next.js 15 site in `site/` renders it.
Deployable to Cloudflare Pages with R2 for images.

```
knowledge/
├── notes/                  ← your writing (.md / .mdx)
│   ├── concepts/
│   ├── projects/
│   ├── papers/
│   └── daily/
└── site/                   ← the renderer (Next.js 15, App Router)
    ├── src/
    │   ├── app/            ← routes
    │   ├── components/     ← UI + MDX components
    │   └── lib/            ← notes loader, MDX pipeline, R2 helper
    ├── next.config.ts
    ├── wrangler.toml       ← Cloudflare Pages config
    └── .env.example        ← R2 public URL
```

The site is completely decoupled from `notes/`. Move files, rename
folders, restructure: the renderer picks it up.

## Run it

```sh
cd site
bun install
bun run dev
```

Open <http://localhost:3000>.

The dev server reads notes from `../notes` on every request, so edits
land in the browser within a few hundred milliseconds. No restart, no
re-index.

### Build & preview

```sh
bun run build        # static export → site/out
bun run preview      # wrangler pages dev out
```

### Deploy to Cloudflare Pages

```sh
bun run deploy       # build + wrangler pages deploy out --project-name=knowledge
```

The first deploy will prompt you to create the project; subsequent
deploys reuse it. See `wrangler.toml` for the project name and
optional R2 binding.

## Adding a note

Drop a Markdown file anywhere under `notes/`:

```md
---
title: My New Note
description: One-line summary, optional.
created: 2026-05-18
updated: 2026-05-18
---

The body starts here. Plain Markdown plus inline math like
$a^2 + b^2 = c^2$ and block math:

$$
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
$$
```

URL is derived from the file's path inside `notes/`:

| file                                          | URL                                       |
| --------------------------------------------- | ----------------------------------------- |
| `notes/concepts/cross-encoder-reranking.md`   | `/notes/concepts/cross-encoder-reranking` |
| `notes/daily/2026-05-18.md`                   | `/notes/daily/2026-05-18`                 |

### Frontmatter

| field         | type     | required | notes                                  |
| ------------- | -------- | -------- | -------------------------------------- |
| `title`       | string   | yes      | shown in listing and `<h1>`            |
| `description` | string   | no       | shown on listings and under the title  |
| `tags`        | string[] | no       | kept on the note, not shown in UI      |
| `created`     | date     | no       | `YYYY-MM-DD` works; shown on the page  |
| `updated`     | date     | no       | drives homepage sort order             |
| `draft`       | boolean  | no       | `true` hides the note                  |

### When to use MDX

Use `.md` by default. Switch to `.mdx` only when a note benefits from
a component: a callout, an inline interaction, an image with a
caption. MDX components are pre-registered globally so notes don't
need to `import` anything.

Available out of the box:

| component           | use                                            |
| ------------------- | ---------------------------------------------- |
| `<Callout>`         | aside box; `kind="info" \| "note" \| "warn"`    |
| `<R2Image>`         | image stored in R2; `src` is the object key   |
| `<DemoFrame>`       | wrap an inline interactive demo               |
| `<DrawerDemo>`      | example Vaul + Sonner inline demo             |

See `notes/concepts/calm-interfaces.mdx` and
`notes/concepts/drawer-and-toast.mdx` for working examples.

## Images via R2

Cloud images live in a public R2 bucket. The renderer takes the
object key and resolves it to a full URL.

1. Create an R2 bucket in the Cloudflare dashboard.
2. Enable a public URL (or attach a custom domain).
3. Copy the URL into `site/.env.local`:

```sh
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-XXXXXXXX.r2.dev
```

Then reference images by key:

```mdx
<R2Image
  src="notes/2026-05/sketch.png"
  alt="A sketch of the retrieval pipeline"
  width={1280}
  height={720}
  caption="Bi-encoder, cross-encoder, with a budget label."
/>
```

When `NEXT_PUBLIC_R2_PUBLIC_URL` is unset, `<R2Image>` renders an
inline placeholder so local development never breaks.

For private buckets, point `NEXT_PUBLIC_R2_PUBLIC_URL` at a
Worker route that signs requests on your behalf. The rest of the
stack stays the same.

## Design

Type, color, and spacing follow the open-source palette from
[emilkowal.ski](https://emilkowal.ski). A 12-step gray scale
(`gray-100` through `gray-1200`) for light and dark, one warm yellow
brand color, a 644px reading column, and serif italics for inline
emphasis. Tweak `@theme { ... }` in `globals.css` to retune the
entire site.

## Folder map for the renderer

```
site/src/
├── lib/
│   ├── notes.ts         ← reads ../notes, parses frontmatter
│   ├── mdx.ts           ← compiles MDX with math + code highlighting
│   ├── r2.ts            ← R2 URL helper
│   └── cn.ts            ← classname utility
├── components/
│   ├── Header.tsx
│   ├── NoteList.tsx     ← row-hover writing list
│   ├── Callout.tsx
│   ├── R2Image.tsx
│   ├── DemoFrame.tsx
│   ├── DrawerDemo.tsx   ← uses vaul + sonner
│   ├── Toaster.tsx      ← sonner wrapper
│   └── mdx.tsx          ← global MDX component map
├── mdx-components.tsx
└── app/
    ├── layout.tsx
    ├── page.tsx                       ← homepage
    ├── globals.css
    ├── notes/[...slug]/page.tsx       ← individual note
    └── not-found.tsx
```

## Stack

- Next.js 15 (App Router, static export)
- React 19
- Tailwind CSS v4
- Inter + Instrument Serif + JetBrains Mono (via `next/font`)
- TypeScript (strict)
- next-mdx-remote 5 + remark-math + rehype-katex + rehype-pretty-code (Shiki)
- Vaul (drawer), Sonner (toasts)
- Cloudflare Pages + R2

## Future extension points (kept clean on purpose)

- **Search.** Add Pagefind as a build step (`bunx pagefind --site out`).
- **Backlinks.** Parse `[[wikilinks]]` with a remark plugin; expose
  the inbound map on `Note` in `lib/notes.ts`.
- **Note graph.** Iterate the collection at build time, emit graph
  JSON.
- **Vector DB / semantic search.** Iterate notes, embed, write to a
  local store. Keep that in a sibling folder (`indexer/`).
- **MCP server.** Same data source; expose `getAllNotes()` over MCP.

The renderer reads files and produces HTML. Anything heavier than
that belongs in a sibling tool.
