import { Cells, Diagram, FONT, Grid, measure, Node, NODE, Text, type Tone } from "@/components/figure";
import { TONE } from "@/components/tones";

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

/** The tone of a halting state, by its label. */
const HALT: [Tone, RegExp][] = [
  [TONE.accept, /accept|^q_\{?A\}?$/],
  [TONE.reject, /reject|^q_\{?R\}?$/],
];

/** Every configuration as one row: its state, the tape with the scanned cell lit, and the note. */
export function TuringTrace({ rows, title, caption, leftEllipsis = false, rightEllipsis = false, className }: Props) {
  const stateW = Math.max(...rows.map((r) => measure(r.state, FONT.title, { weight: 600 }))) + 2 * NODE.padX;
  const halt = HALT.find(([, re]) => re.test(rows.at(-1)?.state ?? ""))?.[0];
  const ellipsis = leftEllipsis && rightEllipsis ? "both" : leftEllipsis ? "start" : rightEllipsis ? "end" : undefined;
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Grid cols={3} colGap={16} rowGap={10} align="start">
        {rows.flatMap((r, k) => [
          <Node key={`q${k}`} title={r.state} w={stateW} state={k === rows.length - 1 ? "strong" : undefined} tone={k === rows.length - 1 ? halt : undefined} />,
          <Cells
            key={`t${k}`}
            cell={NODE.h}
            ellipsis={ellipsis}
            items={r.cells.map((c, i) => ({ label: c == null || c === "" ? undefined : String(c), state: i === r.head ? ("active" as const) : undefined }))}
          />,
          <Text key={`n${k}`} text={r.note ?? ""} size="note" muted />,
        ])}
      </Grid>
    </Diagram>
  );
}
