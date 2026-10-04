import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMDX } from "@/lib/mdx";

// Screenshot every figure of the given notes (default: all), light and dark,
// one trimmed PNG per figure. Styles and fonts come from a running dev server.
//   bun scripts/shoot-figures.tsx [course/slug ...]
//   PORT=3000 OUT=/tmp/figures THEMES=light bun scripts/shoot-figures.tsx data-intensive-systems/l5
const port = process.env.PORT ?? "3000";
const out = process.env.OUT ?? "/tmp/figures";
const themes = (process.env.THEMES ?? "light,dark").split(",");
const origin = `http://localhost:${port}`;

const cache = join(homedir(), "Library/Caches/ms-playwright");
const shell = readdirSync(cache)
  .filter((d) => d.startsWith("chromium_headless_shell"))
  .sort()
  .map((d) => join(cache, d, "chrome-headless-shell-mac-arm64/chrome-headless-shell"))
  .pop();
if (!shell) throw new Error("no chromium headless shell; run `bunx playwright install chromium-headless-shell`");

const home = await (await fetch(origin)).text();
const htmlClass = home.match(/<html[^>]*class="([^"]*)"/)?.[1] ?? "";
const sheets = [...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
const absolute = (text: string, base: string) => text.replace(/url\("?([^")]+)"?\)/g, (_, u: string) => `url("${new URL(u, base)}")`);
const css = (await Promise.all(sheets.map(async (href) => absolute(await (await fetch(origin + href)).text(), origin + href)))).join("\n");

const notesDir = new URL("../../notes/", import.meta.url).pathname;
const notes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(notesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((c) => readdirSync(join(notesDir, c.name)).filter((f) => f.endsWith(".mdx")).map((f) => `${c.name}/${f.replace(/\.mdx$/, "")}`));

mkdirSync(out, { recursive: true });
for (const note of notes) {
  const html = renderToStaticMarkup(await renderMDX(readFileSync(join(notesDir, `${note}.mdx`), "utf8")));
  const figures = html.match(/<figure class="diagram[\s\S]*?<\/figure>/g) ?? [];
  for (const theme of themes) {
    figures.forEach((figure, i) => {
      const name = `${note.replace(/\W/g, "_")}_${theme}_${i}`;
      const page = join(out, `${name}.html`);
      writeFileSync(
        page,
        `<!doctype html><html class="${htmlClass} ${theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8"><style>${css}</style></head>` +
          `<body style="background:var(--color-bg);margin:0"><div class="prose" style="width:720px;margin:0 auto;padding:24px 0">${figure}</div></body></html>`,
      );
      const png = join(out, `${name}.png`);
      spawnSync(shell, ["--headless", "--hide-scrollbars", "--disable-web-security", "--virtual-time-budget=1500", "--window-size=760,1800", `--screenshot=${png}`, `file://${page}`], { stdio: "ignore" });
      spawnSync("magick", [png, "-trim", "-bordercolor", theme === "dark" ? "#111110" : "#ffffff", "-border", "16", png], { stdio: "ignore" });
    });
  }
  console.log(`${note}: ${figures.length} figures`);
}
