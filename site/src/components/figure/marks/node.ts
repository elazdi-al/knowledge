import { COMMON, mark, type Common, type Marker } from "../mark";
import { measure, measureStyle } from "../measure";
import type { Op, Rect, Shape, State, Tone } from "../model";
import { SHAPES } from "../model";
import { badge, hLine, lookOf, polygonPoints, rect, shapeStyle, V } from "../paint";
import { FONT, NODE, RADIUS, STROKE, r2, type TextStyle } from "../theme";

export interface NodeProps extends Common {
  title?: string;
  sub?: string;
  mono?: boolean;
  badge?: string;
  shape?: Shape;
  /** second outline inset 4px (circle, box, diamond) */
  double?: boolean;
  /** rule under the title (ER key / partial key) */
  underline?: "solid" | "dashed";
  w?: number;
  h?: number;
  align?: "start" | "center";
}
interface NodeData {
  title?: string;
  sub?: string;
  mono: boolean;
  badge?: string;
  shape: Shape;
  double: boolean;
  underline?: "solid" | "dashed";
  w?: number;
  h?: number;
  align: "start" | "center";
}

type TitleOf = { mono?: boolean; state: State; shape: Shape; tone?: Tone };
/** How a node's title is drawn: mono as data; semibold when it carries a tone, the accent or emphasis; the ISA triangle at note size. */
export const nodeTitleStyle = (b: TitleOf): TextStyle =>
  b.mono
    ? { size: FONT.mono, mono: true, weight: b.state === "strong" ? 600 : undefined }
    : { size: b.shape === "triangle" ? FONT.note : FONT.title, weight: b.tone || b.state === "strong" || b.state === "active" ? 600 : 500 };
export const nodeTitleW = (b: TitleOf & { title?: string }) => (b.title ? measureStyle(b.title, nodeTitleStyle(b)) : 0);

const diamondPoints = (r: Rect, inset = 0) => {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, hw0 = r.w / 2, hh0 = r.h / 2;
  // offsetting a rhombus keeps its angles: shrink each half-axis by inset * diagonal / other half-axis
  const d = Math.hypot(hw0, hh0);
  const hw = hw0 - (inset * d) / hh0, hh = hh0 - (inset * d) / hw0;
  return polygonPoints([[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]]);
};

function cylinderPath(r: Rect): string {
  const ry = NODE.cap / 2, rx = r.w / 2;
  const top = r.y + ry, bottom = r.y + r.h - ry;
  return [
    `M${r2(r.x)},${r2(top)}`,
    `A${r2(rx)},${ry} 0 0 1 ${r2(r.x + r.w)},${r2(top)}`,
    `L${r2(r.x + r.w)},${r2(bottom)}`,
    `A${r2(rx)},${ry} 0 0 1 ${r2(r.x)},${r2(bottom)}`,
    "Z",
  ].join(" ");
}

function outlineOps(shape: Shape, r: Rect, double: boolean, st: ReturnType<typeof shapeStyle>): Op[] {
  const inner = { ...st, fill: "none" };
  const d = NODE.doubleInset;
  switch (shape) {
    case "circle": {
      const cx = r2(r.x + r.w / 2), cy = r2(r.y + r.h / 2), rad = Math.min(r.w, r.h) / 2;
      return [{ el: "circle", cx, cy, r: r2(rad), style: st }, ...(double ? [{ el: "circle" as const, cx, cy, r: r2(rad - d), style: inner }] : [])];
    }
    case "cylinder":
      return [
        { el: "path", d: cylinderPath(r), style: st },
        { el: "ellipse", cx: r2(r.x + r.w / 2), cy: r2(r.y + NODE.cap / 2), rx: r2(r.w / 2), ry: NODE.cap / 2, style: inner },
      ];
    case "diamond":
      return [{ el: "polygon", points: diamondPoints(r), style: st }, ...(double ? [{ el: "polygon" as const, points: diamondPoints(r, d), style: inner }] : [])];
    case "triangle":
      return [{ el: "polygon", points: `${r2(r.x)},${r2(r.y)} ${r2(r.x + r.w)},${r2(r.y)} ${r2(r.x + r.w / 2)},${r2(r.y + r.h)}`, style: { ...st, strokeLinejoin: "round" } }];
    default: {
      const rx = shape === "pill" ? r.h / 2 : RADIUS.node;
      return [
        rect(r, st, r2(rx)),
        ...(double ? [rect({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d }, inner, r2(Math.max(0, rx - d)))] : []),
      ];
    }
  }
}

export const Node: Marker<NodeProps> = mark<NodeProps, NodeData>({
  kind: "node",
  solid: true,
  obstacle: true,
  props: { ...COMMON, title: true, sub: true, mono: true, badge: true, shape: SHAPES, double: true, underline: ["solid", "dashed"], w: "number", h: "number", align: ["start", "center"] },
  data: (p) => ({
    title: p.title,
    sub: p.sub,
    mono: p.mono === true,
    badge: p.badge,
    shape: p.shape ?? "box",
    double: p.double === true,
    underline: p.underline,
    w: p.w,
    h: p.h,
    align: p.align ?? "center",
  }),
  outline: (d) => d.shape,
  size(b) {
    const { title, sub, mono, shape, w, h, double } = b.data;
    const titleW = nodeTitleW({ title, mono, shape, state: b.state, tone: b.tone });
    const textW = Math.max(titleW, sub ? measure(sub, FONT.note) : 0);
    const baseH = sub ? NODE.hSub : NODE.h;
    if (shape === "circle") {
      const d = w ?? Math.max(NODE.circleMin, textW + 16, sub ? NODE.hSub : 0);
      return { w: d, h: h ?? d };
    }
    if (shape === "diamond") {
      // the inscribed width at the text band's corner is hw * (1 - band / hh); a double
      // diamond sizes its inner outline this way and inflates (the offset rhombus is similar)
      const hh = (sub ? NODE.diamondH + 16 : NODE.diamondH) / 2;
      const band = sub ? 15 : FONT.title / 2 + 2;
      const hw = Math.max(NODE.diamondMinW / 2, (textW / 2 + 4) / (1 - band / hh));
      const k = double ? 1 + NODE.doubleInset * Math.hypot(1 / hw, 1 / hh) : 1;
      return { w: w ?? 2 * hw * k, h: h ?? 2 * hh * k };
    }
    if (shape === "triangle") {
      // fixed height; the label sits 0.4 h below the flat top and the taper at the band's bottom must clear it
      const th = h ?? NODE.triangleH;
      const bottom = 0.4 * th + FONT.note / 2 + 1;
      return { w: w ?? Math.max(NODE.triangleH, (textW + 8) / (1 - bottom / th)), h: th };
    }
    return { w: w ?? Math.max(NODE.minW, textW + 2 * NODE.padX), h: h ?? (shape === "cylinder" ? baseH + NODE.cap : baseH) };
  },
  paint(it, { uid, ground }) {
    const r = it.rect;
    const { title, sub, mono, shape, align, underline, double, badge: chip } = it.data;
    // a grey node on a light ground needs a firmer outline than a light node on a grey panel
    const l = (ground(it) ?? "surface") === "panel" ? lookOf(it.state, uid, V("surface"), it.tone) : lookOf(it.state, uid, V("panel"), it.tone, V("rule"));
    const cy = r.y + r.h / 2 + (shape === "cylinder" ? NODE.cap / 2 : 0);
    const x = align === "start" ? r.x + NODE.padX : r.x + r.w / 2;
    const anchor = align === "start" ? ("start" as const) : ("middle" as const);
    const of = { mono, shape, state: it.state, tone: it.tone };
    const style = nodeTitleStyle(of);
    const titleY = shape === "triangle" ? r.y + 0.4 * r.h : sub ? cy - 7.5 : cy;
    const titleW = nodeTitleW({ ...of, title });
    const ux = anchor === "start" ? x : x - titleW / 2;
    const uy = titleY + style.size / 2 + 2;
    return [
      {
        el: "g",
        kids: [
          ...outlineOps(shape, r, double, shapeStyle(l)),
          ...(title ? [{ el: "text" as const, x, y: titleY, text: title, size: style.size, weight: style.weight, mono: style.mono, italic: l.italic, fill: l.text, anchor }] : []),
          ...(title && underline ? [hLine(ux, ux + titleW, uy, { stroke: l.text, strokeWidth: STROKE.border, strokeDasharray: underline === "dashed" ? "3 2" : undefined })] : []),
          ...(sub ? [{ el: "text" as const, x, y: cy + 8.5, text: sub, size: FONT.note, fill: l.sub, italic: l.italic, anchor }] : []),
          ...(chip ? [badge(chip, it.tone, r.x + r.w / 2, r.y)] : []),
        ],
      },
    ];
  },
  check(it) {
    const { title, mono, shape } = it.data;
    if (title && nodeTitleW({ title, mono, shape, state: it.state, tone: it.tone }) + 8 > it.rect.w) {
      return [{ code: "node/title-overflow", severity: "warn", message: `Title "${title}" is wider than node "${it.id}".` }];
    }
    return [];
  },
});
