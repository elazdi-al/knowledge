/** Geometry placed by its own coordinates inside a `Canvas`, and room for a layout to leave. */
import { COMMON, mark, type Common, type Marker } from "../mark";
import { createElement, type ReactNode } from "react";
import type { Op, Placed, Point, PropTable, Style } from "../model";
import { chevron, line, polyline, shownTone, solid, tint, V } from "../paint";
import { DOT_R, STROKE, r2 } from "../theme";

export interface SpaceProps extends Common {
  w?: number;
  h?: number;
}

export const Space: Marker<SpaceProps> = mark<SpaceProps, { w: number; h: number }>({
  kind: "space",
  props: { ...COMMON, w: "number", h: "number" },
  data: (p) => ({ w: p.w ?? 0, h: p.h ?? 0 }),
  size: ({ data }) => data,
});

type Pts = Point[];
/** Canvas marks default to a tone's colours; `fill`, `stroke` and `opacity` take any CSS value. */
interface Drawn extends Pick<Common, "id" | "state" | "tone"> {
  fill?: string;
  stroke?: string;
  opacity?: number;
}
const DRAWN: PropTable<Drawn> = { id: true, state: COMMON.state, tone: COMMON.tone, fill: true, stroke: true, opacity: "number" };
const custom = (p: Drawn) => ({ fill: p.fill, stroke: p.stroke, opacity: p.opacity });
type Custom = ReturnType<typeof custom>;
/** A style with the author's overrides on top. */
const over = (style: Style, c: Custom): Style => ({ ...style, fill: c.fill ?? style.fill, stroke: c.stroke ?? style.stroke, opacity: c.opacity });

const originOf = (pts: Pts): Point => [Math.min(...pts.map(([x]) => x)), Math.min(...pts.map(([, y]) => y))];
const fromOrigin = (pts: Pts): Pts => {
  const [ox, oy] = originOf(pts);
  return pts.map(([x, y]) => [x - ox, y - oy]);
};
const extent = (pts: Pts) => ({ w: Math.max(0, ...pts.map(([x]) => x)), h: Math.max(0, ...pts.map(([, y]) => y)) });

/** A filled polygon inside a `Canvas`, its points in the `Canvas`'s coordinates; a background, so edges and labels may cross it. `outline` draws its border in the tone's line. */
export interface PolyProps extends Drawn {
  points: Pts;
  outline?: boolean;
}

export const Poly: Marker<PolyProps> = mark<PolyProps, Custom & { points: Pts; outline: boolean }>({
  kind: "poly",
  props: { ...DRAWN, points: true, outline: true },
  data: (p) => ({ ...custom(p), points: fromOrigin(p.points ?? []), outline: p.outline === true }),
  origin: (p) => originOf(p.points ?? []),
  size: ({ data }) => extent(data.points),
  /** A tinted surface; without `outline`, a canvas-coloured seam keeps adjacent polygons apart. */
  paint(it) {
    const r = it.rect;
    const tone = shownTone(it.state, it.tone);
    return [
      {
        el: "polygon",
        points: it.data.points.map(([x, y]) => `${r2(r.x + x)},${r2(r.y + y)}`).join(" "),
        style: over({ fill: tone ? tint(tone) : V("panel"), stroke: it.data.outline ? (tone ? line(tone) : V("panel-edge")) : V("canvas"), strokeWidth: STROKE.border, strokeLinejoin: "round" }, it.data),
      },
    ];
  },
});

/** A stroked polyline inside a `Canvas`, its points in the `Canvas`'s coordinates: ink when `strong`, the tone's solid when toned, else the edge grey. */
export interface PathProps extends Drawn {
  points: Pts;
  /** join the last point back to the first */
  closed?: boolean;
  dashed?: boolean;
  /** a 1px hairline, for grids and contours */
  thin?: boolean;
  thick?: boolean;
  /** arrowheads: `end` at the last point, `both` at the first as well */
  head?: "none" | "end" | "both";
}

interface PathData extends Custom {
  /** the line, then each arrowhead, relative to the mark's top-left */
  points: Pts;
  heads: Pts[];
  closed: boolean;
  dashed: boolean;
  width: number;
}

function headsOf({ points: pts, head = "none", thin, thick }: PathProps): Pts[] {
  if (pts.length < 2 || head === "none") return [];
  const width = thin === true ? STROKE.border : thick === true ? STROKE.thick : STROKE.edge;
  const size = STROKE.head * Math.sqrt(width / STROKE.edge);
  const arriving = (from: Point, tip: Point) => chevron(tip, Math.atan2(tip[1] - from[1], tip[0] - from[0]), size);
  const end = arriving(pts[pts.length - 2], pts[pts.length - 1]);
  return head === "both" ? [end, arriving(pts[1], pts[0])] : [end];
}
/** Everything the mark draws, so arrowheads count toward its box. */
const drawnPoints = (p: PathProps) => [...(p.points ?? []), ...headsOf(p).flat()];

export const Path: Marker<PathProps> = mark<PathProps, PathData>({
  kind: "path",
  props: { ...DRAWN, points: true, closed: true, dashed: true, thin: true, thick: true, head: ["none", "end", "both"] },
  data(p) {
    const [ox, oy] = originOf(drawnPoints(p));
    const rel = (pts: Pts): Pts => pts.map(([x, y]) => [x - ox, y - oy]);
    return {
      ...custom(p),
      points: rel(p.points ?? []),
      heads: headsOf(p).map(rel),
      closed: p.closed === true,
      dashed: p.dashed === true,
      width: p.thin === true ? STROKE.border : p.thick === true ? STROKE.thick : STROKE.edge,
    };
  },
  origin: (p) => originOf(drawnPoints(p)),
  size: ({ data }) => extent([...data.points, ...data.heads.flat()]),
  paint(it) {
    const r = it.rect;
    const d = it.data;
    const tone = shownTone(it.state, it.tone);
    const colour = it.state === "ghost" ? V("faint") : tone ? solid(tone) : it.state === "strong" ? V("text") : V("line");
    const placed = (pts: Pts): Pts => pts.map(([x, y]) => [r.x + x, r.y + y]);
    const style = (dash?: string) => over({ fill: "none", stroke: colour, strokeWidth: d.width, strokeDasharray: dash, strokeLinecap: "round", strokeLinejoin: "round" }, d);
    return [
      { el: "path", d: polyline(placed(d.points)) + (d.closed ? " Z" : ""), style: style(d.dashed ? STROKE.dash : undefined) },
      ...d.heads.map((h) => ({ el: "path" as const, d: polyline(placed(h)), style: style() })),
    ];
  },
});

/** A straight segment between two points of a `Canvas`; `head` makes it an arrow. For a line between marks, use `Edge`. */
export interface LineProps extends Omit<PathProps, "points" | "closed"> {
  from: Point;
  to: Point;
}
export const Line = ({ from, to, ...path }: LineProps) => createElement(Path, { points: [from, to], ...path });

/** `n` segments of the circle around `c` from angle `a0` to `a1`, in degrees clockwise from east; for `Path` and `Poly`. */
export const arc = ([cx, cy]: Point, r: number, a0: number, a1: number, n = 48): Pts =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

/** A round surface around a point of a `Canvas`. Toned or set by `fill` and `stroke`; `opacity` lets shapes show through each other. */
export interface EllipseProps extends Drawn {
  at: Point;
  rx: number;
  ry: number;
}
export type CircleProps = Omit<EllipseProps, "rx" | "ry"> & { r: number };

const round = (kind: string) => ({
  kind,
  /** A background like `Poly`, so edges and labels may cross it. */
  paint(it: Placed<Custom & { rx: number; ry: number }>): Op[] {
    const r = it.rect;
    const tone = shownTone(it.state, it.tone);
    const ghost = it.state === "ghost";
    return [
      {
        el: "ellipse",
        cx: r2(r.x + r.w / 2),
        cy: r2(r.y + r.h / 2),
        rx: r2(it.data.rx),
        ry: r2(it.data.ry),
        style: over({ fill: ghost ? "none" : tone ? tint(tone) : V("panel"), stroke: ghost ? V("faint") : tone ? line(tone) : V("panel-edge"), strokeWidth: STROKE.border }, it.data),
      },
    ];
  },
  size: ({ data }: { data: { rx: number; ry: number } }) => ({ w: 2 * data.rx, h: 2 * data.ry }),
});

export const Ellipse: Marker<EllipseProps> = mark<EllipseProps, Custom & { rx: number; ry: number }>({
  ...round("ellipse"),
  props: { ...DRAWN, at: true, rx: "number", ry: "number" },
  data: (p) => ({ ...custom(p), rx: p.rx, ry: p.ry }),
});

export const Circle: Marker<CircleProps> = mark<CircleProps, Custom & { rx: number; ry: number }>({
  ...round("circle"),
  props: { ...DRAWN, at: true, r: "number" },
  data: (p) => ({ ...custom(p), rx: p.r, ry: p.r }),
});

/** A filled data point centred `at` a point of its `Canvas`. */
export interface DotProps extends Drawn {
  at: Point;
  r?: number;
}

export const Dot: Marker<DotProps> = mark<DotProps, Custom & { r: number }>({
  kind: "dot",
  props: { ...DRAWN, at: true, r: "number" },
  data: (p) => ({ ...custom(p), r: p.r ?? DOT_R }),
  size: ({ data }) => ({ w: 2 * data.r, h: 2 * data.r }),
  /** A canvas-coloured ring keeps a point legible where it sits on a line or touches another point. */
  paint(it) {
    const r = it.rect;
    const tone = shownTone(it.state, it.tone);
    return [
      {
        el: "circle",
        cx: r2(r.x + r.w / 2),
        cy: r2(r.y + r.h / 2),
        r: r2(it.data.r),
        style: over({ fill: it.state === "ghost" ? V("faint") : tone ? solid(tone) : V("text"), stroke: V("canvas"), strokeWidth: STROKE.border }, it.data),
      },
    ];
  },
});

/** Raw SVG elements in a box of `w` by `h`, the box's top-left as their origin. It takes part in layout, gaps and edges like any mark. */
export interface SvgProps extends Common {
  w: number;
  h: number;
  children?: ReactNode;
}

export const Svg: Marker<SvgProps> = mark<SvgProps, { w: number; h: number; node: ReactNode }>({
  kind: "svg",
  solid: true,
  props: { ...COMMON, w: "number", h: "number", children: true },
  data: (p) => ({ w: p.w, h: p.h, node: p.children }),
  size: ({ data }) => ({ w: data.w, h: data.h }),
  paint: (it) => [{ el: "raw", x: r2(it.rect.x), y: r2(it.rect.y), node: it.data.node }],
});
