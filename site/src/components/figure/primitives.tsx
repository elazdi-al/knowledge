/**
 * JSX markers and the walker. Markers render nothing; `toScene` reads the
 * element tree, expands plain function components, and returns one `Scene`.
 */
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import {
  type Align,
  type Block,
  type CellItem,
  type Dir,
  type EdgeSpec,
  type EdgeState,
  type RouteMode,
  type Scene,
  type Shape,
  type Side,
  type State,
  type TableRow,
  type TextSize,
  type Tone,
  type Weight,
} from "./model";
import { DOT_R, GAP, GROUP, STROKE } from "./theme";

export interface Common {
  id?: string;
  state?: State;
  tone?: Tone;
  /** position inside a `Free` parent */
  x?: number;
  y?: number;
}

type WithChildren = { children?: ReactNode };

export interface RowProps extends Common, WithChildren {
  gap?: number;
  align?: Align;
  pad?: number;
  /** static figures only: below 520px this row is laid out as a column (ignored on `Col`) */
  wrap?: boolean;
}
export interface GridProps extends Common, WithChildren {
  cols: number;
  gap?: number;
  colGap?: number;
  rowGap?: number;
  align?: Align;
}
export interface GroupProps extends Common, WithChildren {
  title?: string;
  badge?: string;
  dir?: Dir;
  gap?: number;
  pad?: number;
  align?: Align;
  dashed?: boolean;
}
export interface GraphProps extends Common, WithChildren {
  dir?: "right" | "down";
  gap?: number;
  rankGap?: number;
}
export interface FreeProps extends Common, WithChildren {}
export interface SpaceProps extends Common {
  w?: number;
  h?: number;
}
export interface NodeProps extends Common {
  title?: string;
  sub?: string;
  mono?: boolean;
  badge?: string;
  shape?: Shape;
  double?: boolean;
  underline?: "solid" | "dashed";
  w?: number;
  h?: number;
  align?: "start" | "center";
}
export type CellInput = string | number | null | CellItem;
export interface CellsProps extends Common {
  items: CellInput[];
  dir?: Dir;
  /** grid this many cells wide */
  cols?: number;
  cell?: number;
  mono?: boolean;
  index?: boolean;
  ellipsis?: "start" | "end" | "both";
}
export type RowInput = TableRow["cells"] | TableRow;
export interface TableProps extends Common {
  columns?: string[];
  rows: RowInput[];
  mono?: boolean;
  /** placeholder text shown when there are no rows */
  empty?: string;
}
export interface TextProps extends Common {
  text: string;
  size?: TextSize;
  muted?: boolean;
  mono?: boolean;
  weight?: Weight;
}
export interface TagProps extends Common {
  text: string;
}
export interface DotsProps extends Common {
  dir?: Dir;
}
/** A filled polygon inside a `Free`, its points in the `Free`'s coordinates; `outline` draws its border in the tone's line. */
export interface PolyProps extends Omit<Common, "x" | "y"> {
  points: [number, number][];
  outline?: boolean;
}
/** A stroked polyline inside a `Free`, its points in the `Free`'s coordinates: ink when `strong`, the tone's solid when toned, else the edge grey. */
export interface PathProps extends Omit<Common, "x" | "y"> {
  points: [number, number][];
  /** join the last point back to the first */
  closed?: boolean;
  dashed?: boolean;
  /** a 1px hairline, for grids and contours */
  thin?: boolean;
  thick?: boolean;
}
/** A filled data point centred `at` a point of its `Free`. */
export interface DotProps extends Omit<Common, "x" | "y"> {
  at: [number, number];
  r?: number;
}
export interface EdgeProps {
  id?: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
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

type Marker<P> = ((props: P) => null) & { dg: string };
const marker = <P,>(kind: string): Marker<P> => Object.assign((_props: P) => null, { dg: kind });

export const Row = marker<RowProps>("row");
export const Col = marker<RowProps>("col");
export const Grid = marker<GridProps>("grid");
export const Group = marker<GroupProps>("group");
export const Graph = marker<GraphProps>("graph");
export const Free = marker<FreeProps>("free");
export const Space = marker<SpaceProps>("space");
export const Node = marker<NodeProps>("node");
export const Cells = marker<CellsProps>("cells");
export const Table = marker<TableProps>("table");
export const Text = marker<TextProps>("text");
export const Tag = marker<TagProps>("tag");
export const Dots = marker<DotsProps>("dots");
export const Poly = marker<PolyProps>("poly");
export const Path = marker<PathProps>("path");
export const Dot = marker<DotProps>("dot");
export const Edge = marker<EdgeProps>("edge");

// --- walking ------------------------------------------------------------------

type Props = Record<string, unknown>;
interface TNode {
  kind: string;
  props: Props;
  children: TNode[];
}

function isMarker(t: unknown): t is Marker<unknown> {
  return typeof t === "function" && "dg" in t;
}

/** Flatten a children tree into marker nodes, expanding plain components. */
export function collect(children: ReactNode): TNode[] {
  const out: TNode[] = [];
  Children.forEach(children, (child) => {
    if (child == null || typeof child === "boolean") return;
    if (!isValidElement(child)) {
      if (typeof child === "string" && child.trim() === "") return;
      throw new Error(`[diagram] bare ${typeof child} child; wrap text in <Text>`);
    }
    const el = child as ReactElement<Props>;
    const type = el.type;
    if (isMarker(type)) {
      out.push({ kind: type.dg, props: el.props, children: collect(el.props.children as ReactNode) });
      return;
    }
    if (typeof type === "function") {
      if ((type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent) {
        throw new Error("[diagram] class components are not supported inside <Diagram>");
      }
      out.push(...collect((type as (p: Props) => ReactNode)(el.props)));
      return;
    }
    if ((type as unknown) === Symbol.for("react.fragment")) {
      out.push(...collect(el.props.children as ReactNode));
      return;
    }
    throw new Error(`[diagram] unsupported child <${String(type)}> inside <Diagram>`);
  });
  return out;
}

const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

const asCell = (c: CellInput): CellItem =>
  c === null ? {} : typeof c === "object" ? c : { label: String(c) };
const asRow = (r: RowInput): TableRow => (Array.isArray(r) ? { cells: r } : r);

interface Ctx {
  edges: EdgeSpec[];
  /** id -> state, for edge presence and ghosting */
  states: Map<string, State>;
}

function resolve(t: TNode, ctx: Ctx, pathId: string, inheritGhost: boolean): Block | null {
  const p = t.props;
  if (t.kind === "edge") {
    const from = String(p.from), to = String(p.to);
    ctx.edges.push({
      id: str(p.id) ?? `e:${from}>${to}`,
      from,
      to,
      label: str(p.label),
      dashed: p.dashed === true,
      thick: p.thick === true || undefined,
      head: (p.head as EdgeSpec["head"]) ?? "end",
      route: (p.route as RouteMode) ?? "auto",
      bend: num(p.bend, 0) || undefined,
      fromSide: p.fromSide as Side | undefined,
      toSide: p.toSide as Side | undefined,
      loop: p.loop as Side | undefined,
      tone: p.tone as Tone | undefined,
      state: (p.state as EdgeState) ?? "default",
    });
    return null;
  }

  const id = str(p.id) ?? pathId;
  const state: State = inheritGhost ? "ghost" : ((p.state as State) ?? "default");
  const common = { id, state, tone: p.tone as Tone | undefined, x: p.x as number | undefined, y: p.y as number | undefined };
  ctx.states.set(id, state);

  const kids = () =>
    t.children
      .map((c, i) => resolve(c, ctx, `${id}.${i}`, state === "ghost"))
      .filter((b): b is Block => b !== null);

  switch (t.kind) {
    case "row":
    case "col":
      return {
        ...common,
        kind: t.kind,
        gap: num(p.gap, GAP.stack),
        align: (p.align as Align) ?? "center",
        pad: num(p.pad, 0),
        wrap: (t.kind === "row" && p.wrap === true) || undefined,
        children: kids(),
      };
    case "grid":
      return {
        ...common,
        kind: "grid",
        cols: num(p.cols, 2),
        colGap: num(p.colGap, num(p.gap, GAP.stack)),
        rowGap: num(p.rowGap, num(p.gap, GAP.stack)),
        align: (p.align as Align) ?? "center",
        children: kids(),
      };
    case "group":
      return {
        ...common,
        kind: "group",
        title: str(p.title),
        badge: str(p.badge),
        dir: (p.dir as Dir) ?? "col",
        gap: num(p.gap, GAP.stack),
        pad: num(p.pad, GROUP.pad),
        align: (p.align as Align) ?? "center",
        dashed: p.dashed === true,
        children: kids(),
      };
    case "graph":
      return {
        ...common,
        kind: "graph",
        dir: (p.dir as "right" | "down") ?? "right",
        gap: num(p.gap, GAP.graphNode),
        rankGap: num(p.rankGap, GAP.graphRank),
        children: kids(),
      };
    case "free":
      return { ...common, kind: "free", children: kids() };
    case "space":
      return { ...common, kind: "space", w: num(p.w, 0), h: num(p.h, 0) };
    case "node":
      return {
        ...common,
        kind: "node",
        title: str(p.title),
        sub: str(p.sub),
        mono: p.mono === true,
        badge: str(p.badge),
        shape: (p.shape as Shape) ?? "box",
        double: p.double === true,
        underline: p.underline as "solid" | "dashed" | undefined,
        w: p.w as number | undefined,
        h: p.h as number | undefined,
        align: (p.align as "start" | "center") ?? "center",
      };
    case "cells":
      return {
        ...common,
        kind: "cells",
        items: ((p.items as CellInput[] | undefined) ?? []).map(asCell),
        dir: (p.dir as Dir) ?? "row",
        cols: p.cols as number | undefined,
        cell: p.cell as number | undefined,
        mono: p.mono !== false,
        index: p.index === true,
        ellipsis: p.ellipsis as "start" | "end" | "both" | undefined,
      };
    case "table":
      return {
        ...common,
        kind: "table",
        columns: p.columns as string[] | undefined,
        rows: ((p.rows as RowInput[] | undefined) ?? []).map(asRow),
        mono: p.mono !== false,
        empty: str(p.empty),
      };
    case "text":
      return {
        ...common,
        kind: "text",
        text: str(p.text) ?? "",
        size: (p.size as TextSize) ?? "label",
        muted: p.muted === true,
        mono: p.mono === true,
        weight: p.weight as Weight | undefined,
      };
    case "tag":
      return { ...common, kind: "tag", text: str(p.text) ?? "" };
    case "dots":
      return { ...common, kind: "dots", dir: (p.dir as Dir) ?? "row" };
    case "poly": {
      const pts = (p.points as [number, number][] | undefined) ?? [];
      const x = Math.min(...pts.map(([px]) => px)), y = Math.min(...pts.map(([, py]) => py));
      return { ...common, x, y, kind: "poly", points: pts.map(([px, py]) => [px - x, py - y]), outline: p.outline === true };
    }
    case "path": {
      const pts = (p.points as [number, number][] | undefined) ?? [];
      const x = Math.min(...pts.map(([px]) => px)), y = Math.min(...pts.map(([, py]) => py));
      return {
        ...common,
        x,
        y,
        kind: "path",
        points: pts.map(([px, py]) => [px - x, py - y]),
        closed: p.closed === true,
        dashed: p.dashed === true,
        width: p.thin === true ? STROKE.border : p.thick === true ? STROKE.thick : STROKE.edge,
      };
    }
    case "dot": {
      const r = num(p.r, DOT_R);
      const [cx, cy] = (p.at as [number, number] | undefined) ?? [0, 0];
      return { ...common, x: cx - r, y: cy - r, kind: "dot", r };
    }
  }
  throw new Error(`[diagram] unknown primitive ${t.kind}`);
}

/** Owner id of a derived id (`cells.3` -> `cells`, `tbl.r2` -> `tbl`). */
export const ownerId = (id: string) => id.replace(/\.[^.]*$/, "");

/** Compile the children of a `<Diagram>` into a scene. Edges to missing ids are dropped; edges touching a ghost are ghosts. */
export function toScene(children: ReactNode): Scene {
  const ctx: Ctx = { edges: [], states: new Map() };
  const kids = collect(children)
    .map((n, i) => resolve(n, ctx, `root.${i}`, false))
    .filter((b): b is Block => b !== null);
  const root: Block = { id: "root", state: "default", kind: "col", gap: GAP.stack, align: "center", pad: 0, children: kids };
  const stateOf = (id: string) => ctx.states.get(id) ?? ctx.states.get(ownerId(id));
  const seen = new Set<string>();
  const edges = ctx.edges
    .filter((e) => stateOf(e.from) !== undefined && stateOf(e.to) !== undefined)
    .map((e) => {
      let id = e.id;
      for (let n = 2; seen.has(id); n++) id = `${e.id}#${n}`;
      seen.add(id);
      const ghosted = stateOf(e.from) === "ghost" || stateOf(e.to) === "ghost";
      return { ...e, id, state: ghosted ? ("ghost" as const) : e.state };
    });
  return { root, edges };
}
