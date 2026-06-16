import {
  Arrow,
  ArrowHead,
  Box,
  type BoxState,
  type Cell,
  CellStrip,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  DotsEllipsis,
  FONT,
  Label,
  MAX_CONTENT_W,
  measureLabel,
  plainLabel,
  SPACE,
  stableId,
} from "@/components/diagram";

/**
 * A Turing-machine computation drawn the textbook way: one tape row per
 * configuration, stacked top to bottom, with the control state shown as a
 * tinted node on the left and the scanned cell inverted to mark the head.
 * Short step arrows link consecutive states, so the figure reads as a single
 * derivation `q_0 w ⊢ … ⊢ q_accept …` rather than a pile of separate tapes.
 *
 * Where `TuringTape` freezes one configuration with a big head pointer, this
 * shows the *resolution*: how the machine moves from the start configuration to
 * a halt, one transition (or one high-level pass) per row. Each row may carry a
 * muted note in a right-hand gutter naming the step it performs, set beside the
 * tape where no arrow ever crosses it.
 *
 * Rendered once on the server (no client JS). All colour, stroke and text come
 * from the shared diagram core, so it reads as one family with the other
 * figures and re-themes live on the light/dark switch.
 */

export interface TraceRow {
  /** Control state, e.g. `q_0` or `q_{accept}`. `_` marks a subscript. */
  state: string;
  /** Tape contents shown on this row. Blank cells may be `""`/`null`. */
  cells: Array<string | number | null>;
  /** Index of the cell under the head; that cell is inverted. */
  head: number;
  /** Muted annotation for the step, drawn in the right gutter. */
  note?: string;
}

interface Props {
  /** Configurations top to bottom; the start configuration first. */
  rows: TraceRow[];
  /** Bold heading inside the card (e.g. "Run on 00"). */
  title?: string;
  caption?: string;
  /** Drawn ellipsis before the first cell ("tape continues left"). */
  leftEllipsis?: boolean;
  /** Drawn ellipsis after the last cell ("blanks continue right"). */
  rightEllipsis?: boolean;
  className?: string;
}

// --- geometry ---------------------------------------------------------------

const CELL_W = 34;
const CELL_H = 30;
const ROW_GAP = 22; // vertical room between strips for the step arrow
const STATE_H = 26; // height of the left-hand state node
const STATE_GAP = 16; // gap between the state node and the tape
const ELLIPSIS_W = 22;
const NOTE_GAP = 16; // gap between the tape and the right note gutter
const NOTE_MAX_W = 150;
const NOTE_LINE_H = 15;

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

const isHalt = (state: string) => {
  const p = plainLabel(state);
  return /accept|reject/i.test(p) || /^q[ar]$/i.test(p);
};

export function TuringTrace({
  rows,
  title,
  caption,
  leftEllipsis = false,
  rightEllipsis = false,
  className,
}: Props) {
  const stateW = Math.max(
    48,
    rows.reduce((m, r) => Math.max(m, measureLabel(r.state, FONT.label, 700)), 0) +
      20,
  );

  const tapeX = SPACE.margin + stateW + STATE_GAP + (leftEllipsis ? ELLIPSIS_W : 0);
  const maxCells = rows.reduce((m, r) => Math.max(m, r.cells.length), 0);
  const tapeW = maxCells * CELL_W;
  const tapeRight = tapeX + tapeW + (rightEllipsis ? ELLIPSIS_W : 0);

  // Right gutter: per-row wrapped notes, beside the row (never under an arrow).
  const noteLines = rows.map((r) => (r.note ? wrapNote(r.note) : []));
  const gutterW = noteLines.reduce(
    (m, ls) => ls.reduce((mm, l) => Math.max(mm, measureLabel(l, FONT.note)), m),
    0,
  );

  const width = Math.min(
    MAX_CONTENT_W,
    tapeRight + (gutterW ? NOTE_GAP + gutterW : 0) + SPACE.margin,
  );

  // Row centres; a tall note block may spill above the first / below the last.
  const blockH = noteLines.map((ls) => ls.length * NOTE_LINE_H);
  const last = rows.length - 1;
  const topSpill = Math.max(0, ((blockH[0] ?? 0) - CELL_H) / 2);
  const bottomSpill = Math.max(0, ((blockH[last] ?? 0) - CELL_H) / 2);
  const pitch = CELL_H + ROW_GAP;
  const rowCY = rows.map(
    (_, i) => SPACE.margin + topSpill + CELL_H / 2 + i * pitch,
  );
  const height =
    (rowCY[last] ?? SPACE.margin + CELL_H / 2) +
    CELL_H / 2 +
    bottomSpill +
    SPACE.margin;

  const stateCX = SPACE.margin + stateW / 2;
  const arrowId = stableId("tt-step", { rows, title });

  // Step arrows: bottom of each state node to the top of the next.
  const stepEls = rows.slice(0, -1).map((_, i) => (
    <Arrow
      key={`s-${i}`}
      from={{ x: stateCX, y: rowCY[i] + STATE_H / 2 }}
      to={{ x: stateCX, y: rowCY[i + 1] - STATE_H / 2 }}
      markerId={arrowId}
    />
  ));

  const rowEls = rows.map((r, i) => {
    const cy = rowCY[i];
    const cells: Cell[] = r.cells.map((c, idx) => {
      const base: Cell =
        c == null || c === "" ? {} : { label: String(c) };
      return idx === r.head ? { ...base, state: "highlight" as BoxState } : base;
    });
    return (
      <g key={`r-${i}`}>
        <Box
          x={SPACE.margin}
          y={cy - STATE_H / 2}
          w={stateW}
          h={STATE_H}
          label={r.state}
          fontSize={FONT.label}
          fontWeight={700}
          tint
          state={isHalt(r.state) ? "emphasis" : "normal"}
        />
        <CellStrip
          x={tapeX}
          y={cy - CELL_H / 2}
          cellW={CELL_W}
          cellH={CELL_H}
          cells={cells}
          fontSize={FONT.node}
        />
        {leftEllipsis && (
          <DotsEllipsis x={tapeX - ELLIPSIS_W / 2} y={cy} />
        )}
        {rightEllipsis && (
          <DotsEllipsis x={tapeX + tapeW + ELLIPSIS_W / 2} y={cy} />
        )}
        {noteLines[i].map((line, k) => (
          <Label
            key={`n-${i}-${k}`}
            x={tapeRight + NOTE_GAP}
            y={cy + (k - (noteLines[i].length - 1) / 2) * NOTE_LINE_H}
            text={line}
            size={FONT.note}
            fill={COLOR.caption}
            anchor="start"
          />
        ))}
      </g>
    );
  });

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={width}
        h={height}
        label={caption ?? "Turing machine computation trace"}
      >
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        {stepEls}
        {rowEls}
      </DiagramSvg>
    </DiagramFigure>
  );
}
