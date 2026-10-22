/**
 * `$...$` in a label is TeX, typeset at build time by MathJax into glyph paths
 * in its TeX font, the Computer Modern faces KaTeX sets the prose math in. The
 * paths sit inside the figure SVG, so math scales with the figure everywhere
 * (HTML in a foreignObject is misplaced by Safari once the SVG scales), and the
 * metrics are exact, so layout centres and anchors math precisely.
 */
import { mathjax } from "@mathjax/src/js/mathjax.js";
import { TeX } from "@mathjax/src/js/input/tex.js";
import { SVG } from "@mathjax/src/js/output/svg.js";
import { liteAdaptor } from "@mathjax/src/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "@mathjax/src/js/handlers/html.js";
import "@mathjax/src/js/input/tex/base/BaseConfiguration.js";
import "@mathjax/src/js/input/tex/ams/AmsConfiguration.js";
import { MathJaxTexFont } from "@mathjax/mathjax-tex-font/js/svg.js";

export interface Typeset {
  /** inner SVG markup, in a 1000-per-em box with the baseline at y = 0 */
  body: string;
  /** width, height above the baseline and depth below it, in em */
  w: number;
  h: number;
  d: number;
}

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", {
  InputJax: new TeX({ packages: ["base", "ams"] }),
  OutputJax: new SVG({ fontData: MathJaxTexFont, fontCache: "none", linebreaks: { inline: false } }),
});

const cache = new Map<string, Typeset>();

export function typeset(tex: string): Typeset {
  let m = cache.get(tex);
  if (!m) {
    // "\theta" in a JS string (not a JSX attribute) is a tab and "heta".
    if (/[\b\t\n\v\f\r]/.test(tex)) throw new Error(`[diagram] control character in TeX ${JSON.stringify(tex)}: escape the backslash`);
    const svg = adaptor.tags(doc.convert(tex, { display: false }), "svg")[0];
    const [, top, w, hd] = adaptor.getAttribute(svg, "viewBox").split(" ").map(Number);
    const inner = adaptor.innerHTML(svg);
    if (inner.includes("merror")) throw new Error(`[diagram] bad TeX in label: ${tex}`);
    // Colour and halo come from the enclosing <g>; these attributes would override them.
    const body = inner.replace(/ (data-[\w-]+|stroke|stroke-width|fill)="[^"]*"/g, "");
    m = { body, w: w / 1000, h: -top / 1000, d: (hd + top) / 1000 };
    cache.set(tex, m);
  }
  return m;
}
