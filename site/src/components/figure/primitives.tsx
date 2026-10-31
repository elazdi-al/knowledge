/**
 * JSX markers and the walker. Markers render nothing; `toScene` reads the
 * element tree, expands plain function components, and returns one `Scene`.
 */
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { suggest, type Diagnostic } from "./diagnostics";
import {
  partIds,
  SHAPES,
  STATES,
  TONES,
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
function collect(children: ReactNode): TNode[] {
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
  diagnostics: Diagnostic[];
}

/** Every prop a marker takes: `true`, or the values it may hold. Keeping this exhaustive is what lets MDX, which has no types, get the same errors as TSX. */
type PropTable<P> = { [K in keyof Required<P>]: true | readonly string[] };
const ALIGN = ["start", "center", "end", "stretch"] as const;
const DIR = ["row", "col"] as const;
const SIDES = ["top", "right", "bottom", "left"] as const;
const COMMON: PropTable<Common> = { id: true, state: STATES, tone: TONES, x: true, y: true };
const STACK: PropTable<RowProps> = { ...COMMON, children: true, gap: true, align: ALIGN, pad: true, wrap: true };
const SHAPE_POINTS = { id: true, state: STATES, tone: TONES, points: true } as const;
const PROPS: Record<string, Record<string, true | readonly string[]>> = {
  row: STACK,
  col: STACK,
  grid: { ...COMMON, children: true, cols: true, gap: true, colGap: true, rowGap: true, align: ALIGN } satisfies PropTable<GridProps>,
  group: { ...COMMON, children: true, title: true, badge: true, dir: DIR, gap: true, pad: true, align: ALIGN, dashed: true } satisfies PropTable<GroupProps>,
  graph: { ...COMMON, children: true, dir: ["right", "down"], gap: true, rankGap: true } satisfies PropTable<GraphProps>,
  free: { ...COMMON, children: true } satisfies PropTable<FreeProps>,
  space: { ...COMMON, w: true, h: true } satisfies PropTable<SpaceProps>,
  node: {
    ...COMMON,
    title: true,
    sub: true,
    mono: true,
    badge: true,
    shape: SHAPES,
    double: true,
    underline: ["solid", "dashed"],
    w: true,
    h: true,
    align: ["start", "center"],
  } satisfies PropTable<NodeProps>,
  cells: { ...COMMON, items: true, dir: DIR, cols: true, cell: true, mono: true, index: true, ellipsis: ["start", "end", "both"] } satisfies PropTable<CellsProps>,
  table: { ...COMMON, columns: true, rows: true, mono: true, empty: true } satisfies PropTable<TableProps>,
  text: { ...COMMON, text: true, size: ["title", "label", "note"], muted: true, mono: true, weight: true } satisfies PropTable<TextProps>,
  tag: { ...COMMON, text: true } satisfies PropTable<TagProps>,
  dots: { ...COMMON, dir: DIR } satisfies PropTable<DotsProps>,
  poly: { ...SHAPE_POINTS, outline: true } satisfies PropTable<PolyProps>,
  path: { ...SHAPE_POINTS, closed: true, dashed: true, thin: true, thick: true } satisfies PropTable<PathProps>,
  dot: { id: true, state: STATES, tone: TONES, at: true, r: true } satisfies PropTable<DotProps>,
  edge: {
    id: true,
    from: true,
    to: true,
    label: true,
    dashed: true,
    thick: true,
    head: ["end", "both", "none"],
    route: ["auto", "straight", "curve", "ortho", "arc"],
    bend: true,
    fromSide: SIDES,
    toSide: SIDES,
    loop: SIDES,
    tone: TONES,
    state: ["default", "active", "ghost"],
  } satisfies PropTable<EdgeProps>,
};

function checkProps(t: TNode, parentKind: string, ctx: Ctx) {
  const table = PROPS[t.kind];
  const where = `<${t.kind}${typeof t.props.id === "string" ? ` id="${t.props.id}"` : ""}>`;
  for (const [name, value] of Object.entries(t.props)) {
    if (value === undefined) continue;
    const allowed = table[name];
    if (allowed === undefined) {
      ctx.diagnostics.push({ code: "prop/invalid", severity: "error", message: `${where} has no prop "${name}".`, hint: suggest(name, Object.keys(table)) });
    } else if (allowed !== true && !allowed.includes(value as string)) {
      ctx.diagnostics.push({ code: "prop/invalid", severity: "error", message: `${where} ${name}="${String(value)}" is not valid.`, hint: `One of: ${allowed.join(", ")}.` });
    } else if ((name === "x" || name === "y") && parentKind !== "free") {
      ctx.diagnostics.push({ code: "prop/ignored", severity: "warn", message: `${where} sets ${name}, but only a child of <Free> is positioned.`, hint: `Its parent is <${parentKind}>.` });
    }
  }
}

function resolve(t: TNode, ctx: Ctx, pathId: string, inheritGhost: boolean, parentKind: string): Block | null {
  const p = t.props;
  checkProps(t, parentKind, ctx);
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
  if (ctx.states.has(id)) ctx.diagnostics.push({ code: "id/duplicate", severity: "error", message: `Two items have id "${id}".`, hint: id === ROOT ? `"${ROOT}" is reserved.` : "Ids must be unique within a figure." });
  ctx.states.set(id, state);

  const kids = () =>
    t.children
      .map((c, i) => resolve(c, ctx, `${id}.${i}`, state === "ghost", t.kind))
      .filter((b): b is Block => b !== null);

  const block = build(t, common, kids);
  for (const part of partIds(block)) {
    if (ctx.states.has(part)) ctx.diagnostics.push({ code: "id/duplicate", severity: "error", message: `Two items have id "${part}".`, hint: "Ids must be unique within a figure." });
    ctx.states.set(part, state);
  }
  return block;
}

function build(t: TNode, common: Pick<Block, "id" | "state" | "tone" | "x" | "y">, kids: () => Block[]): Block {
  const p = t.props;
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

const ROOT = "root";

/** Compile the children of a `<Diagram>` into a scene. An edge to a missing id is an error; edges touching a ghost are ghosts. */
export function toScene(children: ReactNode): Scene {
  const ctx: Ctx = { edges: [], states: new Map([[ROOT, "default"]]), diagnostics: [] };
  const kids = collect(children)
    .map((n, i) => resolve(n, ctx, `${ROOT}.${i}`, false, "col"))
    .filter((b): b is Block => b !== null);
  const root: Block = { id: ROOT, state: "default", kind: "col", gap: GAP.stack, align: "center", pad: 0, children: kids };
  const known = [...ctx.states.keys()].filter((id) => id !== ROOT);
  const seen = new Set<string>();
  const edges = ctx.edges.flatMap((e) => {
    const missing = [e.from, e.to].filter((id) => !ctx.states.has(id));
    for (const id of new Set(missing)) {
      ctx.diagnostics.push({ code: "edge/unknown-endpoint", severity: "error", message: `Edge "${e.from}" -> "${e.to}" has no item "${id}".`, hint: suggest(id, known) });
    }
    if (missing.length) return [];
    let id = e.id;
    for (let n = 2; seen.has(id); n++) id = `${e.id}#${n}`;
    seen.add(id);
    const ghosted = ctx.states.get(e.from) === "ghost" || ctx.states.get(e.to) === "ghost";
    return [{ ...e, id, state: ghosted ? ("ghost" as const) : e.state }];
  });
  return { root, edges, diagnostics: ctx.diagnostics };
}
