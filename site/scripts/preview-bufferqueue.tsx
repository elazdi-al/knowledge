import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";

import * as bufferqueue from "./gallery/bufferqueue";

type GalleryModule = {
  name: string;
  examples: React.ReactNode[];
};

const modules: GalleryModule[] = [bufferqueue];

// Palette + CSS copied from preview-bplustree.tsx so the gallery shares the
// exact light/dark scaffold.
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
h3{font-size:15px;font-weight:600;margin:2.4em 0 .4em;opacity:.85}
.group:first-of-type h3{margin-top:1.2em}
`;

const groupsMarkup = modules
  .map((mod) => {
    const heading = `<h3>${mod.name}</h3>`;
    const body = mod.examples
      .map((example) => renderToStaticMarkup(example))
      .join("\n");
    return `<section class="group">${heading}${body}</section>`;
  })
  .join("\n");

const panel = (cls: string, label: string) =>
  `<div class="panel ${cls}"><h2>${label}</h2>${groupsMarkup}</div>`;

const html = `<!doctype html><html><head><meta charset="utf8"><style>${CSS}</style></head><body><div class="cols">${panel(
  "light",
  "light",
)}${panel("dark", "dark")}</div></body></html>`;

writeFileSync(new URL("../preview-bufferqueue.html", import.meta.url), html);
console.log("wrote preview-bufferqueue.html");
