import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMDX } from "@/lib/mdx";

// Render every note like the site does and print the figure engine's
// `[diagram]` dev-lint warnings grouped per note. Exits non-zero only when a
// note fails to render.
//   bun scripts/lint-figures.tsx
const notesDir = fileURLToPath(new URL("../../notes/", import.meta.url));
const mdxFiles = (dir: string): string[] =>
  readdirSync(dir)
    .flatMap((e) => {
      const p = join(dir, e);
      return statSync(p).isDirectory() ? mdxFiles(p) : p.endsWith(".mdx") ? [p] : [];
    })
    .sort();

const captured: string[] = [];
const warn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = args.map(String).join(" ");
  if (msg.startsWith("[diagram]")) captured.push(msg);
  else warn(...args);
};

let warnings = 0, errors = 0;
for (const file of mdxFiles(notesDir)) {
  const name = relative(join(notesDir, ".."), file);
  captured.length = 0;
  try {
    renderToStaticMarkup(await renderMDX(readFileSync(file, "utf8")));
  } catch (e) {
    errors++;
    console.log(`${name}\n  ERROR ${e instanceof Error ? e.message : String(e)}`);
    continue;
  }
  if (!captured.length) continue;
  warnings += captured.length;
  console.log(name);
  for (const w of captured) console.log(`  ${w}`);
}
console.log(`${warnings} warning(s), ${errors} render error(s)`);
process.exit(errors ? 1 : 0);
