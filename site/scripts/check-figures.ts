// Fails on a figure registered in src/mdx-components.tsx that no note renders. Run from site/.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const NOTES = "../notes";
// Only notes/ctf/ uses these, and git ignores that folder, so a clean checkout can't see their uses.
const PRIVATE_FIGURES = ["AddressVsDereferenceDiagram", "StackCallDiagram", "StackFrameDiagram"];

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
