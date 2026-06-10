import {
  Arrow,
  ArrowHead,
  Box,
  CellStrip,
  COLOR,
  DiagramFigure,
  DiagramSvg,
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
  type BoxState,
  type Cell,
} from "@/components/diagram";

/**
 * Hash-table structures in the textbook style, as one server-rendered SVG
 * family covering the five database-index shapes:
 *
 *  - "static"       a hash source node fanning out to numbered primary page
 *                   boxes (header band + key/value rows), with an overflow page
 *                   reached by a spill arrow. Also handles the hash-index figure.
 *  - "chained"      a directory column of pointer dots, each pointing to one
 *                   bucket page; collisions extend a bucket through an overflow
 *                   page on a spill arrow.
 *  - "slotArray"    open addressing: a slot strip (occupied / empty / tombstone),
 *                   curved displacement arcs above for the probe chain, and an
 *                   optional second row illustrating a tombstone after a delete.
 *  - "directory"    extendible hashing: a binary-indexed directory of pointer
 *                   dots pointing to bucket pages that carry a local-depth chip;
 *                   several entries may share one bucket, and a global-depth
 *                   chip sits above the directory.
 *  - "bucketColumn" linear hashing: a numbered column of buckets (+ overflow),
 *                   a next/split pointer into the bucket being split, and a
 *                   dashed split elbow to the new image bucket.
 *
 * The author supplies the structure; layout is derived per mode. Boxes are
 * sized from real font metrics and the svg height is computed from the laid
 * content, so nothing ever clips. Every annotation gets its own lane: fan-out
 * index labels sit off their dashed lines toward the target, displacement-arc
 * labels stack one apex lane per arc (nudged sideways out of other arcs'
 * paths), and slot tags ("home") live in a band below the index row, clear of
 * the arcs. State follows the family grammar — emphasis = bold outline,
 * new = dashed, highlight = inverted — and a tombstone is a drawn diagonal
 * cross, never a glyph. Rendered once on the server (no client JS); all colour
 * and stroke comes from the diagram theme.
 */

// --- shared types ---------------------------------------------------------

/** Visual state shared across page boxes and slot cells.
 *  `full` = heavier outline (the page being changed / spilling),
 *  `new` = dashed outline (just created by a split),
 *  `highlight` = inverted box. */
export type HashState = "normal" | "full" | "new" | "highlight";

/** One page box: a header band over zero or more key (or key|value) rows. */
export interface HashPage {
  /** Stable id referenced by links / spills. */
  id: string;
  /** Header band text, e.g. "Bucket 0" or "Overflow". */
  title?: string;
  /** Small muted sub-line under the title, e.g. "primary page". */
  subtitle?: string;
  /** Body rows. Each row is a string, or `[key, value]` for a two-column row. */
  rows?: Array<string | [string, string]>;
  /** Local-depth chip drawn to the left of the box (extendible hashing). */
  depth?: string | number;
  state?: HashState;
  /** Small muted note to the right of the box, e.g. "21 just inserted". */
  note?: string;
}

export interface HashLink {
  /** Source: a directory entry index (number) or a dot/page id (string). */
  from: number | string;
  /** Target page id. */
  to: string;
}

/** A single open-addressing slot cell. */
export interface HashSlot {
  /** Cell contents; empty/omitted renders a blank free cell. */
  label?: string;
  /** "used" (occupied), "free" (empty) or "tomb" (tombstone marker). */
  kind?: "used" | "free" | "tomb";
  /** Small muted tag for the cell, e.g. "home"; drawn beneath its index. */
  top?: string;
}

/** A curved displacement arc above the slot row (probe chain step). */
export interface HashDisplacement {
  /** Source slot index. */
  from: number;
  /** Target slot index. */
  to: number;
  label?: string;
}

export interface HashProps {
  mode: "static" | "chained" | "slotArray" | "directory" | "bucketColumn";

  // -- node-and-pages modes (static, chained, directory, bucketColumn) --
  /** The hash source node, e.g. "h(k)". Drawn as a circle on the left. */
  source?: string;
  /** Small line under the source node, e.g. "h(k) mod N". */
  sourceNote?: string;
  /** Primary pages / buckets, top to bottom. */
  pages?: HashPage[];
  /** Overflow / image pages reached by a spill (chaining) arrow. */
  overflow?: HashPage[];
  /** Spill arrows from a page to an overflow page (id -> id). */
  spills?: Array<{ from: string; to: string; label?: string }>;

  // -- static: dashed numbered fan-out from the source --
  /** Fan-out edges from the source to pages, with an index label. */
  fanout?: Array<{ to: string; label?: string }>;

  // -- directory mode --
  /** Directory entry labels, top to bottom, e.g. ["00","01","10","11"]. */
  directory?: string[];
  /** Title above the directory column. */
  directoryTitle?: string;
  /** Global-depth chip value, drawn above the directory. */
  globalDepth?: string | number;
  /** Links from a directory entry (index) to a page id. */
  links?: HashLink[];

  // -- bucketColumn (linear hashing) --
  /** Bucket index labels, top to bottom; `isNew` is accepted for
   *  compatibility (the page's `new` state carries the meaning). */
  bucketLabels?: Array<{ label: string; isNew?: boolean }>;
  /** Index of the bucket the next/split pointer targets. */
  nextIndex?: number;
  /** Split elbow: from a page id to the new image page id. */
  split?: { from: string; to: string; label?: string };

  // -- slotArray mode --
  slots?: HashSlot[];
  /** Curved probe-displacement arcs above the slot row. */
  displacements?: HashDisplacement[];
  /** Optional second row illustrating a state (e.g. after a delete). */
  secondRow?: {
    /** Leading label to the left of the row. */
    leftLabel?: string;
    slots: HashSlot[];
    /** Trailing note to the right of the row. */
    rightLabel?: string;
  };

  title?: string;
  caption?: string;
  className?: string;
}

// --- geometry -------------------------------------------------------------

const HEADER_H = 26; // page header band height
const ROW_H = 22; // body / subtitle row height
const PAGE_MIN_W = 110; // page boxes never get narrower than this
const PAGE_GAP_Y = 24; // vertical gap between stacked pages
const SOURCE_R = 32; // hash source circle radius (grows to fit its label)
const SOURCE_RUN = 64; // fan-out run between the source circle and the pages
const SPILL_RUN = 56; // minimum run between the primary and overflow columns
const DIR_W = 48; // directory column width
const DIR_SLOT_H = 30; // minimum directory entry height
const DIR_RUN = 52; // link run between the directory dots and the pages
const CHIP_H = 20; // depth chip height
const CHIP_GAP = 6; // gap between a depth chip and its page (no shared edge)
const TOP_BAND = 34; // headroom for the global-depth chip / directory title
const NEXT_LANE = 56; // lane for the linear-hashing next pointer
const LABEL_LANE = 26; // lane for bucket index labels
const NOTE_GAP = 10; // gap between a page and its right-hand note
const SLOT_W = 44; // open-addressing slot cell width
const SLOT_H = 30; // open-addressing slot cell height
const ARC_BASE = 20; // apex depth of the lowest displacement arc
const ARC_LANE = 26; // extra apex depth per displacement-arc lane

const toBoxState = (s?: HashState): BoxState =>
  s === "full" ? "emphasis" : s === "new" ? "new" : s === "highlight" ? "highlight" : "normal";

/** An explicitly empty `rows: []` still gets one blank body row so the bucket
 *  draws as a complete box; `rows` omitted means a header-only box. */
const bodyRowCount = (p: HashPage) => (p.rows ? Math.max(p.rows.length, 1) : 0);

const pageHeight = (p: HashPage) =>
  HEADER_H + (p.subtitle ? ROW_H : 0) + bodyRowCount(p) * ROW_H;

const chipW = (depth: string | number) =>
  Math.max(22, measureLabel(String(depth), FONT.label, 600) + 10);

const rowNeedW = (row: string | [string, string]) =>
  Array.isArray(row)
    ? 2 * Math.max(measureLabel(row[0], FONT.label), measureLabel(row[1], FONT.label)) +
      2 * SPACE.textPadX +
      8
    : measureLabel(row, FONT.label) + 2 * SPACE.textPadX;

/** Width a page needs so none of its text overflows. */
function pageNeedW(p: HashPage): number {
  let w = PAGE_MIN_W;
  if (p.title) w = Math.max(w, measureLabel(p.title, FONT.label, 600) + 2 * SPACE.textPadX);
  if (p.subtitle) w = Math.max(w, measureLabel(p.subtitle, FONT.note) + 2 * SPACE.textPadX);
  for (const row of p.rows ?? []) w = Math.max(w, rowNeedW(row));
  return w;
}

// --- a page box (header band + body rows + optional depth chip + note) -----

interface LaidPage {
  page: HashPage;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Left edge of the page including its depth chip — where links arrive. */
const pageLeftX = (b: LaidPage) =>
  b.x - (b.page.depth != null ? chipW(b.page.depth) + CHIP_GAP : 0);

function PageEl({ b, uid }: { b: LaidPage; uid: string }) {
  const p = b.page;
  const { x, y, w, h } = b;
  const hi = p.state === "highlight";
  const ink = hi ? COLOR.hiFg : COLOR.fg;
  const headerOnly = !p.subtitle && p.rows == null;
  const rows = p.rows ?? [];
  const bodyTop = y + HEADER_H + (p.subtitle ? ROW_H : 0);

  const chip = p.depth != null && (
    <Box
      x={x - chipW(p.depth) - CHIP_GAP}
      y={y + (h - CHIP_H) / 2}
      w={chipW(p.depth)}
      h={CHIP_H}
      rx={RADIUS.cell}
      label={String(p.depth)}
      tint
      fontWeight={600}
    />
  );
  const note = p.note && (
    <Label
      x={x + w + NOTE_GAP}
      y={y + h / 2}
      text={p.note}
      size={FONT.note}
      fill={COLOR.caption}
      anchor="start"
    />
  );

  // a header-only page (no subtitle, no rows) is one fully tinted band
  if (headerOnly) {
    return (
      <g>
        {chip}
        <Box x={x} y={y} w={w} h={h} label={p.title} state={toBoxState(p.state)} tint={!hi} />
        {note}
      </g>
    );
  }

  const clipId = stableId("hd-page", { uid, id: p.id });
  return (
    <g>
      {chip}
      <clipPath id={clipId}>
        <rect x={r2(x)} y={r2(y)} width={r2(w)} height={r2(h)} rx={RADIUS.box} />
      </clipPath>
      {/* base fill, then the header tint clipped so the corners stay rounded */}
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(w)}
        height={r2(h)}
        rx={RADIUS.box}
        fill={hi ? COLOR.hiBg : COLOR.bg}
      />
      <g clipPath={ref(clipId)}>
        <rect x={r2(x)} y={r2(y)} width={r2(w)} height={HEADER_H} fill={hi ? COLOR.hiBg : COLOR.node} />
      </g>
      {/* single-stroke dividers: header rule, then one rule per extra row */}
      <line
        x1={r2(x)}
        y1={r2(y + HEADER_H)}
        x2={r2(x + w)}
        y2={r2(y + HEADER_H)}
        stroke={ink}
        strokeWidth={STROKE.divider}
      />
      {rows.map((_, i) =>
        i > 0 ? (
          <line
            key={`sep-${i}`}
            x1={r2(x)}
            y1={r2(bodyTop + i * ROW_H)}
            x2={r2(x + w)}
            y2={r2(bodyTop + i * ROW_H)}
            stroke={ink}
            strokeWidth={STROKE.divider}
          />
        ) : null,
      )}
      {/* outer frame on top so fills and dividers never poke past it */}
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(w)}
        height={r2(h)}
        rx={RADIUS.box}
        fill="none"
        stroke={hi ? COLOR.hiBg : COLOR.fg}
        strokeWidth={p.state === "full" ? STROKE.bold : STROKE.frame}
        strokeDasharray={p.state === "new" ? STROKE.dash : undefined}
      />
      {p.title && (
        <Label x={x + w / 2} y={y + HEADER_H / 2} text={p.title} weight={600} fill={ink} />
      )}
      {p.subtitle && (
        <Label
          x={x + w / 2}
          y={y + HEADER_H + ROW_H / 2}
          text={p.subtitle}
          size={FONT.note}
          fill={hi ? COLOR.hiFg : COLOR.caption}
        />
      )}
      {rows.map((row, i) => {
        const ry = bodyTop + i * ROW_H;
        if (Array.isArray(row)) {
          return (
            <g key={`row-${i}`}>
              <Label x={x + w * 0.3} y={ry + ROW_H / 2} text={row[0]} fill={ink} />
              <line
                x1={r2(x + w / 2)}
                y1={r2(ry)}
                x2={r2(x + w / 2)}
                y2={r2(ry + ROW_H)}
                stroke={ink}
                strokeWidth={STROKE.divider}
              />
              <Label x={x + w * 0.7} y={ry + ROW_H / 2} text={row[1]} fill={ink} />
            </g>
          );
        }
        return row ? (
          <Label key={`row-${i}`} x={x + w / 2} y={ry + ROW_H / 2} text={row} fill={ink} />
        ) : null;
      })}
      {note}
    </g>
  );
}

// --- main ------------------------------------------------------------------

export function HashDiagram(props: HashProps) {
  return props.mode === "slotArray" ? slotArray(props) : columnPages(props);
}

// ===========================================================================
// Column-of-pages modes: static, chained, directory, bucketColumn
// ===========================================================================

function columnPages(props: HashProps) {
  const {
    source,
    sourceNote,
    pages = [],
    overflow = [],
    spills = [],
    fanout = [],
    directory = [],
    directoryTitle,
    globalDepth,
    links = [],
    bucketLabels = [],
    nextIndex,
    split,
    title,
    caption,
    className,
  } = props;

  const arrowId = stableId("hd-arrow", props);

  const hasNext = typeof nextIndex === "number" && nextIndex >= 0 && nextIndex < pages.length;
  const hasLabels = bucketLabels.length > 0;
  const hasDepth = [...pages, ...overflow].some((p) => p.depth != null);
  const hasGlobalChip = globalDepth != null;
  const nDir = directory.length;

  // -- horizontal lanes, left to right: split lane / next pointer / bucket
  //    index labels / source circle or directory / depth chips / pages /
  //    spill run / overflow pages / page notes. ------------------------------
  const splitLabelW = split?.label ? measureLabel(split.label, FONT.note) : 0;
  const splitLane = split ? Math.max(28, splitLabelW + 16 - (hasNext ? NEXT_LANE : 0)) : 0;
  const srcR = source ? Math.max(SOURCE_R, measureLabel(source, FONT.label) / 2 + 12) : 0;
  const sourceLane = source ? 2 * srcR + SOURCE_RUN : 0;
  const dirLane = nDir ? DIR_W + DIR_RUN : 0;
  const depthLane = hasDepth ? Math.max(...pages.map((p) => (p.depth != null ? chipW(p.depth) : 0))) + CHIP_GAP : 0;

  const x0 = SPACE.margin + splitLane; // content left after the split lane
  const feedX = x0 + (hasNext ? NEXT_LANE : 0) + (hasLabels ? LABEL_LANE : 0);
  const labelCx = x0 + (hasNext ? NEXT_LANE : 0) + LABEL_LANE / 2;
  const dirX = feedX + sourceLane;
  const pageX = feedX + sourceLane + dirLane + depthLane;
  const pageW = Math.max(...[...pages, ...overflow].map(pageNeedW), PAGE_MIN_W);

  // -- vertical: top band for the global chip / directory title, then the
  //    primary page stack; overflow centres on its spill source. -------------
  const topY = SPACE.margin + (hasGlobalChip || directoryTitle ? TOP_BAND : 0);
  const laid: LaidPage[] = [];
  let cy = topY;
  for (const p of pages) {
    const h = pageHeight(p);
    laid.push({ page: p, x: pageX, y: cy, w: pageW, h });
    cy += h + PAGE_GAP_Y;
  }
  const primaryBottom = laid.length ? cy - PAGE_GAP_Y : topY;
  const byId = new Map<string, LaidPage>(laid.map((b) => [b.page.id, b]));

  const spillRun = Math.max(
    SPILL_RUN,
    ...spills.map((s) => (s.label ? measureLabel(s.label, FONT.note) + 14 : 0)),
  );
  const overflowX = pageX + pageW + spillRun;
  const ovLaid: LaidPage[] = [];
  let oy = topY;
  for (const p of overflow) {
    const h = pageHeight(p);
    const sp = spills.find((s) => s.to === p.id);
    const src = sp ? byId.get(sp.from) : undefined;
    const y = Math.max(src ? src.y + src.h / 2 - h / 2 : oy, oy);
    ovLaid.push({ page: p, x: overflowX, y, w: pageW, h });
    byId.set(p.id, ovLaid[ovLaid.length - 1]);
    oy = y + h + PAGE_GAP_Y;
  }

  // -- the source node and the directory column ------------------------------
  const sourceCx = feedX + srcR;
  const sourceCy = (topY + primaryBottom) / 2;
  const dirH = nDir ? Math.max(nDir * DIR_SLOT_H, primaryBottom - topY) : 0;
  const dirSlotH = nDir ? dirH / nDir : 0;
  const dotX = dirX + DIR_W - 9;
  const dotY = (i: number) => topY + dirSlotH * (i + 0.5);

  // -- edges ------------------------------------------------------------------
  const edges: React.ReactNode[] = [];

  // static fan-out: dashed numbered edges from the source to a page's left
  // edge. The index label sits at 62% of the run, pushed off the line toward
  // its upper side, so it clears the dashes and the caption under the circle.
  fanout.forEach((f, i) => {
    const b = byId.get(f.to);
    if (!b) return;
    const ex = pageLeftX(b) - 3;
    const ey = b.y + b.h / 2;
    const ang = Math.atan2(ey - sourceCy, ex - sourceCx);
    const sx = sourceCx + Math.cos(ang) * srcR;
    const sy = sourceCy + Math.sin(ang) * srcR;
    const len = Math.hypot(ex - sx, ey - sy) || 1;
    let nx = -(ey - sy) / len;
    let ny = (ex - sx) / len;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    edges.push(
      <g key={`fan-${i}`}>
        <Arrow from={{ x: sx, y: sy }} to={{ x: ex, y: ey }} markerId={arrowId} dashed />
        {f.label && (
          <Label
            x={sx + (ex - sx) * 0.62 + nx * 10}
            y={sy + (ey - sy) * 0.62 + ny * 10}
            text={f.label}
            size={FONT.note}
            fill={COLOR.muted}
            halo
          />
        )}
      </g>,
    );
  });

  // directory links: from an entry's dot to the page's left edge; entries
  // sharing one bucket arrive staggered so the heads never overlap
  const shared = new Map<string, HashLink[]>();
  for (const l of links) {
    const g = shared.get(l.to) ?? [];
    g.push(l);
    shared.set(l.to, g);
  }
  links.forEach((l, i) => {
    const b = byId.get(l.to);
    if (!b) return;
    const sibs = shared.get(l.to)!;
    const k = sibs.indexOf(l);
    const sy = typeof l.from === "number" ? dotY(l.from) : topY + dirH / 2;
    const ey = b.y + b.h / 2 + (k - (sibs.length - 1) / 2) * 10;
    edges.push(
      <Arrow
        key={`lnk-${i}`}
        from={{ x: dotX + 5, y: sy }}
        to={{ x: pageLeftX(b) - 3, y: ey }}
        markerId={arrowId}
      />,
    );
  });

  // spill arrows: page right edge to the overflow's left edge (the overflow
  // is centred on its source, so the run is horizontal and the label clears it)
  spills.forEach((s, i) => {
    const a = byId.get(s.from);
    const b = byId.get(s.to);
    if (!a || !b) return;
    edges.push(
      <Arrow
        key={`spill-${i}`}
        from={{ x: a.x + a.w + 2, y: a.y + a.h / 2 }}
        to={{ x: b.x - 3, y: b.y + b.h / 2 }}
        markerId={arrowId}
        label={s.label}
      />,
    );
  });

  // split elbow (linear hashing): a dashed run that leaves the bottom of the
  // bucket being split, drops down a dedicated lane on the far left, and
  // enters the top of the new image bucket. Orthogonal segments keep it clear
  // of the next pointer, the bucket index labels and the page boxes.
  if (split) {
    const a = byId.get(split.from);
    const b = byId.get(split.to);
    if (a && b) {
      const laneX = SPACE.margin;
      const cr = 8;
      const sx = a.x + 16;
      const sy = a.y + a.h;
      const runY = sy + PAGE_GAP_Y / 2;
      const ex = b.x + 16;
      const ey = b.y;
      const inY = ey - PAGE_GAP_Y / 2;
      const d = [
        `M${r2(sx)},${r2(sy)}`,
        `L${r2(sx)},${r2(runY - cr)}`,
        `Q${r2(sx)},${r2(runY)} ${r2(sx - cr)},${r2(runY)}`,
        `L${r2(laneX + cr)},${r2(runY)}`,
        `Q${r2(laneX)},${r2(runY)} ${r2(laneX)},${r2(runY + cr)}`,
        `L${r2(laneX)},${r2(inY - cr)}`,
        `Q${r2(laneX)},${r2(inY)} ${r2(laneX + cr)},${r2(inY)}`,
        `L${r2(ex - cr)},${r2(inY)}`,
        `Q${r2(ex)},${r2(inY)} ${r2(ex)},${r2(inY + cr)}`,
        `L${r2(ex)},${r2(ey - 2)}`,
      ].join(" ");
      // the label sits beside the lane, dodging the next-pointer row if needed
      let labelY = (runY + inY) / 2;
      if (hasNext && laid[nextIndex!]) {
        const nb = laid[nextIndex!];
        if (Math.abs(labelY - (nb.y + nb.h / 2)) < 18) labelY += 24;
      }
      edges.push(
        <g key="split">
          <path
            d={d}
            fill="none"
            stroke={COLOR.muted}
            strokeWidth={STROKE.line}
            strokeDasharray={STROKE.dash}
            markerEnd={ref(arrowId)}
          />
          {split.label && (
            <Label
              x={laneX + 8}
              y={labelY}
              text={split.label}
              size={FONT.note}
              fill={COLOR.muted}
              anchor="start"
              halo
            />
          )}
        </g>,
      );
    }
  }

  // next/split pointer (linear hashing): into the bucket's index label
  if (hasNext) {
    const b = laid[nextIndex!];
    const y = b.y + b.h / 2;
    const fromX = x0 + 2;
    const toX = labelCx - 10;
    edges.push(
      <g key="next">
        <Arrow from={{ x: fromX, y }} to={{ x: toX, y }} markerId={arrowId} />
        <Label x={(fromX + toX) / 2} y={y - 10} text="next" size={FONT.note} weight={600} />
      </g>,
    );
  }

  // -- nodes / chips ----------------------------------------------------------
  const els: React.ReactNode[] = [];

  if (source) {
    els.push(
      <g key="source">
        <circle
          cx={r2(sourceCx)}
          cy={r2(sourceCy)}
          r={r2(srcR)}
          fill={COLOR.node}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        <Label x={sourceCx} y={sourceCy} text={source} />
        {sourceNote && (
          <Label
            x={sourceCx}
            y={sourceCy + srcR + 14}
            text={sourceNote}
            size={FONT.note}
            fill={COLOR.caption}
          />
        )}
      </g>,
    );
  }

  // global-depth chip (or, without one, the directory title)
  const gx = nDir ? dirX : pageX;
  const gW = hasGlobalChip ? chipW(globalDepth) : 0;
  if (hasGlobalChip) {
    els.push(
      <g key="gdepth">
        <Box
          x={gx}
          y={SPACE.margin}
          w={gW}
          h={CHIP_H}
          rx={RADIUS.cell}
          label={String(globalDepth)}
          tint
          fontWeight={600}
        />
        <Label
          x={gx + gW + 8}
          y={SPACE.margin + CHIP_H / 2}
          text="global depth"
          size={FONT.note}
          fill={COLOR.caption}
          anchor="start"
        />
      </g>,
    );
  }
  const dirTitleW = directoryTitle ? measureText(directoryTitle, FONT.note, 600) : 0;
  const dirTitleX = Math.max(dirX + DIR_W / 2, SPACE.margin + dirTitleW / 2);
  if (directoryTitle && !hasGlobalChip) {
    els.push(
      <Label
        key="dirtitle"
        x={dirTitleX}
        y={topY - 12}
        text={directoryTitle}
        size={FONT.note}
        weight={600}
        baseline="baseline"
      />,
    );
  }

  // the directory column: one tinted strip, a pointer dot per entry
  if (nDir) {
    els.push(
      <CellStrip
        key="dir"
        x={dirX}
        y={topY}
        cellW={DIR_W}
        cellH={dirSlotH}
        widths={directory.map(() => dirSlotH)}
        cells={directory.map((d) => (d ? { label: d } : {}))}
        orient="v"
        tint
      />,
    );
    directory.forEach((_, i) => {
      els.push(
        <circle key={`dot-${i}`} cx={r2(dotX)} cy={r2(dotY(i))} r={3} fill={COLOR.fg} />,
      );
    });
  }

  // bucket index labels (linear hashing)
  bucketLabels.forEach((bl, i) => {
    const b = laid[i];
    if (!b) return;
    els.push(
      <Label key={`blbl-${i}`} x={labelCx} y={b.y + b.h / 2} text={bl.label} weight={600} />,
    );
  });

  for (const b of laid) els.push(<PageEl key={`p-${b.page.id}`} b={b} uid={arrowId} />);
  for (const b of ovLaid) els.push(<PageEl key={`o-${b.page.id}`} b={b} uid={arrowId} />);

  // -- extents: everything laid above, so nothing can clip --------------------
  let right = pageX + pageW;
  for (const b of [...laid, ...ovLaid]) {
    right = Math.max(right, b.x + b.w);
    if (b.page.note)
      right = Math.max(right, b.x + b.w + NOTE_GAP + measureText(b.page.note, FONT.note));
  }
  if (hasGlobalChip)
    right = Math.max(right, gx + gW + 8 + measureText("global depth", FONT.note));
  if (directoryTitle) right = Math.max(right, dirTitleX + dirTitleW / 2);
  if (source && sourceNote)
    right = Math.max(right, sourceCx + measureText(sourceNote, FONT.note) / 2);
  const width = right + SPACE.margin;

  let bottom = primaryBottom;
  for (const b of ovLaid) bottom = Math.max(bottom, b.y + b.h);
  if (nDir) bottom = Math.max(bottom, topY + dirH);
  if (source)
    bottom = Math.max(bottom, sourceCy + srcR + (sourceNote ? 14 + FONT.note / 2 + 2 : 0));
  const height = bottom + SPACE.margin;

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg w={width} h={height} label={caption ?? "Hash table diagram"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        {edges}
        {els}
      </DiagramSvg>
    </DiagramFigure>
  );
}

// ===========================================================================
// slotArray mode: open addressing
// ===========================================================================

/** Rising-side parameter where a midpoint-control quadratic reaches depth
 *  fraction q of its apex: 4s(1-s) = q. */
const riseS = (q: number) => (1 - Math.sqrt(Math.max(0, 1 - Math.min(1, q)))) / 2;

interface ArcLane {
  d: HashDisplacement;
  key: number;
  fx: number;
  tx: number;
  apex: number; // visual apex depth above the arc baseline
  labelW: number;
  labelX: number;
}

/** x-intervals where arc `g` passes through the depth band [lo, hi] —
 *  obstacles for another arc's label living in that band. */
function bandIntervals(g: ArcLane, lo: number, hi: number): Array<[number, number]> {
  if (g.apex <= lo) return [];
  const xAt = (s: number) => g.fx + (g.tx - g.fx) * s;
  const span = (sa: number, sb: number): [number, number] => {
    const a = xAt(sa);
    const b = xAt(sb);
    return a <= b ? [a, b] : [b, a];
  };
  const s1 = riseS(lo / g.apex);
  if (g.apex <= hi) return [span(s1, 1 - s1)]; // apex inside the band
  const s2 = riseS(hi / g.apex);
  return [span(s1, s2), span(1 - s2, 1 - s1)];
}

const slotCell = (s: HashSlot): Cell =>
  s.kind === "used" || (s.kind == null && !!s.label) ? { label: s.label, tint: true } : {};

/** The tombstone marker: a drawn diagonal cross, never a glyph. */
function TombCross({ cx, cy }: { cx: number; cy: number }) {
  const a = 5.5;
  return (
    <g stroke={COLOR.muted} strokeWidth={STROKE.line} strokeLinecap="round">
      <line x1={r2(cx - a)} y1={r2(cy - a)} x2={r2(cx + a)} y2={r2(cy + a)} />
      <line x1={r2(cx - a)} y1={r2(cy + a)} x2={r2(cx + a)} y2={r2(cy - a)} />
    </g>
  );
}

function slotArray(props: HashProps) {
  const { slots = [], displacements = [], secondRow, title, caption, className } = props;

  const arrowId = stableId("hd-arrow", props);
  const x0 = SPACE.margin;
  const centre = (i: number) => x0 + i * SLOT_W + SLOT_W / 2;

  // -- displacement arcs: narrow spans sit lowest, one apex lane per arc, so
  //    every label gets its own band; labels then nudge sideways until no
  //    other arc passes through their box. ----------------------------------
  const arcs: ArcLane[] = [];
  displacements
    .map((d, key) => ({ d, key, span: Math.abs(d.to - d.from) }))
    .sort((a, b) => a.span - b.span || a.key - b.key)
    .forEach(({ d, key }, rank) => {
      const fx = centre(d.from);
      const tx = centre(d.to);
      arcs.push({
        d,
        key,
        fx,
        tx,
        apex: ARC_BASE + rank * ARC_LANE,
        labelW: d.label ? measureLabel(d.label, FONT.note) : 0,
        labelX: (fx + tx) / 2,
      });
    });
  for (const a of arcs) {
    if (!a.d.label) continue;
    const lo = a.apex + 3; // label box top/bottom as depths above the baseline
    const hi = a.apex + 18;
    const half = a.labelW / 2 + 6;
    const obstacles = arcs.filter((g) => g !== a).flatMap((g) => bandIntervals(g, lo, hi));
    const mid = (a.fx + a.tx) / 2;
    for (let k = 0; k <= 12; k++) {
      const c = mid + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 4;
      if (obstacles.every(([p, q]) => c + half < p || c - half > q)) {
        a.labelX = c;
        break;
      }
    }
  }
  const arcBand = arcs.length
    ? Math.max(...arcs.map((a) => a.apex + (a.d.label ? 18 : 4))) + 6
    : 0;

  // -- vertical bands: arcs / slot strip / index row / tag row / second row --
  const rowY = SPACE.margin + arcBand;
  const baseY = rowY - 4;
  const indexY = rowY + SLOT_H + 13;
  const hasTags = slots.some((s) => s.top);
  const tagY = indexY + 15;
  const mainBottom = (hasTags ? tagY : indexY) + 6;

  const els: React.ReactNode[] = [];

  arcs.forEach((a) => {
    els.push(
      <g key={`arc-${a.key}`}>
        <Arrow
          from={{ x: a.fx, y: baseY }}
          to={{ x: a.tx, y: baseY }}
          bend={(a.tx > a.fx ? -1 : 1) * 2 * a.apex}
          dashed
          markerId={arrowId}
        />
        {a.d.label && (
          <Label
            x={a.labelX}
            y={baseY - a.apex - 5 - FONT.note / 2}
            text={a.d.label}
            size={FONT.note}
            fill={COLOR.muted}
            halo
          />
        )}
      </g>,
    );
  });

  // the slot strip, tombstone crosses, index row, tag row
  els.push(
    <CellStrip
      key="strip"
      x={x0}
      y={rowY}
      cellW={SLOT_W}
      cellH={SLOT_H}
      cells={slots.map(slotCell)}
    />,
  );
  slots.forEach((s, i) => {
    if (s.kind === "tomb")
      els.push(<TombCross key={`tomb-${i}`} cx={centre(i)} cy={rowY + SLOT_H / 2} />);
    els.push(
      <Label
        key={`idx-${i}`}
        x={centre(i)}
        y={indexY}
        text={String(i)}
        size={FONT.note}
        fill={COLOR.caption}
      />,
    );
    if (s.top)
      els.push(
        <Label
          key={`tag-${i}`}
          x={centre(i)}
          y={tagY}
          text={s.top}
          size={FONT.note}
          fill={COLOR.caption}
        />,
      );
  });

  let width = x0 + slots.length * SLOT_W + SPACE.margin;
  let bottom = mainBottom;

  // second row (e.g. after a delete -> tombstone), a fragment with side notes
  if (secondRow) {
    const sr = secondRow;
    const rowYb = mainBottom + 18;
    const leftW = sr.leftLabel ? measureText(sr.leftLabel, FONT.note) + NOTE_GAP : 0;
    const rx = x0 + leftW;
    if (sr.leftLabel)
      els.push(
        <Label
          key="sr-left"
          x={x0}
          y={rowYb + SLOT_H / 2}
          text={sr.leftLabel}
          size={FONT.note}
          fill={COLOR.caption}
          anchor="start"
        />,
      );
    els.push(
      <CellStrip
        key="sr-strip"
        x={rx}
        y={rowYb}
        cellW={SLOT_W}
        cellH={SLOT_H}
        cells={sr.slots.map(slotCell)}
      />,
    );
    sr.slots.forEach((s, i) => {
      const cx = rx + i * SLOT_W + SLOT_W / 2;
      if (s.kind === "tomb")
        els.push(<TombCross key={`sr-tomb-${i}`} cx={cx} cy={rowYb + SLOT_H / 2} />);
      if (s.top)
        els.push(
          <Label
            key={`sr-tag-${i}`}
            x={cx}
            y={rowYb + SLOT_H + 13}
            text={s.top}
            size={FONT.note}
            fill={COLOR.caption}
          />,
        );
    });
    const stripRight = rx + sr.slots.length * SLOT_W;
    if (sr.rightLabel) {
      els.push(
        <Label
          key="sr-right"
          x={stripRight + NOTE_GAP}
          y={rowYb + SLOT_H / 2}
          text={sr.rightLabel}
          size={FONT.note}
          fill={COLOR.caption}
          anchor="start"
        />,
      );
      width = Math.max(
        width,
        stripRight + NOTE_GAP + measureText(sr.rightLabel, FONT.note) + SPACE.margin,
      );
    }
    width = Math.max(width, stripRight + SPACE.margin);
    bottom = rowYb + SLOT_H + (sr.slots.some((s) => s.top) ? 19 : 0);
  }

  const height = bottom + SPACE.margin;

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg w={width} h={height} label={caption ?? "Hash table diagram"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        {els}
      </DiagramSvg>
    </DiagramFigure>
  );
}
