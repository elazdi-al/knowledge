/** Geometry placed by its own coordinates inside a `Canvas`, and room for a layout to leave. */
import { COMMON, mark, type Common, type Marker } from "../mark";
import type { Point, PropTable } from "../model";
import { line, shownTone, solid, tint, V } from "../paint";
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
type Drawn = Pick<Common, "id" | "state" | "tone">;
const DRAWN: PropTable<Drawn> = { id: true, state: COMMON.state, tone: COMMON.tone };

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

export const Poly: Marker<PolyProps> = mark<PolyProps, { points: Pts; outline: boolean }>({
  kind: "poly",
  props: { ...DRAWN, points: true, outline: true },
  data: (p) => ({ points: fromOrigin(p.points ?? []), outline: p.outline === true }),
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
        style: { fill: tone ? tint(tone) : V("panel"), stroke: it.data.outline ? (tone ? line(tone) : V("panel-edge")) : V("canvas"), strokeWidth: STROKE.border, strokeLinejoin: "round" },
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
}

export const Path: Marker<PathProps> = mark<PathProps, { points: Pts; closed: boolean; dashed: boolean; width: number }>({
  kind: "path",
  props: { ...DRAWN, points: true, closed: true, dashed: true, thin: true, thick: true },
  data: (p) => ({
    points: fromOrigin(p.points ?? []),
    closed: p.closed === true,
    dashed: p.dashed === true,
    width: p.thin === true ? STROKE.border : p.thick === true ? STROKE.thick : STROKE.edge,
  }),
  origin: (p) => originOf(p.points ?? []),
  size: ({ data }) => extent(data.points),
  paint(it) {
    const r = it.rect;
    const d = it.data;
    const tone = shownTone(it.state, it.tone);
    const colour = it.state === "ghost" ? V("faint") : tone ? solid(tone) : it.state === "strong" ? V("text") : V("line");
    return [
      {
        el: "path",
        d: d.points.map(([x, y], i) => `${i ? "L" : "M"}${r2(r.x + x)},${r2(r.y + y)}`).join(" ") + (d.closed ? " Z" : ""),
        style: { fill: "none", stroke: colour, strokeWidth: d.width, strokeDasharray: d.dashed ? STROKE.dash : undefined, strokeLinecap: "round", strokeLinejoin: "round" },
      },
    ];
  },
});

/** A filled data point centred `at` a point of its `Canvas`. */
export interface DotProps extends Drawn {
  at: Point;
  r?: number;
}

export const Dot: Marker<DotProps> = mark<DotProps, { r: number }>({
  kind: "dot",
  props: { ...DRAWN, at: true, r: "number" },
  data: (p) => ({ r: p.r ?? DOT_R }),
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
        style: { fill: it.state === "ghost" ? V("faint") : tone ? solid(tone) : V("text"), stroke: V("canvas"), strokeWidth: STROKE.border },
      },
    ];
  },
});
