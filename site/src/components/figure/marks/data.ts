/** Marks for data structures: strips of cells and tables of rows, whose cells and rows edges can address. */
import { COMMON, mark, type Common, type Marker } from "../mark";
import { measure, measureStyle } from "../measure";
import type { Block, Dir, Op, Part, Rect, State, Tone } from "../model";
import { byOutline, clipIdOf, group, ink, line, lookOf, partFill, rect, shapeStyle, solid, stateOutline, stripLook, styled, tint, V } from "../paint";
import { CELL, FONT, NODE, RADIUS, STROKE, TABLE, TEXT, r2 } from "../theme";

export type CellItem = {
  id?: string;
  label?: string;
  sub?: string;
  tone?: Tone;
  state?: State;
};
export type CellInput = string | number | null | CellItem;

export interface CellsProps extends Common {
  items: CellInput[];
  dir?: Dir;
  /** lay the items out as a grid this many cells wide (one frame, dividers both ways) */
  cols?: number;
  cell?: number;
  mono?: boolean;
  index?: boolean;
  ellipsis?: "start" | "end" | "both";
}
interface CellsData {
  items: CellItem[];
  dir: Dir;
  cols?: number;
  cell?: number;
  mono: boolean;
  index: boolean;
  ellipsis?: "start" | "end" | "both";
}
interface CellPart {
  label?: string;
  sub?: string;
  mono: boolean;
  index?: number;
}

const asCell = (c: CellInput): CellItem => (c === null ? {} : typeof c === "object" ? c : { label: String(c) });

function cellSize(d: CellsData): { s: number; h: number } {
  const size = d.mono ? FONT.mono : FONT.label;
  const labelW = Math.max(0, ...d.items.map((c) => Math.max(c.label ? measure(c.label, size, { mono: d.mono }) : 0, c.sub ? measure(c.sub, FONT.note - 1) : 0)));
  const s = Math.max(d.cell ?? CELL.size, labelW + CELL.pad);
  return { s, h: d.items.some((c) => c.sub) ? s + 12 : s };
}

function cellContent(c: Part<CellPart>, dir: Dir, s: number, uid: string): Op[] {
  const r = c.rect;
  const l = lookOf(c.state, uid, "none", c.tone);
  const cy = r.y + s / 2;
  const { label, sub, mono, index } = c.data;
  const out: Op[] = [];
  if (label) out.push({ el: "text", x: r.x + r.w / 2, y: sub ? cy - 5 : cy, text: label, size: mono ? FONT.mono : FONT.label, weight: c.state === "strong" ? 600 : undefined, mono, fill: l.text, italic: l.italic });
  if (sub) out.push({ el: "text", x: r.x + r.w / 2, y: cy + 8, text: sub, size: FONT.note - 1, fill: l.sub });
  if (index !== undefined) {
    const at = dir === "row" ? { x: r.x + r.w / 2, y: r.y + r.h + CELL.index / 2 + 1 } : { x: r.x + r.w + CELL.index / 2 + 2, y: cy };
    out.push({ el: "text", ...at, text: String(index), size: FONT.note - 1.5, fill: V("muted"), mono: true });
  }
  return out;
}

export const Cells: Marker<CellsProps> = mark<CellsProps, CellsData>({
  kind: "cells",
  solid: true,
  obstacle: true,
  props: { ...COMMON, items: true, dir: ["row", "col"], cols: "number", cell: "number", mono: true, index: true, ellipsis: ["start", "end", "both"] },
  data: (p) => ({ items: (p.items ?? []).map(asCell), dir: p.dir ?? "row", cols: p.cols, cell: p.cell, mono: p.mono !== false, index: p.index === true, ellipsis: p.ellipsis }),
  size({ data: d }) {
    const { s, h } = cellSize(d);
    const n = d.items.length;
    if (d.cols) return { w: d.cols * s, h: Math.ceil(n / d.cols) * h };
    const ell = (d.ellipsis === "both" ? 2 : d.ellipsis ? 1 : 0) * CELL.ellipsis;
    const idx = d.index ? CELL.index : 0;
    return d.dir === "row" ? { w: n * s + ell, h: h + idx } : { w: s + idx, h: n * h + ell };
  },
  parts(b, rect) {
    const d = b.data;
    const { s, h } = cellSize(d);
    const start = d.ellipsis === "start" || d.ellipsis === "both" ? CELL.ellipsis : 0;
    return d.items.map((c, i): Part<CellPart> => ({
      id: c.id ?? `${b.id}.${i}`,
      state: c.state ?? "default",
      tone: c.tone,
      rect: d.cols
        ? { x: rect.x + (i % d.cols) * s, y: rect.y + Math.floor(i / d.cols) * h, w: s, h }
        : d.dir === "row"
          ? { x: rect.x + start + i * s, y: rect.y, w: s, h }
          : { x: rect.x, y: rect.y + start + i * h, w: s, h },
      data: { label: c.label, sub: c.sub, mono: d.mono, index: d.index ? i : undefined },
    }));
  },
  paint(it, { uid }) {
    const r = it.rect;
    const { dir, cols, index, ellipsis } = it.data;
    const l = stripLook(it.state, uid);
    const { s, h: cellH } = cellSize(it.data);
    const grid = cols ?? 0;
    const frame: Rect = grid || dir === "col" ? { x: r.x, y: r.y, w: r.w - (!grid && index ? CELL.index : 0), h: r.h } : { x: r.x, y: r.y, w: r.w, h: cellH };
    const ell = (side: "start" | "end") => (!grid && (ellipsis === side || ellipsis === "both") ? CELL.ellipsis : 0);
    const inner: Rect =
      dir === "row"
        ? { x: frame.x + ell("start"), y: frame.y, w: frame.w - ell("start") - ell("end"), h: frame.h }
        : { x: frame.x, y: frame.y + ell("start"), w: frame.w, h: frame.h - ell("start") - ell("end") };
    const rx = Math.min(RADIUS.cell, s / 4);
    const divider = { stroke: l.stroke, strokeWidth: STROKE.divider };
    const cells = it.parts as Part<CellPart>[];
    const vLine = (x: number): Op => ({ el: "line", x1: r2(x), y1: r2(inner.y), x2: r2(x), y2: r2(inner.y + inner.h), style: divider } as Op);
    const hLineAt = (y: number): Op => ({ el: "line", x1: r2(inner.x), y1: r2(y), x2: r2(inner.x + inner.w), y2: r2(y), style: divider } as Op);
    const dividers: Op[] = grid
      ? [
          ...Array.from({ length: grid - 1 }, (_, c) => vLine(inner.x + (c + 1) * s)),
          ...Array.from({ length: Math.ceil(cells.length / grid) - 1 }, (_, i) => hLineAt(inner.y + (i + 1) * cellH)),
        ]
      : cells.flatMap((c) => {
          const cr = c.rect;
          if (Math.abs(dir === "row" ? cr.x - inner.x : cr.y - inner.y) < 0.5) return [];
          return [dir === "row" ? vLine(cr.x) : hLineAt(cr.y)];
        });
    const clip = clipIdOf(uid, it.id);
    const dots = (cx: number, cy: number): Op => ({
      el: "g",
      style: { fill: V("muted") },
      kids: [-1, 0, 1].map((k) => ({ el: "circle", cx: r2(dir === "row" ? cx + k * 5 : cx), cy: r2(dir === "row" ? cy : cy + k * 5), r: 1.5 })),
    });
    return [
      group(
        { el: "clipPath", id: clip, kids: [rect(inner, undefined, rx)] },
        rect(inner, { ...shapeStyle(l), stroke: "none" }, rx),
        { el: "g", clipPath: `url(#${clip})`, kids: cells.map((c) => rect(c.rect, { fill: partFill(c, uid) })) },
        ...dividers,
        rect(inner, { ...shapeStyle(l), fill: "none" }, rx),
        ...(ell("start") > 0 ? [dots(dir === "row" ? frame.x + CELL.ellipsis / 2 : frame.x + frame.w / 2, dir === "row" ? frame.y + frame.h / 2 : frame.y + CELL.ellipsis / 2)] : []),
        ...(ell("end") > 0 ? [dots(dir === "row" ? frame.x + frame.w - CELL.ellipsis / 2 : frame.x + frame.w / 2, dir === "row" ? frame.y + frame.h / 2 : frame.y + frame.h - CELL.ellipsis / 2)] : []),
        ...[...cells].sort(byOutline).map((c) => group(...stateOutline(c, inner, rx, uid), ...cellContent(c, dir, s, uid))),
      ),
    ];
  },
});

export type TableCell = string | number | null | { text: string; tone?: Tone; solid?: boolean; mono?: boolean };

export interface TableRow {
  id?: string;
  cells: TableCell[];
  state?: State;
  tone?: Tone;
}
export type RowInput = TableRow["cells"] | TableRow;

export interface TableProps extends Common {
  columns?: string[];
  rows: RowInput[];
  mono?: boolean;
  /** placeholder text shown when there are no rows */
  empty?: string;
}
interface TableData {
  columns?: string[];
  rows: TableRow[];
  mono: boolean;
  empty?: string;
}
interface RowPart {
  cells: TableCell[];
  mono: boolean;
}

const cellText = (c: TableCell): string => (c === null ? "" : typeof c === "object" ? c.text : String(c));
/** Width of a toned table chip. */
const chipW = (text: string, mono: boolean) => Math.max(18, measureStyle(text, { ...TEXT.chip, mono }) + 8);

export function tableColumnWidths(columns: string[] | undefined, rows: { cells: TableCell[] }[], mono: boolean): number[] {
  const n = Math.max(columns?.length ?? 0, ...rows.map((r) => r.cells.length));
  const widths: number[] = [];
  for (let c = 0; c < n; c++) {
    let w = columns?.[c] ? measureStyle(columns[c], TEXT.tableHeader) : 0;
    for (const r of rows) {
      const cell = r.cells[c];
      if (cell === undefined || cell === null) continue;
      const isMono = typeof cell === "object" ? cell.mono ?? mono : mono;
      const tw = typeof cell === "object" && cell.tone ? chipW(cell.text, isMono) : measure(cellText(cell), isMono ? FONT.mono : FONT.label, { mono: isMono });
      w = Math.max(w, tw);
    }
    widths.push(Math.max(24, w + 2 * TABLE.padX));
  }
  return widths;
}

function tableCell(cell: TableCell, x: number, cy: number, mono: boolean, color: string, italic: boolean): Op[] {
  if (cell === null || cell === undefined) return [];
  if (typeof cell === "object") {
    const isMono = cell.mono ?? mono;
    if (cell.tone) {
      const w = chipW(cell.text, isMono);
      const h = 18;
      return [
        group(
          {
            el: "rect",
            x: r2(x),
            y: r2(cy - h / 2),
            width: r2(w),
            height: h,
            rx: 4,
            style: { fill: cell.solid ? solid(cell.tone) : tint(cell.tone), stroke: cell.solid ? "none" : line(cell.tone), strokeWidth: STROKE.border },
          },
          { el: "text", x: x + w / 2, y: cy, ...styled(cell.text, { ...TEXT.chip, mono: isMono }), fill: cell.solid ? V("surface") : ink(cell.tone) },
        ),
      ];
    }
    return [{ el: "text", x, y: cy, text: cell.text, size: isMono ? FONT.mono : FONT.label, mono: isMono, fill: color, anchor: "start", italic }];
  }
  return [{ el: "text", x, y: cy, text: String(cell), size: mono ? FONT.mono : FONT.label, mono, fill: color, anchor: "start", italic }];
}

const tableEmpty = (d: TableData) => d.rows.length === 0 && !d.columns;

export const Table: Marker<TableProps> = mark<TableProps, TableData>({
  kind: "table",
  solid: true,
  obstacle: true,
  props: { ...COMMON, columns: true, rows: true, mono: true, empty: true },
  data: (p) => ({ columns: p.columns, rows: (p.rows ?? []).map((r) => (Array.isArray(r) ? { cells: r } : r)), mono: p.mono !== false, empty: p.empty }),
  size({ data: d }: Block<TableData>) {
    if (tableEmpty(d)) return { w: d.empty ? measure(d.empty, FONT.label) + 2 * NODE.padX : 60, h: TABLE.emptyH };
    const w = tableColumnWidths(d.columns, d.rows, d.mono).reduce((a, x) => a + x, 0);
    return { w, h: ((d.columns ? 1 : 0) + d.rows.length) * TABLE.rowH };
  },
  parts(b, rect) {
    const top = rect.y + (b.data.columns ? TABLE.rowH : 0);
    return b.data.rows.map((r, i): Part<RowPart> => ({
      id: r.id ?? `${b.id}.r${i}`,
      state: r.state ?? "default",
      tone: r.tone,
      rect: { x: rect.x, y: top + i * TABLE.rowH, w: rect.w, h: TABLE.rowH },
      data: { cells: r.cells, mono: b.data.mono },
    }));
  },
  paint(it, { uid }) {
    const r = it.rect;
    const d = it.data;
    if (tableEmpty(d)) {
      const l = lookOf("placeholder", uid, "none");
      return [
        group(
          rect(r, shapeStyle(l), RADIUS.cell),
          ...(d.empty ? [{ el: "text" as const, x: r.x + r.w / 2, y: r.y + r.h / 2, text: d.empty, size: FONT.label, fill: l.text, italic: true }] : []),
        ),
      ];
    }
    const l = stripLook(it.state, uid);
    const widths = tableColumnWidths(d.columns, d.rows, d.mono);
    const colX: number[] = [];
    let acc = r.x;
    widths.forEach((w, i) => {
      colX[i] = acc;
      acc += w;
    });
    const headerH = d.columns ? TABLE.rowH : 0;
    const rows = it.parts as Part<RowPart>[];
    const clip = clipIdOf(uid, it.id);
    const rule = { stroke: l.stroke, strokeWidth: STROKE.divider };
    const fills = rows.flatMap((row) => {
      const fill = partFill(row, uid);
      return fill === "none" ? [] : [rect(row.rect, { fill })];
    });
    return [
      group(
        { el: "clipPath", id: clip, kids: [rect(r, undefined, RADIUS.cell)] },
        rect(r, { ...shapeStyle(l), stroke: "none" }, RADIUS.cell),
        { el: "g", clipPath: `url(#${clip})`, kids: [...(d.columns ? [{ el: "rect" as const, x: r2(r.x), y: r2(r.y), width: r2(r.w), height: headerH, style: { fill: V("panel") } }] : []), ...fills] },
        ...(d.columns ?? []).map((c, i): Op => ({ el: "text", x: colX[i] + TABLE.padX, y: r.y + headerH / 2, ...styled(c, TEXT.tableHeader), fill: V("muted"), anchor: "start" })),
        ...rows.flatMap((row, i) => (i === 0 && !d.columns ? [] : [{ el: "line", x1: r2(r.x), y1: r2(row.rect.y), x2: r2(r.x + r.w), y2: r2(row.rect.y), style: rule } as Op])),
        ...(d.columns ? colX.slice(1).map((x) => ({ el: "line", x1: r2(x), y1: r2(r.y), x2: r2(x), y2: r2(r.y + r.h), style: rule } as Op)) : []),
        rect(r, { ...shapeStyle(l), fill: "none" }, RADIUS.cell),
        ...[...rows].sort(byOutline).map((row) => {
          const rl = lookOf(row.state, uid, "none", row.tone);
          return group(
            ...stateOutline(row, r, RADIUS.cell, uid),
            ...row.data.cells.map((cell, ci) => group(...tableCell(cell, colX[ci] + TABLE.padX, row.rect.y + row.rect.h / 2, row.data.mono, rl.text, rl.italic))),
          );
        }),
      ),
    ];
  },
});
