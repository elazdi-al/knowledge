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
 * Renders a Mermaid diagram in the site's house style.
 *
 * beautiful-mermaid does the parsing, ELK layout, shapes, arrowheads and edge
 * styles natively — we lean on all of that. A small, well-scoped `restyle()`
 * pass then nudges three things the library can't express as options:
 *   1. container titles: centred + balanced in their header zone (no band),
 *   2. corner radii: containers `16`, element boxes `8`,
 *   3. connectors: every link keeps its native arrowhead and gains a small
 *      junction dot — one coherent motif shared across all edge styles.
 *
 * The SVG is produced once at build time (Server Component → no client JS, no
 * flash) and every colour is a `var(--mm-*)` reference, so the baked geometry
 * re-themes live on the light/dark switch.
 */

/** Uniform zoom so intrinsic 13px node text lands near the reference's ~16px. */
const SCALE = 1.25;

/**
 * How far outside a node box an arrow endpoint is seated. The native arrowhead
 * tip sits ~1px past the endpoint, so GAP=2 lands the tip ~1px clear of the box
 * — touching, never painted over by the box (nodes draw on top of edges).
 */
const GAP = 2;

/** Shapes whose bounding box is a faithful rectangle, so endpoint-seating is safe.
 *  Diamonds, circles, hexagons etc. are left alone — the library already seats
 *  their endpoints on the true (sloped/curved) perimeter. */
const RECT_LIKE = new Set(["rectangle", "rounded", "stadium", "subroutine"]);

/**
 * Optical centre of a container title, measured down from the container's top
 * edge. The library plants it at +14 (inside the 16px corner curve, far from
 * the content below); +22 sits it in the middle of the header zone instead.
 */
const TITLE_CENTER_FROM_TOP = 22;

const COLOR_OPTS = {
  bg: "var(--mm-bg)",
  fg: "var(--mm-fg)",
  // Element boxes sit at the card colour and read by their border — the
  // reference's inner box is the same fill as the card, not a lighter tint.
  surface: "var(--mm-bg)",
  border: "var(--mm-border)",
  line: "var(--mm-line)",
  // Drives both arrowheads (var(--_arrow)) and the junction dot core, so the
  // two halves of a connector stay the same colour.
  accent: "var(--mm-accent)",
  muted: "var(--mm-muted)",
  transparent: true,
  // Hug the content; the card supplies the breathing room.
  padding: 14,
} as const;

// A ready-made class so authors can emphasise a node with `:::highlight`
// (or `class X highlight`) without wiring colours — the inverted box. This is
// beautiful-mermaid's own classDef mechanism, theme-reactive via var(--mm-*).
const HIGHLIGHT_CLASSDEF =
  "classDef highlight fill:var(--mm-hi-bg),stroke:var(--mm-hi-bg),color:var(--mm-hi-fg);";

function withHighlight(src: string): string {
  return /\bclassDef\s+highlight\b/.test(src) ? src : `${src}\n${HIGHLIGHT_CLASSDEF}`;
}

const round = (n: number) => Math.round(n * 1000) / 1000;
const attr = (s: string, name: string): string =>
  (s.match(new RegExp(`\\b${name}="([^"]*)"`)) ?? [])[1] ?? "";

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

/** The shared junction-dot motif: a ring + an accent core, centred on a point. */
function junctionDot(x: number, y: number): string {
  return (
    `<circle cx="${round(x)}" cy="${round(y)}" r="5" fill="var(--mm-dot-ring)" />` +
    `<circle cx="${round(x)}" cy="${round(y)}" r="2.5" fill="var(--mm-accent)" />`
  );
}

// --- restyle passes -------------------------------------------------------

/** Route the SVG's text onto the site font stack and drop the bundled import. */
function fixFont(svg: string): string {
  return svg
    .replace(/\s*@import url\([^)]*\);?/g, "")
    .replace(/font-family:\s*'Inter'[^;]*;/, "font-family: var(--font-sans);");
}

/** Uniformly zoom the root SVG. viewBox is untouched, so max-width:100% holds. */
function scaleRoot(svg: string): string {
  return svg.replace(
    /(<svg\b[^>]*?)\swidth="([\d.]+)"\sheight="([\d.]+)"/,
    (_m, head, w, h) =>
      `${head} width="${round(parseFloat(w) * SCALE)}" height="${round(
        parseFloat(h) * SCALE,
      )}"`,
  );
}

/**
 * Each subgraph emits a header trio — background rect, header-band rect, title —
 * before any nested child group. Matching that trio (rather than the whole
 * group body) keeps the transform safe for arbitrarily nested subgraphs:
 *   • background rect → container fill, hairline ring, 16px radius,
 *   • header band     → dropped,
 *   • title           → centred, brightened, balanced in the header zone.
 */
function restyleContainers(svg: string): string {
  return svg.replace(
    /(<g class="subgraph"[^>]*>)\s*(<rect\b[^>]*\/>)\s*<rect\b[^>]*\/>\s*(<text\b[^>]*>[\s\S]*?<\/text>)/g,
    (_m, open: string, bgRect: string, title: string) => {
      const x = parseFloat(attr(bgRect, "x") || "0");
      const y = parseFloat(attr(bgRect, "y") || "0");
      const w = parseFloat(attr(bgRect, "width") || "0");
      const cx = round(x + w / 2);

      const container = bgRect
        .replace(/\brx="[^"]*"/, 'rx="16"')
        .replace(/\bry="[^"]*"/, 'ry="16"')
        .replace(/\bfill="[^"]*"/, 'fill="var(--mm-node)"')
        .replace(/\bstroke="[^"]*"/, 'stroke="var(--mm-frame-border)"');

      // Re-emit the title centred and balanced; re-anchor any multi-line tspans.
      const inner = (title.match(/<text\b[^>]*>([\s\S]*?)<\/text>/) ?? ["", ""])[1].replace(
        /x="[^"]*"/g,
        `x="${cx}"`,
      );
      const titleEl =
        `<text x="${cx}" y="${round(y + TITLE_CENTER_FROM_TOP)}" text-anchor="middle" ` +
        `font-size="14" font-weight="500" fill="var(--mm-fg)" dy="0.35em">${inner}</text>`;

      // Dropping the band rect is what removes the native header strip.
      return `${open}\n  ${container}\n  ${titleEl}`;
    },
  );
}

/** Square element boxes → rounded-lg (containers are already 16 by here). */
function roundBoxes(svg: string): string {
  return svg.replace(/rx="0" ry="0"/g, 'rx="8" ry="8"');
}

/** Plain element labels → muted. Highlight/styled nodes keep their inline fill. */
function muteLabels(svg: string): string {
  return svg.replace(/fill="var\(--_text\)"/g, 'fill="var(--mm-muted)"');
}

interface Box {
  left: number;
  top: number;
  right: number;
  bot: number;
}

/** Bounding boxes for rect-like nodes and every subgraph container, keyed by id. */
function collectBoxes(svg: string): Record<string, Box> {
  const boxes: Record<string, Box> = {};
  for (const m of svg.matchAll(
    /<g class="node" data-id="([^"]+)" data-label="[^"]*" data-shape="([^"]+)">([\s\S]*?)<\/g>/g,
  )) {
    const [, id, shape, inner] = m;
    if (!RECT_LIKE.has(shape)) continue;
    const rect = (inner.match(/<rect\b[^>]*\/>/) ?? [])[0] ?? "";
    const x = parseFloat(attr(rect, "x"));
    const y = parseFloat(attr(rect, "y"));
    const w = parseFloat(attr(rect, "width"));
    const h = parseFloat(attr(rect, "height"));
    if (![x, y, w, h].some(Number.isNaN)) {
      boxes[id] = { left: x, top: y, right: x + w, bot: y + h };
    }
  }
  for (const m of svg.matchAll(
    /<g class="subgraph" data-id="([^"]+)"[^>]*>\s*<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g,
  )) {
    const [, id, x, y, w, h] = m;
    boxes[id] = {
      left: +x,
      top: +y,
      right: +x + +w,
      bot: +y + +h,
    };
  }
  return boxes;
}

/**
 * Move an edge endpoint `e` (whose inward neighbour is `n`) to sit `gap` px
 * outside `box`, snapping along whichever axis the edge approaches on. Bails out
 * if the move would cross the neighbour (degenerate segment).
 */
function snap(
  e: { x: number; y: number },
  n: { x: number; y: number },
  box: Box,
  gap: number,
): { x: number; y: number } {
  const ax = e.x - n.x;
  const ay = e.y - n.y;
  if (Math.abs(ay) >= Math.abs(ax)) {
    const y = ay > 0 ? box.top - gap : box.bot + gap;
    return (y - n.y) * ay <= 0 ? e : { x: e.x, y };
  }
  const x = ax > 0 ? box.left - gap : box.right + gap;
  return (x - n.x) * ax <= 0 ? e : { x, y: e.y };
}

/**
 * Seat every edge against the boxes it joins. The layout ends same-level edges
 * flush with the box (so the arrowhead tip gets clipped) and insets edges that
 * cross a subgraph boundary by the padding (so they float short of their box).
 * Re-anchoring both ends to a uniform `GAP` fixes the clip and the float at once
 * — and, by spanning the line edge-to-edge, centres the junction dot too.
 */
function seatEdges(svg: string): string {
  const boxes = collectBoxes(svg);
  return svg.replace(/<polyline class="edge"[^>]*\/>/g, (line: string) => {
    const pts = (attr(line, "points") || "")
      .trim()
      .split(/\s+/)
      .map((p) => {
        const [a, b] = p.split(",").map(Number);
        return { x: a, y: b };
      });
    if (pts.length < 2) return line;

    const src = boxes[attr(line, "data-from")];
    const tgt = boxes[attr(line, "data-to")];
    if (!src && !tgt) return line;

    if (tgt) {
      const arrow = /data-arrow-end="true"/.test(line);
      pts[pts.length - 1] = snap(pts[pts.length - 1], pts[pts.length - 2], tgt, arrow ? GAP : 0);
    }
    if (src) {
      const arrow = /data-arrow-start="true"/.test(line);
      pts[0] = snap(pts[0], pts[1], src, arrow ? GAP : 0);
    }

    const points = pts.map((p) => `${round(p.x)},${round(p.y)}`).join(" ");
    return line.replace(/points="[^"]*"/, `points="${points}"`);
  });
}

/**
 * The coherent connector system. Native arrowheads and dash/thickness are left
 * exactly as beautiful-mermaid drew them; we only add the shared junction dot:
 *   • directed link    → line + arrowhead + dot,
 *   • plain link (---)  → line + dot,
 *   • labelled link    → label box is the midpoint accent, so no dot.
 * One motif, applied the same way across every edge style.
 */
function dotConnectors(svg: string): string {
  return svg.replace(/<polyline class="edge"[^>]*\/>/g, (line: string) => {
    if (/\bdata-label="/.test(line)) return line; // label owns the midpoint
    const pts = (attr(line, "points") || "")
      .trim()
      .split(/\s+/)
      .map((p) => {
        const [a, b] = p.split(",").map(Number);
        return { x: a, y: b };
      });
    if (pts.length < 2) return line;
    const mid = pathMidpoint(pts);
    return line + junctionDot(mid.x, mid.y);
  });
}

function restyle(svg: string): string {
  return dotConnectors(
    seatEdges(muteLabels(roundBoxes(restyleContainers(scaleRoot(fixFont(svg)))))),
  );
}

export function Mermaid({ chart, children, caption, className }: Props) {
  const source = (chart ?? (typeof children === "string" ? children : "")).trim();

  let svg: string | null = null;
  try {
    svg = restyle(renderMermaidSVG(withHighlight(source), COLOR_OPTS));
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
