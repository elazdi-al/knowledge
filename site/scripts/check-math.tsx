// Fails if a math delimiter stops converting or rendering. Run from site/.
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMDX } from "@/lib/mdx";
import { normalizeMathDelimiters as normalize } from "@/lib/math-delimiters";

const CONVERTED: [string, string][] = [
  ["a \\(x \\text{or} y\\) b", "a $x \\text{or} y$ b"],
  ["\\( x \\)", "$x$"],
  ["\\(a\nb\\)", "$a\nb$"],
  ["\\(\\text{\\$5}\\)", "$$\\text{\\$5}$$"],
  ["\\[\nx\n\\]", "$$\nx\n$$"],
  ["\\[x\\]", "$$\nx\n$$"],
  ["a \\[x\\] b", "a\n$$\nx\n$$\nb"],
  ["- \\[x\\]", "- $$\n  x\n  $$"],
  ["- a\n  \\[\n  x\n  \\]", "- a\n  $$\n  x\n  $$"],
  ["> a \\[x\\]", "> a\n> $$\n> x\n> $$"],
];
for (const [input, expected] of CONVERTED) assert.equal(normalize(input), expected);

const UNCHANGED = [
  "$a \\\\[2pt] b$",
  "$$\na \\\\[2pt] b\n$$",
  "`\\(x\\)`",
  "``a ` \\(x\\)``",
  "```\n\\(x\\)\n```",
  "- ```\n  \\[x\\]\n  ```",
  "~~~\n\\(x\\)\n~~~",
  "\\\\(x\\\\)",
  "\\(x\n\ny\\)",
  "\\[x",
  "\\(\\)",
  "a\\\nb",
];
for (const input of UNCHANGED) assert.equal(normalize(input), input);

const html = async (source: string) => renderToStaticMarkup(await renderMDX(source));
const count = (text: string, part: string) => text.split(part).length - 1;

const page = await html(
  [
    "Dollars $a$ and $$b$$, then parens \\(x \\text{or} y\\).",
    "",
    "Display \\[\\frac{c}{d}\\] in a sentence.",
    "",
    "\\[",
    "\\text{own lines}",
    "\\]",
    "",
    "$$",
    "\\text{dollar block}",
    "$$",
    "",
    "- item",
    "  \\[e\\]",
  ].join("\n"),
);
assert.equal(count(page, 'class="katex-display"'), 4);
assert.equal(count(page, 'class="katex"') - count(page, 'class="katex-display"'), 3);
assert.match(page, /<li>[\s\S]*katex-display[\s\S]*<\/li>/);
assert.doesNotMatch(page, /\\\(|\\\[/);

console.log("math delimiters ok");
