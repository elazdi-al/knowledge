import { Col, Diagram, Edge, Grid, Group, Node, Row, Table, Text } from "@/components/figure";
import { ScheduleGrid, TX_TONE, type ScheduleOp, type TxId } from "@/components/ScheduleGrid";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

const txChip = (tx: TxId) => ({ text: `T_${tx}`, tone: TX_TONE[tx], mono: false });

const LOG: { tx: TxId; op: string }[] = [
  { tx: 1, op: "W(A)" },
  { tx: 2, op: "W(C)" },
  { tx: 1, op: "W(B)" },
  { tx: 2, op: "W(D)" },
  { tx: 1, op: "COMMIT" },
  { tx: 2, op: "COMMIT" },
];

/** Each record points back to the previous record of its transaction: T1 on the right, T2 on the left, so the chains never cross. */
export function TransactionLogSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "A log is append-only; prev-pointers link each transaction's records."} className={className}>
      <Col gap={14} align="stretch">
        <Group title="Append-only log" gap={10}>
          <Text text="prev-pointers chain records from the same transaction" size="note" muted />
          <Table id="log" rows={LOG.map((r, i) => ({ id: `log.${i}`, cells: [`#${i}`, txChip(r.tx), r.op] }))} />
        </Group>
        <Group title="One update log record" gap={10}>
          <Table columns={["TxID", "Page ID", "Offset", "Length", "Before-image", "After-image"]} rows={[[txChip(1), "P42", "128", "8", "$10", "$12"]]} />
          <Text text="before-image enables UNDO; after-image enables REDO" size="note" muted />
        </Group>
      </Col>
      {LOG.map((r, i) => {
        const prev = LOG.slice(0, i).findLastIndex((p) => p.tx === r.tx);
        if (prev < 0) return null;
        const side = r.tx === 1 ? "right" : "left";
        return <Edge key={i} from={`log.${i}`} to={`log.${prev}`} fromSide={side} toSide={side} route="curve" tone={TX_TONE[r.tx]} />;
      })}
    </Diagram>
  );
}

/** Both rules order writes: the log record before the page, and the forced log flush before the commit returns. */
export function WalRulesSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "Write-ahead logging requires log-before-page and log-before-commit."} className={className}>
      <Row wrap gap={16} align="stretch">
        <Group title="Rule 1: log before page" gap={14}>
          <Grid cols={3} colGap={16} rowGap={56} align="stretch">
            <Text text="memory" size="note" muted />
            <Node id="pg" title="Page P42 dirty" />
            <Node id="lr" title="log record" />
            <Text text="disk" size="note" muted />
            <Node id="pgd" title="Page P42 stale" />
            <Node id="lrd" title="log record" />
          </Grid>
          <Text text="a dirty page may reach disk only after its log record" size="note" muted />
        </Group>
        <Group title="Rule 2: commit boundary">
          <Col gap={6}>
            <Text text="log buffer" size="note" muted />
            <Row id="buf" gap={6}>
              <Node title="W(A)" mono />
              <Node title="W(B)" mono />
              <Node title="W(C)" mono />
              <Node title="COMMIT" mono state="active" />
            </Row>
          </Col>
          <Node id="persist" title="all log records persisted" />
          <Node id="ok" title="return success" />
        </Group>
      </Row>
      <Edge from="lr" to="lrd" label="1 write log" />
      <Edge from="pg" to="pgd" label="2 write page" />
      <Edge from="buf" to="persist" label="1 forced flush" />
      <Edge from="persist" to="ok" label="2 only then" />
    </Diagram>
  );
}

const SCHEDULES: { title: string; ops: [TxId, string][]; result: string; bad?: boolean }[] = [
  {
    title: "Serial",
    ops: [[1, "A=A-100"], [1, "B=B+100"], [1, "COMMIT"], [2, "A=A*1.06"], [2, "B=B*1.06"]],
    result: "A=954, B=1166",
  },
  {
    title: "Equivalent interleaving",
    ops: [[1, "A=A-100"], [2, "A=A*1.06"], [1, "B=B+100"], [1, "COMMIT"], [2, "B=B*1.06"]],
    result: "A=954, B=1166",
  },
  {
    title: "Bad interleaving",
    ops: [[1, "A=A-100"], [2, "A=A*1.06"], [2, "B=B*1.06"], [2, "COMMIT"], [1, "B=B+100"]],
    result: "A=954, B=1160",
    bad: true,
  },
];

export function ScheduleEquivalenceSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "A valid interleaving has the same effect as some serial schedule."} className={className}>
      <Row wrap gap={8} align="start">
        {SCHEDULES.map((s) => (
          <Group key={s.title} title={s.title} gap={12} pad={12} align="stretch">
            <ScheduleGrid txs={[1, 2]} ops={s.ops.map(([tx, text]): ScheduleOp => ({ tx, text }))} />
            <Node title={s.result} mono state={s.bad ? "strong" : undefined} />
          </Group>
        ))}
      </Row>
    </Diagram>
  );
}

const PHASES = [
  { title: "1. Analysis", lines: ["scan log forward", "find committed txns", "find in-flight txns"] },
  { title: "2. Redo", lines: ["replay committed", "restore after-images", "make effects durable"] },
  { title: "3. Undo", lines: ["walk log backward", "restore before-images", "remove in-flight effects"] },
];

export function RecoveryPhasesSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "Crash recovery scans, replays committed work, and undoes in-flight work."} className={className}>
      <Col gap={16}>
        <Row wrap gap={36} align="stretch">
          {PHASES.map((p, i) => (
            <Group key={p.title} id={`phase${i}`} title={p.title} gap={4} align="start">
              {p.lines.map((l) => (
                <Text key={l} text={l} size="note" />
              ))}
            </Group>
          ))}
        </Row>
        <Node title="Recovery may crash too, so each phase must be safe to repeat." />
      </Col>
      <Edge from="phase0" to="phase1" />
      <Edge from="phase1" to="phase2" />
    </Diagram>
  );
}
