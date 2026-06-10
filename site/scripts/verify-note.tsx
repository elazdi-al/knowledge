import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMDX } from "@/lib/mdx";

// Compile + render one .mdx note exactly as the site does, to catch MDX syntax
// errors, unknown components, and bad props before a full build.
const path = process.argv[2];
if (!path) throw new Error("usage: bun scripts/verify-note.tsx <path-to-mdx>");
const src = readFileSync(path, "utf8");
const el = await renderMDX(src);
const html = renderToStaticMarkup(el);
if (!html || html.length < 50) throw new Error("empty render for " + path);
console.log("OK", path, html.length, "chars");
