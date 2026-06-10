import type { ReactNode } from "react";
import {
  Arrow,
  ArrowHead,
  Box,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  DotsEllipsis,
  FONT,
  Label,
  MAX_CONTENT_W,
  SPACE,
  measureLabel,
  stableId,
  type BoxState,
} from "@/components/diagram";

/**
 * An external merge-sort pass tree in the textbook style: one row of run
 * rectangles per pass, run widths roughly doubling each pass as smaller runs
 * are merged into fewer, larger ones, and fan-in merge arrows converging from
 * each pass onto the runs below until a single highlighted, fully-sorted run
 * remains.
 *
 * The teaching point is the geometry: the number of runs shrinks while their
 * width grows pass by pass, so the layout is driven by each run's `span` (its
 * share of the file). The author gives the passes and, per run, which runs of
 * the pass above feed into it; the row layout, edge routing and the inverted
 * highlight on the final run are derived. Cost formulas stay in prose.
 *
 * Per-pass notes and annotations live in a measured right-hand gutter beside
 * their row — outside the band the merge arrows fan through — so no arrow can
 * ever cross an annotation. Gutter widths, the pass-label gutter and the run
 * row are all sized from real font metrics within the family width budget.
 *
 * Rendered once on the server (no client JS); all colour and stroke comes from
 * the diagram theme, so it re-themes with the family on the light/dark switch.
 * State is encoded by stroke weight, dashing and the inverted highlight box,
 * never by saturated fills.
 */

export interface SortRun {
  /** Stable id, referenced by the next pass's `from` lists. */
  id: string;
  /**
   * Relative width of this run (its share of the file, e.g. number of pages or
   * runs merged). Defaults to 1. Runs in a pass are scaled to fill the row, so
   * absolute values do not matter — only ratios within and across passes.
   */
  span?: number;
  /** Centred label inside the run, e.g. "1 sorted file". Kept short. */
  label?: string;
  /** ids of runs in the pass above that merge into this run. */
  from?: string[];
  /**
   * Visual state. `final` = inverted highlight box (the fully-sorted result),
   * `emphasis` = heavier outline, `new` = dashed outline. Default `normal`.
   */
  state?: "normal" | "final" | "emphasis" | "new";
}

export interface SortPass {
  /** Bold row heading at the left margin, e.g. "Pass 0" or "Final". */
  label?: string;
  /** Muted note for the row, drawn in the right gutter beside the runs. */
  note?: string;
  /** Right-gutter annotation for the row, e.g. cost or run count. */
  annotation?: string;
  /** The runs produced by this pass, left to right. */
  runs: SortRun[];
  /** Append a muted drawn ellipsis after the row's runs ("more runs"). */
  ellipsis?: boolean;
}

interface Props {
  /** Passes top to bottom; pass 0 first, the final merged run last. */
  passes: SortPass[];
  /** Bold heading inside the card (e.g. "External merge sort"). */
  title?: string;
  caption?: string;
  className?: string;
}

// --- geometry ---------------------------------------------------------------

const ROW_H = 30; // run rectangle height
const ROW_GAP = 48; // vertical merge-arrow band between pass rows
const RUN_GAP = 12; // horizontal gap between runs in a row
const RUN_MIN_W = 18; // floor for a run's width
const ROW_MAX_W = 520; // run rows never grow wider than this
const LABEL_GAP = 12; // gap between the pass-label gutter and the row
const GUTTER_GAP = 14; // gap between the row and the right annotation gutter
const NOTE_LINE_H = 15; // line pitch of wrapped gutter notes
const NOTE_MAX_W = 132; // wrap gutter notes to this width
const ELLIPSIS_W = 24; // room reserved for a trailing drawn ellipsis

const runState: Record<NonNullable<SortRun["state"]>, BoxState> = {
  normal: "normal",
  final: "highlight",
  emphasis: "emphasis",
  new: "new",
};

/** Greedy wrap by measured width, so gutter notes stay inside their lane. */
function wrapNote(text: string): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measureLabel(next, FONT.note) > NOTE_MAX_W) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

interface LaidRun extends SortRun {
  x: number; // left edge
  w: number; // width
  cy: number; // vertical centre
}

interface GutterLine {
  text: string;
  color: string;
}

export function SortPasses({ passes, title, caption, className }: Props) {
  // --- gutters sized from real font metrics ----------------------------------
  const labelW = passes.reduce(
    (m, p) => Math.max(m, p.label ? measureLabel(p.label, FONT.label, 700) : 0),
    0,
  );
  // right-gutter block per pass: the annotation line first, then the wrapped
  // note lines — beside the row, where the merge arrows never travel
  const gutters: GutterLine[][] = passes.map((p) => {
    const lines: GutterLine[] = [];
    if (p.annotation) lines.push({ text: p.annotation, color: COLOR.muted });
    if (p.note)
      for (const l of wrapNote(p.note))
        lines.push({ text: l, color: COLOR.caption });
    return lines;
  });
  const gutterW = gutters.reduce(
    (m, ls) =>
      ls.reduce((mm, l) => Math.max(mm, measureLabel(l.text, FONT.note)), m),
    0,
  );

  const rowLeft = SPACE.margin + (labelW ? labelW + LABEL_GAP : 0);
  const rowW = Math.min(
    ROW_MAX_W,
    MAX_CONTENT_W - SPACE.margin - rowLeft - (gutterW ? gutterW + GUTTER_GAP : 0),
  );
  const width =
    rowLeft + rowW + (gutterW ? GUTTER_GAP + gutterW : 0) + SPACE.margin;

  // --- row centres; a gutter block may be taller than its 1-row band --------
  const blockH = gutters.map((ls) => ls.length * NOTE_LINE_H);
  const lastPass = passes.length - 1;
  const topSpill = Math.max(0, ((blockH[0] ?? 0) - ROW_H) / 2);
  const bottomSpill = Math.max(0, ((blockH[lastPass] ?? 0) - ROW_H) / 2);
  const rowCY = passes.map(
    (_, i) => SPACE.margin + topSpill + ROW_H / 2 + i * (ROW_H + ROW_GAP),
  );
  const height =
    (rowCY[lastPass] ?? SPACE.margin + ROW_H / 2) +
    ROW_H / 2 +
    bottomSpill +
    SPACE.margin;

  // --- lay out runs: spans scaled to fill the row ----------------------------
  const byId = new Map<string, LaidRun>();
  const laidRows: LaidRun[][] = passes.map((pass, p) => {
    const n = pass.runs.length;
    const spans = pass.runs.map((r) => (r.span && r.span > 0 ? r.span : 1));
    const total = spans.reduce((a, b) => a + b, 0) || 1;
    const reserve = pass.ellipsis ? ELLIPSIS_W + RUN_GAP : 0;
    const usable = rowW - reserve - RUN_GAP * (n - 1);
    let cursor = rowLeft;
    return pass.runs.map((run, i) => {
      const w = Math.max(RUN_MIN_W, (usable * spans[i]) / total);
      const laid: LaidRun = { ...run, x: cursor, w, cy: rowCY[p] };
      cursor += w + RUN_GAP;
      byId.set(run.id, laid);
      return laid;
    });
  });

  const arrowId = stableId("sp-merge", { passes, title });

  // --- merge edges: fan-in from each run's sources in the pass above --------
  const edgeEls = laidRows.flatMap((row, p) => {
    if (p === 0) return [];
    return row.flatMap((child, ci) => {
      const sources = (child.from ?? [])
        .map((id) => byId.get(id))
        .filter((s): s is LaidRun => !!s);
      const cn = sources.length;
      return sources.map((src, si) => {
        // spread arrival points across the child's top edge so fan-in reads
        const ex =
          cn <= 1 ? child.x + child.w / 2 : child.x + ((si + 0.5) / cn) * child.w;
        return (
          <Arrow
            key={`e-${p}-${ci}-${si}`}
            from={{ x: src.x + src.w / 2, y: src.cy + ROW_H / 2 }}
            to={{ x: ex, y: child.cy - ROW_H / 2 }}
            markerId={arrowId}
          />
        );
      });
    });
  });

  // --- run rectangles + trailing ellipses ------------------------------------
  const runEls = laidRows.flatMap((row, p) => {
    const els = row.map((run) => (
      <Box
        key={`r-${run.id}`}
        x={run.x}
        y={run.cy - ROW_H / 2}
        w={run.w}
        h={ROW_H}
        label={run.label}
        state={runState[run.state ?? "normal"]}
        fontSize={FONT.label}
      />
    ));
    if (passes[p].ellipsis && row.length) {
      const tail = row[row.length - 1];
      els.push(
        <DotsEllipsis
          key={`ell-${p}`}
          x={tail.x + tail.w + RUN_GAP + ELLIPSIS_W / 2}
          y={tail.cy}
        />,
      );
    }
    return els;
  });

  // --- pass labels (left gutter) and annotations/notes (right gutter) -------
  const chromeEls = passes.flatMap((pass, p) => {
    const els: ReactNode[] = [];
    if (pass.label) {
      els.push(
        <Label
          key={`lab-${p}`}
          x={rowLeft - LABEL_GAP}
          y={rowCY[p]}
          text={pass.label}
          weight={700}
          anchor="end"
        />,
      );
    }
    const lines = gutters[p];
    lines.forEach((line, k) => {
      els.push(
        <Label
          key={`g-${p}-${k}`}
          x={rowLeft + rowW + GUTTER_GAP}
          y={rowCY[p] + (k - (lines.length - 1) / 2) * NOTE_LINE_H}
          text={line.text}
          size={FONT.note}
          fill={line.color}
          anchor="start"
        />,
      );
    });
    return els;
  });

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={width}
        h={height}
        label={caption ?? "External merge-sort passes diagram"}
      >
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        {edgeEls}
        {runEls}
        {chromeEls}
      </DiagramSvg>
    </DiagramFigure>
  );
}
