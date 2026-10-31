/** Marks that arrange other marks. */
import type { ReactNode } from "react";
import { COMMON, idsUnder, mark, type Common, type Marker } from "../mark";
import { measureStyle } from "../measure";
import type { Align, AnyBlock, Arranged, Block, Dir, EdgeSpec, LayoutCtx, PropTable, Rect, Size } from "../model";
import { ACCENT, badge, ink, lookOf, rect, shapeStyle, styled, V } from "../paint";
import { layoutGraph } from "../graph";
import { labelPillW } from "../route";
import { EDGE_GAP, EDGE_LABEL, GAP, GROUP, LABEL_CLEAR, RADIUS, STROKE, TEXT } from "../theme";

type WithChildren = { children?: ReactNode };
const ALIGN = ["start", "center", "end", "stretch"] as const;
const DIR = ["row", "col"] as const;

const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);
const alignOffset = (align: Align, avail: number, size: number) => (align === "end" ? avail - size : align === "center" ? (avail - size) / 2 : 0);

/** Room an edge needs between the two items it joins along a horizontal or vertical gap: a readable arrow, or its label (which sits on the line) with clearance. Undirected connectors (tree links) keep the author's gap. */
const edgeGap = (e: EdgeSpec, horizontal: boolean) =>
  e.label ? Math.max(EDGE_GAP, (horizontal ? labelPillW(e.label) : EDGE_LABEL.h) + LABEL_CLEAR) : e.head === "none" ? 0 : EDGE_GAP;

interface StackData {
  dir: Dir;
  gap: number;
  align: Align;
  pad: number;
  /** a wrapping row becomes a column in the narrow layout of a static figure */
  wrap?: boolean;
  title?: string;
  badge?: string;
  dashed?: boolean;
}

/** Gap after each child of a stack: the author's gap, grown to `EDGE_GAP` for an edge between adjacent children, and so a labelled edge's label has `LABEL_CLEAR` around it. */
function gapsOf(b: Block<StackData>, ctx: LayoutCtx): number[] {
  const horizontal = b.data.dir === "row";
  const sets = b.children.map((c) => idsUnder(c));
  return sets.slice(1).map((next, i) => {
    const prev = sets[i];
    let g = b.data.gap;
    for (const e of ctx.edges) {
      if ((prev.has(e.from) && next.has(e.to)) || (prev.has(e.to) && next.has(e.from))) g = Math.max(g, edgeGap(e, horizontal));
    }
    return g;
  });
}

function arrangeStack(b: Block<StackData>, kids: Size[], ctx: LayoutCtx, given?: Size): Arranged {
  const { dir, pad, align, title } = b.data;
  const main = (k: Size) => (dir === "row" ? k.w : k.h);
  const cross = (k: Size) => (dir === "row" ? k.h : k.w);
  const band = title ? GROUP.titleBand : 0;
  const titleW = title ? measureStyle(title, TEXT.groupTitle) : 0;
  const gaps = gapsOf(b, ctx);
  const mainTotal = sum(kids.map(main)) + sum(gaps);
  const crossMax = Math.max(0, ...kids.map(cross));
  const inner = dir === "row" ? { w: mainTotal, h: crossMax } : { w: crossMax, h: mainTotal };
  const size = { w: Math.max(inner.w, titleW) + 2 * pad, h: inner.h + 2 * pad + band };
  const box = given ?? size;
  const availCross = dir === "row" ? box.h - 2 * pad - band : box.w - 2 * pad;
  const stretch = align === "stretch";
  let cursor = 0;
  const rects = kids.map((k, i) => {
    const off = stretch ? 0 : alignOffset(align, availCross, cross(k));
    const at = cursor;
    cursor += main(k) + (gaps[i] ?? 0);
    return dir === "row"
      ? { x: pad + at, y: pad + band + off, w: k.w, h: stretch ? availCross : k.h }
      : { x: pad + off, y: pad + band + at, w: stretch ? availCross : k.w, h: k.h };
  });
  return { size, rects };
}

export interface RowProps extends Common, WithChildren {
  gap?: number;
  align?: Align;
  pad?: number;
  /** static figures only: below 520px this row is laid out as a column */
  wrap?: boolean;
}
export type ColProps = Omit<RowProps, "wrap">;

const STACK: PropTable<ColProps> = { ...COMMON, children: true, gap: "number", align: ALIGN, pad: "number" };

export const Row: Marker<RowProps> = mark<RowProps, StackData>({
  kind: "row",
  props: { ...STACK, wrap: true },
  data: (p) => ({ dir: "row", gap: p.gap ?? GAP.stack, align: p.align ?? "center", pad: p.pad ?? 0, wrap: p.wrap === true }),
  arrange: arrangeStack,
});

export const Col: Marker<ColProps> = mark<ColProps, StackData>({
  kind: "col",
  props: STACK,
  data: (p) => ({ dir: "col", gap: p.gap ?? GAP.stack, align: p.align ?? "center", pad: p.pad ?? 0 }),
  arrange: arrangeStack,
});

export interface GroupProps extends Common, WithChildren {
  title?: string;
  badge?: string;
  dir?: Dir;
  gap?: number;
  pad?: number;
  align?: Align;
  dashed?: boolean;
}

export const Group: Marker<GroupProps> = mark<GroupProps, StackData>({
  kind: "group",
  solid: true,
  panel: (d) => !d.dashed,
  props: { ...STACK, title: true, badge: true, dir: DIR, dashed: true },
  data: (p) => ({
    dir: p.dir ?? "col",
    gap: p.gap ?? GAP.stack,
    align: p.align ?? "center",
    pad: p.pad ?? GROUP.pad,
    title: p.title,
    badge: p.badge,
    dashed: p.dashed === true,
  }),
  arrange: arrangeStack,
  paint(it, { uid, ground }) {
    const r = it.rect;
    const { title, pad, dashed, badge: chip } = it.data;
    const own = dashed ? "none" : V(ground(it) === "panel" ? "surface" : "panel");
    const l = lookOf(it.state, uid, own, it.tone);
    const fill = it.state === "default" || it.state === "strong" ? own : l.fill;
    const titleFill = it.state === "ghost" ? V("faint") : it.state === "active" ? ink(ACCENT) : it.tone ? ink(it.tone) : V("text");
    return [
      {
        el: "g",
        kids: [
          rect(r, { ...shapeStyle(l), fill, strokeDasharray: dashed || l.dashed ? STROKE.dash : undefined }, RADIUS.group),
          ...(title
            ? [{ el: "text" as const, x: r.x + r.w / 2, y: r.y + pad + GROUP.titleBand / 2 - 3, ...styled(title, TEXT.groupTitle), fill: titleFill, italic: l.italic }]
            : []),
          ...(chip ? [badge(chip, it.tone, r.x + r.w / 2, r.y)] : []),
        ],
      },
    ];
  },
});

export interface GridProps extends Common, WithChildren {
  cols: number;
  gap?: number;
  colGap?: number;
  rowGap?: number;
  align?: Align;
}
interface GridData {
  cols: number;
  colGap: number;
  rowGap: number;
  align: Align;
}

/** Track sizes of a grid, and the gap after each track: the author's gap, grown by `edgeGap` for an edge between cells adjacent across it. */
function gridTracks(b: Block<GridData>, kids: Size[], ctx: LayoutCtx) {
  const cols = Math.max(1, b.data.cols);
  const colW = new Array<number>(cols).fill(0);
  const rowH = new Array<number>(Math.ceil(kids.length / cols)).fill(0);
  kids.forEach((k, i) => {
    colW[i % cols] = Math.max(colW[i % cols], k.w);
    rowH[Math.floor(i / cols)] = Math.max(rowH[Math.floor(i / cols)], k.h);
  });
  const colGap = new Array<number>(Math.max(0, cols - 1)).fill(b.data.colGap);
  const rowGap = new Array<number>(Math.max(0, rowH.length - 1)).fill(b.data.rowGap);
  const sets = b.children.map((c) => idsUnder(c));
  const cellOf = (id: string) => sets.findIndex((s) => s.has(id));
  for (const e of ctx.edges) {
    const i = cellOf(e.from), j = cellOf(e.to);
    if (i < 0 || j < 0 || i === j) continue;
    const ci = i % cols, ri = Math.floor(i / cols), cj = j % cols, rj = Math.floor(j / cols);
    if (ri === rj && Math.abs(ci - cj) === 1) colGap[Math.min(ci, cj)] = Math.max(colGap[Math.min(ci, cj)], edgeGap(e, true));
    if (ci === cj && Math.abs(ri - rj) === 1) rowGap[Math.min(ri, rj)] = Math.max(rowGap[Math.min(ri, rj)], edgeGap(e, false));
  }
  return { colW, rowH, colGap, rowGap };
}

const trackStarts = (tracks: number[], gaps: number[]) => {
  let acc = 0;
  return tracks.map((t, i) => {
    const at = acc;
    acc += t + (gaps[i] ?? 0);
    return at;
  });
};

export const Grid: Marker<GridProps> = mark<GridProps, GridData>({
  kind: "grid",
  props: { ...COMMON, children: true, cols: "number", gap: "number", colGap: "number", rowGap: "number", align: ALIGN },
  data: (p) => ({ cols: p.cols ?? 2, colGap: p.colGap ?? p.gap ?? GAP.stack, rowGap: p.rowGap ?? p.gap ?? GAP.stack, align: p.align ?? "center" }),
  arrange(b, kids, ctx) {
    const { colW, rowH, colGap, rowGap } = gridTracks(b, kids, ctx);
    const colX = trackStarts(colW, colGap), rowY = trackStarts(rowH, rowGap);
    const rects = kids.map((k, i) => {
      const ci = i % colW.length, ri = Math.floor(i / colW.length);
      return b.data.align === "stretch"
        ? { x: colX[ci], y: rowY[ri], w: colW[ci], h: rowH[ri] }
        : { x: colX[ci] + alignOffset(b.data.align, colW[ci], k.w), y: rowY[ri] + (rowH[ri] - k.h) / 2, w: k.w, h: k.h };
    });
    return { size: { w: sum(colW) + sum(colGap), h: sum(rowH) + sum(rowGap) }, rects };
  },
});

const boxesAt = (at: { x: number; y: number }[], kids: Size[]): Arranged => {
  const rects: Rect[] = at.map((p, i) => ({ x: p.x, y: p.y, w: kids[i].w, h: kids[i].h }));
  return { size: { w: Math.max(0, ...rects.map((r) => r.x + r.w)), h: Math.max(0, ...rects.map((r) => r.y + r.h)) }, rects };
};

export type FreeProps = Common & WithChildren;

export const Free: Marker<FreeProps> = mark<FreeProps, null>({
  kind: "free",
  overlapping: true,
  props: { ...COMMON, children: true },
  data: () => null,
  arrange: (b, kids) => boxesAt(b.children.map((c) => ({ x: c.x ?? 0, y: c.y ?? 0 })), kids),
});

export interface GraphProps extends Common, WithChildren {
  dir?: "right" | "down";
  gap?: number;
  rankGap?: number;
}
interface GraphData {
  dir: "right" | "down";
  gap: number;
  rankGap: number;
}

export const Graph: Marker<GraphProps> = mark<GraphProps, GraphData>({
  kind: "graph",
  props: { ...COMMON, children: true, dir: ["right", "down"], gap: "number", rankGap: "number" },
  data: (p) => ({ dir: p.dir ?? "right", gap: p.gap ?? GAP.graphNode, rankGap: p.rankGap ?? GAP.graphRank }),
  arrange(b, kids, ctx) {
    const owner = new Map(b.children.flatMap((c: AnyBlock) => [...idsUnder(c, new Set(), false)].map((id) => [id, c.id] as const)));
    const edges = ctx.edges.flatMap((e) => {
      const from = owner.get(e.from), to = owner.get(e.to);
      return from && to ? [{ from, to, label: e.label ? labelPillW(e.label) : undefined }] : [];
    });
    const pos = layoutGraph(b.children.map((c, i) => ({ id: c.id, w: kids[i].w, h: kids[i].h })), edges, b.data.dir, b.data.gap, b.data.rankGap);
    return boxesAt(b.children.map((c) => pos.get(c.id) ?? { x: 0, y: 0 }), kids);
  },
  /** Edges inside a `dir="down"` graph are tree connectors: ortho from the parent's bottom to the child's top centre. */
  connect(b, e, rects) {
    if (b.data.dir !== "down" || e.route !== "auto" || e.from === e.to) return e;
    const down = rects[e.from].y <= rects[e.to].y;
    return { ...e, route: "ortho", fromSide: e.fromSide ?? (down ? "bottom" : "top"), toSide: e.toSide ?? (down ? "top" : "bottom") };
  },
});

const hasWrap = (b: AnyBlock): boolean => b.data?.wrap === true || b.children.some(hasWrap);
/** The narrow tree: every wrapping row becomes a centred column. */
function narrowed(b: AnyBlock): AnyBlock {
  const children = b.children.map(narrowed);
  return b.data?.wrap === true ? { ...b, def: Col.def as unknown as AnyBlock["def"], data: { ...b.data, dir: "col", align: "center", wrap: false }, children } : { ...b, children };
}
/** The narrow version of a tree, if any of its rows wraps. */
export const narrowTree = (root: AnyBlock): AnyBlock | null => (hasWrap(root) ? narrowed(root) : null);
