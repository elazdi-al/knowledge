/** A line between two marks: its marker and how a routed one is drawn. */
import { mark, type Marker } from "../mark";
import type { EdgeSpec, EdgeState, Op, Point, RouteMode, Side, Style, Tone } from "../model";
import { SIDES, TONES } from "../model";
import { chevron, ink, polyline, shownTone, solid, styled, V } from "../paint";
import type { Pt, RoutedEdge } from "../route";
import { STROKE, TEXT } from "../theme";

export interface EdgeProps {
  id?: string;
  /** a mark's id, or inside a `Canvas` a point */
  from: string | Point;
  to: string | Point;
  /** inside a `Canvas`: points the line passes through, joined by rounded corners */
  via?: Point[];
  /** `below` draws it under every item */
  layer?: "above" | "below";
  label?: string;
  dashed?: boolean;
  /** 2.5px stroke with a matching head (ER total participation) */
  thick?: boolean;
  head?: "end" | "both" | "none";
  route?: RouteMode;
  bend?: number;
  fromSide?: Side;
  toSide?: Side;
  loop?: Side;
  tone?: Tone;
  state?: EdgeState;
}

export const Edge: Marker<EdgeProps> = mark<EdgeProps, Omit<EdgeSpec, "via">>({
  kind: "edge",
  props: {
    id: true,
    from: true,
    to: true,
    via: true,
    layer: ["above", "below"],
    label: true,
    dashed: true,
    thick: true,
    head: ["end", "both", "none"],
    route: ["auto", "straight", "curve", "ortho", "arc"],
    bend: "number",
    fromSide: SIDES,
    toSide: SIDES,
    loop: SIDES,
    tone: TONES,
    state: ["default", "active", "ghost"],
  },
  data(p) {
    const from = String(p.from), to = String(p.to);
    return {
      id: p.id ?? `e:${from}>${to}`,
      from,
      to,
      layer: p.layer ?? "above",
      label: p.label,
      dashed: p.dashed === true,
      thick: p.thick === true || undefined,
      head: p.head ?? "end",
      route: p.route ?? "auto",
      bend: p.bend || undefined,
      fromSide: p.fromSide,
      toSide: p.toSide,
      loop: p.loop,
      tone: p.tone,
      state: p.state ?? "default",
    };
  },
});

const headAt = ({ x, y }: Pt, angle: number, size: number) => polyline(chevron([x, y], angle, size));

export function edgeOp(e: RoutedEdge): Op {
  const { spec } = e;
  const tone = shownTone(spec.state === "active" ? "active" : "default", spec.tone);
  const colour = spec.state === "ghost" ? V("faint") : tone ? solid(tone) : V("line");
  const width = spec.thick ? STROKE.thick : STROKE.edge;
  const head = STROKE.head * Math.sqrt(width / STROKE.edge);
  const stroke: Style = { stroke: colour, strokeWidth: width, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  return {
    el: "g",
    kids: [
      { el: "path", d: e.d, style: { ...stroke, strokeDasharray: spec.dashed ? STROKE.dash : undefined } },
      ...(spec.head !== "none" ? [{ el: "path" as const, d: headAt(e.pts[e.pts.length - 1], e.endAngle, head), style: stroke }] : []),
      ...(spec.head === "both" ? [{ el: "path" as const, d: headAt(e.pts[0], e.startAngle, head), style: stroke }] : []),
      ...(spec.label && e.label
        ? [{ el: "text" as const, x: e.label.x, y: e.label.y, ...styled(spec.label, TEXT.edgeLabel), fill: spec.state === "ghost" ? V("faint") : tone ? ink(tone) : V("text"), halo: true }]
        : []),
    ],
  };
}
