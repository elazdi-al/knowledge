import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { BPlusTree } from "../src/components/BPlusTree";

const examples = [
  <BPlusTree
    key="structure"
    caption="leaf links preserve key order for range scans"
    roles={[
      { level: 0, label: "root node" },
      { level: 1, label: "inner nodes" },
      { level: 2, label: "leaf nodes" },
    ]}
    nodes={[
      { id: "root", keys: [20] },
      { id: "li", keys: [10] },
      { id: "ri", keys: [35] },
      { id: "l1", keys: [6] },
      { id: "l2", keys: [10] },
      { id: "l3", keys: [20, 31] },
      { id: "l4", keys: [38, 44] },
    ]}
    links={[
      { parent: "root", child: "li", label: "< 20" },
      { parent: "root", child: "ri", label: "≥ 20" },
      { parent: "li", child: "l1", label: "< 10" },
      { parent: "li", child: "l2", label: "≥ 10" },
      { parent: "ri", child: "l3", label: "< 35" },
      { parent: "ri", child: "l4", label: "≥ 35" },
    ]}
  />,

  <BPlusTree
    key="search"
    caption="exact search stops in one leaf; range search continues through sibling pointers"
    nodes={[
      { id: "root", keys: [13, 17, 24, 30] },
      { id: "l1", keys: [2, 3, 5, 7] },
      { id: "l2", keys: [14, 16] },
      { id: "l3", keys: [19, 20, 22] },
      { id: "l4", keys: [24, 27, 29] },
      { id: "l5", keys: [33, 34, 38, 39] },
    ]}
    links={[
      { parent: "root", child: "l1" },
      { parent: "root", child: "l2" },
      { parent: "root", child: "l3" },
      { parent: "root", child: "l4" },
      { parent: "root", child: "l5" },
    ]}
  />,

  <BPlusTree
    key="n4"
    caption="order 4: small fan-out, more levels"
    leafLinks="single"
    roles={[
      { level: 0, label: "root" },
      { level: 1, label: "internal nodes" },
      { level: 2, label: "leaf level" },
    ]}
    nodes={[
      { id: "root", keys: ["Mozart"] },
      { id: "i1", keys: ["Einstein", "Gold"] },
      { id: "i2", keys: ["Srinivasan"] },
      { id: "l1", keys: ["Brandt", "Califieri", "Crick"] },
      { id: "l2", keys: ["Einstein", "El Said"] },
      { id: "l3", keys: ["Gold", "Katz", "Kim"] },
      { id: "l4", keys: ["Mozart", "Singh"] },
      { id: "l5", keys: ["Srinivasan", "Wu"] },
    ]}
    links={[
      { parent: "root", child: "i1" },
      { parent: "root", child: "i2" },
      { parent: "i1", child: "l1" },
      { parent: "i1", child: "l2" },
      { parent: "i1", child: "l3" },
      { parent: "i2", child: "l4" },
      { parent: "i2", child: "l5" },
    ]}
  />,

  <BPlusTree
    key="before"
    title="Before"
    nodes={[
      { id: "r0", keys: [13, 17, 24] },
      { id: "a0", keys: [2, 3, 5, 7], state: "full", note: "target leaf is full" },
      { id: "b0", keys: [14, 16] },
      { id: "c0", keys: [19, 20, 22, 23] },
      { id: "d0", keys: [24, 27, 29] },
    ]}
    links={[
      { parent: "r0", child: "a0" },
      { parent: "r0", child: "b0" },
      { parent: "r0", child: "c0" },
      { parent: "r0", child: "d0" },
    ]}
  />,

  <BPlusTree
    key="after"
    title="After"
    nodes={[
      { id: "r1", keys: [5, 13, 17, 24] },
      { id: "a1", keys: [2, 3] },
      { id: "b1", keys: [5, 7, 8], state: "new", note: "new right leaf after split" },
      { id: "c1", keys: [14, 16] },
      { id: "d1", keys: [19, 20, 22, 23] },
      { id: "e1", keys: [24, 27, 29] },
    ]}
    links={[
      { parent: "r1", child: "a1" },
      { parent: "r1", child: "b1" },
      { parent: "r1", child: "c1" },
      { parent: "r1", child: "d1" },
      { parent: "r1", child: "e1" },
    ]}
    promote={[{ from: "b1", to: "r1", label: "copy up 5", side: "right" }]}
  />,

  // l5.mdx Example 3: two promotes, one bowing each way.
  <BPlusTree
    key="root-split"
    title="After split propagation"
    nodes={[
      { id: "r1", keys: [17] },
      { id: "i1", keys: [5, 13] },
      { id: "i2", keys: [21, 24] },
      { id: "a1", keys: [2, 3] },
      { id: "b1", keys: [5, 7, 8] },
      { id: "c1", keys: [14, 16] },
      { id: "d1", keys: [19, 20] },
      { id: "e1", keys: [21, 22, 23], state: "new", note: "new leaf" },
      { id: "f1", keys: [24, 27, 29] },
    ]}
    links={[
      { parent: "r1", child: "i1" },
      { parent: "r1", child: "i2" },
      { parent: "i1", child: "a1" },
      { parent: "i1", child: "b1" },
      { parent: "i1", child: "c1" },
      { parent: "i2", child: "d1" },
      { parent: "i2", child: "e1" },
      { parent: "i2", child: "f1" },
    ]}
    promote={[
      { from: "e1", to: "i2", label: "copy up 21", side: "right" },
      { from: "i1", to: "r1", label: "push up 17", side: "left" },
    ]}
  />,

  // l5.mdx Example 7 "before": the widest tree in the notes (8 leaves).
  <BPlusTree
    key="widest"
    title="Before non-leaf redistribution"
    nodes={[
      { id: "r0", keys: [22] },
      { id: "i0l", keys: [5, 13, 17, 20] },
      { id: "i0r", keys: [27, 30] },
      { id: "a0", keys: [2, 3] },
      { id: "b0", keys: [5, 7, 8] },
      { id: "c0", keys: [14, 16] },
      { id: "d0", keys: [17, 18] },
      { id: "e0", keys: [20, 21] },
      { id: "f0", keys: [22, 24] },
      { id: "g0", keys: [27, 29] },
      { id: "h0", keys: [33, 34, 38, 39] },
    ]}
    links={[
      { parent: "r0", child: "i0l" },
      { parent: "r0", child: "i0r" },
      { parent: "i0l", child: "a0" },
      { parent: "i0l", child: "b0" },
      { parent: "i0l", child: "c0" },
      { parent: "i0l", child: "d0" },
      { parent: "i0l", child: "e0" },
      { parent: "i0r", child: "f0" },
      { parent: "i0r", child: "g0" },
      { parent: "i0r", child: "h0" },
    ]}
  />,

  // l5.mdx lock-coupling figure: narrow vertical chain inside a Split pane.
  <BPlusTree
    key="latch"
    caption="The thread holds the parent latch while acquiring the child latch, then releases the parent."
    leafLinks={false}
    minViewBoxWidth={190}
    nodes={[
      { id: "root", keys: ["Root"], note: "released" },
      { id: "inner", keys: ["Inner"], state: "full", note: "latched" },
      { id: "leaf", keys: ["Leaf"], state: "highlight", note: "acquiring" },
    ]}
    links={[
      { parent: "root", child: "inner" },
      { parent: "inner", child: "leaf" },
    ]}
  />,
];

const PALETTE_LIGHT = `--mm-bg:#ffffff;--mm-node:#f6f6f5;--mm-fg:#21201c;--mm-border:#e2e1de;--mm-line:#cfceca;--mm-muted:#63635e;--mm-accent:#8d8d86;--mm-caption:#8d8d86;--mm-hi-bg:#21201c;--mm-hi-fg:#ffffff;--mm-frame-border:#e2e1de;`;
const PALETTE_DARK = `--mm-bg:#0a0a0a;--mm-node:#1c1c1f;--mm-fg:#f5f5f5;--mm-border:#383840;--mm-line:#4a4a52;--mm-muted:#c6c6c6;--mm-accent:#9a9aa0;--mm-caption:#8a8a8a;--mm-hi-bg:#f5f5f5;--mm-hi-fg:#0a0a0a;--mm-frame-border:rgba(255,255,255,0.14);`;

const CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif}
.cols{display:grid;grid-template-columns:1fr 1fr}
.panel{padding:28px 32px;min-height:100vh}
.light{background:#faf9f7;color:#21201c;${PALETTE_LIGHT}}
.dark{background:#000;color:#f5f5f5;${PALETTE_DARK}}
.diagram{margin-block:1.6em;max-width:692px}
.diagram__card{display:flex;flex-direction:column;align-items:center;padding:1.5rem 1rem;background:var(--mm-bg);border-radius:12px;box-shadow:0 0 0 1px var(--mm-frame-border);overflow:hidden}
.diagram__title{margin:0 0 .75rem;font-size:.8125rem;font-weight:600;color:var(--mm-fg);text-align:center}
.diagram__canvas{display:flex;width:100%;justify-content:center}
.diagram__canvas svg{max-width:100%;height:auto;display:block}
.diagram__caption{margin-top:1rem;color:var(--mm-caption);font-size:.8125rem;line-height:1.6;text-align:center}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;opacity:.5;margin:0}
`;

const body = examples.map((e) => renderToStaticMarkup(e)).join("\n");
const panel = (cls: string, label: string) =>
  `<div class="panel ${cls}"><h2>${label}</h2>${body}</div>`;

const html = `<!doctype html><html><head><meta charset="utf8"><style>${CSS}</style></head><body><div class="cols">${panel("light", "light")}${panel("dark", "dark")}</div></body></html>`;

writeFileSync(new URL("../preview-bplustree.html", import.meta.url), html);
console.log("wrote preview-bplustree.html");
