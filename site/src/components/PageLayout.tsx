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
  measureText,
  r2,
  ref,
  stableId,
  type Cell,
} from "@/components/diagram";

/**
 * One figure shell for storage-layout diagrams:
 * page / byte / record layouts and block-structured file layouts, all drawn
 * as generated vector graphics in the house style. A single `mode` prop
 * selects the internal shape:
 *
 *   slot-grid   header + a grid of fixed slots, with an optional RID annotation
 *               (packed page, bitmap page, page+RID).
 *   byte-strip  a horizontal run of byte-addressed cells with a numeric ruler
 *               underneath; cells can be dashed gaps (deleted / free) and a
 *               shift arrow can sit below (variable record layout).
 *   slotted     a slotted page: header + slot directory growing from the
 *               front, records growing from the back, a free-space region and
 *               a free pointer between them, with slot->record links.
 *   row-column  a row store next to a column store, each a labelled grid, with
 *               one row (resp. one column) ringed by an emphasis stroke.
 *   pax         a PAX page: row groups stacked vertically, each split into
 *               per-attribute minipages (partitions).
 *   orc         stacked banded file blocks (stripes) with a zoomed detail
 *               panel and directory->payload links.
 *   heap-dir    a heap-file page directory: a directory strip of per-page
 *               free-space summaries on top, each entry pointing straight down
 *               at its page with used/free fill regions.
 *   overflow    ordered data pages on a baseline followed by an overflow block,
 *               wired into the chain.
 *   node-strip  the B+-tree node anatomy: pointer | key | pointer ... cell
 *               strips for an internal node and a leaf node.
 *
 * Pure server component (no client JS). All colour, stroke and type come from
 * the diagram theme, so every figure re-themes on the light/dark switch and
 * reads as one family with <Automaton>, <BPlusTree> and the rest. Text is
 * measured with real font metrics, page headers are clipped bands (one frame
 * stroke, never doubled), adjacent cells are single-stroke strips, and
 * annotation arrows are routed outside the boxes so they never cross content.
 */

// --- public prop types ------------------------------------------------------

/** One fixed-size cell in a `slot-grid`. */
export interface SlotCell {
  label: string;
  /** `hit` = emphasis ring (the RID target); `empty` = dashed free slot. */
  state?: "normal" | "hit" | "empty";
}

/** One cell in a `byte-strip`. */
export interface ByteCell {
  label: string;
  /** Relative width weight (default 1); wider cells get more horizontal room. */
  span?: number;
  /** `gap` = dashed deletion/free cell; `meta` = muted secondary cell. */
  state?: "normal" | "gap" | "meta";
  /** Optional small caption centred above the cell (e.g. a field group). */
  group?: string;
}

/** A slot-directory entry in `slotted` mode. */
export interface SlotEntry {
  label: string;
  /** Height weight of the matching record on the right (default 1). */
  recWeight?: number;
  recLabel?: string;
}

/** A page in `heap-dir` mode. */
export interface HeapPage {
  title: string;
  /** Fraction of the page that is free, 0..1. */
  free: number;
  /** Directory-entry text above the page, e.g. "P42 | 20% free". */
  entry: string;
  /** Label inside the used region. */
  usedLabel?: string;
  /** Label inside the free region (omit if free is 0). */
  freeLabel?: string;
}

/** A data page in `overflow` mode. */
export interface OrderedPage {
  title: string;
  records: Array<string | number>;
}

/** A stripe/band in `orc` mode. */
export interface OrcBand {
  label: string;
  /** `meta` muted, `data` element-box, `footer` emphasised. */
  kind?: "meta" | "data" | "footer";
}

interface CommonProps {
  title?: string;
  caption?: string;
  className?: string;
}

interface SlotGridProps extends CommonProps {
  mode: "slot-grid";
  /** Bold header text inside the page (e.g. "Page 42"). */
  header: string;
  /** Small muted label at the header's left (e.g. "header"). */
  headerNote?: string;
  cells: SlotCell[];
  /** Cells per row (default = all on one row). */
  columns?: number;
  /** A second header line, right-aligned (e.g. a bitmap "1 1 0 1 0"). */
  headerRight?: string;
  /** Annotation text pointing at the first `hit` cell (e.g. RID). */
  annotation?: string;
  /** Caption note centred below the grid. */
  footnote?: string;
}

interface ByteStripProps extends CommonProps {
  mode: "byte-strip";
  header?: string;
  cells: ByteCell[];
  /** Byte offsets under the cell boundaries; length = cells.length + 1. */
  offsets?: Array<string | number>;
  /** Label for the offset ruler (e.g. "bytes"). */
  rulerLabel?: string;
  /** Below-strip arrow: shifts the lower bound toward the upper. */
  shiftLabel?: string;
  footnote?: string;
}

interface SlottedProps extends CommonProps {
  mode: "slotted";
  /** Header rows above the slot directory (e.g. "# entries = 3", "free ptr"). */
  headerRows: string[];
  slots: SlotEntry[];
  leftTitle?: string;
  rightTitle?: string;
  freeLabel?: string;
}

interface RowColumnProps extends CommonProps {
  mode: "row-column";
  columns: string[];
  /** Cell text per row, each row an array aligned with `columns`. */
  rows: string[][];
  rowLabels?: string[];
  leftTitle: string;
  rightTitle: string;
  leftTag?: string;
  rightTag?: string;
  /** Row index ringed in the row store. */
  highlightRow?: number;
  /** Column index ringed in the column store. */
  highlightColumn?: number;
  leftNote?: string;
  rightNote?: string;
}

interface PaxProps extends CommonProps {
  mode: "pax";
  header: string;
  headerNote?: string;
  columns: string[];
  /** Each row group: per-column arrays of cell labels. */
  groups: Array<{ label?: string; cells: string[][] }>;
  footnote?: string;
}

interface OrcProps extends CommonProps {
  mode: "orc";
  leftTitle: string;
  rightTitle: string;
  /** Each stripe: an ordered list of bands. */
  stripes: Array<{ label: string; bands: OrcBand[] }>;
  /** A trailing footer band under the stripe stack (e.g. "File footer"). */
  fileFooter?: string;
  /** Whether to draw a vertical-dots ellipsis before the last stripe. */
  ellipsis?: boolean;
  /** Detail panel rows on the right (the "zoom" into one stripe). */
  detail: Array<{ label: string; kind?: "index" | "data" }>;
  footnote?: string;
}

interface HeapDirProps extends CommonProps {
  mode: "heap-dir";
  dirTitle?: string;
  pages: HeapPage[];
  /** Show a drawn-dots ellipsis after the last directory entry. */
  ellipsis?: boolean;
  footnote?: string;
}

interface OverflowProps extends CommonProps {
  mode: "overflow";
  pages: OrderedPage[];
  overflow: { title: string; record: string | number; afterPage: number };
  topNote?: string;
  footnote?: string;
}

interface NodeStripProps extends CommonProps {
  mode: "node-strip";
  /** Each strip is a node: a title plus cells. Internal nodes alternate
   *  pointer/key; leaves alternate key/ptr and end with a "next" link.
   *  A cell of "..." renders as drawn ellipsis dots. */
  nodes: Array<{
    title: string;
    cells: string[];
    /** Draw a trailing arrow leaving the right edge (leaf "next" link). */
    nextLink?: boolean;
  }>;
  footnote?: string;
}

export type PageLayoutProps =
  | SlotGridProps
  | ByteStripProps
  | SlottedProps
  | RowColumnProps
  | PaxProps
  | OrcProps
  | HeapDirProps
  | OverflowProps
  | NodeStripProps;

// --- shared helpers -----------------------------------------------------------

const labelW = (s: string, size: number = FONT.label, weight: 400 | 600 | 700 = 400) =>
  measureLabel(s, size, weight);

/**
 * A page container with a clipped header band: ONE node-filled rect, a bg
 * header band clipped to the frame's rounding, a single divider under it, and
 * the ink frame drawn once on top — page tops are never double-stroked.
 */
function PageFrame({
  x,
  y,
  w,
  h,
  headH,
  title,
  note,
  right,
  uid,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  headH: number;
  /** Bold centred header text. */
  title?: string;
  /** Small muted text at the header's left. */
  note?: string;
  /** Small muted text at the header's right. */
  right?: string;
  uid: string;
}) {
  const clipId = `${uid}-clip-${r2(x)}-${r2(y)}`;
  return (
    <g>
      <clipPath id={clipId}>
        <rect x={r2(x)} y={r2(y)} width={r2(w)} height={r2(h)} rx={RADIUS.frame} />
      </clipPath>
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(w)}
        height={r2(h)}
        rx={RADIUS.frame}
        fill={COLOR.node}
      />
      <g clipPath={ref(clipId)}>
        <rect x={r2(x)} y={r2(y)} width={r2(w)} height={r2(headH)} fill={COLOR.bg} />
      </g>
      <line
        x1={r2(x)}
        y1={r2(y + headH)}
        x2={r2(x + w)}
        y2={r2(y + headH)}
        stroke={COLOR.fg}
        strokeWidth={STROKE.divider}
      />
      {title && (
        <Label x={x + w / 2} y={y + headH / 2} text={title} size={FONT.title} weight={700} />
      )}
      {note && (
        <Label
          x={x + 10}
          y={y + headH / 2}
          text={note}
          size={FONT.note}
          fill={COLOR.muted}
          anchor="start"
        />
      )}
      {right && (
        <Label
          x={x + w - 10}
          y={y + headH / 2}
          text={right}
          size={FONT.note}
          fill={COLOR.muted}
          anchor="end"
        />
      )}
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(w)}
        height={r2(h)}
        rx={RADIUS.frame}
        fill="none"
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
    </g>
  );
}

/** Centred muted footnote band at the bottom of a figure. */
function Footnote({ x, y, text }: { x: number; y: number; text: string }) {
  return <Label x={x} y={y} text={text} size={FONT.note} fill={COLOR.caption} />;
}

// =========================================================================
// mode: slot-grid
// =========================================================================

function SlotGrid(p: SlotGridProps) {
  const uid = stableId("pl", p);
  const arrow = `${uid}-a`;
  const M = SPACE.margin;
  const PAD = 14; // page inner padding
  const HEAD_H = 30;
  const CELL_W = 78;
  const CELL_H = 46;
  const GAP = 12;
  const cols = p.columns ?? p.cells.length;
  const rows = Math.ceil(p.cells.length / cols) || 1;
  const gridW = cols * CELL_W + (cols - 1) * GAP;
  const pageW = gridW + 2 * PAD;

  // Per-slot bitmap: when `headerRight` has exactly one token per slot of a
  // single-row grid, each bit sits directly above its slot instead of being
  // packed into the header band.
  const bitTokens = p.headerRight ? p.headerRight.trim().split(/\s+/) : [];
  const perSlotBits = bitTokens.length === cols && rows === 1;
  const BITS_H = perSlotBits ? 20 : 0;

  const gridTop = HEAD_H + PAD + BITS_H;
  const pageH = gridTop + rows * CELL_H + (rows - 1) * GAP + PAD;

  // RID annotation: routed entirely outside the slot grid so the arrow can
  // never cross another slot. Preference order: a horizontal arrow from the
  // right when the hit cell owns the right edge of its row; a vertical arrow
  // from below when it sits in the bottom row; otherwise a plain annotation
  // under the page with the emphasis ring alone carrying the pointer.
  const hitIdx = p.cells.findIndex((c) => c.state === "hit");
  const hitCol = hitIdx % cols;
  const hitRow = Math.floor(hitIdx / cols);
  const rowLast =
    hitIdx >= 0 &&
    (hitCol === cols - 1 || hitIdx === p.cells.length - 1);
  const bottomRow = hitIdx >= 0 && hitRow === rows - 1;
  const route: "side" | "below" | "plain" | "none" = !p.annotation
    ? "none"
    : hitIdx < 0
      ? "plain"
      : rowLast
        ? "side"
        : bottomRow
          ? "below"
          : "plain";

  const ANN_RUN = 38; // arrow run outside the page frame
  const annTextW = p.annotation ? measureText(p.annotation, FONT.label) : 0;
  const annRightW = route === "side" ? ANN_RUN + 8 + annTextW + 8 : 0;
  const annBelowH = route === "below" ? ANN_RUN + 24 : route === "plain" ? 32 : 0;

  const footH = p.footnote ? 26 : 0;
  const footW = p.footnote ? measureText(p.footnote, FONT.note) + 2 * M : 0;
  const width = Math.max(M + pageW + annRightW + M, footW);
  const height = M + pageH + annBelowH + footH + M;
  const x0 = M;
  const y0 = M;

  const cellX = (col: number) => x0 + PAD + col * (CELL_W + GAP);
  const cellY = (row: number) => y0 + gridTop + row * (CELL_H + GAP);

  const cellEls = p.cells.map((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const isHit = c.state === "hit";
    const isEmpty = c.state === "empty";
    return (
      <g key={i}>
        <rect
          x={r2(cellX(col))}
          y={r2(cellY(row))}
          width={CELL_W}
          height={CELL_H}
          rx={RADIUS.box}
          fill={isEmpty ? COLOR.node : COLOR.bg}
          stroke={isEmpty ? COLOR.muted : COLOR.fg}
          strokeWidth={isHit ? STROKE.bold : STROKE.frame}
          strokeDasharray={isEmpty ? STROKE.dash : undefined}
        />
        <Label
          x={cellX(col) + CELL_W / 2}
          y={cellY(row) + CELL_H / 2}
          text={c.label}
          fill={isEmpty ? COLOR.muted : COLOR.fg}
        />
      </g>
    );
  });

  const annotationEl = (() => {
    if (!p.annotation) return null;
    if (route === "side") {
      const y = cellY(hitRow) + CELL_H / 2;
      return (
        <g>
          <Arrow
            from={{ x: x0 + pageW + ANN_RUN, y }}
            to={{ x: cellX(hitCol) + CELL_W + 5, y }}
            markerId={arrow}
          />
          <Label
            x={x0 + pageW + ANN_RUN + 8}
            y={y}
            text={p.annotation}
            anchor="start"
          />
        </g>
      );
    }
    if (route === "below") {
      const x = cellX(hitCol) + CELL_W / 2;
      return (
        <g>
          <Arrow
            from={{ x, y: y0 + pageH + ANN_RUN }}
            to={{ x, y: cellY(hitRow) + CELL_H + 5 }}
            markerId={arrow}
          />
          <Label
            x={x}
            y={y0 + pageH + ANN_RUN + 12}
            text={p.annotation}
          />
        </g>
      );
    }
    return <Label x={x0 + pageW / 2} y={y0 + pageH + 20} text={p.annotation} />;
  })();

  return (
    <DiagramSvg w={width} h={height} label={p.caption ?? p.header}>
      <defs>
        <ArrowHead id={arrow} />
      </defs>
      <PageFrame
        x={x0}
        y={y0}
        w={pageW}
        h={pageH}
        headH={HEAD_H}
        title={p.header}
        note={p.headerNote}
        right={!perSlotBits ? p.headerRight : undefined}
        uid={uid}
      />
      {perSlotBits &&
        bitTokens.map((b, i) => (
          <Label
            key={`bit${i}`}
            x={cellX(i) + CELL_W / 2}
            y={y0 + gridTop - 12}
            text={b}
            size={FONT.note}
            fill={b === "0" ? COLOR.muted : COLOR.fg}
          />
        ))}
      {cellEls}
      {annotationEl}
      {p.footnote && (
        <Footnote x={width / 2} y={height - M - footH / 2 + 8} text={p.footnote} />
      )}
    </DiagramSvg>
  );
}

// =========================================================================
// mode: byte-strip
// =========================================================================

function ByteStrip(p: ByteStripProps) {
  const uid = stableId("pl", p);
  const arrow = `${uid}-a`;
  const M = SPACE.margin + 2;
  const HEAD_H = p.header ? 24 : 0;
  const CELL_H = 50;
  const UNIT = 58; // px per span unit
  const MINW = 50;
  const widths = p.cells.map((c) =>
    Math.max(MINW, (c.span ?? 1) * UNIT, labelW(c.label) + 2 * SPACE.textPadX),
  );
  const stripW = widths.reduce((a, b) => a + b, 0);
  const groupH = p.cells.some((c) => c.group) ? 20 : 0;
  const rulerH = p.offsets ? 22 : 0;
  const shiftH = p.shiftLabel ? 40 : 0;
  const footH = p.footnote ? 24 : 0;
  const footW = p.footnote ? measureText(p.footnote, FONT.note) + 2 * M : 0;
  const rulerLabelW = p.rulerLabel
    ? measureText(p.rulerLabel, FONT.note) + 10
    : 0;
  const x0 = M + rulerLabelW;
  const yGroup = M + HEAD_H + (HEAD_H ? 6 : 0);
  const yStrip = yGroup + groupH;
  const width = Math.max(stripW + 2 * M + rulerLabelW, footW);
  const height = yStrip + CELL_H + rulerH + shiftH + footH + M;

  // boundary x positions (cells.length + 1 of them)
  const xs: number[] = [x0];
  for (const w of widths) xs.push(xs[xs.length - 1] + w);

  // the strip itself: one outer rect + dividers; states overlay inside cells
  const cells: Cell[] = p.cells.map((c) => ({
    label: c.label,
    tint: c.state === "meta",
    color: c.state === "gap" ? COLOR.muted : undefined,
  }));

  return (
    <DiagramSvg w={width} h={height} label={p.caption ?? p.header ?? "byte layout"}>
      <defs>
        <ArrowHead id={arrow} />
      </defs>
      {p.header && (
        <Label
          x={x0 + stripW / 2}
          y={M + HEAD_H / 2}
          text={p.header}
          size={FONT.note}
          weight={700}
          fill={COLOR.muted}
        />
      )}
      {/* group captions above their first cell */}
      {p.cells.map(
        (c, i) =>
          c.group && (
            <Label
              key={`g${i}`}
              x={xs[i] + widths[i] / 2}
              y={yGroup - groupH / 2 + 4}
              text={c.group}
              size={FONT.note}
              weight={700}
            />
          ),
      )}
      <CellStrip x={x0} y={yStrip} cellH={CELL_H} widths={widths} cells={cells} />
      {/* dashed inset marks deleted / free cells without breaking the strip */}
      {p.cells.map((c, i) =>
        c.state === "gap" ? (
          <rect
            key={`gap${i}`}
            x={r2(xs[i] + 4)}
            y={r2(yStrip + 4)}
            width={r2(widths[i] - 8)}
            height={CELL_H - 8}
            rx={RADIUS.cell}
            fill="none"
            stroke={COLOR.muted}
            strokeWidth={STROKE.divider}
            strokeDasharray={STROKE.dash}
          />
        ) : null,
      )}
      {/* byte ruler under the boundaries */}
      {p.offsets && (
        <g>
          {p.offsets.slice(0, xs.length).map((o, i) => (
            <Label
              key={i}
              x={xs[i]}
              y={yStrip + CELL_H + 14}
              text={String(o)}
              size={FONT.note}
              fill={COLOR.caption}
            />
          ))}
          {p.rulerLabel && (
            <Label
              x={x0 - 6}
              y={yStrip + CELL_H + 14}
              text={p.rulerLabel}
              anchor="end"
              size={FONT.note}
              fill={COLOR.caption}
            />
          )}
        </g>
      )}
      {/* shift arrow below the strip */}
      {p.shiftLabel && (
        <Arrow
          from={{ x: x0 + stripW * 0.92, y: yStrip + CELL_H + rulerH + 16 }}
          to={{ x: x0 + stripW * 0.3, y: yStrip + CELL_H + rulerH + 16 }}
          markerId={arrow}
          label={p.shiftLabel}
          labelColor={COLOR.caption}
          labelOffset={13}
        />
      )}
      {p.footnote && (
        <Footnote x={width / 2} y={height - M - footH / 2 + 6} text={p.footnote} />
      )}
    </DiagramSvg>
  );
}

// =========================================================================
// mode: slotted
// =========================================================================

function Slotted(p: SlottedProps) {
  const uid = stableId("pl", p);
  const arrow = `${uid}-a`;
  const M = SPACE.margin + 2;
  const TITLE_H = 22;
  const LEFT_W = 178;
  const HEAD_H = 30;
  const SLOT_H = 50;
  const ROW_GAP = 8;
  const COL_GAP = 82;
  const FREE_W = 130;
  const REC_W = 134;

  const x0 = M;
  const yTop = M + TITLE_H;
  const dirX = x0;
  const headTotal = p.headerRows.length * (HEAD_H + 6) + 2;
  const slotsTotal = p.slots.length * SLOT_H + (p.slots.length - 1) * ROW_GAP;
  const leftH = 12 + headTotal + 8 + slotsTotal + 12;

  const freeX = dirX + LEFT_W + COL_GAP;
  const recX = freeX + FREE_W + COL_GAP;

  // record heights from weights, packed top-down in the right column
  const weights = p.slots.map((s) => s.recWeight ?? 1);
  const totW = weights.reduce((a, b) => a + b, 0);
  const recColH = leftH - 24;
  const recHeights = weights.map((w) => Math.max(26, (w / totW) * recColH - 8));

  const pageW = recX + REC_W + 16 - x0;
  const pageH = leftH;
  const width = M + pageW + M;
  const height = yTop + pageH + M;

  const headerY = (i: number) => yTop + 12 + i * (HEAD_H + 6);
  const slotY = (i: number) => yTop + 12 + headTotal + 8 + i * (SLOT_H + ROW_GAP);
  const recYs: number[] = [];
  {
    let ry = yTop + 12;
    for (const h of recHeights) {
      recYs.push(ry);
      ry += h + 8;
    }
  }

  // free pointer: from the second header row to the free-space region
  const freePtrY = headerY(1) + HEAD_H / 2;

  return (
    <DiagramSvg w={width} h={height} label={p.caption ?? "slotted page"}>
      <defs>
        <ArrowHead id={arrow} />
      </defs>
      <rect
        x={r2(x0)}
        y={r2(yTop)}
        width={r2(pageW)}
        height={r2(pageH)}
        rx={RADIUS.frame}
        fill={COLOR.node}
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      {p.leftTitle && (
        <Label
          x={dirX + LEFT_W / 2}
          y={M + TITLE_H / 2}
          text={p.leftTitle}
          size={FONT.note}
          weight={700}
        />
      )}
      {p.rightTitle && (
        <Label
          x={recX + REC_W / 2}
          y={M + TITLE_H / 2}
          text={p.rightTitle}
          size={FONT.note}
          weight={700}
        />
      )}
      {/* free-space region */}
      <rect
        x={r2(freeX)}
        y={r2(yTop + 12)}
        width={FREE_W}
        height={r2(recColH)}
        rx={RADIUS.box}
        fill={COLOR.bg}
        stroke={COLOR.muted}
        strokeWidth={STROKE.divider}
        strokeDasharray={STROKE.dash}
      />
      {/* label low in the region, below the slot->record link fan */}
      <Label
        x={freeX + FREE_W / 2}
        y={yTop + 12 + recColH * 0.74}
        text={p.freeLabel ?? "Free space"}
        size={FONT.note}
        weight={700}
        fill={COLOR.muted}
        halo
      />
      {/* boundary between free space and records */}
      <line
        x1={r2(freeX + FREE_W)}
        y1={r2(yTop + 12)}
        x2={r2(freeX + FREE_W)}
        y2={r2(yTop + 12 + recColH)}
        stroke={COLOR.fg}
        strokeWidth={STROKE.divider}
        strokeDasharray="3 3"
      />
      {/* free pointer arrow */}
      <Arrow
        from={{ x: dirX + LEFT_W - 12, y: freePtrY }}
        to={{ x: freeX - 4, y: freePtrY }}
        markerId={arrow}
      />
      {/* header rows */}
      {p.headerRows.map((h, i) => (
        <Box
          key={`h${i}`}
          x={dirX + 12}
          y={headerY(i)}
          w={LEFT_W - 24}
          h={HEAD_H}
          label={h}
          tint
          fontSize={FONT.note}
          fontWeight={700}
        />
      ))}
      {/* slot -> record links */}
      {p.slots.map((_, i) => (
        <Arrow
          key={`ln${i}`}
          from={{ x: dirX + LEFT_W - 12, y: slotY(i) + SLOT_H / 2 }}
          to={{ x: recX - 3, y: recYs[i] + recHeights[i] / 2 }}
          markerId={arrow}
        />
      ))}
      {/* slot entries and records */}
      {p.slots.map((s, i) => (
        <g key={`s${i}`}>
          <Box
            x={dirX + 12}
            y={slotY(i)}
            w={LEFT_W - 24}
            h={SLOT_H}
            label={s.label}
            fontSize={FONT.note}
          />
          <Box
            x={recX}
            y={recYs[i]}
            w={REC_W}
            h={recHeights[i]}
            label={s.recLabel ?? `record ${i}`}
            fontSize={FONT.note}
          />
        </g>
      ))}
    </DiagramSvg>
  );
}

// =========================================================================
// mode: row-column
// =========================================================================

function RowColumn(p: RowColumnProps) {
  const uid = stableId("pl", p);
  const M = SPACE.margin;
  const PANEL_GAP = 36;
  const HEAD_H = 30;
  const COL_H = 22;
  const CELL_H = 32;
  const TITLE_PAD = 12;
  const nCols = p.columns.length;
  const nRows = p.rows.length;

  // column width fits the widest cell or header in that column
  const colW = Math.max(
    52,
    ...p.columns.map((c) => labelW(c, FONT.note, 700) + 16),
    ...p.rows.flatMap((row) => row.map((c) => labelW(c, FONT.note) + 16)),
  );
  const rowLabW = p.rowLabels
    ? Math.max(...p.rowLabels.map((l) => labelW(l, FONT.note))) + 14
    : 0;

  const gridW = nCols * colW;
  const panelW = rowLabW + gridW + 2 * TITLE_PAD;
  const panelH = HEAD_H + COL_H + 6 + nRows * CELL_H + 12;
  const noteH = p.leftNote || p.rightNote ? 26 : 0;
  const width = 2 * panelW + PANEL_GAP + 2 * M;
  const height = M + panelH + noteH + M;

  function Panel({
    x,
    title,
    tag,
    hiRow,
    hiCol,
    note,
  }: {
    x: number;
    title: string;
    tag?: string;
    hiRow?: number;
    hiCol?: number;
    note?: string;
  }) {
    const y = M;
    const gx = x + TITLE_PAD + rowLabW;
    const gridTop = y + HEAD_H + COL_H + 6;
    const gridH = nRows * CELL_H;
    return (
      <g>
        <PageFrame x={x} y={y} w={panelW} h={panelH} headH={HEAD_H} title={title} note={tag} uid={`${uid}-${r2(x)}`} />
        {/* column headers */}
        {p.columns.map((c, ci) => (
          <Label
            key={`c${ci}`}
            x={gx + ci * colW + colW / 2}
            y={y + HEAD_H + COL_H / 2 + 4}
            text={c}
            size={FONT.note}
            weight={700}
          />
        ))}
        {/* row labels */}
        {p.rowLabels?.map((rl, ri) => (
          <Label
            key={`rl${ri}`}
            x={gx - 8}
            y={gridTop + ri * CELL_H + CELL_H / 2}
            text={rl}
            anchor="end"
            size={FONT.note}
            fill={COLOR.muted}
          />
        ))}
        {/* the grid: one outer rect + single-stroke dividers */}
        <rect
          x={r2(gx)}
          y={r2(gridTop)}
          width={r2(gridW)}
          height={r2(gridH)}
          rx={RADIUS.box}
          fill={COLOR.bg}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        {Array.from({ length: nCols - 1 }, (_, ci) => (
          <line
            key={`v${ci}`}
            x1={r2(gx + (ci + 1) * colW)}
            y1={r2(gridTop)}
            x2={r2(gx + (ci + 1) * colW)}
            y2={r2(gridTop + gridH)}
            stroke={COLOR.fg}
            strokeWidth={STROKE.divider}
          />
        ))}
        {Array.from({ length: nRows - 1 }, (_, ri) => (
          <line
            key={`hl${ri}`}
            x1={r2(gx)}
            y1={r2(gridTop + (ri + 1) * CELL_H)}
            x2={r2(gx + gridW)}
            y2={r2(gridTop + (ri + 1) * CELL_H)}
            stroke={COLOR.fg}
            strokeWidth={STROKE.divider}
          />
        ))}
        {p.rows.map((row, ri) =>
          row.map((cell, ci) => (
            <Label
              key={`${ri}-${ci}`}
              x={gx + ci * colW + colW / 2}
              y={gridTop + ri * CELL_H + CELL_H / 2}
              text={cell}
              size={FONT.note}
            />
          )),
        )}
        {/* emphasis ring: a row */}
        {hiRow != null && (
          <rect
            x={r2(gx - 2)}
            y={r2(gridTop + hiRow * CELL_H - 2)}
            width={r2(gridW + 4)}
            height={CELL_H + 4}
            rx={RADIUS.box}
            fill="none"
            stroke={COLOR.fg}
            strokeWidth={STROKE.bold}
          />
        )}
        {/* emphasis ring: a column */}
        {hiCol != null && (
          <rect
            x={r2(gx + hiCol * colW - 2)}
            y={r2(gridTop - 2)}
            width={colW + 4}
            height={r2(gridH + 4)}
            rx={RADIUS.box}
            fill="none"
            stroke={COLOR.fg}
            strokeWidth={STROKE.bold}
          />
        )}
        {note && (
          <Label
            x={x + panelW / 2}
            y={M + panelH + 14}
            text={note}
            size={FONT.note}
            fill={COLOR.caption}
          />
        )}
      </g>
    );
  }

  return (
    <DiagramSvg w={width} h={height} label={p.caption ?? "row vs column layout"}>
      <Panel x={M} title={p.leftTitle} tag={p.leftTag} hiRow={p.highlightRow} note={p.leftNote} />
      <Panel
        x={M + panelW + PANEL_GAP}
        title={p.rightTitle}
        tag={p.rightTag}
        hiCol={p.highlightColumn}
        note={p.rightNote}
      />
    </DiagramSvg>
  );
}

// =========================================================================
// mode: pax
// =========================================================================

function Pax(p: PaxProps) {
  const uid = stableId("pl", p);
  const M = SPACE.margin;
  const HEAD_H = 30;
  const GROUP_GAP = 14;
  const GROUP_PAD = 12;
  const MINI_W = 92;
  const MINI_H = 26;
  const CELL_H = 30;
  const PART_GAP = 18;

  const nCols = p.columns.length;
  const cellsPerPart = Math.max(
    ...p.groups.map((g) => Math.max(...g.cells.map((c) => c.length))),
  );
  const cellW = Math.max(
    38,
    ...p.groups.flatMap((g) => g.cells.flat()).map((c) => labelW(c, FONT.note) + 12),
  );
  const partW = cellsPerPart * cellW;
  const innerW = MINI_W + 18 + nCols * partW + (nCols - 1) * PART_GAP;
  const groupW = innerW + 2 * GROUP_PAD;
  const groupH = 14 + MINI_H + 10 + CELL_H + 14;

  // horizontal group labels live in a measured right gutter — never rotated,
  // never clipped (they used to be rotated and cramped at the page edge)
  const gutterW = p.groups.some((g) => g.label)
    ? Math.max(...p.groups.map((g) => (g.label ? labelW(g.label, FONT.note) : 0))) + 14
    : 0;

  const pageW = groupW + 2 * GROUP_PAD;
  const nG = p.groups.length;
  const pageH = HEAD_H + 12 + nG * groupH + (nG - 1) * GROUP_GAP + 14;
  const footH = p.footnote ? 24 : 0;
  const footW = p.footnote ? measureText(p.footnote, FONT.note) + 2 * M : 0;
  const width = Math.max(M + pageW + gutterW + M, footW);
  const height = M + pageH + footH + M;
  const x0 = M;
  const bodyTop = M + HEAD_H + 12;

  const groupEls = p.groups.map((g, gi) => {
    const gy = bodyTop + gi * (groupH + GROUP_GAP);
    const gx = x0 + GROUP_PAD;
    const miniX = gx + GROUP_PAD;
    const miniY = gy + 14;
    const partsY = gy + groupH - 14 - CELL_H;
    return (
      <g key={gi}>
        <rect
          x={r2(gx)}
          y={r2(gy)}
          width={r2(groupW)}
          height={r2(groupH)}
          rx={RADIUS.box}
          fill={COLOR.node}
          stroke={COLOR.muted}
          strokeWidth={STROKE.divider}
          strokeDasharray={STROKE.dash}
        />
        <Box
          x={miniX}
          y={miniY}
          w={MINI_W}
          h={MINI_H}
          label="mini header"
          tint
          fontSize={FONT.note}
          fontWeight={700}
        />
        {p.columns.map((col, ci) => {
          const px = miniX + MINI_W + 18 + ci * (partW + PART_GAP);
          const cells = g.cells[ci] ?? [];
          return (
            <g key={ci}>
              <Label
                x={px + partW / 2}
                y={miniY + MINI_H / 2}
                text={`partition ${col}`}
                size={FONT.note}
                weight={700}
              />
              <CellStrip
                x={px}
                y={partsY}
                cellW={cellW}
                cellH={CELL_H}
                cells={cells}
                fontSize={FONT.note}
              />
            </g>
          );
        })}
        {g.label && (
          <Label
            x={x0 + pageW + 10}
            y={gy + groupH / 2}
            text={g.label}
            anchor="start"
            size={FONT.note}
            fill={COLOR.caption}
          />
        )}
      </g>
    );
  });

  return (
    <DiagramSvg w={width} h={height} label={p.caption ?? "PAX page"}>
      <PageFrame
        x={x0}
        y={M}
        w={pageW}
        h={pageH}
        headH={HEAD_H}
        title={p.header}
        note={p.headerNote}
        uid={uid}
      />
      {groupEls}
      {p.footnote && (
        <Footnote x={M + pageW / 2} y={height - M - footH / 2 + 6} text={p.footnote} />
      )}
    </DiagramSvg>
  );
}

// =========================================================================
// mode: orc
// =========================================================================

function Orc(p: OrcProps) {
  const uid = stableId("pl", p);
  const arrow = `${uid}-a`;
  const M = SPACE.margin;
  const TITLE_H = 24;
  const STRIPE_W = 150;
  const BAND_H = 30;
  const STRIPE_GAP = 14;
  const COL_GAP = 88;
  const DETAIL_W = 168;
  const DETAIL_H = 32;
  const DETAIL_GAP = 8;

  const leftLab = Math.max(...p.stripes.map((s) => labelW(s.label, FONT.note))) + 12;
  const x0 = M;
  const leftX = x0 + leftLab;
  const yTop = M + TITLE_H;

  // left column layout (stripes stacked, drawn dots before the last stripe)
  let ly = yTop;
  const stripeLayout = p.stripes.map((s, i) => {
    const h = s.bands.length * BAND_H;
    const top = ly;
    ly += h + STRIPE_GAP;
    if (p.ellipsis && i === p.stripes.length - 2) ly += 22;
    return { top, h, stripe: s };
  });
  if (p.fileFooter) ly += BAND_H + 6;
  const leftBottom = ly - STRIPE_GAP + (p.fileFooter ? STRIPE_GAP : 0);

  // detail column
  const detailX = leftX + STRIPE_W + COL_GAP;
  const detailTop = yTop + 8;
  let dy = detailTop;
  const detailYs = p.detail.map((d, i) => {
    if (i > 0 && d.kind === "data" && p.detail[i - 1].kind !== "data") dy += 16;
    const y = dy;
    dy += DETAIL_H + DETAIL_GAP;
    return y;
  });
  const detailBottom = dy - DETAIL_GAP;

  const contentBottom = Math.max(leftBottom, detailBottom);
  const footH = p.footnote ? 30 : 0;
  const footW = p.footnote ? measureText(p.footnote, FONT.note) + 2 * M : 0;
  const width = Math.max(detailX + DETAIL_W + M, footW);
  const height = contentBottom + footH + M;

  // links go from the zoomed (first) stripe's bands to the detail rows
  const zoom = stripeLayout[0];
  const zoomBandY = (kind: "index" | "data") => {
    const idx = zoom.stripe.bands.findIndex((b) =>
      kind === "index" ? b.kind !== "footer" && b.kind !== "data" : b.kind === "data",
    );
    return zoom.top + Math.max(0, idx) * BAND_H + BAND_H / 2;
  };

  return (
    <DiagramSvg w={width} h={height} label={p.caption ?? "ORC file layout"}>
      <defs>
        <ArrowHead id={arrow} />
      </defs>
      <Label
        x={leftX + STRIPE_W / 2}
        y={M + TITLE_H / 2}
        text={p.leftTitle}
        size={FONT.note}
        weight={700}
      />
      <Label
        x={detailX + DETAIL_W / 2}
        y={M + TITLE_H / 2}
        text={p.rightTitle}
        size={FONT.note}
        weight={700}
      />
      {/* zoom links under the boxes */}
      {p.detail.map((d, i) => (
        <Arrow
          key={`k${i}`}
          from={{ x: leftX + STRIPE_W, y: zoomBandY(d.kind === "data" ? "data" : "index") }}
          to={{ x: detailX - 3, y: detailYs[i] + DETAIL_H / 2 }}
          markerId={arrow}
          width={STROKE.divider}
        />
      ))}
      {/* stripes */}
      {stripeLayout.map((sl, i) => (
        <g key={i}>
          <Label
            x={leftX - 6}
            y={sl.top + sl.h / 2}
            text={sl.stripe.label}
            anchor="end"
            size={FONT.note}
            fill={COLOR.muted}
          />
          <rect
            x={r2(leftX)}
            y={r2(sl.top)}
            width={STRIPE_W}
            height={r2(sl.h)}
            rx={RADIUS.box}
            fill={COLOR.node}
            stroke={COLOR.fg}
            strokeWidth={STROKE.frame}
          />
          {sl.stripe.bands.map((b, bi) => (
            <Box
              key={bi}
              x={leftX + 6}
              y={sl.top + bi * BAND_H + 3}
              w={STRIPE_W - 12}
              h={BAND_H - 6}
              label={b.label}
              rx={RADIUS.cell}
              fontSize={FONT.note}
              state={b.kind === "footer" ? "emphasis" : "normal"}
              tint={b.kind !== "data"}
              strokeWidth={b.kind === "footer" ? undefined : STROKE.divider}
            />
          ))}
        </g>
      ))}
      {p.ellipsis && stripeLayout.length >= 2 && (
        <DotsEllipsis
          x={leftX + STRIPE_W / 2}
          y={
            stripeLayout[stripeLayout.length - 2].top +
            stripeLayout[stripeLayout.length - 2].h +
            STRIPE_GAP +
            8
          }
          orient="v"
          gap={4}
        />
      )}
      {p.fileFooter && (
        <Box
          x={leftX}
          y={leftBottom - BAND_H}
          w={STRIPE_W}
          h={BAND_H}
          label={p.fileFooter}
          state="emphasis"
          tint
          fontSize={FONT.note}
        />
      )}
      {/* detail rows */}
      {p.detail.map((d, i) => (
        <Box
          key={i}
          x={detailX}
          y={detailYs[i]}
          w={DETAIL_W}
          h={DETAIL_H}
          label={d.label}
          tint={d.kind !== "data"}
          fontSize={FONT.note}
        />
      ))}
      {p.footnote && (
        <Footnote x={width / 2} y={contentBottom + footH / 2 + 4} text={p.footnote} />
      )}
    </DiagramSvg>
  );
}

// =========================================================================
// mode: heap-dir
// =========================================================================

function HeapDir(p: HeapDirProps) {
  const uid = stableId("pl", p);
  const arrow = `${uid}-a`;
  const M = SPACE.margin + 2;
  const DIR_HEAD = 26;
  const ENTRY_H = 32;
  const DROP = 36; // arrow run from directory to pages
  const PAGE_W = 116;
  const PAGE_HEAD = 26;
  const PAGE_H = 158;
  const PAGE_GAP = 26;

  const nPages = p.pages.length;
  // the directory is a strip across the top; each entry sits directly above
  // its page so every pointer is a straight, uncrossed vertical drop
  const pagesW = nPages * PAGE_W + (nPages - 1) * PAGE_GAP;
  const ellW = p.ellipsis ? 26 : 0;
  const dirW = pagesW + ellW;
  const dirH = DIR_HEAD + 10 + ENTRY_H + 10;

  const x0 = M;
  const yDir = M;
  const yPages = yDir + dirH + DROP;
  const footH = p.footnote ? 26 : 0;
  const footW = p.footnote ? measureText(p.footnote, FONT.note) + 2 * M : 0;
  const width = Math.max(M + dirW + M, footW);
  const height = yPages + PAGE_H + footH + M;

  const pageX = (i: number) => x0 + i * (PAGE_W + PAGE_GAP);
  const pageCx = (i: number) => pageX(i) + PAGE_W / 2;
  const entryW = Math.min(
    PAGE_W + PAGE_GAP - 10,
    Math.max(...p.pages.map((pg) => labelW(pg.entry, FONT.note) + 18)),
  );
  const entryY = yDir + DIR_HEAD + 10;

  return (
    <DiagramSvg w={width} h={height} label={p.caption ?? "heap page directory"}>
      <defs>
        <ArrowHead id={arrow} />
      </defs>
      {/* directory strip */}
      <PageFrame
        x={x0}
        y={yDir}
        w={dirW}
        h={dirH}
        headH={DIR_HEAD}
        title={p.dirTitle ?? "Directory"}
        uid={uid}
      />
      {p.pages.map((pg, i) => (
        <Box
          key={`e${i}`}
          x={pageCx(i) - entryW / 2}
          y={entryY}
          w={entryW}
          h={ENTRY_H}
          label={pg.entry}
          fontSize={FONT.note}
        />
      ))}
      {p.ellipsis && (
        <DotsEllipsis x={x0 + dirW - ellW / 2 - 4} y={entryY + ENTRY_H / 2} />
      )}
      {/* entry -> page drops */}
      {p.pages.map((_, i) => (
        <Arrow
          key={`a${i}`}
          from={{ x: pageCx(i), y: yDir + dirH }}
          to={{ x: pageCx(i), y: yPages - 3 }}
          markerId={arrow}
        />
      ))}
      {/* pages with free/used regions */}
      {p.pages.map((pg, i) => {
        const px = pageX(i);
        const bodyTop = yPages + PAGE_HEAD + 8;
        const bodyH = PAGE_H - PAGE_HEAD - 16;
        const freeH = pg.free * bodyH;
        const usedH = bodyH - freeH;
        return (
          <g key={i}>
            <PageFrame
              x={px}
              y={yPages}
              w={PAGE_W}
              h={PAGE_H}
              headH={PAGE_HEAD}
              title={pg.title}
              uid={`${uid}-p${i}`}
            />
            {freeH > 1 && (
              <>
                <rect
                  x={r2(px + 10)}
                  y={r2(bodyTop)}
                  width={PAGE_W - 20}
                  height={r2(freeH)}
                  rx={RADIUS.cell}
                  fill={COLOR.bg}
                  stroke={COLOR.muted}
                  strokeWidth={STROKE.divider}
                  strokeDasharray={STROKE.dash}
                />
                {pg.freeLabel && freeH > 20 && (
                  <Label
                    x={px + PAGE_W / 2}
                    y={bodyTop + freeH / 2}
                    text={pg.freeLabel}
                    size={FONT.note}
                    fill={COLOR.muted}
                  />
                )}
              </>
            )}
            {usedH > 1 && (
              <>
                <rect
                  x={r2(px + 10)}
                  y={r2(bodyTop + freeH)}
                  width={PAGE_W - 20}
                  height={r2(usedH)}
                  rx={RADIUS.cell}
                  fill={COLOR.bg}
                  stroke={COLOR.fg}
                  strokeWidth={STROKE.frame}
                />
                {pg.usedLabel && usedH > 20 && (
                  <Label
                    x={px + PAGE_W / 2}
                    y={bodyTop + freeH + usedH / 2}
                    text={pg.usedLabel}
                    size={FONT.note}
                  />
                )}
              </>
            )}
          </g>
        );
      })}
      {p.footnote && (
        <Footnote x={width / 2} y={height - M - footH / 2 + 8} text={p.footnote} />
      )}
    </DiagramSvg>
  );
}

// =========================================================================
// mode: overflow
// =========================================================================

function Overflow(p: OverflowProps) {
  const uid = stableId("pl", p);
  const arrow = `${uid}-a`;
  const M = SPACE.margin + 2;
  const PAGE_W = 132;
  const PAGE_HEAD = 26;
  const REC_H = 32;
  const REC_GAP = 8;
  const PAGE_GAP = 34;
  const topNoteH = p.topNote ? 24 : 0;
  const yTop = M + topNoteH;

  const maxRecs = Math.max(...p.pages.map((pg) => pg.records.length));
  const pageH = PAGE_HEAD + 8 + maxRecs * REC_H + (maxRecs - 1) * REC_GAP + 10;

  const ovW = PAGE_W + 28;
  const ovHead = 24;
  const ovH = ovHead + 7 + REC_H + 9;
  const dropGap = 44;

  const nPages = p.pages.length;
  const rowW = nPages * PAGE_W + (nPages - 1) * PAGE_GAP;
  const footH = p.footnote ? 28 : 0;
  const baseW = rowW + 2 * M;
  const footnoteW = p.footnote ? measureText(p.footnote, FONT.note) + 2 * M : 0;
  const width = Math.max(baseW, footnoteW);
  const x0 = M + (width - baseW) / 2;
  const height = yTop + pageH + dropGap + ovH + footH + M;

  const pageX = (i: number) => x0 + i * (PAGE_W + PAGE_GAP);
  const recY = (ri: number) => yTop + PAGE_HEAD + 8 + ri * (REC_H + REC_GAP);

  // overflow block centred under the gap after `afterPage`
  const ap = p.overflow.afterPage;
  const ovCenterX = pageX(ap) + PAGE_W + PAGE_GAP / 2;
  const ovX = Math.min(Math.max(M, ovCenterX - ovW / 2), width - M - ovW);
  const ovY = yTop + pageH + dropGap;
  const ovRecY = ovY + ovHead + 7;
  const ovRecX = ovX + 14;
  const ovRecW = ovW - 28;

  // chain: page `ap` bottom -> overflow record -> next page bottom, routed
  // entirely in the band below the pages so nothing is crossed
  const srcX = pageX(ap) + PAGE_W / 2;
  const dstX = pageX(ap + 1) + PAGE_W / 2;
  const ovMidY = ovRecY + REC_H / 2;

  return (
    <DiagramSvg w={width} h={height} label={p.caption ?? "sorted file with overflow"}>
      <defs>
        <ArrowHead id={arrow} />
      </defs>
      {p.topNote && (
        <Label
          x={width / 2}
          y={M + topNoteH / 2 - 4}
          text={p.topNote}
          size={FONT.note}
          fill={COLOR.caption}
        />
      )}
      {/* chain links under the boxes */}
      <path
        d={`M${r2(srcX)},${r2(yTop + pageH)} C ${r2(srcX)},${r2(ovMidY)} ${r2(ovRecX - 26)},${r2(ovMidY)} ${r2(ovX - 3)},${r2(ovMidY)}`}
        fill="none"
        stroke={COLOR.muted}
        strokeWidth={STROKE.line}
        markerEnd={ref(arrow)}
      />
      <path
        d={`M${r2(ovX + ovW)},${r2(ovMidY)} C ${r2(ovX + ovW + 26)},${r2(ovMidY)} ${r2(dstX)},${r2(ovMidY)} ${r2(dstX)},${r2(yTop + pageH + 5)}`}
        fill="none"
        stroke={COLOR.muted}
        strokeWidth={STROKE.line}
        markerEnd={ref(arrow)}
      />
      {/* ordered pages */}
      {p.pages.map((pg, i) => (
        <g key={i}>
          <PageFrame
            x={pageX(i)}
            y={yTop}
            w={PAGE_W}
            h={pageH}
            headH={PAGE_HEAD}
            title={pg.title}
            uid={`${uid}-p${i}`}
          />
          {pg.records.map((rec, ri) => (
            <Box
              key={ri}
              x={pageX(i) + 14}
              y={recY(ri)}
              w={PAGE_W - 28}
              h={REC_H}
              label={String(rec)}
              fontSize={FONT.note}
            />
          ))}
        </g>
      ))}
      {/* overflow block */}
      <PageFrame
        x={ovX}
        y={ovY}
        w={ovW}
        h={ovH}
        headH={ovHead}
        title={p.overflow.title}
        uid={`${uid}-ov`}
      />
      <Box
        x={ovRecX}
        y={ovRecY}
        w={ovRecW}
        h={REC_H}
        label={String(p.overflow.record)}
        state="emphasis"
        fontSize={FONT.note}
      />
      {p.footnote && (
        <Footnote x={width / 2} y={height - M - footH / 2 + 8} text={p.footnote} />
      )}
    </DiagramSvg>
  );
}

// =========================================================================
// mode: node-strip
// =========================================================================

function NodeStrip(p: NodeStripProps) {
  const uid = stableId("pl", p);
  const arrow = `${uid}-a`;
  const M = SPACE.margin + 2;
  const TITLE_H = 22;
  const STRIP_H = 42;
  const ROW_GAP = 40;
  const CELL_MIN = 48;
  const NEXT_LEN = 52;

  const isDots = (s: string) => s.trim() === "...";
  const cellWidths = p.nodes.map((n) =>
    n.cells.map((c) =>
      isDots(c) ? CELL_MIN : Math.max(CELL_MIN, labelW(c) + 2 * SPACE.textPadX),
    ),
  );
  const stripWidths = cellWidths.map((ws) => ws.reduce((a, b) => a + b, 0));
  const maxNext = p.nodes.some((n) => n.nextLink) ? NEXT_LEN : 0;
  const contentW = Math.max(...stripWidths) + maxNext;
  const footH = p.footnote ? 26 : 0;
  const footW = p.footnote ? measureText(p.footnote, FONT.note) + 2 * M : 0;
  const width = Math.max(contentW + 2 * M, footW);
  const rowH = TITLE_H + STRIP_H;
  const height = M + p.nodes.length * (rowH + ROW_GAP) - ROW_GAP + footH + M;

  return (
    <DiagramSvg w={width} h={height} label={p.caption ?? "B+ tree node layout"}>
      <defs>
        <ArrowHead id={arrow} />
      </defs>
      {p.nodes.map((n, ni) => {
        const w = stripWidths[ni];
        const x0 = M + (contentW - maxNext - w) / 2;
        const yTitle = M + ni * (rowH + ROW_GAP);
        const yStrip = yTitle + TITLE_H;
        // boundary positions for the dots cells
        const starts: number[] = [0];
        for (const cw of cellWidths[ni]) starts.push(starts[starts.length - 1] + cw);
        return (
          <g key={ni}>
            <Label
              x={x0 + w / 2}
              y={yTitle + TITLE_H / 2 - 2}
              text={n.title}
              size={FONT.note}
              weight={700}
            />
            <CellStrip
              x={x0}
              y={yStrip}
              cellH={STRIP_H}
              widths={cellWidths[ni]}
              cells={n.cells.map((c) => (isDots(c) ? null : c))}
            />
            {n.cells.map((c, ci) =>
              isDots(c) ? (
                <DotsEllipsis
                  key={`d${ci}`}
                  x={x0 + starts[ci] + cellWidths[ni][ci] / 2}
                  y={yStrip + STRIP_H / 2}
                />
              ) : null,
            )}
            {n.nextLink && (
              <Arrow
                from={{ x: x0 + w, y: yStrip + STRIP_H / 2 }}
                to={{ x: x0 + w + NEXT_LEN - 6, y: yStrip + STRIP_H / 2 }}
                markerId={arrow}
              />
            )}
          </g>
        );
      })}
      {p.footnote && (
        <Footnote x={width / 2} y={height - M - footH / 2 + 8} text={p.footnote} />
      )}
    </DiagramSvg>
  );
}

// =========================================================================
// dispatch
// =========================================================================

export function PageLayout(props: PageLayoutProps) {
  let body: ReactNode;
  switch (props.mode) {
    case "slot-grid":
      body = <SlotGrid {...props} />;
      break;
    case "byte-strip":
      body = <ByteStrip {...props} />;
      break;
    case "slotted":
      body = <Slotted {...props} />;
      break;
    case "row-column":
      body = <RowColumn {...props} />;
      break;
    case "pax":
      body = <Pax {...props} />;
      break;
    case "orc":
      body = <Orc {...props} />;
      break;
    case "heap-dir":
      body = <HeapDir {...props} />;
      break;
    case "overflow":
      body = <Overflow {...props} />;
      break;
    case "node-strip":
      body = <NodeStrip {...props} />;
      break;
  }
  return (
    <DiagramFigure title={props.title} caption={props.caption} className={props.className}>
      {body}
    </DiagramFigure>
  );
}
