// What a figure came out as, without a browser or dev server: its diagnostics, where every box went, and a PNG.
// Usage: bun scripts/figure-preview.tsx path/to/figure.tsx [--dark]. The file's default export is a component or element.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Diagram, formatDiagnostic, layoutScene, toScene, type Box } from "figure";

const [file] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!file) throw new Error("usage: figure:preview path/to/figure.tsx [--dark]");
const dark = process.argv.includes("--dark");
const name = basename(file).replace(/\.\w+$/, "");

const { default: entry } = await import(resolve(file));
if (!entry) throw new Error(`${file} has no default export`);
const element: ReactNode = typeof entry === "function" ? (entry as (p: object) => ReactNode)({}) : entry;

const frame = layoutScene(toScene(element));
console.log(`${name}: ${Math.round(frame.w)} x ${Math.round(frame.h)} px`);
console.log(frame.diagnostics.length ? frame.diagnostics.map((d) => formatDiagnostic(d, name)).join("\n") : "no diagnostics");

if (frame.diagnostics.some((d) => d.severity === "error")) process.exit(1);

const kids = new Map<string | undefined, Box[]>();
for (const b of frame.boxes) kids.set(b.parent, [...(kids.get(b.parent) ?? []), b]);
const tree = (parent: string | undefined, depth: number): string[] =>
  (kids.get(parent) ?? []).flatMap((b) => {
    const { x, y, w, h } = b.rect;
    return [`${"  ".repeat(depth)}${b.kind} ${b.id}  x=${Math.round(x)} y=${Math.round(y)} w=${Math.round(w)} h=${Math.round(h)}`, ...tree(b.id, depth + 1)];
  });
console.log(tree(undefined, 0).join("\n"));

console.warn = () => {};
const figure = renderToStaticMarkup(<Diagram>{element}</Diagram>);
const out = process.env.OUT ?? "/tmp/figure-preview";
mkdirSync(out, { recursive: true });
const tokens = readFileSync(new URL("../../packages/figure/tokens.css", import.meta.url), "utf8");
const page = join(out, `${name}.html`);
writeFileSync(page, `<!doctype html><html class="${dark ? "dark" : ""}"><head><meta charset="utf-8"><style>${tokens} body{margin:16px;background:${dark ? "#111110" : "#fff"};font-family:Inter,system-ui,sans-serif} .diagram{margin:0;width:fit-content} .diagram__caption{font-size:14px;color:gray}</style></head><body>${figure}</body></html>`);

const cache = join(homedir(), "Library/Caches/ms-playwright");
let shell: string | undefined;
try {
  const dir = readdirSync(cache).filter((d) => d.startsWith("chromium_headless_shell")).sort().pop();
  shell = dir && join(cache, dir, "chrome-headless-shell-mac-arm64/chrome-headless-shell");
} catch {}
if (!shell) {
  console.log(`no PNG: run \`bunx playwright install chromium-headless-shell\`. HTML at ${page}`);
} else {
  const png = join(out, `${name}.png`);
  spawnSync(shell, ["--headless", "--hide-scrollbars", "--disable-web-security", `--window-size=${Math.ceil(Math.max(frame.w, 200)) + 32},${Math.ceil(frame.h) + 140}`, `--screenshot=${png}`, `file://${page}`]);
  console.log(`PNG at ${png}`);
}
