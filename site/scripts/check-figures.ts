// Fails on a figure registered in src/mdx-components.tsx that no note renders. Run from site/.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMDX } from "@/lib/mdx";

const NOTES = "../notes";
// Only notes/ctf/ uses these, and git ignores that folder, so a clean checkout can't see their uses.
const PRIVATE_FIGURES = ["AesRoundSchema", "CbcSchema", "CfbSchema", "CtrSchema", "DiffusionSchema", "EcbPenguinSchema", "EcbSchema", "GcmSchema", "KeyExpansionSchema", "OfbSchema", "AddressVsDereferenceDiagram", "AslrDiagram", "NxDiagram", "OverflowOffsetsDiagram", "PieDiagram", "ProcessMemoryLayoutDiagram", "RelroDiagram", "RetChainDiagram", "StackAlignmentDiagram", "StackCallDiagram", "StackCanaryDiagram", "StackFrameDiagram"];

const registered = [...readFileSync("src/mdx-components.tsx", "utf8").matchAll(/^ {4}([A-Z]\w+),$/gm)].map((m) => m[1]);
if (registered.length === 0) throw new Error("no figures found in src/mdx-components.tsx");

const notes = readdirSync(NOTES, { recursive: true, encoding: "utf8" })
  .filter((f) => /\.mdx?$/.test(f))
  .map((f) => readFileSync(join(NOTES, f), "utf8"))
  .join("\n");
const exempt = existsSync(join(NOTES, "ctf")) ? [] : PRIVATE_FIGURES;

const unused = registered.filter((name) => !exempt.includes(name) && !new RegExp(`<${name}\\b`).test(notes));
if (unused.length > 0) {
  console.error(`Unused figures: ${unused.join(", ")}`);
  process.exit(1);
}
console.log(`${registered.length} figures registered, all used`);

const warnings: string[] = [];
console.warn = (...args: unknown[]) => void warnings.push(args.join(" "));
const failures: string[] = [];
for (const note of readdirSync(NOTES, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".mdx"))) {
  try {
    renderToStaticMarkup(await renderMDX(readFileSync(join(NOTES, note), "utf8")));
  } catch (e) {
    failures.push(`${note}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
const problems = [...failures, ...new Set(warnings.filter((w) => w.startsWith("[figure")))];
if (problems.length > 0) {
  console.error(`${problems.length} figure problems:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("every figure renders with no diagnostics");
