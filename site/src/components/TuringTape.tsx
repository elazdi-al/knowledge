import { Cells, Col, Diagram, Edge, Node, Row, Space, type CellItem } from "@/components/figure";
import { CELL } from "@/components/figure/theme";

export type TapeCell =
  | string
  | number
  | null
  | {
      label?: string;
      state?: "normal" | "emphasis" | "new" | "highlight";
      tint?: boolean;
      color?: string;
    };

interface Props {
  cells: TapeCell[];
  head?: number;
  state?: string;
  title?: string;
  caption?: string;
  leftEllipsis?: boolean;
  rightEllipsis?: boolean;
  className?: string;
}

const STATE = { normal: undefined, emphasis: "strong", new: "active", highlight: "strong" } as const;
/** Tape cells read larger than the default strip so the head motion is easy to follow. */
const TAPE = 36;
const HEAD_W = 2 * TAPE;

interface TapeProps {
  /** control state, as TeX (`$q_0$`) */
  q: string;
  cells: CellItem[];
  head: number;
  /** cells to reserve width for, so a trace keeps one width while its tape grows */
  span?: number;
  left?: boolean;
  right?: boolean;
  /** the machine halted: the state is drawn strong instead of active */
  done?: boolean;
}

/** One configuration: the control state centred over the head cell, which is active. */
export function Tape({ q, cells, head, span = cells.length, left = false, right = false, done = false }: TapeProps) {
  const before = (left ? CELL.ellipsis : 0) + head * TAPE;
  const after = (span - 1 - head) * TAPE + (right ? CELL.ellipsis : 0);
  const items = cells.map((c, i) => ({ ...c, state: c.state ?? (i === head ? ("active" as const) : undefined) }));
  return (
    <>
      <Col gap={18} align="start">
        <Row gap={0}>
          <Space w={before} />
          <Node id="q" title={q} w={HEAD_W} state={done ? "strong" : "active"} />
          <Space w={after} />
        </Row>
        <Row gap={0}>
          <Space w={(HEAD_W - TAPE) / 2} />
          <Cells id="tape" cell={TAPE} items={items} ellipsis={left && right ? "both" : left ? "start" : right ? "end" : undefined} />
        </Row>
      </Col>
      <Edge id="head" from="q" to={`tape.${head}`} state="active" />
    </>
  );
}

export function TuringTape({ cells, head = 0, state = "q", title, caption, leftEllipsis = false, rightEllipsis = false, className }: Props) {
  const shown = cells.length > 0 ? cells : [null];
  const items = shown.map((c) => (c === null ? {} : typeof c === "object" ? { label: c.label, state: STATE[c.state ?? "normal"] } : { label: String(c) }));
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Tape q={state} cells={items} head={Math.min(Math.max(head, 0), shown.length - 1)} left={leftEllipsis} right={rightEllipsis} />
    </Diagram>
  );
}
