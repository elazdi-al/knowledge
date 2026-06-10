import type { ReactNode } from "react";
import {
  Arrow,
  ArrowHead,
  Box,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  Label,
  RADIUS,
  SPACE,
  STROKE,
  measureLabel,
  r2,
  stableId,
} from "@/components/diagram";

/**
 * A schema-level Entity-Relationship diagram in the textbook style: rectangle
 * entity sets, diamond relationship sets, ellipse attributes (with a solid
 * underline for a key, a dashed underline for a partial key), the ISA
 * specialization triangle, and a dashed rounded box for aggregation. Edges are
 * muted connector lines, a chevron arrowhead (key / at-most-one constraint),
 * or a bold line (total participation), with optional italic role labels.
 *
 * Why a bespoke SVG: the ER look - hand-tuned multi-level layouts where
 * attributes fan off their owner, a relationship is enclosed and connects
 * onward (aggregation), and ISA trees run several levels deep - is exactly what
 * generic graph engines render badly. So the author supplies x/y for every
 * node (Automaton-style manual mode), in the same y-up centimetre grid as the
 * TikZ sources; we flip to SVG space and draw every glyph from the data.
 *
 * Every shape is sized from real font metrics (measureLabel), so a label can
 * never overflow its rectangle, diamond, ellipse or triangle. Parallel edges
 * between the same endpoints (the two role edges of a self-relationship) fan
 * out with distinct angles - wider apart at the relationship than at the
 * entity - and each role label sits beside its own edge. Key-constraint
 * arrowheads always point into the relationship diamond, whichever way the
 * edge was authored. Rendered once on the server (no client JS); all colour,
 * stroke and type comes from the shared diagram theme, so the figure re-themes
 * on the light/dark switch with the rest of the family.
 */

type Kind = "entity" | "relationship" | "isa";

export interface ERNode {
  /** Stable id referenced by edges, attribute owners and aggregation members. */
  id: string;
  /** Display text. Entities/relationships show it; ISA defaults to "ISA". */
  label?: string;
  /** Centre, in the same y-up centimetre grid as the TikZ sources. */
  x: number;
  y: number;
  /** `weak` double-frames an entity; `identifying` double-frames a relationship. */
  variant?: "normal" | "weak" | "identifying";
}

export interface ERAttribute {
  /** Owner entity / relationship id; the connecting line is drawn for you. */
  owner: string;
  label: string;
  x: number;
  y: number;
  /** `key` = solid underline, `partial` = dashed underline, else plain. */
  kind?: "normal" | "key" | "partial";
}

export interface EREdge {
  /** Endpoint ids: entity, relationship, ISA node, or an aggregation box id. */
  from: string;
  to: string;
  /** `thick` = total participation; `arrow` = key / at-most-one (chevron head). */
  style?: "plain" | "thick" | "arrow" | "thickArrow";
  /** Small italic role label, placed by the edge. */
  label?: string;
  /** Optional label nudge in the same centimetre grid as node coordinates. */
  labelDx?: number;
  labelDy?: number;
}

export interface ERAggregation {
  /** Stable id; usable as an edge endpoint (the box edge, e.g. `agg`->`Monitors`). */
  id: string;
  /** Node ids the dashed box should enclose; attributes owned by those nodes
   *  are pulled in automatically, so the box fits the whole sub-schema. */
  members: string[];
}

export interface ERAnnotation {
  /** Free muted label (e.g. a cardinality caption or "Overlapping"). */
  text: string;
  x: number;
  y: number;
  /** Horizontal anchor. Default "middle". */
  anchor?: "start" | "middle" | "end";
}

interface Props {
  entities?: ERNode[];
  relationships?: ERNode[];
  isa?: ERNode[];
  attributes?: ERAttribute[];
  edges?: EREdge[];
  aggregations?: ERAggregation[];
  annotations?: ERAnnotation[];
  /** Bold heading inside the card (e.g. a figure label). */
  title?: string;
  caption?: string;
  className?: string;
}

// --- geometry -------------------------------------------------------------

const UNIT = 34; // px per TikZ centimetre of the source coordinates
const ENT_W = 2.4 * UNIT; // minimum entity rectangle width
const ENT_H = 0.8 * UNIT; // entity rectangle height
const REL_W = 2.2 * UNIT; // minimum relationship diamond width
const REL_H = 0.92 * UNIT; // relationship diamond height
const ATTR_W = 1.55 * UNIT; // minimum attribute ellipse width
const ATTR_H = 0.74 * UNIT; // attribute ellipse height
const ISA_R = 0.62 * UNIT; // ISA triangle half height (and base half width)
const AGG_PAD = 14; // dashed aggregation box inset around its members
const SHAPE_PAD = 4; // text clearance inside a diamond / ellipse / triangle
const ARROW_GAP = 2; // pull an arrowhead tip just off the target outline
const ROLE_GAP = 8; // gap between a fanned edge and its role label
const LABEL_RISE = 9; // edge label centre above the edge midpoint
const FAN_AT_SOURCE = 0.55; // fanned-edge lateral offset, fraction of source extent
const FAN_AT_TARGET = 0.8; // fanned-edge lateral offset, fraction of target extent
const FAN_MAX = 1.1 * UNIT; // cap on a fanned edge's lateral offset
const ISA_TEXT_RISE = 0.2; // ISA text centre above the triangle centre, in hh

/** ER names are literal identifiers: keep "_" as a drawn low line instead of
 *  letting it trigger the Label subscript syntax. */
const literal = (s: string) => s.replace(/_/g, "_{_}");

/** Half sizes measured from real font metrics, so a label can never overflow
 *  its shape. */
const entHalfW = (label: string) =>
  Math.max(
    ENT_W,
    measureLabel(literal(label), FONT.label, 600) + 2 * SPACE.textPadX,
  ) / 2;

const relHalfW = (label: string) => {
  // at the text band the inscribed diamond width shrinks to (1 - th/hh)
  const free = 1 - FONT.label / 2 / (REL_H / 2);
  return Math.max(
    REL_W / 2,
    (measureLabel(literal(label), FONT.label) / 2 + SHAPE_PAD) / free,
  );
};

const attrHalfW = (label: string) => {
  const free = Math.sqrt(1 - (FONT.label / 2 / (ATTR_H / 2)) ** 2);
  return Math.max(
    ATTR_W / 2,
    measureLabel(literal(label), FONT.label) / 2 / free + SHAPE_PAD,
  );
};

const isaHalfW = (label: string) => {
  // the text bottom sits (0.8 + rise)*hh below the top edge; widen the
  // triangle until the label fits inside the taper at that line
  const free = 1 - ((1 - ISA_TEXT_RISE) * ISA_R + FONT.note / 2) / (2 * ISA_R);
  return Math.max(
    1.08 * ISA_R,
    (measureLabel(literal(label), FONT.note, 600) / 2 + SHAPE_PAD) / free,
  );
};

interface Shape {
  cx: number;
  cy: number;
  hw: number; // half width
  hh: number; // half height
  kind: Kind | "attr" | "agg";
}

/** Boundary point of an axis-aligned rectangle from its centre toward (dx,dy). */
function rectEdge(b: Shape, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return { x: b.cx, y: b.cy };
  const sx = b.hw / (Math.abs(dx) || 1e-9);
  const sy = b.hh / (Math.abs(dy) || 1e-9);
  const s = Math.min(sx, sy);
  return { x: b.cx + dx * s, y: b.cy + dy * s };
}

/** Boundary point of a diamond (|x/hw| + |y/hh| = 1) toward (dx,dy). */
function diamondEdge(b: Shape, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return { x: b.cx, y: b.cy };
  const s = 1 / (Math.abs(dx) / b.hw + Math.abs(dy) / b.hh);
  return { x: b.cx + dx * s, y: b.cy + dy * s };
}

/** Boundary point of an ellipse toward (dx,dy). */
function ellipseEdge(b: Shape, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return { x: b.cx, y: b.cy };
  const s = 1 / Math.sqrt((dx / b.hw) ** 2 + (dy / b.hh) ** 2);
  return { x: b.cx + dx * s, y: b.cy + dy * s };
}

/** Boundary point of the inverted ISA triangle (flat top at cy+hh, apex at
 *  cy-hh in y-up space) toward (dx,dy), so edges meet its slanted sides. */
function triangleEdge(b: Shape, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return { x: b.cx, y: b.cy };
  if (dy > 0) {
    const s = b.hh / dy;
    if (Math.abs(dx) * s <= b.hw) return { x: b.cx + dx * s, y: b.cy + b.hh };
  }
  // slanted side: |x| = hw * (y + hh) / (2 hh)
  const s = b.hw / 2 / (Math.abs(dx) - (b.hw * dy) / (2 * b.hh));
  return { x: b.cx + dx * s, y: b.cy + dy * s };
}

function boundaryPoint(b: Shape, tx: number, ty: number) {
  const dx = tx - b.cx;
  const dy = ty - b.cy;
  if (b.kind === "relationship") return diamondEdge(b, dx, dy);
  if (b.kind === "attr") return ellipseEdge(b, dx, dy);
  if (b.kind === "isa") return triangleEdge(b, dx, dy);
  return rectEdge(b, dx, dy); // entity / agg behave like rectangles
}

/** Implicit shape function: < 1 inside b, = 1 on its boundary. */
function shapeNorm(b: Shape, x: number, y: number) {
  const dx = Math.abs(x - b.cx);
  const dy = Math.abs(y - b.cy);
  if (b.kind === "relationship") return dx / b.hw + dy / b.hh;
  if (b.kind === "attr") return Math.sqrt((dx / b.hw) ** 2 + (dy / b.hh) ** 2);
  if (b.kind === "isa") {
    const u = (y - b.cy + b.hh) / (2 * b.hh); // 0 at the apex, 1 at the top
    if (u <= 0) return 9;
    return Math.max((y - b.cy) / b.hh, (Math.abs(x - b.cx) / b.hw) / u);
  }
  return Math.max(dx / b.hw, dy / b.hh);
}

/** Where the segment q0->q1 (q0 inside b) crosses b's boundary. Used for
 *  fanned edges, whose offset lines no longer pass through the centre. */
function exitPoint(
  b: Shape,
  q0: { x: number; y: number },
  q1: { x: number; y: number },
) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const t = (lo + hi) / 2;
    const x = q0.x + (q1.x - q0.x) * t;
    const y = q0.y + (q1.y - q0.y) * t;
    if (shapeNorm(b, x, y) < 1) lo = t;
    else hi = t;
  }
  const t = (lo + hi) / 2;
  return { x: q0.x + (q1.x - q0.x) * t, y: q0.y + (q1.y - q0.y) * t };
}

export function ERDiagram({
  entities = [],
  relationships = [],
  isa = [],
  attributes = [],
  edges = [],
  aggregations = [],
  annotations = [],
  title,
  caption,
  className,
}: Props) {
  // Collect node shapes in a single map. TikZ y is up, SVG y is down, so we
  // flip y after computing the content bounds.
  const boxes = new Map<string, Shape & { node?: ERNode }>();

  for (const e of entities) {
    boxes.set(e.id, {
      cx: e.x * UNIT,
      cy: e.y * UNIT,
      hw: entHalfW(e.label ?? e.id),
      hh: ENT_H / 2,
      kind: "entity",
      node: e,
    });
  }
  for (const r of relationships) {
    boxes.set(r.id, {
      cx: r.x * UNIT,
      cy: r.y * UNIT,
      hw: relHalfW(r.label ?? r.id),
      hh: REL_H / 2,
      kind: "relationship",
      node: r,
    });
  }
  for (const t of isa) {
    boxes.set(t.id, {
      cx: t.x * UNIT,
      cy: t.y * UNIT,
      hw: isaHalfW(t.label ?? "ISA"),
      hh: ISA_R,
      kind: "isa",
      node: t,
    });
  }

  // attribute shapes (separate list; they connect only to their owner)
  const attrBoxes = attributes.map((a) => ({
    a,
    box: {
      cx: a.x * UNIT,
      cy: a.y * UNIT,
      hw: attrHalfW(a.label),
      hh: ATTR_H / 2,
      kind: "attr" as const,
    },
  }));

  // aggregation boxes: bounds of the member nodes plus any attribute they own.
  const aggBoxes = aggregations.map((agg) => {
    const members = new Set(agg.members);
    const cands: Shape[] = [];
    for (const m of agg.members) {
      const b = boxes.get(m);
      if (b) cands.push(b);
    }
    for (const { a, box } of attrBoxes) {
      if (members.has(a.owner)) cands.push(box);
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const cand of cands) {
      minX = Math.min(minX, cand.cx - cand.hw);
      maxX = Math.max(maxX, cand.cx + cand.hw);
      minY = Math.min(minY, cand.cy - cand.hh);
      maxY = Math.max(maxY, cand.cy + cand.hh);
    }
    if (!Number.isFinite(minX)) {
      minX = maxX = minY = maxY = 0;
    }
    const box: Shape = {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      hw: (maxX - minX) / 2 + AGG_PAD,
      hh: (maxY - minY) / 2 + AGG_PAD,
      kind: "agg",
    };
    boxes.set(agg.id, box);
    return { agg, box };
  });

  // ---- edge geometry (shared by the bounds pass and the render pass) -------
  // Parallel edges (same unordered endpoint pair, e.g. the two role edges of a
  // self-relationship) fan out with distinct angles: each edge leaves the
  // source and enters the target at its own lateral offset, wider at the
  // target, so the lines never overlap and each role label has its own edge.
  const pairKey = (e: EREdge) =>
    e.from < e.to ? `${e.from} ${e.to}` : `${e.to} ${e.from}`;
  const pairTotal = new Map<string, number>();
  for (const e of edges) {
    const k = pairKey(e);
    pairTotal.set(k, (pairTotal.get(k) ?? 0) + 1);
  }
  const pairSeen = new Map<string, number>();

  interface EdgeGeom {
    e: EREdge;
    p0: { x: number; y: number };
    p1: { x: number; y: number };
    /** The chevron always points into the relationship diamond, whichever way
     *  the edge was authored. */
    headAtFrom: boolean;
    /** Label centre/anchor point, in TikZ-derived px space (y-up). */
    lx: number;
    ly: number;
    anchor: "start" | "middle" | "end";
  }

  const edgeGeoms: (EdgeGeom | null)[] = edges.map((e) => {
    const a = boxes.get(e.from);
    const b = boxes.get(e.to);
    if (!a || !b) return null;
    const k = pairKey(e);
    const n = pairTotal.get(k) ?? 1;
    const idx = pairSeen.get(k) ?? 0;
    pairSeen.set(k, idx + 1);

    const arrow = e.style === "arrow" || e.style === "thickArrow";
    const headAtFrom =
      arrow && a.kind === "relationship" && b.kind !== "relationship";

    let p0: { x: number; y: number };
    let p1: { x: number; y: number };
    let lx: number;
    let ly: number;
    let anchor: EdgeGeom["anchor"] = "middle";

    if (n <= 1) {
      p0 = boundaryPoint(a, b.cx, b.cy);
      p1 = boundaryPoint(b, a.cx, a.cy);
      lx = (p0.x + p1.x) / 2;
      ly = (p0.y + p1.y) / 2 + LABEL_RISE;
    } else {
      const t = (idx / (n - 1)) * 2 - 1; // -1 .. 1 across the fan
      const ddx = b.cx - a.cx;
      const ddy = b.cy - a.cy;
      const len = Math.hypot(ddx, ddy) || 1;
      const ux = -ddy / len; // left normal of the centre line
      const uy = ddx / len;
      const pa = boundaryPoint(a, a.cx + ux, a.cy + uy);
      const pb = boundaryPoint(b, b.cx + ux, b.cy + uy);
      const extA = Math.hypot(pa.x - a.cx, pa.y - a.cy);
      const extB = Math.hypot(pb.x - b.cx, pb.y - b.cy);
      const offA = t * Math.min(FAN_AT_SOURCE * extA, FAN_MAX);
      const offB = t * Math.min(FAN_AT_TARGET * extB, 1.6 * FAN_MAX);
      const q0 = { x: a.cx + ux * offA, y: a.cy + uy * offA };
      const q1 = { x: b.cx + ux * offB, y: b.cy + uy * offB };
      p0 = exitPoint(a, q0, q1);
      p1 = exitPoint(b, q1, q0);
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;

      const nudged = e.labelDx != null || e.labelDy != null;
      if (nudged || t === 0) {
        lx = mx;
        ly = my + (nudged ? 0 : LABEL_RISE);
      } else if (Math.abs(ux) >= Math.abs(uy)) {
        // near-vertical edges fan sideways: label beside its own edge,
        // anchored away from the fan centre
        const side = Math.sign(ux * t) || 1;
        lx = mx + side * ROLE_GAP;
        ly = my;
        anchor = side < 0 ? "end" : "start";
      } else {
        // near-horizontal edges fan vertically: label above/below its edge
        const side = Math.sign(uy * t) || 1;
        lx = mx;
        ly = my + side * (LABEL_RISE + 2);
      }
    }

    return {
      e,
      p0,
      p1,
      headAtFrom,
      lx: lx + (e.labelDx ?? 0) * UNIT,
      ly: ly + (e.labelDy ?? 0) * UNIT,
      anchor,
    };
  });

  // ---- content bounds (in flipped, top-left-origin pixel space) ------------
  const allX: number[] = [];
  const allY: number[] = [];
  const consider = (cx: number, cy: number, hw: number, hh: number) => {
    allX.push(cx - hw, cx + hw);
    allY.push(cy - hh, cy + hh);
  };
  for (const b of boxes.values()) consider(b.cx, b.cy, b.hw, b.hh);
  for (const { box } of attrBoxes) consider(box.cx, box.cy, box.hw, box.hh);
  for (const g of edgeGeoms) {
    if (!g?.e.label) continue;
    const w = measureLabel(literal(g.e.label), FONT.note) + 4;
    const left =
      g.anchor === "start" ? g.lx : g.anchor === "end" ? g.lx - w : g.lx - w / 2;
    allX.push(left, left + w);
    allY.push(g.ly - 8, g.ly + 8);
  }
  for (const an of annotations) {
    const x = an.x * UNIT;
    const y = an.y * UNIT;
    const w = measureLabel(literal(an.text), FONT.note) + 4;
    const anchor = an.anchor ?? "middle";
    const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
    allX.push(left, left + w);
    allY.push(y - 8, y + 8);
  }
  if (allX.length === 0) {
    allX.push(0, ENT_W);
    allY.push(0, ENT_H);
  }

  const minPX = Math.min(...allX);
  const maxPX = Math.max(...allX);
  const minPY = Math.min(...allY);
  const maxPY = Math.max(...allY);
  const width = maxPX - minPX + 2 * SPACE.margin;
  const height = maxPY - minPY + 2 * SPACE.margin;

  // Map a TikZ-derived pixel (y-up) into the SVG viewBox (y-down, padded).
  const sx = (px: number) => px - minPX + SPACE.margin;
  const sy = (py: number) => maxPY - py + SPACE.margin;

  const arrowId = stableId("er-arrow", {
    entities,
    relationships,
    isa,
    edges,
    title,
  });

  // ---- edges (drawn first, behind glyphs) ----------------------------------
  const edgeEls = edgeGeoms.map((g, i) => {
    if (!g) return null;
    const { e } = g;
    const thick = e.style === "thick" || e.style === "thickArrow";
    const arrow = e.style === "arrow" || e.style === "thickArrow";
    const tail = g.headAtFrom ? g.p1 : g.p0;
    let head = g.headAtFrom ? g.p0 : g.p1;
    if (arrow) {
      const dx = head.x - tail.x;
      const dy = head.y - tail.y;
      const l = Math.hypot(dx, dy) || 1;
      head = {
        x: head.x - (dx / l) * ARROW_GAP,
        y: head.y - (dy / l) * ARROW_GAP,
      };
    }
    return (
      <g key={`e${i}`}>
        <Arrow
          from={{ x: sx(tail.x), y: sy(tail.y) }}
          to={{ x: sx(head.x), y: sy(head.y) }}
          markerId={arrow ? arrowId : undefined}
          width={thick ? STROKE.bold : STROKE.line}
        />
        {e.label && (
          <g fontStyle="italic">
            <Label
              x={sx(g.lx)}
              y={sy(g.ly)}
              text={literal(e.label)}
              size={FONT.note}
              fill={COLOR.muted}
              anchor={g.anchor}
              halo
            />
          </g>
        )}
      </g>
    );
  });

  // ---- attribute connectors + ellipses -------------------------------------
  const attrEls = attrBoxes.map(({ a, box }, i) => {
    const owner = boxes.get(a.owner);
    const conn =
      owner != null
        ? (() => {
            const p0 = boundaryPoint(owner, box.cx, box.cy);
            const p1 = boundaryPoint(box, owner.cx, owner.cy);
            return (
              <line
                x1={r2(sx(p1.x))}
                y1={r2(sy(p1.y))}
                x2={r2(sx(p0.x))}
                y2={r2(sy(p0.y))}
                stroke={COLOR.muted}
                strokeWidth={STROKE.line}
              />
            );
          })()
        : null;
    const cx = sx(box.cx);
    const cy = sy(box.cy);
    const tw = measureLabel(literal(a.label), FONT.label);
    const underY = cy + FONT.label * 0.42;
    return (
      <g key={`a${i}`}>
        {conn}
        <ellipse
          cx={r2(cx)}
          cy={r2(cy)}
          rx={r2(box.hw)}
          ry={r2(box.hh)}
          fill={COLOR.bg}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        <Label x={cx} y={cy} text={literal(a.label)} size={FONT.label} />
        {(a.kind === "key" || a.kind === "partial") && (
          <line
            x1={r2(cx - tw / 2)}
            y1={r2(underY)}
            x2={r2(cx + tw / 2)}
            y2={r2(underY)}
            stroke={COLOR.fg}
            strokeWidth={STROKE.divider}
            strokeDasharray={a.kind === "partial" ? STROKE.dash : undefined}
          />
        )}
      </g>
    );
  });

  // ---- aggregation dashed boxes (behind nodes, above edges) ----------------
  const aggEls = aggBoxes.map(({ agg, box }) => (
    <rect
      key={`agg-${agg.id}`}
      x={r2(sx(box.cx - box.hw))}
      y={r2(sy(box.cy + box.hh))}
      width={r2(box.hw * 2)}
      height={r2(box.hh * 2)}
      rx={RADIUS.frame}
      fill="none"
      stroke={COLOR.muted}
      strokeWidth={STROKE.frame}
      strokeDasharray={STROKE.dash}
    />
  ));

  // ---- node glyphs ---------------------------------------------------------
  const nodeEls: ReactNode[] = [];

  for (const e of entities) {
    const b = boxes.get(e.id)!;
    const x = sx(b.cx - b.hw);
    const y = sy(b.cy + b.hh);
    nodeEls.push(
      <g key={`ent-${e.id}`}>
        <Box
          x={x}
          y={y}
          w={b.hw * 2}
          h={b.hh * 2}
          label={literal(e.label ?? e.id)}
          fontWeight={600}
          state={e.variant === "weak" ? "emphasis" : "normal"}
          tint
        />
        {e.variant === "weak" && (
          <rect
            x={r2(x + 3.5)}
            y={r2(y + 3.5)}
            width={r2(b.hw * 2 - 7)}
            height={r2(b.hh * 2 - 7)}
            rx={RADIUS.box - 2}
            fill="none"
            stroke={COLOR.fg}
            strokeWidth={STROKE.frame}
          />
        )}
      </g>,
    );
  }

  for (const r of relationships) {
    const b = boxes.get(r.id)!;
    const identifying = r.variant === "identifying";
    const pts = `${r2(sx(b.cx))},${r2(sy(b.cy + b.hh))} ${r2(sx(b.cx + b.hw))},${r2(sy(b.cy))} ${r2(sx(b.cx))},${r2(sy(b.cy - b.hh))} ${r2(sx(b.cx - b.hw))},${r2(sy(b.cy))}`;
    nodeEls.push(
      <g key={`rel-${r.id}`}>
        <polygon
          points={pts}
          fill={COLOR.node}
          stroke={COLOR.fg}
          strokeWidth={identifying ? STROKE.bold : STROKE.frame}
        />
        {identifying && (
          <polygon
            points={`${r2(sx(b.cx))},${r2(sy(b.cy + b.hh) + 5)} ${r2(sx(b.cx + b.hw) - 6)},${r2(sy(b.cy))} ${r2(sx(b.cx))},${r2(sy(b.cy - b.hh) - 5)} ${r2(sx(b.cx - b.hw) + 6)},${r2(sy(b.cy))}`}
            fill="none"
            stroke={COLOR.fg}
            strokeWidth={STROKE.frame}
          />
        )}
        <Label
          x={sx(b.cx)}
          y={sy(b.cy)}
          text={literal(r.label ?? r.id)}
          size={FONT.label}
        />
      </g>,
    );
  }

  for (const t of isa) {
    const b = boxes.get(t.id)!;
    // Inverted triangle (apex down), like the textbook ISA glyph.
    const top = sy(b.cy + b.hh);
    const bot = sy(b.cy - b.hh);
    const pts = `${r2(sx(b.cx - b.hw))},${r2(top)} ${r2(sx(b.cx + b.hw))},${r2(top)} ${r2(sx(b.cx))},${r2(bot)}`;
    nodeEls.push(
      <g key={`isa-${t.id}`}>
        <polygon
          points={pts}
          fill={COLOR.node}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        <Label
          x={sx(b.cx)}
          y={sy(b.cy + ISA_TEXT_RISE * b.hh)}
          text={literal(t.label ?? "ISA")}
          size={FONT.note}
          weight={600}
        />
      </g>,
    );
  }

  // ---- free annotations ----------------------------------------------------
  const annEls = annotations.map((an, i) => (
    <g key={`an${i}`} fontStyle="italic">
      <Label
        x={sx(an.x * UNIT)}
        y={sy(an.y * UNIT)}
        text={literal(an.text)}
        size={FONT.note}
        fill={COLOR.muted}
        anchor={an.anchor ?? "middle"}
        halo
      />
    </g>
  ));

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={width}
        h={height}
        label={caption ?? "Entity-relationship diagram"}
      >
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        {edgeEls}
        {attrEls}
        {aggEls}
        {nodeEls}
        {annEls}
      </DiagramSvg>
    </DiagramFigure>
  );
}
