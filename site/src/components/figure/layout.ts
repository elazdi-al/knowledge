/**
 * `layoutScene`: measure every block bottom-up, place top-down, flatten into
 * absolutely positioned items. Dev lint runs on the result.
 */
import { layoutGraph, type GEdge } from "./graph";
import { measure, measureStyle } from "./measure";
import { formatDiagnostic, type Diagnostic } from "./diagnostics";
import {
  isContainer,
  partIds,
  type Block,
  type Container,
  type EdgeSpec,
  type Frame,
  type Item,
  type Rect,
  type Scene,
  type Shape,
  type State,
  type TableCell,
  type Tone,
} from "./model";
import { encloses, insideOutline, isSolid, labelPillW, routeItems, samplePath } from "./route";
import { CELL, EDGE_GAP, EDGE_LABEL, FONT, GROUP, LABEL_CLEAR, MARGIN, MAX_CONTENT_W, NODE, TABLE, TAG, TEXT, type TextStyle } from "./theme";

interface Size {
  w: number;
  h: number;
}

const TEXT_PX = { title: FONT.title, label: FONT.label, note: FONT.note } as const;

/** Width of a toned table chip. */
export const chipW = (text: string, mono: boolean) => Math.max(18, measureStyle(text, { ...TEXT.chip, mono }) + 8);

type TitleOf = { mono?: boolean; state: State; shape: Shape; tone?: Tone };
/** How a node's title is drawn: mono as data; semibold when it carries a tone, the accent or emphasis; the ISA triangle at note size. */
export const nodeTitleStyle = (b: TitleOf): TextStyle =>
  b.mono
    ? { size: FONT.mono, mono: true, weight: b.state === "strong" ? 600 : undefined }
    : { size: b.shape === "triangle" ? FONT.note : FONT.title, weight: b.tone || b.state === "strong" || b.state === "active" ? 600 : 500 };
export const nodeTitleW = (b: TitleOf & { title?: string }) => (b.title ? measureStyle(b.title, nodeTitleStyle(b)) : 0);

export const cellText = (c: TableCell): string =>
  c === null ? "" : typeof c === "object" ? c.text : String(c);

export function tableColumnWidths(columns: string[] | undefined, rows: { cells: TableCell[] }[], mono: boolean): number[] {
  const n = Math.max(columns?.length ?? 0, ...rows.map((r) => r.cells.length));
  const widths: number[] = [];
  for (let c = 0; c < n; c++) {
    let w = columns?.[c] ? measureStyle(columns[c], TEXT.tableHeader) : 0;
    for (const r of rows) {
      const cell = r.cells[c];
      if (cell === undefined || cell === null) continue;
      const isMono = typeof cell === "object" ? cell.mono ?? mono : mono;
      const tw =
        typeof cell === "object" && cell.tone ? chipW(cell.text, isMono) : measure(cellText(cell), isMono ? FONT.mono : FONT.label, { mono: isMono });
      w = Math.max(w, tw);
    }
    widths.push(Math.max(24, w + 2 * TABLE.padX));
  }
  return widths;
}

export function cellSize(b: Extract<Block, { kind: "cells" }>): { s: number; h: number } {
  const size = b.mono ? FONT.mono : FONT.label;
  const labelW = Math.max(
    0,
    ...b.items.map((c) => Math.max(c.label ? measure(c.label, size, { mono: b.mono }) : 0, c.sub ? measure(c.sub, FONT.note - 1) : 0)),
  );
  const s = Math.max(b.cell ?? CELL.size, labelW + CELL.pad);
  const hasSub = b.items.some((c) => c.sub);
  return { s, h: hasSub ? s + 12 : s };
}

function leafSize(b: Block): Size {
  switch (b.kind) {
    case "space":
      return { w: b.w, h: b.h };
    case "node": {
      const titleW = nodeTitleW(b);
      const subW = b.sub ? measure(b.sub, FONT.note) : 0;
      const textW = Math.max(titleW, subW);
      const baseH = b.sub ? NODE.hSub : NODE.h;
      if (b.shape === "circle") {
        const d = b.w ?? Math.max(NODE.circleMin, textW + 16, b.sub ? NODE.hSub : 0);
        return { w: d, h: b.h ?? d };
      }
      if (b.shape === "diamond") {
        // the inscribed width at the text band's corner is hw * (1 - band / hh); a double
        // diamond sizes its inner outline this way and inflates (the offset rhombus is similar)
        const hh = (b.sub ? NODE.diamondH + 16 : NODE.diamondH) / 2;
        const band = b.sub ? 15 : FONT.title / 2 + 2;
        const hw = Math.max(NODE.diamondMinW / 2, (textW / 2 + 4) / (1 - band / hh));
        const k = b.double ? 1 + NODE.doubleInset * Math.hypot(1 / hw, 1 / hh) : 1;
        return { w: b.w ?? 2 * hw * k, h: b.h ?? 2 * hh * k };
      }
      if (b.shape === "triangle") {
        // fixed height; the label sits 0.4 h below the flat top and the taper at the band's bottom must clear it
        const h = b.h ?? NODE.triangleH;
        const bottom = 0.4 * h + FONT.note / 2 + 1;
        return { w: b.w ?? Math.max(NODE.triangleH, (textW + 8) / (1 - bottom / h)), h };
      }
      const w = b.w ?? Math.max(NODE.minW, textW + 2 * NODE.padX);
      const h = b.h ?? (b.shape === "cylinder" ? baseH + NODE.cap : baseH);
      return { w, h };
    }
    case "cells": {
      const { s, h } = cellSize(b);
      const n = b.items.length;
      if (b.cols) return { w: b.cols * s, h: Math.ceil(n / b.cols) * h };
      const ell = (b.ellipsis === "both" ? 2 : b.ellipsis ? 1 : 0) * CELL.ellipsis;
      const idx = b.index ? CELL.index : 0;
      return b.dir === "row" ? { w: n * s + ell, h: h + idx } : { w: s + idx, h: n * h + ell };
    }
    case "table": {
      if (b.rows.length === 0 && !b.columns) {
        const w = b.empty ? measure(b.empty, FONT.label) + 2 * NODE.padX : 60;
        return { w, h: TABLE.emptyH };
      }
      const widths = tableColumnWidths(b.columns, b.rows, b.mono);
      const w = widths.reduce((a, x) => a + x, 0);
      return { w, h: ((b.columns ? 1 : 0) + b.rows.length) * TABLE.rowH };
    }
    case "text": {
      const px = TEXT_PX[b.size];
      const weight = b.weight ?? (b.size === "title" ? 600 : 400);
      return { w: measure(b.text, b.mono ? px - 0.5 : px, { mono: b.mono, weight }), h: Math.round(px * 1.4) };
    }
    case "tag":
      return { w: measureStyle(b.text, TEXT.tag) + 2 * TAG.padX, h: TAG.h };
    case "dots":
      return b.dir === "row" ? { w: 18, h: 6 } : { w: 6, h: 18 };
    case "poly":
    case "path":
      return { w: Math.max(0, ...b.points.map(([x]) => x)), h: Math.max(0, ...b.points.map(([, y]) => y)) };
    case "dot":
      return { w: 2 * b.r, h: 2 * b.r };
  }
  throw new Error(`[diagram] not a leaf: ${b.kind}`);
}

function graphEdgesFor(b: Extract<Block, { kind: "graph" }>, scene: Scene) {
  const owner = new Map(b.children.flatMap((c) => [c.id, ...partIds(c)].map((id) => [id, c.id] as const)));
  const out: GEdge[] = [];
  for (const e of scene.edges) {
    const from = owner.get(e.from), to = owner.get(e.to);
    if (from && to) out.push({ from, to, label: e.label ? labelPillW(e.label) : undefined });
  }
  return out;
}

interface Ctx {
  scene: Scene;
  sizes: Map<Block, Size>;
  items: Item[];
}

function idsUnder(b: Block, out = new Set<string>()): Set<string> {
  out.add(b.id);
  for (const part of partIds(b)) out.add(part);
  if (isContainer(b)) for (const c of b.children) idsUnder(c, out);
  return out;
}

/** Gap after each child of a stack: the author's gap, grown to `EDGE_GAP` for an edge between adjacent children, and so a labelled edge's label has `LABEL_CLEAR` around it. */
function gapsOf(b: Extract<Block, { kind: "row" | "col" | "group" }>, ctx: Ctx): number[] {
  const horizontal = (b.kind === "group" ? b.dir : b.kind) === "row";
  const sets = b.children.map((c) => idsUnder(c));
  return sets.slice(1).map((next, i) => {
    const prev = sets[i];
    let g = b.gap;
    for (const e of ctx.scene.edges) {
      if ((prev.has(e.from) && next.has(e.to)) || (prev.has(e.to) && next.has(e.from))) g = Math.max(g, edgeGap(e, horizontal));
    }
    return g;
  });
}

/** Room an edge needs between the two items it joins along a horizontal or vertical gap: a readable arrow, or its label (which sits on the line) with clearance. Undirected connectors (tree links) keep the author's gap. */
const edgeGap = (e: EdgeSpec, horizontal: boolean) =>
  e.label ? Math.max(EDGE_GAP, (horizontal ? labelPillW(e.label) : EDGE_LABEL.h) + LABEL_CLEAR) : e.head === "none" ? 0 : EDGE_GAP;

function size(b: Block, ctx: Ctx): Size {
  let s = ctx.sizes.get(b);
  if (!s) {
    s = isContainer(b) ? arrange(b, b.children.map((c) => size(c, ctx)), ctx).size : leafSize(b);
    ctx.sizes.set(b, s);
  }
  return s;
}

interface Arranged {
  size: Size;
  /** child boxes, relative to this block's box */
  rects: Rect[];
}

/** One layout per container. Called without `given` to measure, and with the final size to place, since a parent may stretch it. */
function arrange(b: Container, kids: Size[], ctx: Ctx, given?: Size): Arranged {
  switch (b.kind) {
    case "row":
    case "col":
    case "group":
      return arrangeStack(b, kids, ctx, given);
    case "grid":
      return arrangeGrid(b, kids, ctx);
    case "graph": {
      const pos = layoutGraph(
        b.children.map((c, i) => ({ id: c.id, w: kids[i].w, h: kids[i].h })),
        graphEdgesFor(b, ctx.scene),
        b.dir,
        b.gap,
        b.rankGap,
      );
      return boxesAt(b.children.map((c) => pos.get(c.id) ?? { x: 0, y: 0 }), kids);
    }
    case "free":
      return boxesAt(b.children.map((c) => ({ x: c.x ?? 0, y: c.y ?? 0 })), kids);
  }
}

const boxesAt = (at: { x: number; y: number }[], kids: Size[]): Arranged => {
  const rects = at.map((p, i) => ({ x: p.x, y: p.y, w: kids[i].w, h: kids[i].h }));
  return { size: { w: Math.max(0, ...rects.map((r) => r.x + r.w)), h: Math.max(0, ...rects.map((r) => r.y + r.h)) }, rects };
};

const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);

function arrangeStack(b: Extract<Block, { kind: "row" | "col" | "group" }>, kids: Size[], ctx: Ctx, given?: Size): Arranged {
  const dir = b.kind === "group" ? b.dir : b.kind;
  const main = (k: Size) => (dir === "row" ? k.w : k.h);
  const cross = (k: Size) => (dir === "row" ? k.h : k.w);
  const band = b.kind === "group" && b.title ? GROUP.titleBand : 0;
  const titleW = b.kind === "group" && b.title ? measureStyle(b.title, TEXT.groupTitle) : 0;
  const gaps = gapsOf(b, ctx);
  const mainTotal = sum(kids.map(main)) + sum(gaps);
  const crossMax = Math.max(0, ...kids.map(cross));
  const inner = dir === "row" ? { w: mainTotal, h: crossMax } : { w: crossMax, h: mainTotal };
  const size = { w: Math.max(inner.w, titleW) + 2 * b.pad, h: inner.h + 2 * b.pad + band };
  const box = given ?? size;
  const availCross = dir === "row" ? box.h - 2 * b.pad - band : box.w - 2 * b.pad;
  const stretch = b.align === "stretch";
  let cursor = 0;
  const rects = kids.map((k, i) => {
    const off = stretch ? 0 : alignOffset(b.align, availCross, cross(k));
    const at = cursor;
    cursor += main(k) + (gaps[i] ?? 0);
    return dir === "row"
      ? { x: b.pad + at, y: b.pad + band + off, w: k.w, h: stretch ? availCross : k.h }
      : { x: b.pad + off, y: b.pad + band + at, w: stretch ? availCross : k.w, h: k.h };
  });
  return { size, rects };
}

function arrangeGrid(b: Extract<Block, { kind: "grid" }>, kids: Size[], ctx: Ctx): Arranged {
  const { colW, rowH, colGap, rowGap } = gridTracks(b, kids, ctx);
  const starts = (tracks: number[], gaps: number[]) => {
    let acc = 0;
    return tracks.map((t, i) => {
      const at = acc;
      acc += t + (gaps[i] ?? 0);
      return at;
    });
  };
  const colX = starts(colW, colGap), rowY = starts(rowH, rowGap);
  const rects = kids.map((k, i) => {
    const ci = i % colW.length, ri = Math.floor(i / colW.length);
    return b.align === "stretch"
      ? { x: colX[ci], y: rowY[ri], w: colW[ci], h: rowH[ri] }
      : { x: colX[ci] + alignOffset(b.align, colW[ci], k.w), y: rowY[ri] + (rowH[ri] - k.h) / 2, w: k.w, h: k.h };
  });
  return { size: { w: sum(colW) + sum(colGap), h: sum(rowH) + sum(rowGap) }, rects };
}

/** Track sizes of a grid, and the gap after each track: the author's gap, grown by `edgeGap` for an edge between cells adjacent across it. */
function gridTracks(b: Extract<Block, { kind: "grid" }>, kids: Size[], ctx: Ctx) {
  const cols = Math.max(1, b.cols);
  const colW = new Array<number>(cols).fill(0);
  const rowH = new Array<number>(Math.ceil(kids.length / cols)).fill(0);
  kids.forEach((k, i) => {
    colW[i % cols] = Math.max(colW[i % cols], k.w);
    rowH[Math.floor(i / cols)] = Math.max(rowH[Math.floor(i / cols)], k.h);
  });
  const colGap = new Array<number>(Math.max(0, cols - 1)).fill(b.colGap);
  const rowGap = new Array<number>(Math.max(0, rowH.length - 1)).fill(b.rowGap);
  const sets = b.children.map((c) => idsUnder(c));
  const cellOf = (id: string) => sets.findIndex((s) => s.has(id));
  for (const e of ctx.scene.edges) {
    const i = cellOf(e.from), j = cellOf(e.to);
    if (i < 0 || j < 0 || i === j) continue;
    const ci = i % cols, ri = Math.floor(i / cols), cj = j % cols, rj = Math.floor(j / cols);
    if (ri === rj && Math.abs(ci - cj) === 1) colGap[Math.min(ci, cj)] = Math.max(colGap[Math.min(ci, cj)], edgeGap(e, true));
    if (ci === cj && Math.abs(ri - rj) === 1) rowGap[Math.min(ri, rj)] = Math.max(rowGap[Math.min(ri, rj)], edgeGap(e, false));
  }
  return { colW, rowH, colGap, rowGap };
}

function alignOffset(align: string, avail: number, size: number) {
  return align === "end" ? avail - size : align === "center" ? (avail - size) / 2 : 0;
}

function place(b: Block, rect: Rect, parent: string | undefined, ctx: Ctx) {
  const { children: _c, x: _x, y: _y, ...rest } = b as Block & { children?: Block[] };
  ctx.items.push({ ...(rest as Omit<Block, "children" | "x" | "y">), rect, parent } as Item);

  if (b.kind === "cells") {
    const { s, h } = cellSize(b);
    const start = b.ellipsis === "start" || b.ellipsis === "both" ? CELL.ellipsis : 0;
    b.items.forEach((c, i) => {
      const r = b.cols
        ? { x: rect.x + (i % b.cols) * s, y: rect.y + Math.floor(i / b.cols) * h, w: s, h }
        : b.dir === "row"
          ? { x: rect.x + start + i * s, y: rect.y, w: s, h }
          : { x: rect.x, y: rect.y + start + i * h, w: s, h };
      ctx.items.push({
        kind: "cell",
        id: c.id ?? `${b.id}.${i}`,
        state: c.state ?? "default",
        tone: c.tone,
        label: c.label,
        sub: c.sub,
        mono: b.mono,
        index: b.index ? i : undefined,
        rect: r,
        parent: b.id,
      });
    });
    return;
  }
  if (b.kind === "table") {
    const top = rect.y + (b.columns ? TABLE.rowH : 0);
    b.rows.forEach((r, i) => {
      ctx.items.push({
        kind: "trow",
        id: r.id ?? `${b.id}.r${i}`,
        state: r.state ?? "default",
        tone: r.tone,
        cells: r.cells,
        mono: b.mono,
        rect: { x: rect.x, y: top + i * TABLE.rowH, w: rect.w, h: TABLE.rowH },
        parent: b.id,
      });
    });
    return;
  }
  if (!isContainer(b)) return;

  const { rects } = arrange(b, b.children.map((c) => size(c, ctx)), ctx, rect);
  b.children.forEach((c, i) => {
    const r = rects[i];
    place(c, { x: rect.x + r.x, y: rect.y + r.y, w: r.w, h: r.h }, b.id, ctx);
  });
}

export function layoutScene(scene: Scene): Frame {
  const ctx: Ctx = { scene, sizes: new Map(), items: [] };
  const s = size(scene.root, ctx);
  place(scene.root, { x: MARGIN, y: MARGIN, w: s.w, h: s.h }, undefined, ctx);
  const rects = Object.fromEntries(ctx.items.map((i) => [i.id, i.rect]));
  const edges = treeEdges(scene.root, scene.edges, rects);
  const fit = growToFit(ctx.items, edges, s);
  const frame: Frame = { ...fit, items: ctx.items, diagnostics: scene.diagnostics };
  frame.diagnostics = [...scene.diagnostics, ...lint(frame)];
  return frame;
}

/** Edges inside a `dir="down"` graph are tree connectors: ortho from the parent's bottom to the child's top centre. */
function treeEdges(root: Block, edges: EdgeSpec[], rects: Record<string, Rect>): EdgeSpec[] {
  const graphOf = new Map<string, Block>();
  const walk = (b: Block) => {
    if (!isContainer(b)) return;
    if (b.kind === "graph" && b.dir === "down") for (const c of b.children) for (const id of [c.id, ...partIds(c)]) graphOf.set(id, b);
    b.children.forEach(walk);
  };
  walk(root);
  if (!graphOf.size) return edges;
  return edges.map((e) => {
    if (e.route !== "auto" || e.from === e.to || !graphOf.get(e.from) || graphOf.get(e.from) !== graphOf.get(e.to)) return e;
    const down = rects[e.from].y <= rects[e.to].y;
    return { ...e, route: "ortho", fromSide: e.fromSide ?? (down ? "bottom" : "top"), toSide: e.toSide ?? (down ? "top" : "bottom") };
  });
}

/**
 * Arcs, loops and same-side curves bow past the items, loop labels sit beyond them, and a `Free` child may sit at a
 * negative offset (a label left of a plot); keep every item, path and pill in the viewBox. Moves the items if it must,
 * and returns the frame size and the final routes.
 */
function growToFit(items: Item[], edges: EdgeSpec[], content: Size) {
  let minX = MARGIN, minY = MARGIN, maxX = content.w + MARGIN, maxY = content.h + MARGIN;
  const extend = (x0: number, y0: number, x1: number, y1: number) => {
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  };
  for (const { rect: r } of items) extend(r.x, r.y, r.x + r.w, r.y + r.h);
  let routes = routeItems(items, edges);
  for (const r of routes) {
    for (const p of r.pts) extend(p.x - 4, p.y - 4, p.x + 4, p.y + 4);
    if (r.label && r.spec.label) {
      const hw = labelPillW(r.spec.label) / 2, hh = EDGE_LABEL.h / 2;
      extend(r.label.x - hw, r.label.y - hh, r.label.x + hw, r.label.y + hh);
    }
  }
  const dx = Math.max(0, MARGIN - minX), dy = Math.max(0, MARGIN - minY);
  if (dx > 0 || dy > 0) {
    for (const it of items) {
      it.rect.x += dx;
      it.rect.y += dy;
    }
    routes = routeItems(items, edges);
  }
  return { w: maxX + dx + MARGIN, h: maxY + dy + MARGIN, routes };
}

const overlaps = (a: Rect, b: Rect, slack = 0.5) =>
  a.x + a.w > b.x + slack && b.x + b.w > a.x + slack && a.y + a.h > b.y + slack && b.y + b.h > a.y + slack;

function lint(frame: Frame): Diagnostic[] {
  const out: Diagnostic[] = [];
  const warn = (code: Diagnostic["code"], message: string, hint?: string) => out.push({ code, severity: "warn", message, hint });
  if (frame.w > MAX_CONTENT_W) warn("frame/too-wide", `Frame is ${Math.round(frame.w)}px wide (max ${MAX_CONTENT_W}).`, "Stack or wrap.");

  const byParent = new Map<string | undefined, Item[]>();
  for (const it of frame.items) {
    const list = byParent.get(it.parent) ?? [];
    list.push(it);
    byParent.set(it.parent, list);
  }
  for (const [parent, sibs] of byParent) {
    const kind = frame.items.find((i) => i.id === parent)?.kind;
    if (kind === "cells" || kind === "table" || kind === "free") continue;
    for (let i = 0; i < sibs.length; i++)
      for (let j = i + 1; j < sibs.length; j++)
        if (overlaps(sibs[i].rect, sibs[j].rect)) warn("siblings/overlap", `Siblings "${sibs[i].id}" and "${sibs[j].id}" overlap.`);
  }
  for (const it of frame.items) {
    if (it.kind === "node" && it.title && nodeTitleW(it) + 8 > it.rect.w) warn("node/title-overflow", `Title "${it.title}" is wider than node "${it.id}".`);
  }
  const rects = Object.fromEntries(frame.items.map((i) => [i.id, i.rect]));
  const byId = new Map(frame.items.map((i) => [i.id, i]));
  // a line must end on something drawn: layout boxes are invisible, and a sized Space is empty room
  for (const { spec: e } of frame.routes) {
    for (const id of [e.from, e.to]) {
      const it = byId.get(id);
      if (it && (["row", "col", "grid", "graph", "free"].includes(it.kind) || (it.kind === "space" && (it.rect.w > 0 || it.rect.h > 0))))
        warn("edge/invisible-endpoint", `Edge ${e.id} ends on invisible ${it.kind} "${id}".`, "Attach it to the shape inside.");
    }
  }
  const solids = frame.items.filter((i) => isSolid(i.kind));
  const obstacles = frame.items.filter((i) => i.kind === "node" || i.kind === "cells" || i.kind === "table" || i.kind === "tag");
  const routes = frame.routes;
  const pillOf = (r: (typeof routes)[number]) => {
    const lw = labelPillW(r.spec.label ?? "");
    return { x: r.label!.x - lw / 2, y: r.label!.y - EDGE_LABEL.h / 2, w: lw, h: EDGE_LABEL.h };
  };
  for (const r of routes) {
    const a = rects[r.spec.from], b = rects[r.spec.to];
    const owner = (id: string) => byId.get(id)?.parent;
    const along = samplePath(r.pts);
    for (const it of obstacles) {
      if (it.id === r.spec.from || it.id === r.spec.to || it.id === owner(r.spec.from) || it.id === owner(r.spec.to)) continue;
      if (encloses(it.rect, a) || encloses(it.rect, b)) continue;
      const shape = it.kind === "node" ? it.shape : undefined;
      if (along.some((p) => insideOutline(shape, it.rect, p))) warn("edge/crosses-shape", `Edge ${r.spec.id} crosses "${it.id}".`, "Add a bend, set sides, or move the item.");
    }
    if (!r.label) continue;
    // a pill over its own endpoint means layout reserved no room for the label; only shared ancestors are exempt
    const lr = pillOf(r);
    for (const it of solids) {
      if (encloses(it.rect, a) && encloses(it.rect, b) && it.id !== r.spec.from && it.id !== r.spec.to) continue;
      if (overlaps(lr, it.rect)) warn("edge/label-overlap", `Label "${r.spec.label}" on edge ${r.spec.id} overlaps "${it.id}".`);
    }
  }
  const labelled = routes.filter((r) => r.label);
  for (let i = 0; i < labelled.length; i++)
    for (let j = i + 1; j < labelled.length; j++)
      if (overlaps(pillOf(labelled[i]), pillOf(labelled[j]))) warn("edge/label-overlap", `Labels on edges ${labelled[i].spec.id} and ${labelled[j].spec.id} overlap.`);
  return out;
}

/** Throws on errors, prints warnings in development. */
export function reportDiagnostics(frame: Frame, figure: string) {
  const errors = frame.diagnostics.filter((d) => d.severity === "error");
  if (errors.length) throw new Error(errors.map((d) => formatDiagnostic(d, figure)).join("\n"));
  if (process.env.NODE_ENV === "production") return;
  for (const d of frame.diagnostics) console.warn(formatDiagnostic(d, figure));
}
