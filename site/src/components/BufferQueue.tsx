import {
  Arrow,
  ArrowHead,
  Box,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  Label,
  MAX_CONTENT_W,
  RADIUS,
  SPACE,
  STROKE,
  measureLabel,
  r2,
  stableId,
  type BoxState,
  type Pt,
} from "@/components/diagram";

/**
 * Buffer-replacement queue / stack figures in the textbook style: ordered
 * columns of page cells typed by role (hot / read-once / scan), optionally a
 * horizontal scan row sweeping through fresh pages, and labelled arrows for
 * insert (new page), evict, promote (between queues), and the scan sweep.
 *
 * Roles map onto the family state grammar — hot = emphasis (bold outline),
 * scan = new (dashed), highlight = inverted — never a saturated fill. The
 * author gives columns of cells and a list of arrows; the layout (column
 * x-positions, cell y-positions, arrow endpoints by anchor) is derived.
 *
 * Columns flow left to right and wrap onto new centred rows once a row would
 * exceed the prose column, so the wide sequential-flooding example stacks its
 * three panels vertically at full text size instead of scaling down. Every
 * arrow annotation gets a measured lane: the gap between columns widens to fit
 * the widest promote label on a single line, and side labels (new page /
 * evict) are clamped fully clear of any column frame, so no label is ever
 * crossed or cramped against an edge.
 *
 * Rendered once on the server (no client JS); all colour and stroke comes from
 * the diagram theme, so it re-themes with the family on the light/dark switch.
 */

/** A page cell's role, mapped onto the family state grammar:
 *  - `hot`: emphasis outline (a protected / working-set page).
 *  - `read-once`: normal outline (a one-off page that should be discarded).
 *  - `scan`: dashed outline (a page brought in by a sequential scan).
 *  - `highlight`: inverted box (the page the arrow is about to act on). */
export type CellRole = "hot" | "read-once" | "scan" | "highlight";

export interface PageCell {
  /** Display label, e.g. "page 7". */
  label: string;
  /** Stable id, used to anchor arrows on this exact cell. Optional. */
  id?: string;
  role?: CellRole;
}

export interface QueueColumn {
  /** Stable id, used to anchor arrows on the column. */
  id: string;
  /** Bold heading above the column frame (e.g. "FIFO queue"). */
  title?: string;
  /** Cells, top to bottom. */
  cells: PageCell[];
  /** Small muted note centred below the column frame (e.g. "hot pages"). */
  foot?: string;
  /** Draw the frame box around the cells. Default true. A `scan` row sets this
   *  false to read as a loose sweep rather than a buffer pool. */
  framed?: boolean;
  /** Lay the cells in a horizontal row instead of a vertical stack. Used for
   *  the sequential-scan strip. */
  horizontal?: boolean;
}

/** An anchor on the figure: a column, a column edge, or a specific cell.
 *  `"colId"` — the column centre. `"colId:top"` / `":bottom"` / `":left"` /
 *  `":right"` — the named edge of the column frame. `"colId#cellId"` or
 *  `"colId#3"` — a specific cell (by id or 0-based index), with an optional
 *  `:edge` suffix, e.g. `"fifo#page8:right"`. */
export type Anchor = string;

export interface QueueArrow {
  from: Anchor;
  to: Anchor;
  label?: string;
  /** `insert` / `evict` / `promote` are plain connectors; `scan` is a long
   *  sweep drawn with a heavier stroke. Default `promote`. */
  kind?: "insert" | "evict" | "promote" | "scan";
  /** Nudge the label off the arrow midpoint. `above` (default) / `below`. */
  labelSide?: "above" | "below";
  /** Pull the `from` endpoint away from its anchor by [dx, dy] px. Lets an
   *  insert/evict arrow start or end in free space beside the frame (the TikZ
   *  "new page" / "evict" arrows that reach in from outside the queue). */
  fromOffset?: [number, number];
  /** Pull the `to` endpoint away from its anchor by [dx, dy] px. */
  toOffset?: [number, number];
}

interface Props {
  /** The columns, left to right (wrapping onto new rows when too wide). */
  columns: QueueColumn[];
  /** Arrows between anchors. */
  arrows?: QueueArrow[];
  /** Deprecated: no longer rendered — the figure caption tells that story.
   *  Kept so existing notes that pass it keep compiling. */
  note?: { title?: string; body: string };
  /** Bold heading inside the card. */
  title?: string;
  caption?: string;
  className?: string;
}

// --- geometry ---------------------------------------------------------------

const CELL_W = 96; // page cell width
const CELL_H = 30; // page cell height
const CELL_GAP = 8; // gap between cells inside a frame
const FRAME_PAD = 10; // padding between a frame and its cells
const GAP_MIN = 64; // minimum gap between columns in a row
const LANE_PAD = 12; // measured clearance around an arrow label in its lane
const TITLE_DROP = 16; // column title baseline above the frame top
const FOOT_DROP = 17; // column foot baseline below the frame bottom
const TITLE_ROOM = 30; // vertical room above a titled row's frames
const FOOT_ROOM = 22; // vertical room below a footed row's frames
const ROW_GAP_Y = 16; // extra gap between wrapped rows
const SCAN_OVERHANG = 14; // scan sweeps poke out past their end cells
const LABEL_CLEAR = 12; // arrow label centre offset from its line
const ROW_BUDGET = MAX_CONTENT_W - 2 * SPACE.margin; // wrap rows beyond this

const roleState: Record<CellRole, BoxState> = {
  hot: "emphasis",
  "read-once": "normal",
  scan: "new",
  highlight: "highlight",
};

interface LaidCell extends PageCell {
  cx: number;
  cy: number;
}

interface LaidCol {
  col: QueueColumn;
  x: number; // frame left
  y: number; // frame top
  w: number;
  h: number;
  framed: boolean;
  cells: LaidCell[];
}

export function BufferQueue({
  columns,
  arrows = [],
  note,
  title,
  caption,
  className,
}: Props) {
  void note; // deprecated: the figure caption carries that text now.

  // the inter-column gap reserves a lane for the widest promote label, so a
  // label like "second hit promotes" renders on one line with clearance
  const promoteLabelW = arrows
    .filter((a) => (a.kind ?? "promote") === "promote" && a.label)
    .reduce((m, a) => Math.max(m, measureLabel(a.label as string, FONT.note)), 0);
  const colGap = Math.max(GAP_MIN, promoteLabelW + 2 * LANE_PAD);

  // --- column sizes, then flow them into wrapped rows -----------------------
  const sized = columns.map((col) => {
    const n = col.cells.length;
    const w = col.horizontal
      ? FRAME_PAD * 2 + n * CELL_W + (n - 1) * CELL_GAP
      : FRAME_PAD * 2 + CELL_W;
    const h = col.horizontal
      ? FRAME_PAD * 2 + CELL_H
      : FRAME_PAD * 2 + n * CELL_H + (n - 1) * CELL_GAP;
    return { col, w, h };
  });

  const rows: Array<typeof sized> = [];
  {
    let row: typeof sized = [];
    let rowW = 0;
    for (const s of sized) {
      const next = row.length ? rowW + colGap + s.w : s.w;
      if (row.length && next > ROW_BUDGET) {
        rows.push(row);
        row = [s];
        rowW = s.w;
      } else {
        row.push(s);
        rowW = next;
      }
    }
    if (row.length) rows.push(row);
  }

  const rowWidth = (r: typeof sized) =>
    r.reduce((a, s) => a + s.w, 0) + (r.length - 1) * colGap;
  const contentW = Math.max(...rows.map(rowWidth), 1);

  // --- lay out rows top to bottom, each row centred --------------------------
  const laid: LaidCol[] = [];
  let rowY = 0;
  rows.forEach((r, ri) => {
    const titled = r.some((s) => s.col.title);
    const footed = r.some((s) => s.col.foot);
    if (ri > 0) rowY += ROW_GAP_Y;
    const frameY = rowY + (titled ? TITLE_ROOM : 0);
    const maxH = Math.max(...r.map((s) => s.h));
    let x = (contentW - rowWidth(r)) / 2;
    for (const s of r) {
      const framed = s.col.framed ?? true;
      const cells: LaidCell[] = [];
      if (s.col.horizontal) {
        s.col.cells.forEach((c, i) => {
          const cx = x + FRAME_PAD + CELL_W / 2 + i * (CELL_W + CELL_GAP);
          cells.push({ ...c, cx, cy: frameY + s.h / 2 });
        });
      } else {
        s.col.cells.forEach((c, i) => {
          const cy = frameY + FRAME_PAD + CELL_H / 2 + i * (CELL_H + CELL_GAP);
          cells.push({ ...c, cx: x + s.w / 2, cy });
        });
      }
      laid.push({ col: s.col, x, y: frameY, w: s.w, h: s.h, framed, cells });
      x += s.w + colGap;
    }
    rowY = frameY + maxH + (footed ? FOOT_ROOM : 0);
  });

  const colById = new Map(laid.map((l) => [l.col.id, l] as const));

  // --- resolve an anchor string to a point ----------------------------------
  const anchorPoint = (a: Anchor): Pt | null => {
    const [head, edgeRaw] = a.split(":");
    const edge = edgeRaw as "top" | "bottom" | "left" | "right" | undefined;
    const [colId, cellSel] = head.split("#");
    const lc = colById.get(colId);
    if (!lc) return null;

    if (cellSel != null) {
      // a specific cell.
      let cell: LaidCell | undefined;
      const idx = Number(cellSel);
      if (Number.isInteger(idx) && String(idx) === cellSel) {
        cell = lc.cells[idx];
      } else {
        cell = lc.cells.find((c) => c.id === cellSel);
      }
      if (!cell) return null;
      switch (edge) {
        case "top":
          return { x: cell.cx, y: cell.cy - CELL_H / 2 };
        case "bottom":
          return { x: cell.cx, y: cell.cy + CELL_H / 2 };
        case "left":
          return { x: cell.cx - CELL_W / 2, y: cell.cy };
        case "right":
          return { x: cell.cx + CELL_W / 2, y: cell.cy };
        default:
          return { x: cell.cx, y: cell.cy };
      }
    }

    // the column frame.
    const cx = lc.x + lc.w / 2;
    const cy = lc.y + lc.h / 2;
    switch (edge) {
      case "top":
        return { x: cx, y: lc.y };
      case "bottom":
        return { x: cx, y: lc.y + lc.h };
      case "left":
        return { x: lc.x, y: cy };
      case "right":
        return { x: lc.x + lc.w, y: cy };
      default:
        return { x: cx, y: cy };
    }
  };

  // --- resolve arrows + their labels (labels feed the viewBox bounds) -------
  const offsetPt = (p: Pt | null, off?: [number, number]): Pt | null =>
    p && off ? { x: p.x + off[0], y: p.y + off[1] } : p;

  interface LaidArrow {
    ar: QueueArrow;
    p0: Pt;
    p1: Pt;
    isScan: boolean;
    lx: number;
    ly: number;
    lw: number;
  }
  const laidArrows: LaidArrow[] = [];
  for (const ar of arrows) {
    let p0 = offsetPt(anchorPoint(ar.from), ar.fromOffset);
    let p1 = offsetPt(anchorPoint(ar.to), ar.toOffset);
    if (!p0 || !p1) continue;
    const isScan = (ar.kind ?? "promote") === "scan";
    if (isScan) {
      // poke the sweep out past its end cells so the tail and head stay
      // visible (the line itself runs underneath the page cells).
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
      const ux = (p1.x - p0.x) / len;
      const uy = (p1.y - p0.y) / len;
      p0 = { x: p0.x - ux * SCAN_OVERHANG, y: p0.y - uy * SCAN_OVERHANG };
      p1 = { x: p1.x + ux * SCAN_OVERHANG, y: p1.y + uy * SCAN_OVERHANG };
    }

    // single-line label in its own band above/below the line; a scan sweep
    // runs through the cells, so its label clears the whole cell band
    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const below = ar.labelSide === "below";
    const clear = isScan ? CELL_H / 2 + 6 : 0;
    const ly = below ? mid.y + clear + LABEL_CLEAR : mid.y - clear - LABEL_CLEAR;
    let lx = mid.x;
    const lw = ar.label ? measureLabel(ar.label, FONT.note) : 0;

    // keep the label in its lane: shift it fully clear of any column frame
    if (ar.label) {
      for (const lc of laid) {
        if (!lc.framed) continue;
        const overlapsY =
          ly + FONT.note / 2 > lc.y - 2 && ly - FONT.note / 2 < lc.y + lc.h + 2;
        const overlapsX =
          lx + lw / 2 > lc.x - 4 && lx - lw / 2 < lc.x + lc.w + 4;
        if (!overlapsY || !overlapsX) continue;
        lx =
          mid.x < lc.x + lc.w / 2
            ? lc.x - 6 - lw / 2
            : lc.x + lc.w + 6 + lw / 2;
      }
    }

    laidArrows.push({ ar, p0, p1, isScan, lx, ly, lw });
  }

  // --- bounds over frames, titles, feet, arrows, labels ----------------------
  let minX = 0;
  let maxX = contentW;
  let minY = 0;
  let maxY = rowY;
  for (const lc of laid) {
    const cx = lc.x + lc.w / 2;
    if (lc.col.title) {
      const tw = measureLabel(lc.col.title, FONT.title, 700);
      minX = Math.min(minX, cx - tw / 2);
      maxX = Math.max(maxX, cx + tw / 2);
      minY = Math.min(minY, lc.y - TITLE_DROP - FONT.title);
    }
    if (lc.col.foot) {
      const fw = measureLabel(lc.col.foot, FONT.note);
      minX = Math.min(minX, cx - fw / 2);
      maxX = Math.max(maxX, cx + fw / 2);
      maxY = Math.max(maxY, lc.y + lc.h + FOOT_DROP + 3);
    }
  }
  for (const a of laidArrows) {
    for (const p of [a.p0, a.p1]) {
      minX = Math.min(minX, p.x - 3);
      maxX = Math.max(maxX, p.x + 3);
      minY = Math.min(minY, p.y - 6);
      maxY = Math.max(maxY, p.y + 6);
    }
    if (a.ar.label) {
      minX = Math.min(minX, a.lx - a.lw / 2 - 2);
      maxX = Math.max(maxX, a.lx + a.lw / 2 + 2);
      minY = Math.min(minY, a.ly - FONT.note / 2 - 3);
      maxY = Math.max(maxY, a.ly + FONT.note / 2 + 3);
    }
  }

  const shiftX = SPACE.margin - minX;
  const shiftY = SPACE.margin - minY;
  const width = maxX - minX + 2 * SPACE.margin;
  const height = maxY - minY + 2 * SPACE.margin;

  const arrowId = stableId("bq-arrow", { columns, arrows, title });

  // --- render: frames under arrows, cells over them, labels on top ----------
  const frameEls = laid.map((lc) => (
    <g key={`f-${lc.col.id}`}>
      {lc.framed && (
        <rect
          x={r2(lc.x)}
          y={r2(lc.y)}
          width={r2(lc.w)}
          height={r2(lc.h)}
          rx={RADIUS.frame}
          fill={COLOR.node}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
      )}
      {lc.col.title && (
        <Label
          x={lc.x + lc.w / 2}
          y={lc.y - TITLE_DROP}
          text={lc.col.title}
          size={FONT.title}
          weight={700}
          baseline="baseline"
        />
      )}
      {lc.col.foot && (
        <Label
          x={lc.x + lc.w / 2}
          y={lc.y + lc.h + FOOT_DROP}
          text={lc.col.foot}
          size={FONT.note}
          fill={COLOR.caption}
          baseline="baseline"
        />
      )}
    </g>
  ));

  const cellEls = laid.map((lc) => (
    <g key={`c-${lc.col.id}`}>
      {lc.cells.map((c, i) => (
        <Box
          key={c.id ?? i}
          x={c.cx - CELL_W / 2}
          y={c.cy - CELL_H / 2}
          w={CELL_W}
          h={CELL_H}
          label={c.label}
          state={roleState[c.role ?? "read-once"]}
        />
      ))}
    </g>
  ));

  const arrowEls = laidArrows.map((a, i) => (
    <Arrow
      key={`ar${i}`}
      from={a.p0}
      to={a.p1}
      markerId={arrowId}
      width={a.isScan ? STROKE.bold : STROKE.line}
    />
  ));

  const arrowLabelEls = laidArrows.map((a, i) =>
    a.ar.label ? (
      <Label
        key={`al${i}`}
        x={a.lx}
        y={a.ly}
        text={a.ar.label}
        size={FONT.note}
        fill={COLOR.muted}
        halo
      />
    ) : null,
  );

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg w={width} h={height} label={caption ?? "Buffer queue diagram"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        <g transform={`translate(${r2(shiftX)},${r2(shiftY)})`}>
          {frameEls}
          {arrowEls}
          {cellEls}
          {arrowLabelEls}
        </g>
      </DiagramSvg>
    </DiagramFigure>
  );
}
