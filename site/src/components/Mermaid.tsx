import { renderMermaidSVG } from "beautiful-mermaid";
import { cn } from "@/lib/cn";

interface Props {
  /** Mermaid source. May also be passed as a string child. */
  chart?: string;
  children?: string;
  /** Caption rendered below the card (sans, muted) — like the reference. */
  caption?: string;
  className?: string;
}

/**
 * Renders a Mermaid diagram styled to match the reference "Mermaid Graphs"
 * design exactly.
 *
 * beautiful-mermaid handles parsing + ELK layout; everything visual is then
 * re-shaped to the reference look. The SVG is produced once at build time
 * (Server Component → no client JS, no flash) and every colour is a
 * `var(--mm-*)` reference, so the baked geometry re-themes live on the
 * light/dark switch.
 *
 * The reference has a specific three-level structure that beautiful-mermaid
 * does not produce natively, so `toReference()` rewrites the SVG:
 *   • card  (#0B0B0B) — the figure background
 *   • node container = subgraph (#111111, hairline ring, centred bright title)
 *   • element box    = node (#0B0B0B fill, #2A2A2A border, muted label), or an
 *     inverted highlight box via `:::highlight`
 *   • connector = line + a centred junction dot (no arrowhead)
 */

const SCALE = 1.25;

const COLOR_OPTS = {
  bg: "var(--mm-bg)",
  fg: "var(--mm-fg)",
  // Element boxes sit at the card colour and are read by their border — the
  // reference's inner box is the same fill as the card, not a lighter tint.
  surface: "var(--mm-bg)",
  border: "var(--mm-border)",
  line: "var(--mm-line)",
  accent: "var(--mm-accent)",
  muted: "var(--mm-muted)",
  transparent: true,
  // Hug the content; the card supplies the breathing room.
  padding: 14,
} as const;

// A ready-made class so authors can emphasise a node with `:::highlight`
// (or `class X highlight`) without wiring colours — the inverted box.
const HIGHLIGHT_CLASSDEF =
  "classDef highlight fill:var(--mm-hi-bg),stroke:var(--mm-hi-bg),color:var(--mm-hi-fg);";

function withHighlight(src: string): string {
  return /\bclassDef\s+highlight\b/.test(src) ? src : `${src}\n${HIGHLIGHT_CLASSDEF}`;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Point halfway along a polyline by arc length — where the junction dot sits. */
function pathMidpoint(pts: { x: number; y: number }[]): { x: number; y: number } {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(d);
    total += d;
  }
  let half = total / 2;
  for (let i = 1; i < pts.length; i++) {
    if (half <= seg[i - 1]) {
      const t = seg[i - 1] === 0 ? 0 : half / seg[i - 1];
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
      };
    }
    half -= seg[i - 1];
  }
  return pts[pts.length - 1] ?? { x: 0, y: 0 };
}

function toReference(svg: string): string {
  // Font: drop the bundled Google-Fonts @import (the page already serves Inter
  // via next/font) and route the SVG text onto the site font stack.
  svg = svg
    .replace(/\s*@import url\([^)]*\);?\n?/, "")
    .replace(/font-family:\s*'Inter'[^;]*;/, "font-family: var(--font-sans);");

  // Uniformly zoom the root SVG so intrinsic text lands near the reference's
  // 16px (beautiful-mermaid fixes node text at 13px). viewBox is untouched, so
  // max-width:100% still guards against overflow.
  svg = svg.replace(
    /(<svg\b[^>]*?)\swidth="([\d.]+)"\sheight="([\d.]+)"/,
    (_m, head, w, h) =>
      `${head} width="${round(parseFloat(w) * SCALE)}" height="${round(
        parseFloat(h) * SCALE,
      )}"`,
  );

  // Subgraph → node container: #111 fill, hairline ring, 16px radius, header
  // bar dropped, title centred + brightened to the element-text scale.
  svg = svg.replace(
    /(<g class="subgraph"[^>]*>)([\s\S]*?)(<\/g>)/g,
    (_m, open: string, inner: string, close: string) => {
      const rects = inner.match(/<rect\b[^>]*\/>/g) ?? [];
      const body = rects[0] ?? "";
      const x = parseFloat((body.match(/\bx="([^"]+)"/) ?? [])[1] ?? "0");
      const w = parseFloat((body.match(/\bwidth="([^"]+)"/) ?? [])[1] ?? "0");
      const cx = round(x + w / 2);
      const newBody = body
        .replace(/\brx="[^"]*"/, 'rx="16"')
        .replace(/\bry="[^"]*"/, 'ry="16"')
        .replace(/\bfill="[^"]*"/, 'fill="var(--mm-node)"')
        .replace(/\bstroke="[^"]*"/, 'stroke="var(--mm-frame-border)"');
      const text = (inner.match(/<text\b[^>]*>[\s\S]*?<\/text>/) ?? [""])[0]
        .replace(/\bx="[^"]*"/, `x="${cx}"`)
        .replace(/<text\b/, '<text text-anchor="middle"')
        .replace(/\bfont-size="[^"]*"/, 'font-size="13"')
        .replace(/\bfont-weight="[^"]*"/, 'font-weight="500"')
        .replace(/\bfill="[^"]*"/, 'fill="var(--mm-fg)"');
      // Re-emitting only body + title drops the header bar rect.
      return `${open}${newBody}${text}${close}`;
    },
  );

  // Remaining square corners are element boxes → rounded-lg.
  svg = svg.replace(/rx="0" ry="0"/g, 'rx="8" ry="8"');
  // Unstyled element labels → muted. Styled nodes carry their own inline fill
  // and are left untouched.
  svg = svg.replace(/fill="var\(--_text\)"/g, 'fill="var(--mm-muted)"');

  // Edges → connector with a centred junction dot, no arrowhead.
  svg = svg.replace(/<polyline class="edge"[^>]*\/>/g, (line: string) => {
    const raw = (line.match(/points="([^"]+)"/) ?? [])[1] ?? "";
    const pts = raw
      .trim()
      .split(/\s+/)
      .map((p) => {
        const [a, b] = p.split(",").map(Number);
        return { x: a, y: b };
      });
    const mid = pathMidpoint(pts);
    const cleaned = line.replace(/\s*marker-(?:end|start)="[^"]*"/g, "");
    return (
      cleaned +
      `<circle cx="${round(mid.x)}" cy="${round(mid.y)}" r="8" fill="var(--mm-dot-ring)" />` +
      `<circle cx="${round(mid.x)}" cy="${round(mid.y)}" r="4" fill="var(--mm-accent)" />`
    );
  });

  return svg;
}

export function Mermaid({ chart, children, caption, className }: Props) {
  const source = (chart ?? (typeof children === "string" ? children : "")).trim();

  let svg: string | null = null;
  try {
    svg = toReference(renderMermaidSVG(withHighlight(source), COLOR_OPTS));
  } catch {
    svg = null;
  }

  if (!svg) {
    // Unparseable source shouldn't break the static build — show the raw text.
    return (
      <figure className={cn("mermaid-graph mermaid-graph--error", className)}>
        <div className="mermaid-graph__card">
          <pre>{source}</pre>
        </div>
      </figure>
    );
  }

  return (
    <figure className={cn("mermaid-graph", className)}>
      <div className="mermaid-graph__card">
        <div
          className="mermaid-graph__canvas"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {caption && (
        <figcaption className="mermaid-graph__caption">{caption}</figcaption>
      )}
    </figure>
  );
}
