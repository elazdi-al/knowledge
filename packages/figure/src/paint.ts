/** Building blocks of a mark's `paint`: token colours, how a state looks, and shorthands for ops. */
import type { Op, Point, Rect, State, Style, Tone } from "./model";
import { measureStyle } from "./measure";
import { NODE, STROKE, TEXT, r2, type TextStyle } from "./theme";

export const V = (name: string) => `var(--dg-${name})`;
export const tint = (t: Tone) => V(`${t}-tint`);
export const line = (t: Tone) => V(`${t}-line`);
export const solid = (t: Tone) => V(`${t}-solid`);
export const ink = (t: Tone) => V(`${t}-ink`);
/** The accent ("this one") is the blue tone. */
export const ACCENT: Tone = "blue";
/** The tone an item shows: `active` means the accent. */
export const shownTone = (state: State, tone?: Tone) => (state === "active" ? ACCENT : tone);

export interface Look {
  fill: string;
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  text: string;
  sub: string;
  italic: boolean;
}

/** How an item in `state` (and optional `tone`) is painted, given its own fill and neutral border. */
export function lookOf(state: State, uid: string, fill: string, tone?: Tone, edge = V("panel-edge")): Look {
  const base: Look = { fill, stroke: edge, strokeWidth: STROKE.border, dashed: false, text: V("ink"), sub: V("muted"), italic: false };
  const toned = (t: Tone): Look => ({ ...base, fill: tint(t), stroke: line(t), text: ink(t), sub: ink(t) });
  switch (state) {
    case "active":
      return toned(ACCENT);
    case "strong":
      return { ...(tone ? toned(tone) : base), stroke: tone ? solid(tone) : V("text"), strokeWidth: STROKE.strong };
    case "placeholder":
      return { ...base, fill: "none", stroke: V("rule"), dashed: true, text: V("muted"), italic: true };
    case "free":
      return { ...base, fill: `url(#${uid}-hatch)`, stroke: V("rule"), dashed: true, text: V("muted") };
    case "ghost":
      return { ...base, fill: "none", stroke: V("faint"), text: V("faint"), sub: V("faint") };
    default:
      return tone ? toned(tone) : base;
  }
}

export const shapeStyle = (l: Look): Style => ({
  fill: l.fill,
  stroke: l.stroke,
  strokeWidth: l.strokeWidth,
  strokeDasharray: l.dashed ? STROKE.dash : undefined,
});

/** Strip look: data structures are light surfaces with a rule border wherever they sit. */
export function stripLook(state: State, uid: string): Look {
  const l = lookOf(state, uid, V("surface"));
  return state === "default" ? { ...l, stroke: V("rule") } : l;
}

/** Fill behind a cell or row: its state's fill, else its tone's tint, else nothing. */
export function partFill(c: { state: State; tone?: Tone }, uid: string): string {
  if (c.state === "default") return c.tone ? tint(c.tone) : "none";
  return lookOf(c.state, uid, "none", c.tone).fill;
}

/** Paint order for per-cell and per-row outlines: a shared divider is owned by the state painted last. */
const OUTLINE_ORDER: Record<State, number> = { default: 0, ghost: 1, placeholder: 2, free: 3, active: 4, strong: 5 };
export const byOutline = (a: { state: State }, b: { state: State }) => OUTLINE_ORDER[a.state] - OUTLINE_ORDER[b.state];

export const rect = (r: Rect, style?: Style, rx?: number): Op => ({ el: "rect", x: r2(r.x), y: r2(r.y), width: r2(r.w), height: r2(r.h), rx, style });
export const group = (...kids: Op[]): Op => ({ el: "g", kids });
export const hLine = (x1: number, x2: number, y: number, style: Style): Op => ({ el: "line", x1: r2(x1), x2: r2(x2), y1: r2(y), y2: r2(y), style });
export const clipIdOf = (uid: string, id: string) => `${uid}-${id.replace(/[^a-z0-9_-]/gi, "_")}`;
export const polygonPoints = (pts: number[][]) => pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ");
/** Text op props for `text` in a text role; pair with `measureStyle` so layout and paint agree. */
export const styled = (text: string, s: TextStyle) => ({ text, size: s.size, weight: s.weight, mono: s.mono });

const corner = (r: number, x: number, y: number) => (r > 0 ? `A${r2(r)},${r2(r)} 0 0 1 ${r2(x)},${r2(y)}` : `L${r2(x)},${r2(y)}`);
/** Rect path with one radius per corner (top-left, top-right, bottom-right, bottom-left). */
function cornerPath(r: Rect, [tl, tr, br, bl]: number[]): string {
  const x1 = r.x + r.w, y1 = r.y + r.h;
  return [
    `M${r2(r.x + tl)},${r2(r.y)}`,
    `L${r2(x1 - tr)},${r2(r.y)}`,
    corner(tr, x1, r.y + tr),
    `L${r2(x1)},${r2(y1 - br)}`,
    corner(br, x1 - br, y1),
    `L${r2(r.x + bl)},${r2(y1)}`,
    corner(bl, r.x, y1 - bl),
    `L${r2(r.x)},${r2(r.y + tl)}`,
    corner(tl, r.x + tl, r.y),
    "Z",
  ].join(" ");
}

/** A stated cell's or row's outline, painted over the strip frame and dividers; rounded where it shares the frame's corners. */
export function stateOutline(c: { state: State; tone?: Tone; rect: Rect }, frame: Rect, rx: number, uid: string): Op[] {
  if (c.state === "default") return [];
  const r = c.rect;
  const eq = (a: number, b: number) => Math.abs(a - b) < 0.5;
  const left = eq(r.x, frame.x), right = eq(r.x + r.w, frame.x + frame.w);
  const top = eq(r.y, frame.y), bottom = eq(r.y + r.h, frame.y + frame.h);
  const radii = [left && top ? rx : 0, right && top ? rx : 0, right && bottom ? rx : 0, left && bottom ? rx : 0];
  return [{ el: "path", d: cornerPath(r, radii), style: { ...shapeStyle(lookOf(c.state, uid, "none", c.tone)), fill: "none" } }];
}

/** An open arrowhead at `tip` for a line arriving at `angle` radians: left leg, tip, right leg. */
export function chevron([x, y]: Point, angle: number, size: number): Point[] {
  const a = 0.62;
  return [[x - size * Math.cos(angle - a), y - size * Math.sin(angle - a)], [x, y], [x - size * Math.cos(angle + a), y - size * Math.sin(angle + a)]];
}
/** A polyline as path data. */
export const polyline = (pts: Point[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${r2(x)},${r2(y)}`).join(" ");

/** Small chip centred on a node's or group's top edge. */
export function badge(text: string, tone: Tone | undefined, cx: number, y: number): Op {
  const s = NODE.badge;
  const w = Math.max(s, measureStyle(text, TEXT.badge) + 10);
  return group(
    {
      el: "rect",
      x: r2(cx - w / 2),
      y: r2(y - s / 2),
      width: r2(w),
      height: s,
      rx: s / 2,
      style: { fill: tone ? tint(tone) : V("surface"), stroke: tone ? line(tone) : V("rule"), strokeWidth: STROKE.border },
    },
    { el: "text", x: cx, y, ...styled(text, TEXT.badge), fill: tone ? ink(tone) : V("text") },
  );
}
