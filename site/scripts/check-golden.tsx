// Fails when a figure's SVG changes. Update on purpose: bun scripts/check-golden.tsx --update. DUMP=dir also writes each figure.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMDX } from "@/lib/mdx";

const NOTES = "../notes";
const GOLDEN = "scripts/figures.golden.json";
const dump = process.env.DUMP;

/** A figure's generated id is not content. */
function normalize(figure: string): string {
  const uid = figure.match(/id="([^"]+)-hatch"/)?.[1];
  return uid ? figure.replaceAll(uid, "UID") : figure;
}

const actual: Record<string, string[]> = {};
const notes = readdirSync(NOTES, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".mdx") && !f.startsWith("ctf"))
  .sort();
if (dump) mkdirSync(dump, { recursive: true });
for (const note of notes) {
  const html = renderToStaticMarkup(await renderMDX(readFileSync(join(NOTES, note), "utf8")));
  const figures = (html.match(/<figure class="diagram[\s\S]*?<\/figure>/g) ?? []).map(normalize);
  actual[note] = figures.map((f) => createHash("sha256").update(f).digest("hex").slice(0, 16));
  if (dump) figures.forEach((f, i) => writeFileSync(join(dump, `${note.replace(/\W/g, "_")}_${i}.html`), f));
}

if (process.argv.includes("--update")) {
  writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 1)}\n`);
  console.log(`${Object.values(actual).flat().length} figures written to ${GOLDEN}`);
  process.exit(0);
}

const golden: Record<string, string[]> = JSON.parse(readFileSync(GOLDEN, "utf8"));
const changed = notes.flatMap((n) => {
  const a = actual[n], g = golden[n] ?? [];
  return Array.from({ length: Math.max(a.length, g.length) }, (_, i) => i).filter((i) => a[i] !== g[i]).map((i) => `${n} #${i}`);
});
if (changed.length) {
  console.error(`${changed.length} figures changed:\n${changed.join("\n")}`);
  process.exit(1);
}
console.log(`${Object.values(actual).flat().length} figures match`);
