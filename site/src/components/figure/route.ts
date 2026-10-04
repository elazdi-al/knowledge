/** Edge routing from item rects. Pure. */
import { measureStyle } from "./measure";
import type { EdgeSpec, Item, Rect, Shape, Side } from "./model";
import { EDGE_LABEL, NODE, PORT_INSET, RADIUS, TEXT, r2 } from "./theme";

/** Width of an edge label's pill (text plus padding). */
export const labelPillW = (label: string) => measureStyle(label, TEXT.edgeLabel) + EDGE_LABEL.pad;

export interface RouteOpts {
  /** non-box node shapes: ports project onto the outline, and diamonds and triangles attach at their vertices */
  shapes?: Record<string, Shape>;
  /** rects of visible items; labels avoid them */
  solids?: Record<string, Rect>;
}

/** Kinds that paint something; layout containers and derived cells are not obstacles. */
const SOLID = new Set(["node", "group", "cells", "table", "text", "tag", "dots"]);
export const isSolid = (kind: string) => SOLID.has(kind);
export const encloses = (outer: Rect, inner: Rect) =>
  outer.x <= inner.x && outer.y <= inner.y && outer.x + outer.w >= inner.x + inner.w && outer.y + outer.h >= inner.y + inner.h;

/** Route `edges` between `items`, using `rects` (default: the items' own rects) and treating every visible item as a label obstacle. */
export function routeItems(items: Item[], edges: EdgeSpec[], rects?: Record<string, Rect>): RoutedEdge[] {
  const own = rects ?? Object.fromEntries(items.map((i) => [i.id, i.rect]));
  const shapes: Record<string, Shape> = {}, solids: Record<string, Rect> = {};
  for (const it of items) {
    if (it.kind === "node") shapes[it.id] = it.shape;
    if (SOLID.has(it.kind) && own[it.id]) solids[it.id] = own[it.id];
  }
  return routeEdges(own, edges, { shapes, solids });
}

/** Edges meet these shapes at a side's midpoint (a vertex or the apex), never spread along it. */
const isVertexShape = (s?: Shape) => s === "diamond" || s === "triangle";

/** Point on the outline of `r` (drawn as `shape`) from its centre toward `target`. */
function outline(shape: Shape | undefined, r: Rect, target: Pt): Pt {
  const c = centre(r), hw = r.w / 2, hh = r.h / 2;
  const dx = target.x - c.x, dy = target.y - c.y;
  if (dx === 0 && dy === 0) return c;
  let s: number;
  switch (shape) {
    case "circle": {
      const rad = Math.min(hw, hh);
      s = rad / Math.hypot(dx, dy);
      break;
    }
    case "diamond":
      s = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
      break;
    case "triangle":
      // flat top at -hh, apex at +hh; the slant has half-width hw * (hh - y) / (2 hh)
      if (dy < 0 && (Math.abs(dx) * hh) / -dy <= hw) s = hh / -dy;
      else s = hw / 2 / (Math.abs(dx) + (hw * dy) / (2 * hh));
      break;
    default:
      s = Math.min(Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity);
      return onOutline(shape, r, { x: c.x + dx * s, y: c.y + dy * s });
  }
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/** Corner radius of a rounded-rect outline: a pill is all corner. Matches the renderer. */
const cornerRadius = (shape: Shape | undefined, r: Rect) =>
  shape === "pill" ? Math.min(r.w, r.h) / 2 : shape === "box" ? Math.min(RADIUS.node, r.w / 2, r.h / 2) : 0;

/** Move a port chosen on the bounding box onto the drawn outline, along the side's inward normal, so a line always touches its shape. */
function onOutline(shape: Shape | undefined, r: Rect, p: Pt): Pt {
  if (shape === "circle") return outline(shape, r, p);
  if (shape === "triangle") {
    if (Math.abs(p.x - (r.x + r.w / 2)) <= 0.5) return p;
    const half = (r.w / 2) * (1 - (p.y - r.y) / r.h);
    return { x: r.x + r.w / 2 + Math.sign(p.x - r.x - r.w / 2) * half, y: p.y };
  }
  const x1 = r.x + r.w, y1 = r.y + r.h;
  const top = Math.abs(p.y - r.y) < 0.01, bottom = Math.abs(p.y - y1) < 0.01;
  if (shape === "cylinder") {
    if (!top && !bottom) return p;
    const u = (p.x - (r.x + r.w / 2)) / (r.w / 2), ry = NODE.cap / 2;
    const d = ry * (1 - Math.sqrt(Math.max(0, 1 - u * u)));
    return { x: p.x, y: top ? p.y + d : p.y - d };
  }
  const rad = cornerRadius(shape, r);
  if (!rad) return p;
  const depth = (off: number) => (off > 0 ? rad - Math.sqrt(Math.max(0, rad * rad - off * off)) : 0);
  if (top || bottom) {
    const d = depth(Math.max(r.x + rad - p.x, p.x - (x1 - rad)));
    return { x: p.x, y: top ? p.y + d : p.y - d };
  }
  const left = Math.abs(p.x - r.x) < 0.01, right = Math.abs(p.x - x1) < 0.01;
  if (!left && !right) return p;
  const d = depth(Math.max(r.y + rad - p.y, p.y - (y1 - rad)));
  return { x: left ? p.x + d : p.x - d, y: p.y };
}

export interface Pt {
  x: number;
  y: number;
}

export interface RoutedEdge {
  spec: EdgeSpec;
  d: string;
  /** sampled polyline, for tokens and labels */
  pts: Pt[];
  len: number;
  /** travel direction (radians) at the start and end, for chevrons */
  startAngle: number;
  endAngle: number;
  label?: Pt;
}

const NORMAL: Record<Side, Pt> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
const horizontal = (s: Side) => s === "left" || s === "right";
const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

/** Point on `side` of `r` at coordinate `u` along that side's axis. */
function sidePoint(r: Rect, side: Side, u: number): Pt {
  switch (side) {
    case "top":
      return { x: u, y: r.y };
    case "bottom":
      return { x: u, y: r.y + r.h };
    case "left":
      return { x: r.x, y: u };
    case "right":
      return { x: r.x + r.w, y: u };
  }
}
const sideSpan = (r: Rect, side: Side): [number, number] =>
  horizontal(side) ? [r.y, r.y + r.h] : [r.x, r.x + r.w];
const centre = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

function autoSides(a: Rect, b: Rect): [Side, Side] {
  const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  const ca = centre(a), cb = centre(b);
  if (gx >= gy) return cb.x >= ca.x ? ["right", "left"] : ["left", "right"];
  return cb.y >= ca.y ? ["bottom", "top"] : ["top", "bottom"];
}

export function pathLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return l;
}

/** Point at fraction `t` (0..1) of the polyline's arc length. */
export function pointAt(pts: Pt[], t: number): Pt {
  if (pts.length === 1) return pts[0];
  const total = pathLength(pts);
  let target = Math.min(1, Math.max(0, t)) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (target <= seg || i === pts.length - 1) {
      const u = seg === 0 ? 0 : Math.min(1, target / seg);
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u };
    }
    target -= seg;
  }
  return pts[pts.length - 1];
}

const cubic = (p0: Pt, c1: Pt, c2: Pt, p1: Pt, n = 32): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
    };
  });
const quad = (p0: Pt, c: Pt, p1: Pt, n = 24): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });

const P = (p: Pt) => `${r2(p.x)},${r2(p.y)}`;

/** Polyline with rounded corners as an SVG path. */
function roundedPath(pts: Pt[], radius: number): string {
  let d = `M${P(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], c = pts[i], b = pts[i + 1];
    const la = Math.hypot(c.x - a.x, c.y - a.y), lb = Math.hypot(b.x - c.x, b.y - c.y);
    const r = Math.min(radius, la / 2, lb / 2);
    if (r < 0.5) {
      d += ` L${P(c)}`;
      continue;
    }
    const inPt = { x: c.x - ((c.x - a.x) / la) * r, y: c.y - ((c.y - a.y) / la) * r };
    const outPt = { x: c.x + ((b.x - c.x) / lb) * r, y: c.y + ((b.y - c.y) / lb) * r };
    d += ` L${P(inPt)} Q${P(c)} ${P(outPt)}`;
  }
  return `${d} L${P(pts[pts.length - 1])}`;
}

const angleOf = (a: Pt, b: Pt) => Math.atan2(b.y - a.y, b.x - a.x);

interface Port {
  side: Side;
  /** coordinate along the side axis */
  u: number;
}

function buildPath(spec: EdgeSpec, a: Rect, b: Rect, pa: Port, pb: Port, shapes: Record<string, Shape>): Omit<RoutedEdge, "spec" | "label"> {
  let p0 = onOutline(shapes[spec.from], a, sidePoint(a, pa.side, pa.u));
  let p1 = onOutline(shapes[spec.to], b, sidePoint(b, pb.side, pb.u));
  const n0 = NORMAL[pa.side], n1 = NORMAL[pb.side];

  let mode = spec.route;
  if (mode === "auto") {
    const aligned = horizontal(pa.side) ? Math.abs(p0.y - p1.y) < 0.5 : Math.abs(p0.x - p1.x) < 0.5;
    mode = aligned && pb.side === OPPOSITE[pa.side] ? "straight" : "curve";
  }
  let pts: Pt[];
  let d: string;
  switch (mode) {
    case "straight":
      pts = [p0, p1];
      d = `M${P(p0)} L${P(p1)}`;
      break;
    case "ortho": {
      const r = RADIUS.corner;
      let poly: Pt[];
      if (pb.side === OPPOSITE[pa.side]) {
        const aligned = horizontal(pa.side) ? Math.abs(p0.y - p1.y) < 0.5 : Math.abs(p0.x - p1.x) < 0.5;
        if (aligned) poly = [p0, p1];
        else if (horizontal(pa.side)) {
          const mx = (p0.x + p1.x) / 2;
          poly = [p0, { x: mx, y: p0.y }, { x: mx, y: p1.y }, p1];
        } else {
          const my = (p0.y + p1.y) / 2;
          poly = [p0, { x: p0.x, y: my }, { x: p1.x, y: my }, p1];
        }
      } else if (pb.side === pa.side) {
        // both ports face the same way: run a channel 24px out, on the further side
        const out = 24;
        const pick = n0.x + n0.y > 0 ? Math.max : Math.min;
        if (horizontal(pa.side)) {
          const cx = pick(p0.x, p1.x) + n0.x * out;
          poly = [p0, { x: cx, y: p0.y }, { x: cx, y: p1.y }, p1];
        } else {
          const cy = pick(p0.y, p1.y) + n0.y * out;
          poly = [p0, { x: p0.x, y: cy }, { x: p1.x, y: cy }, p1];
        }
      } else {
        poly = horizontal(pa.side) ? [p0, { x: p1.x, y: p0.y }, p1] : [p0, { x: p0.x, y: p1.y }, p1];
      }
      pts = poly;
      d = roundedPath(poly, r);
      break;
    }
    case "arc": {
      const c0 = centre(a), c1 = centre(b);
      const dx = c1.x - c0.x, dy = c1.y - c0.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const bend = spec.bend ?? 0;
      const ctrl = { x: (c0.x + c1.x) / 2 + nx * bend, y: (c0.y + c1.y) / 2 + ny * bend };
      p0 = outline(shapes[spec.from], a, ctrl);
      p1 = outline(shapes[spec.to], b, ctrl);
      pts = quad(p0, ctrl, p1);
      d = `M${P(p0)} Q${P(ctrl)} ${P(p1)}`;
      break;
    }
    default: {
      // tangent length follows the gap along the exit normal; same-side
      // curves have none, so they bow by the distance across instead
      const tangent = (p: Pt, q: Pt, n: Pt) => {
        const along = Math.abs((q.x - p.x) * n.x + (q.y - p.y) * n.y);
        const across = Math.abs((q.x - p.x) * n.y) + Math.abs((q.y - p.y) * n.x);
        return Math.max(24, Math.min(120, Math.max(along * 0.5, across * 0.25)));
      };
      const dist0 = tangent(p0, p1, n0);
      const dist1 = tangent(p1, p0, n1);
      const c1 = { x: p0.x + n0.x * dist0, y: p0.y + n0.y * dist0 };
      const c2 = { x: p1.x + n1.x * dist1, y: p1.y + n1.y * dist1 };
      pts = cubic(p0, c1, c2, p1);
      d = `M${P(p0)} C${P(c1)} ${P(c2)} ${P(p1)}`;
    }
  }
  return {
    d,
    pts,
    len: pathLength(pts),
    startAngle: angleOf(pts[1] ?? p1, p0),
    endAngle: angleOf(pts[pts.length - 2] ?? p0, p1),
  };
}

function selfLoop(spec: EdgeSpec, r: Rect, shape: Shape | undefined): Omit<RoutedEdge, "spec" | "label"> {
  const side = spec.loop ?? "top";
  const n = NORMAL[side];
  const t = { x: -n.y, y: n.x };
  const c = centre(r);
  const half = (horizontal(side) ? r.w : r.h) / 2;
  const base = { x: c.x + n.x * half, y: c.y + n.y * half };
  const spread = 11, out = 34;
  let p0 = { x: base.x - t.x * spread, y: base.y - t.y * spread };
  let p1 = { x: base.x + t.x * spread, y: base.y + t.y * spread };
  if (shape === "circle") {
    p0 = outline(shape, r, p0);
    p1 = outline(shape, r, p1);
  }
  const c1 = { x: p0.x + n.x * out - t.x * 16, y: p0.y + n.y * out - t.y * 16 };
  const c2 = { x: p1.x + n.x * out + t.x * 16, y: p1.y + n.y * out + t.y * 16 };
  const pts = cubic(p0, c1, c2, p1);
  return {
    d: `M${P(p0)} C${P(c1)} ${P(c2)} ${P(p1)}`,
    pts,
    len: pathLength(pts),
    startAngle: angleOf(pts[1], p0),
    endAngle: angleOf(pts[pts.length - 2], p1),
  };
}

/**
 * Route every edge. Ports on a shared side are spread evenly along it,
 * ordered by the other endpoint's position, so fan-outs never stack.
 */
export function routeEdges(rects: Record<string, Rect>, edges: EdgeSpec[], opts: RouteOpts = {}): RoutedEdge[] {
  const shapes = opts.shapes ?? {};
  const solids = opts.solids ?? {};
  type Pending = { spec: EdgeSpec; a: Rect; b: Rect; pa: Port; pb: Port };
  const pending: (Pending | null)[] = [];
  const groups = new Map<string, { i: number; end: "a" | "b"; other: number }[]>();

  edges.forEach((spec, i) => {
    const a = rects[spec.from], b = rects[spec.to];
    if (!a || !b) {
      pending.push(null);
      return;
    }
    if (spec.from === spec.to) {
      pending.push({ spec, a, b, pa: { side: "top", u: 0 }, pb: { side: "top", u: 0 } });
      return;
    }
    const auto = autoSides(a, b);
    const sa = spec.fromSide ?? auto[0];
    const sb = spec.toSide ?? auto[1];
    // default port: the middle of the facing spans' overlap, else the side
    // centre; ortho elbows and vertex shapes always use the centre
    const [a0, a1] = sideSpan(a, sa), [b0, b1] = sideSpan(b, sb);
    const lo = Math.max(a0, b0), hi = Math.min(a1, b1);
    const facing = spec.route !== "ortho" && sb === OPPOSITE[sa] && lo < hi;
    const va = isVertexShape(shapes[spec.from]), vb = isVertexShape(shapes[spec.to]);
    const ua = facing && !va ? (lo + hi) / 2 : (a0 + a1) / 2;
    const ub = facing && !vb ? (lo + hi) / 2 : (b0 + b1) / 2;
    pending.push({ spec, a, b, pa: { side: sa, u: ua }, pb: { side: sb, u: ub } });
    const cb = centre(b), ca = centre(a);
    const push = (key: string, end: "a" | "b", other: number) => {
      const g = groups.get(key) ?? [];
      g.push({ i, end, other });
      groups.set(key, g);
    };
    if (!va) push(`${spec.from}:${sa}`, "a", horizontal(sa) ? cb.y : cb.x);
    if (!vb) push(`${spec.to}:${sb}`, "b", horizontal(sb) ? ca.y : ca.x);
  });

  for (const g of groups.values()) {
    if (g.length < 2) continue;
    g.sort((p, q) => p.other - q.other || p.i - q.i);
    g.forEach(({ i, end }, k) => {
      const e = pending[i]!;
      const port = end === "a" ? e.pa : e.pb;
      const [s0, s1] = sideSpan(end === "a" ? e.a : e.b, port.side);
      const inset = Math.min(PORT_INSET, (s1 - s0) / 4);
      port.u = s0 + inset + ((s1 - s0 - 2 * inset) * (k + 0.5)) / g.length;
    });
  }

  const fan = (key: string) => (groups.get(key)?.length ?? 0) > 1;
  return pending.flatMap((e) => {
    if (!e) return [];
    const base = e.spec.from === e.spec.to ? selfLoop(e.spec, e.a, shapes[e.spec.from]) : buildPath(e.spec, e.a, e.b, e.pa, e.pb, shapes);
    let label: Pt | undefined;
    if (e.spec.label && e.spec.from === e.spec.to) label = loopLabel(e.spec, base.pts);
    else if (e.spec.label) {
      // sit away from the end where edges converge, so fan labels never stack
      const out = fan(`${e.spec.from}:${e.pa.side}`), inn = fan(`${e.spec.to}:${e.pb.side}`);
      label = labelPoint(e.spec, base.pts, e.a, e.b, solids, out && !inn ? 0.65 : inn && !out ? 0.35 : 0.5);
    }
    return [{ ...base, spec: e.spec, label }];
  });
}

/** A self-loop's label sits just beyond the loop's apex along the loop side's normal, its pill clear of the line. */
function loopLabel(spec: EdgeSpec, pts: Pt[]): Pt {
  const side = spec.loop ?? "top", n = NORMAL[side];
  const apex = pointAt(pts, 0.5);
  const half = horizontal(side) ? labelPillW(spec.label ?? "") / 2 : EDGE_LABEL.h / 2;
  return { x: apex.x + n.x * (half + EDGE_LABEL.loopGap), y: apex.y + n.y * (half + EDGE_LABEL.loopGap) };
}

const densify = (pts: Pt[], step = 4): Pt[] => {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
};
const inside = (p: Pt, r: Rect, slack = 1) => p.x > r.x + slack && p.x < r.x + r.w - slack && p.y > r.y + slack && p.y < r.y + r.h - slack;

/**
 * Label anchor: fraction `t` along the longest run of the path that is outside
 * every solid item, pulled back so the pill clears both ends of that run when
 * it is long enough. Endpoints and anything enclosing both endpoints (their
 * shared ancestors) are not obstacles.
 */
function labelPoint(spec: EdgeSpec, pts: Pt[], a: Rect, b: Rect, solids: Record<string, Rect>, t: number): Pt {
  const obstacles = Object.entries(solids)
    .filter(([id, r]) => id !== spec.from && id !== spec.to && !(encloses(r, a) && encloses(r, b)))
    .map(([, r]) => r);
  let best: Pt[] = [], run: Pt[] = [];
  const flush = () => {
    if (pathLength(run) > pathLength(best)) best = run;
    run = [];
  };
  for (const p of densify(pts)) {
    if (obstacles.some((r) => inside(p, r))) flush();
    else run.push(p);
  }
  flush();
  const on = best.length > 1 ? best : pts;
  const len = pathLength(on), half = labelPillW(spec.label ?? "") / 2 + EDGE_LABEL.loopGap;
  const at = len > 2 * half ? Math.min(len - half, Math.max(half, t * len)) : len / 2;
  return pointAt(on, at / len);
}
