import type { ReactNode } from "react";
import {
  Arrow,
  ArrowHead,
  Box,
  CellStrip,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  DotsEllipsis,
  FONT,
  Label,
  RADIUS,
  SPACE,
  STROKE,
  measureLabel,
  r2,
  stableId,
  type Pt,
} from "@/components/diagram";

/**
 * Index-structure maps in the textbook style: an entry column (the index)
 * joined to a data side by anchored connector arrows. One reusable spine -
 * an ordered stack of entry cells on one side, a data side (a multi-column
 * record table, a stack of multi-record pages, or a row of plain nodes) on
 * the other - handles each index figure through a small `mode` choice and
 * orthogonal data (`columns`, `buckets`, `levels`, `panels`).
 *
 * Modes:
 *   - "rows"      entry strips into a data-table. When a column's link
 *                 targets walk down the table in order, its entries are
 *                 pinned level with their target rows, so connectors run
 *                 horizontally (dense key, dense non-key group leaders).
 *                 A second plain column mirrors to the right of the table
 *                 so its arrows never cross the first column.
 *   - "pages"     entry strips anchored to a vertical stack of multi-record
 *                 page boxes, each entry level with its record (clustered
 *                 example, sparse anchors).
 *   - "levels"    a multi-level block cascade: an outer block feeding inner
 *                 blocks feeding data pages, notes in reserved bands.
 *   - "mapping"   two stacked node rows joined by mapping arrows that run
 *                 parallel (clustered) or cross (unclustered).
 *   - "frames"    a page-table strip linked to a buffer-pool strip, plus an
 *                 on-disk page strip sending a dashed fetch arrow up into a
 *                 free frame on a miss.
 *
 * Several modes accept a `panels` array to place two independent spines side
 * by side or stacked. Rendered once on the server (no client JS); every
 * colour and stroke comes from the shared diagram theme, all text flows
 * through <Label> (so `_{...}` runs render as real subscripts), and the
 * figure reads as one family with <StorageHierarchy> and <RAIDDiagram>.
 */

// --------------------------------------------------------------------------
// Public data model
// --------------------------------------------------------------------------

/** A single cell in an index entry strip or a bucket strip. */
export interface EntryBox {
  /** Stable id, referenced by links. */
  id: string;
  /** Display text; `_{...}` renders as a subscript. */
  label: string | number;
  /** Visual state: `highlight` = inverted cell, `accent` = heavier stroke. */
  state?: "normal" | "highlight" | "accent";
}

/** A vertical strip of entry/bucket cells with an optional bold title. */
export interface EntryColumn {
  /** Stable id (used to disambiguate two columns). */
  id?: string;
  /** Bold title above the strip. */
  title?: string;
  entries: EntryBox[];
  /** Visual flavour: "entry" (default, element fill) or "bucket" (tint). */
  kind?: "entry" | "bucket";
  /** Small muted note centred beneath the strip. */
  note?: string;
}

/** One record row in the data table; cells are the column values, left→right. */
export interface DataRow {
  id: string;
  cells: Array<string | number>;
  /** Start a new group above this row (draws a heavier separator rule). */
  groupStart?: boolean;
  state?: "normal" | "highlight";
}

/** The central record table on the data side. */
export interface DataTable {
  /** Column headers, left→right. Also fixes the column count. */
  headers: string[];
  rows: DataRow[];
  /** Per-column relative widths (minimums; text never clips). */
  weights?: number[];
  title?: string;
}

/** A multi-record page box on the data side ("pages" mode). */
export interface PageBox {
  id: string;
  title?: string;
  /** Record rows inside the page; each cell laid out as a mini table. */
  rows: Array<Array<string | number>>;
}

/** A small node in a node row ("mapping" mode) or the disk row ("frames"). */
export interface MapNode {
  id: string;
  label: string | number;
  state?: "normal" | "highlight" | "accent";
}

/** A multi-level block ("levels" mode). */
export interface LevelBlock {
  id: string;
  title?: string;
  /** Number of faint placeholder rows drawn inside the block. */
  rows?: number;
  /** Draw a vertical drawn-dots glyph to suggest continuation. */
  ellipsis?: boolean;
  /** Index blocks: muted note beneath the block (wrapped to the block
   *  width). Data blocks: muted label inside the block. */
  note?: string;
  /** Block size: "wide" data-page blocks vs default index blocks. */
  kind?: "index" | "data";
}

/** A connector between two anchors, addressed by id (+ optional side). */
export interface IndexLink {
  /** Source anchor: an entry/bucket id, a page id, or a node id. */
  from: string;
  /** Target anchor: a data-row id, a page id, a node id, or a block id. */
  to: string;
  /** Override which faces are joined. Defaults to a sensible left→right or
   *  top→bottom depending on the relative positions. */
  fromSide?: Side;
  toSide?: Side;
  /** Connector style: solid (default), dashed fetch, or a scan flow.
   *  All connectors share the family ink and one chevron marker. */
  variant?: "solid" | "dashed" | "flow";
  /** Bow the connector gently (bucket fan-out). */
  curve?: boolean;
  label?: string;
}

type Side = "left" | "right" | "top" | "bottom";

/** A self-contained spine, for two-up / stacked layouts. */
export interface Panel {
  title?: string;
  /** Top node row (mapping mode). */
  topRow?: MapNode[];
  /** Bottom node row (mapping mode). */
  bottomRow?: MapNode[];
  /** Link the top row left→right as a doubly-linked leaf chain. */
  chainTop?: boolean;
  /** Mapping arrows from top-row ids to bottom-row ids. */
  links: IndexLink[];
  /** A horizontal "scan" flow arrow above the panel with this label. */
  scan?: string;
  /** Muted notes beneath each row. */
  topNote?: string;
  bottomNote?: string;
}

interface Props {
  mode: "rows" | "pages" | "levels" | "mapping" | "frames";

  // --- rows / pages / levels / frames -------------------------------------
  /** Entry columns on the left of the data side (the index). */
  columns?: EntryColumn[];
  /** Entry columns on the right of the data side (two-sided composite keys). */
  rightColumns?: EntryColumn[];
  /** Bucket column sitting between the index and the data side (secondary). */
  buckets?: EntryColumn;
  /** The central record table. */
  table?: DataTable;
  /** Page boxes on the data side ("pages" mode), stacked vertically. */
  pages?: PageBox[];
  /** Level blocks ("levels" mode), grouped into visual stages. */
  levels?: LevelBlock[][];
  /** Frame column ("frames" mode): the buffer-pool slots. */
  frames?: EntryColumn;
  /** On-disk page row ("frames" mode). */
  disk?: { title?: string; pages: MapNode[] };
  /** Connectors addressed by anchor id. */
  links?: IndexLink[];

  // --- mapping ------------------------------------------------------------
  /** Side-by-side ("row") or stacked ("col") panels for mapping mode. */
  panels?: Panel[];
  panelLayout?: "row" | "col";

  title?: string;
  caption?: string;
  className?: string;
}

// --- geometry ---------------------------------------------------------------

const ROW_H = 26; // table row pitch; entry cells share it so links run level
const HEADER_H = 26; // table header band / column title band
const TITLE_DROP = 9; // bold title baseline above its element
const COL_GAP = 60; // horizontal run between linked stacks
const NOTE_DROP = 16; // note centre below an element
const MIN_CELL_W = 64; // narrowest entry strip
const PAGE_ROW = 24; // record row pitch inside a page box
const PAGE_HEAD = 22; // page title band
const PAGE_GAP = 16; // vertical gap between stacked pages
const PAGE_PAD = 10; // horizontal text padding inside a page field
const NODE_W_MIN = 34; // narrowest mapping node
const NODE_H = 28; // mapping node height
const NODE_GAP = 12; // gap between mapping nodes
const CHAIN_GAP = 26; // wider node gap when leaves are chained with arrows
const ROW_DROP = 72; // mapping top-row top to bottom-row top
const PANEL_GAP = 40; // gap between mapping panels
const TITLE_BAND = 22; // reserved band for a bold title above content
const SCAN_BAND = 30; // reserved band for the scan arrow + its label
const BLK_ROW = 11; // placeholder row pitch inside a level block
const BLK_HEAD = 22; // level block title band
const BLK_PAD = 10; // padding around placeholder rows
const BLK_GAP_Y = 18; // vertical gap between stacked level blocks
const DATA_W = 92; // data block width ("levels" mode)
const DATA_H = 62; // data block height
const NOTE_LINE = 14; // line pitch of a wrapped note

// --------------------------------------------------------------------------
// Shared bits
// --------------------------------------------------------------------------

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const cx = (b: Rect) => b.x + b.w / 2;
const cy = (b: Rect) => b.y + b.h / 2;

const OUT: Record<Side, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};

const sidePoint = (b: Rect, s: Side): Pt =>
  s === "left"
    ? { x: b.x, y: cy(b) }
    : s === "right"
      ? { x: b.x + b.w, y: cy(b) }
      : s === "top"
        ? { x: cx(b), y: b.y }
        : { x: cx(b), y: b.y + b.h };

function defaultSide(a: Rect, b: Rect, end: "from" | "to"): Side {
  // mostly horizontal: leave the facing side, enter the facing side
  if (Math.abs(cx(b) - cx(a)) >= Math.abs(cy(b) - cy(a))) {
    const goingRight = cx(b) >= cx(a);
    if (end === "from") return goingRight ? "right" : "left";
    return goingRight ? "left" : "right";
  }
  const goingDown = cy(b) >= cy(a);
  if (end === "from") return goingDown ? "bottom" : "top";
  return goingDown ? "top" : "bottom";
}

/** Endpoint pair for a link: leave the source face by 2px, stop 3px short of
 *  the target face so the chevron tip never touches the frame. */
function linkEnds(a: Rect, b: Rect, lk: IndexLink): { from: Pt; to: Pt } {
  const fs = lk.fromSide ?? defaultSide(a, b, "from");
  const ts = lk.toSide ?? defaultSide(a, b, "to");
  const p = sidePoint(a, fs);
  const q = sidePoint(b, ts);
  return {
    from: { x: p.x + OUT[fs][0] * 2, y: p.y + OUT[fs][1] * 2 },
    to: { x: q.x + OUT[ts][0] * 3, y: q.y + OUT[ts][1] * 3 },
  };
}

/** Gentle bow for `curve` links: leave roughly level, then turn. */
function bendFor(from: Pt, to: Pt, curve?: boolean): number {
  if (!curve) return 0;
  const dy = to.y - from.y;
  if (Math.abs(dy) < 4) return 0;
  return -Math.sign(dy) * Math.min(14, Math.abs(dy) * 0.25);
}

function LinkArrow({
  a,
  b,
  lk,
  markerId,
}: {
  a: Rect;
  b: Rect;
  lk: IndexLink;
  markerId: string;
}) {
  const { from, to } = linkEnds(a, b, lk);
  return (
    <Arrow
      from={from}
      to={to}
      markerId={markerId}
      dashed={lk.variant === "dashed"}
      bend={bendFor(from, to, lk.curve)}
      label={lk.label}
    />
  );
}

/** Greedy word-wrap at the note size so notes stay inside their slot. */
function wrapNote(text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    const cand = cur ? `${cur} ${word}` : word;
    if (cur && measureLabel(cand, FONT.note) > maxW) {
      lines.push(cur);
      cur = word;
    } else {
      cur = cand;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// --------------------------------------------------------------------------
// Entry strips: runs of contiguous cells, optionally pinned to target rows
// --------------------------------------------------------------------------

interface StripRun {
  y: number;
  entries: EntryBox[];
}

interface LaidColumn {
  data: EntryColumn;
  slot: Rect; // reserved horizontal band (strip + title/note overhang)
  stripX: number;
  stripW: number;
  cellH: number;
  runs: StripRun[];
  boxes: Map<string, Rect>; // per entry id
  bottom: number; // lowest strip bottom
}

const stripWidth = (col: EntryColumn) =>
  Math.max(
    MIN_CELL_W,
    ...col.entries.map(
      (e) => measureLabel(String(e.label), FONT.label) + 2 * SPACE.textPadX,
    ),
  );

const slotWidth = (col: EntryColumn, stripW: number) =>
  Math.max(
    stripW,
    col.title ? measureLabel(col.title, FONT.title, 700) : 0,
    col.note ? measureLabel(col.note, FONT.note) : 0,
  );

/** Group entries into contiguous runs. `pin` gives each entry the y of the
 *  cell it should sit level with; consecutive pins merge into one strip. */
function buildRuns(
  entries: EntryBox[],
  cellH: number,
  pin: (i: number) => number,
): StripRun[] {
  const runs: StripRun[] = [];
  for (let i = 0; i < entries.length; i++) {
    const y = pin(i);
    const last = runs[runs.length - 1];
    if (last && Math.abs(last.y + last.entries.length * cellH - y) < 0.5) {
      last.entries.push(entries[i]);
    } else {
      runs.push({ y, entries: [entries[i]] });
    }
  }
  return runs;
}

function layoutColumn(
  col: EntryColumn,
  slotX: number,
  cellH: number,
  pin: (i: number) => number,
): LaidColumn {
  const stripW = stripWidth(col);
  const slotW = slotWidth(col, stripW);
  const stripX = slotX + (slotW - stripW) / 2;
  const runs = buildRuns(col.entries, cellH, pin);
  const boxes = new Map<string, Rect>();
  let bottom = 0;
  let top = Infinity;
  for (const run of runs) {
    run.entries.forEach((e, j) => {
      boxes.set(e.id, { x: stripX, y: run.y + j * cellH, w: stripW, h: cellH });
    });
    top = Math.min(top, run.y);
    bottom = Math.max(bottom, run.y + run.entries.length * cellH);
  }
  return {
    data: col,
    slot: { x: slotX, y: top, w: slotW, h: bottom - top },
    stripX,
    stripW,
    cellH,
    runs,
    boxes,
    bottom,
  };
}

/** Render a laid column: cell strips, a bold title sitting just above the
 *  topmost strip, and a muted note beneath the lowest one. */
function ColumnEls({ laid }: { laid: LaidColumn }): ReactNode {
  const { data, slot, stripX, stripW, cellH, runs, boxes, bottom } = laid;
  const tint = data.kind === "bucket";
  return (
    <g>
      {data.title && (
        <Label
          x={cx(slot)}
          y={slot.y - TITLE_DROP}
          text={data.title}
          size={FONT.title}
          weight={700}
          baseline="baseline"
        />
      )}
      {runs.map((run, ri) => (
        <CellStrip
          key={ri}
          x={stripX}
          y={run.y}
          cellW={stripW}
          cellH={cellH}
          widths={run.entries.map(() => cellH)}
          orient="v"
          tint={tint}
          rx={RADIUS.cell}
          cells={run.entries.map((e) => ({
            label: String(e.label),
            state: e.state === "highlight" ? ("highlight" as const) : undefined,
          }))}
        />
      ))}
      {data.entries
        .filter((e) => e.state === "accent")
        .map((e) => {
          const b = boxes.get(e.id)!;
          return (
            <rect
              key={`acc-${e.id}`}
              x={r2(b.x)}
              y={r2(b.y)}
              width={r2(b.w)}
              height={r2(b.h)}
              rx={RADIUS.cell}
              fill="none"
              stroke={COLOR.fg}
              strokeWidth={STROKE.bold}
            />
          );
        })}
      {data.note && (
        <Label
          x={cx(slot)}
          y={bottom + NOTE_DROP}
          text={data.note}
          size={FONT.note}
          fill={COLOR.caption}
        />
      )}
    </g>
  );
}

// --------------------------------------------------------------------------
// The data table: one outer rect, single-stroke dividers, group rules
// --------------------------------------------------------------------------

interface LaidTable {
  frame: Rect;
  rows: Map<string, Rect>; // full-width row bands
  colX: number[];
  colW: number[];
  bodyTop: number;
  data: DataTable;
}

function layoutTable(t: DataTable, x: number, top: number): LaidTable {
  const weights = t.weights;
  const colW = t.headers.map((h, i) => {
    const textW = Math.max(
      measureLabel(h, FONT.label, 700),
      ...t.rows.map((r) => measureLabel(String(r.cells[i] ?? ""), FONT.label)),
    );
    const minW = weights ? (weights[i] ?? 1) * 70 : 0;
    return Math.max(textW + 2 * SPACE.textPadX, minW);
  });
  const colX: number[] = [];
  let acc = x;
  for (const w of colW) {
    colX.push(acc);
    acc += w;
  }
  const totalW = acc - x;
  const bodyTop = top + HEADER_H;
  const rows = new Map<string, Rect>();
  t.rows.forEach((r, i) => {
    rows.set(r.id, { x, y: bodyTop + i * ROW_H, w: totalW, h: ROW_H });
  });
  const frame: Rect = { x, y: top, w: totalW, h: HEADER_H + t.rows.length * ROW_H };
  return { frame, rows, colX, colW, bodyTop, data: t };
}

function TableEl({ laid }: { laid: LaidTable }) {
  const { frame, colX, colW, bodyTop, data } = laid;
  const clipId = stableId("im-table", {
    x: frame.x,
    y: frame.y,
    rows: data.rows.map((r) => r.id),
  });
  const anyHighlight = data.rows.some((r) => r.state === "highlight");
  return (
    <g>
      {anyHighlight && (
        <clipPath id={clipId}>
          <rect
            x={r2(frame.x)}
            y={r2(frame.y)}
            width={r2(frame.w)}
            height={r2(frame.h)}
            rx={RADIUS.box}
          />
        </clipPath>
      )}
      <rect
        x={r2(frame.x)}
        y={r2(frame.y)}
        width={r2(frame.w)}
        height={r2(frame.h)}
        rx={RADIUS.box}
        fill={COLOR.bg}
        stroke="none"
      />
      {anyHighlight && (
        <g clipPath={`url(#${clipId})`}>
          {data.rows.map((r) => {
            if (r.state !== "highlight") return null;
            const b = laid.rows.get(r.id)!;
            return (
              <rect
                key={`hi-${r.id}`}
                x={r2(b.x)}
                y={r2(b.y)}
                width={r2(b.w)}
                height={r2(b.h)}
                fill={COLOR.hiBg}
              />
            );
          })}
        </g>
      )}
      {/* column dividers */}
      {colX.slice(1).map((xx, i) => (
        <line
          key={`cv${i}`}
          x1={r2(xx)}
          y1={r2(frame.y)}
          x2={r2(xx)}
          y2={r2(frame.y + frame.h)}
          stroke={COLOR.fg}
          strokeWidth={STROKE.divider}
        />
      ))}
      {/* header divider + row dividers (group starts get a bold rule) */}
      <line
        x1={r2(frame.x)}
        y1={r2(bodyTop)}
        x2={r2(frame.x + frame.w)}
        y2={r2(bodyTop)}
        stroke={COLOR.fg}
        strokeWidth={STROKE.divider}
      />
      {data.rows.map((r, i) => {
        if (i === 0) return null;
        const y = bodyTop + i * ROW_H;
        return (
          <line
            key={`rh${i}`}
            x1={r2(frame.x)}
            y1={r2(y)}
            x2={r2(frame.x + frame.w)}
            y2={r2(y)}
            stroke={COLOR.fg}
            strokeWidth={r.groupStart ? STROKE.bold : STROKE.divider}
          />
        );
      })}
      {/* outer frame on top so dividers never poke past the corners */}
      <rect
        x={r2(frame.x)}
        y={r2(frame.y)}
        width={r2(frame.w)}
        height={r2(frame.h)}
        rx={RADIUS.box}
        fill="none"
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      {/* headers + cells */}
      {data.headers.map((h, i) => (
        <Label
          key={`h${i}`}
          x={colX[i] + colW[i] / 2}
          y={frame.y + HEADER_H / 2}
          text={h}
          weight={700}
        />
      ))}
      {data.rows.map((r) => {
        const b = laid.rows.get(r.id)!;
        const hi = r.state === "highlight";
        return r.cells.map((c, ci) => (
          <Label
            key={`${r.id}-${ci}`}
            x={colX[ci] + colW[ci] / 2}
            y={cy(b)}
            text={String(c)}
            fill={hi ? COLOR.hiFg : COLOR.fg}
          />
        ));
      })}
    </g>
  );
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------

type Built = { body: ReactNode; width: number; height: number };

export function IndexMap(props: Props) {
  const { mode, title, caption, className } = props;
  const headId = stableId("im-head", props);

  const built =
    mode === "mapping"
      ? buildMapping(props, headId)
      : mode === "levels"
        ? buildLevels(props, headId)
        : mode === "frames"
          ? buildFrames(props, headId)
          : mode === "pages"
            ? buildPages(props, headId)
            : buildRows(props, headId);

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={built.width}
        h={built.height}
        label={caption ?? "Index structure diagram"}
      >
        <defs>
          <ArrowHead id={headId} />
        </defs>
        {built.body}
      </DiagramSvg>
    </DiagramFigure>
  );
}

// --- "rows": entry strips into a record table --------------------------------

function buildRows(props: Props, headId: string): Built {
  const { buckets, table, links = [] } = props;
  let left = props.columns ?? [];
  let right = props.rightColumns ?? [];
  // A second plain index column mirrors to the right of the table, so its
  // connectors never have to cross the first column to reach the rows.
  if (table && !buckets && right.length === 0 && left.length > 1) {
    right = left.slice(1);
    left = left.slice(0, 1);
  }

  const top = SPACE.margin;
  const tableTitleBand = table?.title ? TITLE_BAND : 0;
  const tableTop = top + tableTitleBand;
  const bodyTop = tableTop + HEADER_H;

  const rowIndex = new Map<string, number>();
  table?.rows.forEach((r, i) => rowIndex.set(r.id, i));
  const rowY = (i: number) => bodyTop + i * ROW_H;

  // Pin a column's entries level with their target rows when the targets walk
  // down the table in order; otherwise stack them contiguously from the top.
  const pinFor = (col: EntryColumn): ((i: number) => number) => {
    const targets = col.entries.map((e) => {
      const lk = links.find((l) => l.from === e.id && rowIndex.has(l.to));
      return lk ? rowIndex.get(lk.to)! : undefined;
    });
    const monotone =
      targets.length > 0 &&
      targets.every((t) => t !== undefined) &&
      targets.every((t, i) => i === 0 || (t as number) > (targets[i - 1] as number));
    if (monotone) return (i) => rowY(targets[i] as number);
    return (i) => bodyTop + i * ROW_H;
  };

  // pack slots left to right: left columns, buckets, table, right columns
  const anchors = new Map<string, Rect>();
  const laidCols: LaidColumn[] = [];
  let cursor: number = SPACE.margin;
  const addColumn = (col: EntryColumn) => {
    const laid = layoutColumn(col, cursor, ROW_H, pinFor(col));
    laidCols.push(laid);
    for (const [id, b] of laid.boxes) anchors.set(id, b);
    cursor += laid.slot.w + COL_GAP;
  };

  for (const col of left) addColumn(col);
  if (buckets) addColumn(buckets);

  let laidTable: LaidTable | null = null;
  if (table) {
    const tableW = layoutTable(table, 0, 0).frame.w; // measure pass
    const slotW = Math.max(
      tableW,
      table.title ? measureLabel(table.title, FONT.title, 700) : 0,
    );
    laidTable = layoutTable(table, cursor + (slotW - tableW) / 2, tableTop);
    for (const [id, b] of laidTable.rows) anchors.set(id, b);
    cursor += slotW + COL_GAP;
  }

  for (const col of right) addColumn(col);

  const width = cursor - COL_GAP + SPACE.margin;
  const bottoms = [
    ...laidCols.map((l) => l.bottom + (l.data.note ? NOTE_DROP + 7 : 0)),
    laidTable ? laidTable.frame.y + laidTable.frame.h : 0,
  ];
  const height = Math.max(...bottoms) + SPACE.margin;

  const linkEls = links.map((lk, i) => {
    const a = anchors.get(lk.from);
    const b = anchors.get(lk.to);
    if (!a || !b) return null;
    return <LinkArrow key={`lk${i}`} a={a} b={b} lk={lk} markerId={headId} />;
  });

  return {
    body: (
      <>
        {linkEls}
        {laidCols.map((l, i) => (
          <ColumnEls key={`col${i}`} laid={l} />
        ))}
        {laidTable && (
          <>
            {laidTable.data.title && (
              <Label
                x={cx(laidTable.frame)}
                y={tableTop - TITLE_DROP}
                text={laidTable.data.title}
                size={FONT.title}
                weight={700}
                baseline="baseline"
              />
            )}
            <TableEl laid={laidTable} />
          </>
        )}
      </>
    ),
    width,
    height,
  };
}

// --- "pages": entry strips into a vertical stack of page boxes ---------------

function buildPages(props: Props, headId: string): Built {
  const col = props.columns?.[0];
  const pages = props.pages ?? [];
  const links = props.links ?? [];
  if (!col || pages.length === 0) return { body: null, width: 100, height: 60 };

  // shared field widths across pages (they are records of one file)
  const nFields = Math.max(1, ...pages.map((p) => Math.max(...p.rows.map((r) => r.length))));
  const fieldW = Array.from({ length: nFields }, (_, f) =>
    Math.max(
      40,
      ...pages.flatMap((p) =>
        p.rows.map((row) =>
          measureLabel(String(row[f] ?? ""), FONT.label) + 2 * PAGE_PAD,
        ),
      ),
    ),
  );
  const pageW = Math.max(
    fieldW.reduce((a, b) => a + b, 0),
    ...pages.map((p) =>
      p.title ? measureLabel(p.title, FONT.label, 700) + 2 * PAGE_PAD : 0,
    ),
  );
  const anyPageTitle = pages.some((p) => p.title);
  const headH = anyPageTitle ? PAGE_HEAD : 0;
  const pageH = (p: PageBox) => headH + p.rows.length * PAGE_ROW;

  // stack pages vertically; the column title band aligns with page 0's head
  const top = SPACE.margin + (col.title && !anyPageTitle ? TITLE_BAND : 0);
  const pageRects = new Map<string, Rect>();
  const stripW = stripWidth(col);
  const slotW = slotWidth(col, stripW);
  const pageX = SPACE.margin + slotW + COL_GAP;
  let py = top;
  for (const p of pages) {
    pageRects.set(p.id, { x: pageX, y: py, w: pageW, h: pageH(p) });
    py += pageH(p) + PAGE_GAP;
  }

  // pin each entry level with record j of its target page (anchor semantics)
  const targetPage = (e: EntryBox) =>
    links.find((l) => l.from === e.id && pageRects.has(l.to))?.to;
  const seen = new Map<string, number>();
  const pin = (i: number): number => {
    const pid = targetPage(col.entries[i]);
    const rect = pid ? pageRects.get(pid) : undefined;
    if (!rect) return top + headH + i * PAGE_ROW;
    const j = seen.get(pid!) ?? 0;
    seen.set(pid!, j + 1);
    return rect.y + headH + Math.min(j, Math.max(0, pageRows(pid!) - 1)) * PAGE_ROW;
  };
  const pageRows = (pid: string) =>
    pages.find((p) => p.id === pid)?.rows.length ?? 1;

  const laid = layoutColumn(col, SPACE.margin, PAGE_ROW, pin);

  // horizontal connectors: enter the page's left edge level with the entry
  const linkEls = links.map((lk, i) => {
    const a = laid.boxes.get(lk.from);
    const b = pageRects.get(lk.to);
    if (!a || !b) return null;
    if (!lk.toSide || lk.toSide === "left") {
      return (
        <Arrow
          key={`lk${i}`}
          from={{ x: a.x + a.w + 2, y: cy(a) }}
          to={{ x: b.x - 3, y: cy(a) }}
          markerId={headId}
          dashed={lk.variant === "dashed"}
          label={lk.label}
        />
      );
    }
    return <LinkArrow key={`lk${i}`} a={a} b={b} lk={lk} markerId={headId} />;
  });

  const pageEls = pages.map((p) => {
    const b = pageRects.get(p.id)!;
    let fx = b.x;
    const fieldX = fieldW.map((w) => {
      const x0 = fx;
      fx += w;
      return x0;
    });
    return (
      <g key={p.id}>
        <rect
          x={r2(b.x)}
          y={r2(b.y)}
          width={r2(b.w)}
          height={r2(b.h)}
          rx={RADIUS.box}
          fill={COLOR.bg}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        {p.title && (
          <>
            <Label x={cx(b)} y={b.y + PAGE_HEAD / 2} text={p.title} weight={700} />
            <line
              x1={r2(b.x)}
              y1={r2(b.y + PAGE_HEAD)}
              x2={r2(b.x + b.w)}
              y2={r2(b.y + PAGE_HEAD)}
              stroke={COLOR.fg}
              strokeWidth={STROKE.divider}
            />
          </>
        )}
        {p.rows.map((row, ri) => (
          <g key={ri}>
            {ri > 0 && (
              <line
                x1={r2(b.x)}
                y1={r2(b.y + headH + ri * PAGE_ROW)}
                x2={r2(b.x + b.w)}
                y2={r2(b.y + headH + ri * PAGE_ROW)}
                stroke={COLOR.fg}
                strokeWidth={STROKE.divider}
              />
            )}
            {row.map((c, fi) => (
              <Label
                key={fi}
                x={fieldX[fi] + fieldW[fi] / 2}
                y={b.y + headH + ri * PAGE_ROW + PAGE_ROW / 2}
                text={String(c)}
              />
            ))}
          </g>
        ))}
      </g>
    );
  });

  const width = pageX + pageW + SPACE.margin;
  const height =
    Math.max(
      py - PAGE_GAP,
      laid.bottom + (col.note ? NOTE_DROP + 7 : 0),
    ) + SPACE.margin;

  return {
    body: (
      <>
        {linkEls}
        <ColumnEls laid={laid} />
        {pageEls}
      </>
    ),
    width,
    height,
  };
}

// --- "levels": multi-level block cascade --------------------------------------

function buildLevels(props: Props, headId: string): Built {
  const stages = props.levels ?? [];
  const links = props.links ?? [];

  const blockW = (blk: LevelBlock) =>
    blk.kind === "data"
      ? DATA_W
      : Math.max(
          110,
          blk.title ? measureLabel(blk.title, FONT.label, 700) + 2 * SPACE.textPadX : 0,
        );
  const blockH = (blk: LevelBlock) =>
    blk.kind === "data"
      ? DATA_H
      : BLK_HEAD + BLK_PAD + (blk.rows ?? 2) * BLK_ROW + (blk.ellipsis ? 14 : 0) + BLK_PAD;

  // per stage: block width, note wrap, stacked height
  const laidStages = stages.map((stage) => {
    const w = Math.max(...stage.map(blockW));
    const notes = stage.map((blk) =>
      blk.note && blk.kind !== "data" ? wrapNote(blk.note, w) : [],
    );
    const noteW = Math.max(
      0,
      ...notes.flat().map((l) => measureLabel(l, FONT.note)),
    );
    const slotW = Math.max(w, noteW);
    const stackH =
      stage.reduce((a, blk) => a + blockH(blk), 0) +
      BLK_GAP_Y * Math.max(0, stage.length - 1);
    return { stage, w, notes, slotW, stackH };
  });
  const maxStackH = Math.max(...laidStages.map((s) => s.stackH));

  // place blocks: stages cascade left to right, each centred vertically
  const anchors = new Map<string, Rect>();
  const blockOf = new Map<string, LevelBlock>();
  const noteOf = new Map<string, string[]>();
  let cursor: number = SPACE.margin;
  for (const ls of laidStages) {
    let y = SPACE.margin + (maxStackH - ls.stackH) / 2;
    const x = cursor + (ls.slotW - ls.w) / 2;
    ls.stage.forEach((blk, i) => {
      const w = blk.kind === "data" ? DATA_W : ls.w;
      anchors.set(blk.id, { x: x + (ls.w - w) / 2, y, w, h: blockH(blk) });
      blockOf.set(blk.id, blk);
      noteOf.set(blk.id, ls.notes[i]);
      y += blockH(blk) + BLK_GAP_Y;
    });
    cursor += ls.slotW + COL_GAP;
  }

  // connectors: leave the source's right face, fanning when one block feeds
  // several targets; enter the target's left face
  const byFrom = new Map<string, IndexLink[]>();
  for (const lk of links) {
    if (!anchors.has(lk.from) || !anchors.has(lk.to)) continue;
    byFrom.set(lk.from, [...(byFrom.get(lk.from) ?? []), lk]);
  }
  const linkEls: ReactNode[] = [];
  for (const [from, lks] of byFrom) {
    const a = anchors.get(from)!;
    const sorted = [...lks].sort(
      (l1, l2) => cy(anchors.get(l1.to)!) - cy(anchors.get(l2.to)!),
    );
    sorted.forEach((lk, i) => {
      const b = anchors.get(lk.to)!;
      const frac = sorted.length === 1 ? 0.5 : 0.3 + (0.4 * i) / (sorted.length - 1);
      linkEls.push(
        <Arrow
          key={`${from}-${lk.to}`}
          from={{ x: a.x + a.w + 2, y: a.y + a.h * frac }}
          to={{ x: b.x - 3, y: cy(b) }}
          markerId={headId}
          dashed={lk.variant === "dashed"}
          label={lk.label}
        />,
      );
    });
  }

  let bottom = SPACE.margin + maxStackH;
  const blockEls: ReactNode[] = [];
  for (const [id, b] of anchors) {
    const blk = blockOf.get(id)!;
    if (blk.kind === "data") {
      blockEls.push(
        <g key={id}>
          <Box x={b.x} y={b.y} w={b.w} h={b.h} tint rx={RADIUS.box} />
          {blk.note && (
            <Label x={cx(b)} y={cy(b)} text={blk.note} size={FONT.note} fill={COLOR.muted} />
          )}
        </g>,
      );
      continue;
    }
    const rows = blk.rows ?? 2;
    const rowsTop = b.y + BLK_HEAD + BLK_PAD;
    const lines = noteOf.get(id) ?? [];
    blockEls.push(
      <g key={id}>
        <rect
          x={r2(b.x)}
          y={r2(b.y)}
          width={r2(b.w)}
          height={r2(b.h)}
          rx={RADIUS.box}
          fill={COLOR.bg}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        {blk.title && (
          <>
            <Label x={cx(b)} y={b.y + BLK_HEAD / 2} text={blk.title} weight={700} />
            <line
              x1={r2(b.x)}
              y1={r2(b.y + BLK_HEAD)}
              x2={r2(b.x + b.w)}
              y2={r2(b.y + BLK_HEAD)}
              stroke={COLOR.fg}
              strokeWidth={STROKE.divider}
            />
          </>
        )}
        {Array.from({ length: rows }, (_, i) => (
          <line
            key={`pr${i}`}
            x1={r2(b.x + BLK_PAD)}
            y1={r2(rowsTop + i * BLK_ROW)}
            x2={r2(b.x + b.w - BLK_PAD)}
            y2={r2(rowsTop + i * BLK_ROW)}
            stroke={COLOR.line}
            strokeWidth={STROKE.divider}
          />
        ))}
        {blk.ellipsis && (
          <DotsEllipsis x={cx(b)} y={rowsTop + rows * BLK_ROW + 6} orient="v" gap={4} r={1.4} />
        )}
        {lines.map((line, i) => (
          <Label
            key={`nt${i}`}
            x={cx(b)}
            y={b.y + b.h + NOTE_DROP + i * NOTE_LINE}
            text={line}
            size={FONT.note}
            fill={COLOR.caption}
          />
        ))}
      </g>,
    );
    if (lines.length) {
      bottom = Math.max(bottom, b.y + b.h + NOTE_DROP + (lines.length - 1) * NOTE_LINE + 7);
    }
  }

  return {
    body: (
      <>
        {linkEls}
        {blockEls}
      </>
    ),
    width: cursor - COL_GAP + SPACE.margin,
    height: bottom + SPACE.margin,
  };
}

// --- "frames": page table -> buffer pool + on-disk fetch ----------------------

function buildFrames(props: Props, headId: string): Built {
  const entryCol = props.columns?.[0];
  const frames = props.frames;
  const disk = props.disk;
  const links = props.links ?? [];
  if (!entryCol || !frames) return { body: null, width: 100, height: 60 };

  const stripTop = SPACE.margin + TITLE_BAND;
  const headingY = SPACE.margin + TITLE_BAND / 2;

  // the two memory-side strips, headed "Page table" / "Buffer pool"
  const wL = stripWidth(entryCol);
  const slotL = Math.max(wL, measureLabel("Page table", FONT.title, 700));
  const wR = stripWidth(frames);
  const slotR = Math.max(wR, measureLabel("Buffer pool", FONT.title, 700));

  const leftX = SPACE.margin + (slotL - wL) / 2;
  const rightSlotX = SPACE.margin + slotL + COL_GAP;
  const rightX = rightSlotX + (slotR - wR) / 2;

  const anchors = new Map<string, Rect>();
  entryCol.entries.forEach((e, i) => {
    anchors.set(e.id, { x: leftX, y: stripTop + i * ROW_H, w: wL, h: ROW_H });
  });
  frames.entries.forEach((e, i) => {
    anchors.set(e.id, { x: rightX, y: stripTop + i * ROW_H, w: wR, h: ROW_H });
  });
  const stripBottom =
    stripTop + Math.max(entryCol.entries.length, frames.entries.length) * ROW_H;

  // on-disk page strip below a dashed memory/disk separator
  const topW = rightSlotX + slotR + SPACE.margin;
  const sepY = stripBottom + 16;
  let diskRect: Rect | null = null;
  let diskCellW = 0;
  if (disk) {
    diskCellW = Math.max(
      56,
      ...disk.pages.map(
        (p) => measureLabel(String(p.label), FONT.label) + 2 * SPACE.textPadX,
      ),
    );
    const diskW = diskCellW * disk.pages.length;
    const width = Math.max(topW, diskW + 2 * SPACE.margin);
    diskRect = { x: (width - diskW) / 2, y: sepY + 28, w: diskW, h: ROW_H };
    disk.pages.forEach((p, i) => {
      anchors.set(p.id, {
        x: diskRect!.x + i * diskCellW,
        y: diskRect!.y,
        w: diskCellW,
        h: ROW_H,
      });
    });
  }
  const width = Math.max(topW, diskRect ? diskRect.w + 2 * SPACE.margin : 0);
  const height = (diskRect ? diskRect.y + diskRect.h : sepY) + SPACE.margin;

  // links: page-table -> frame run level; disk fetches rise into a frame
  const linkEls = links.map((lk, i) => {
    const a = anchors.get(lk.from);
    const b = anchors.get(lk.to);
    if (!a || !b) return null;
    const fetch = lk.variant === "dashed";
    const sides: IndexLink = fetch
      ? { ...lk, fromSide: lk.fromSide ?? "top", toSide: lk.toSide ?? "bottom" }
      : lk;
    return <LinkArrow key={`lk${i}`} a={a} b={b} lk={sides} markerId={headId} />;
  });

  const stripEl = (col: EntryColumn, x: number, w: number) => (
    <CellStrip
      x={x}
      y={stripTop}
      cellW={w}
      cellH={ROW_H}
      widths={col.entries.map(() => ROW_H)}
      orient="v"
      tint={col.kind === "bucket"}
      rx={RADIUS.cell}
      cells={col.entries.map((e) => ({
        label: String(e.label),
        state: e.state === "highlight" ? ("highlight" as const) : undefined,
      }))}
    />
  );

  return {
    body: (
      <>
        {linkEls}
        <Label
          x={SPACE.margin + slotL / 2}
          y={headingY}
          text="Page table"
          size={FONT.title}
          weight={700}
        />
        <Label
          x={rightSlotX + slotR / 2}
          y={headingY}
          text="Buffer pool"
          size={FONT.title}
          weight={700}
        />
        {stripEl(entryCol, leftX, wL)}
        {stripEl(frames, rightX, wR)}
        <line
          x1={r2(SPACE.margin)}
          y1={r2(sepY)}
          x2={r2(width - SPACE.margin)}
          y2={r2(sepY)}
          stroke={COLOR.muted}
          strokeWidth={STROKE.divider}
          strokeDasharray={STROKE.dash}
        />
        {disk && diskRect && (
          <>
            <Label
              x={width / 2}
              y={sepY + 15}
              text={disk.title ?? "On-disk file"}
              size={FONT.title}
              weight={700}
            />
            <CellStrip
              x={diskRect.x}
              y={diskRect.y}
              cellW={diskCellW}
              cellH={ROW_H}
              orient="h"
              rx={RADIUS.cell}
              cells={disk.pages.map((p) => ({
                label: String(p.label),
                state:
                  p.state === "highlight" ? ("highlight" as const) : undefined,
              }))}
            />
          </>
        )}
      </>
    ),
    width,
    height,
  };
}

// --- "mapping": stacked node rows, parallel vs crossing ------------------------

function buildMapping(props: Props, headId: string): Built {
  const panels = props.panels ?? [];
  const layout = props.panelLayout ?? "row";

  const els: ReactNode[] = [];
  let ox: number = SPACE.margin;
  let oy: number = SPACE.margin;
  let maxRight: number = SPACE.margin;
  let maxBottom: number = SPACE.margin;

  panels.forEach((p, pi) => {
    const top = p.topRow ?? [];
    const bottom = p.bottomRow ?? [];
    const nodeW = Math.max(
      NODE_W_MIN,
      ...[...top, ...bottom].map(
        (n) => measureLabel(String(n.label), FONT.label) + 14,
      ),
    );
    const topGap = p.chainTop ? CHAIN_GAP : NODE_GAP;
    const topW = top.length * nodeW + Math.max(0, top.length - 1) * topGap;
    const bottomW =
      bottom.length * nodeW + Math.max(0, bottom.length - 1) * NODE_GAP;
    const innerW = Math.max(
      topW,
      bottomW,
      p.title ? measureLabel(p.title, FONT.title, 700) : 0,
      p.topNote ? measureLabel(p.topNote, FONT.note) : 0,
      p.bottomNote ? measureLabel(p.bottomNote, FONT.note) : 0,
    );

    // vertical bands: title / scan arrow / top row / mapping / bottom row / note
    const titleBand = p.title ? TITLE_BAND : 0;
    const scanBand = p.scan ? SCAN_BAND : 0;
    const topY = oy + titleBand + scanBand;
    const bottomY = topY + ROW_DROP;
    const noteBand = p.bottomNote ? NOTE_DROP + 7 : 0;
    const panelH = bottomY + NODE_H + noteBand - oy;

    const placeRow = (nodes: MapNode[], rowW: number, gap: number, y: number) => {
      const boxes = new Map<string, Rect>();
      let x = ox + (innerW - rowW) / 2;
      for (const n of nodes) {
        boxes.set(n.id, { x, y, w: nodeW, h: NODE_H });
        x += nodeW + gap;
      }
      return boxes;
    };
    const topBoxes = placeRow(top, topW, topGap, topY);
    const bottomBoxes = placeRow(bottom, bottomW, NODE_GAP, bottomY);

    const panelEls: ReactNode[] = [];

    if (p.title) {
      panelEls.push(
        <Label
          key="title"
          x={ox + innerW / 2}
          y={oy + TITLE_BAND / 2 - 2}
          text={p.title}
          size={FONT.title}
          weight={700}
        />,
      );
    }

    // scan flow above the leaf row
    if (p.scan && top.length) {
      const first = topBoxes.get(top[0].id)!;
      const last = topBoxes.get(top[top.length - 1].id)!;
      const sy = oy + titleBand + SCAN_BAND - 9;
      panelEls.push(
        <Arrow
          key="scan"
          from={{ x: first.x, y: sy }}
          to={{ x: last.x + last.w, y: sy }}
          markerId={headId}
          label={p.scan}
        />,
      );
    }

    // doubly-linked leaf chain
    if (p.chainTop) {
      for (let i = 0; i < top.length - 1; i++) {
        const a = topBoxes.get(top[i].id)!;
        const b = topBoxes.get(top[i + 1].id)!;
        panelEls.push(
          <Arrow
            key={`ch${i}`}
            from={{ x: a.x + a.w + 2, y: cy(a) }}
            to={{ x: b.x - 2, y: cy(b) }}
            markerId={headId}
            both
          />,
        );
      }
    }

    // mapping arrows; spread landings when several share one target box
    const landingX = new Map<IndexLink, number>();
    {
      const byTarget = new Map<string, IndexLink[]>();
      for (const lk of p.links) {
        if (!topBoxes.has(lk.from) || !bottomBoxes.has(lk.to)) continue;
        byTarget.set(lk.to, [...(byTarget.get(lk.to) ?? []), lk]);
      }
      for (const [to, lks] of byTarget) {
        const b = bottomBoxes.get(to)!;
        const sorted = [...lks].sort(
          (l1, l2) => cx(topBoxes.get(l1.from)!) - cx(topBoxes.get(l2.from)!),
        );
        sorted.forEach((lk, i) => {
          const frac =
            sorted.length === 1 ? 0.5 : 0.28 + (0.44 * i) / (sorted.length - 1);
          landingX.set(lk, b.x + b.w * frac);
        });
      }
    }
    p.links.forEach((lk, i) => {
      const a = topBoxes.get(lk.from);
      const b = bottomBoxes.get(lk.to);
      if (!a || !b) return;
      panelEls.push(
        <Arrow
          key={`ml${i}`}
          from={{ x: cx(a), y: a.y + a.h + 2 }}
          to={{ x: landingX.get(lk) ?? cx(b), y: b.y - 3 }}
          markerId={headId}
          dashed={lk.variant === "dashed"}
          label={lk.label}
        />,
      );
    });

    const nodeEl = (n: MapNode, b: Rect) => (
      <Box
        key={n.id}
        x={b.x}
        y={b.y}
        w={b.w}
        h={b.h}
        label={String(n.label)}
        state={
          n.state === "highlight"
            ? "highlight"
            : n.state === "accent"
              ? "emphasis"
              : "normal"
        }
        rx={RADIUS.cell}
      />
    );
    for (const n of top) panelEls.push(nodeEl(n, topBoxes.get(n.id)!));
    for (const n of bottom) panelEls.push(nodeEl(n, bottomBoxes.get(n.id)!));

    if (p.topNote) {
      panelEls.push(
        <Label
          key="tnote"
          x={ox + innerW / 2}
          y={topY + NODE_H + NOTE_DROP}
          text={p.topNote}
          size={FONT.note}
          fill={COLOR.caption}
          halo
        />,
      );
    }
    if (p.bottomNote) {
      panelEls.push(
        <Label
          key="bnote"
          x={ox + innerW / 2}
          y={bottomY + NODE_H + NOTE_DROP}
          text={p.bottomNote}
          size={FONT.note}
          fill={COLOR.caption}
        />,
      );
    }

    els.push(<g key={`p${pi}`}>{panelEls}</g>);
    maxRight = Math.max(maxRight, ox + innerW);
    maxBottom = Math.max(maxBottom, oy + panelH);
    if (layout === "row") ox += innerW + PANEL_GAP;
    else oy += panelH + PANEL_GAP;
  });

  return {
    body: <>{els}</>,
    width: maxRight + SPACE.margin,
    height: maxBottom + SPACE.margin,
  };
}
