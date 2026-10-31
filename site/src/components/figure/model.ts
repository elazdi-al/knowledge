/**
 * Data shapes for the figure engine. A Scene is the compiled tree of marks; a Frame is the laid-out result, plain JSON:
 * what to draw (`ops`), where everything is (`boxes`, `routes`) and what is wrong with it (`diagnostics`).
 */
import type { Diagnostic } from "./diagnostics";
import type { RoutedEdge } from "./route";

export type Tone = "blue" | "teal" | "green" | "purple" | "red";
export const TONES: readonly Tone[] = ["blue", "teal", "green", "purple", "red"];

export type State = "default" | "active" | "placeholder" | "free" | "ghost" | "strong";
export const STATES: readonly State[] = ["default", "active", "placeholder", "free", "ghost", "strong"];

export type Side = "top" | "right" | "bottom" | "left";
export const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];
export type Align = "start" | "center" | "end" | "stretch";
export type Dir = "row" | "col";
/** `diamond` and `triangle` (point down, label in the upper part) are the ER relationship and ISA glyphs; edges meet them at their vertices. */
export type Shape = "box" | "pill" | "circle" | "cylinder" | "diamond" | "triangle";
export const SHAPES: readonly Shape[] = ["box", "pill", "circle", "cylinder", "diamond", "triangle"];
export type TextSize = "title" | "label" | "note";
export type Weight = 400 | 500 | 600 | 700;

export interface Size {
  w: number;
  h: number;
}
export interface Rect extends Size {
  x: number;
  y: number;
}

export type RouteMode = "auto" | "straight" | "curve" | "ortho" | "arc";
export type EdgeState = "default" | "active" | "ghost";

export interface EdgeSpec {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** 2.5px stroke with a matching head (ER total participation) */
  thick?: boolean;
  head: "end" | "both" | "none";
  route: RouteMode;
  bend?: number;
  fromSide?: Side;
  toSide?: Side;
  loop?: Side;
  tone?: Tone;
  state: EdgeState;
}

/** CSS a drawing op carries. Colours are `var(--dg-*)` tokens. */
export interface Style {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeLinecap?: "round";
  strokeLinejoin?: "round";
}

/** One drawing instruction, a JSON subset of SVG. Attribute order is output order. */
export type Op =
  | { el: "rect"; x: number; y: number; width: number; height: number; rx?: number; style?: Style }
  | { el: "circle"; cx: number; cy: number; r: number; style?: Style }
  | { el: "ellipse"; cx: number; cy: number; rx: number; ry: number; style?: Style }
  | { el: "line"; x1: number; x2: number; y1: number; y2: number; style?: Style }
  | { el: "polygon"; points: string; style?: Style }
  | { el: "path"; d: string; style?: Style }
  | { el: "g"; clipPath?: string; style?: Style; kids: Op[] }
  | { el: "clipPath"; id: string; kids: Op[] }
  | ({ el: "text" } & TextOp);

export interface TextOp {
  x: number;
  y: number;
  text: string;
  size: number;
  fill: string;
  weight?: number;
  mono?: boolean;
  italic?: boolean;
  anchor?: "start" | "middle" | "end";
  /** knockout halo in the canvas colour, so lines passing behind the text break around it */
  halo?: boolean;
}

export interface Base {
  id: string;
  state: State;
  tone?: Tone;
  /** Position inside a `Free` parent. */
  x?: number;
  y?: number;
}

/** A compiled element: its mark, the data the mark made from its props, and its children. */
export interface Block<D = unknown> extends Base {
  def: MarkDef<never, D>;
  data: D;
  children: AnyBlock[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBlock = Block<any>;

/** An addressable piece of a mark that edges may attach to (`cells.3`, `tbl.r2`). */
export interface Part<P = unknown> {
  id: string;
  state: State;
  tone?: Tone;
  rect: Rect;
  data: P;
}

/** A block with its place in the frame. */
export interface Placed<D = unknown> extends Block<D> {
  rect: Rect;
  parent?: Placed;
  parts: Part[];
}

export interface Arranged {
  size: Size;
  /** child boxes, relative to this block's box */
  rects: Rect[];
}

export interface LayoutCtx {
  edges: EdgeSpec[];
}

export interface PaintCtx {
  /** unique prefix for clip and pattern ids */
  uid: string;
  /** the fill of the nearest painted group around an item */
  ground(it: Placed): "panel" | "surface" | undefined;
}

/** Every prop a mark takes: `true`, `"number"`, or the values it may hold. MDX has no types, so this is what catches its typos. */
export type PropTable<P> = { [K in keyof Required<P>]: true | "number" | readonly string[] };

/** All a mark is. A custom mark is written exactly like a built-in one. */
export interface MarkDef<P, D> {
  kind: string;
  props: PropTable<P>;
  /** resolve props to the data every other step reads */
  data(props: P): D;
  /** position inside a `Free`, when it does not come from `x` and `y` */
  origin?(props: P, data: D): { x: number; y: number };
  /** a leaf's own size */
  size?(b: Block<D>): Size;
  /** a container's layout: called without `given` to measure, and with the final size to place */
  arrange?(b: Block<D>, kids: Size[], ctx: LayoutCtx, given?: Size): Arranged;
  /** restyle an edge between two of a container's children */
  connect?(b: Block<D>, e: EdgeSpec, rects: Record<string, Rect>): EdgeSpec;
  /** the addressable pieces of a leaf, at `rect` */
  parts?(b: Block<D>, rect: Rect): Part[];
  paint?(it: Placed<D>, ctx: PaintCtx): Op[];
  /** report on a placed item */
  check?(it: Placed<D>): Diagnostic[];
  /** painted and opaque: edge labels avoid it */
  solid?: boolean;
  /** an edge passing over it is a mistake */
  obstacle?: boolean;
  /** it paints a panel, and what sits on it takes the opposite fill */
  panel?(data: D): boolean;
  /** the outline edges attach to */
  outline?(data: D): Shape;
  /** children may overlap on purpose */
  overlapping?: boolean;
}

/** A placed item or part, as routing and diagnostics see it. */
export interface Box {
  id: string;
  kind: string;
  rect: Rect;
  parent?: string;
  shape?: Shape;
  solid?: boolean;
  obstacle?: boolean;
  /** a layout box or empty room: nothing to attach a line to */
  invisible?: boolean;
}

export interface Scene {
  root: AnyBlock;
  edges: EdgeSpec[];
  diagnostics: Diagnostic[];
}

export interface Frame {
  w: number;
  h: number;
  ops: Op[];
  boxes: Box[];
  routes: RoutedEdge[];
  diagnostics: Diagnostic[];
}
