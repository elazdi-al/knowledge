import { Cells, Col, Diagram, Edge, Grid, Group, measure, Node, Row, Space, Text, type CellItem, type State, type Tone } from "@/components/figure";
import { FONT } from "@/components/figure/theme";
import { ScheduleGrid, type ScheduleOp } from "@/components/ScheduleGrid";
import { TONE, TX_TONE } from "@/components/tones";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

/** Rows matching age=30 take the tone of the transaction that touches them: T2's inserted row, T1's locked gap. */
const PHANTOM: { title: string; ops: ScheduleOp[]; rows: { title: string; tone?: Tone; state?: State }[]; note: [string, string] }[] = [
  {
    title: "Tuple locks only",
    ops: [
      { tx: 1, text: "count age=30" },
      { tx: 1, text: "result 5" },
      { tx: 2, text: "insert age=30" },
      { tx: 2, text: "COMMIT" },
      { tx: 1, text: "result 6", state: "strong" },
    ],
    rows: [{ title: "row 30" }, { title: "row 30" }, { title: "new 30", tone: TX_TONE[2] }],
    note: ["The second SELECT sees a row", "that $T_1$ never protected."],
  },
  {
    title: "Range or predicate lock",
    ops: [
      { tx: 1, text: "lock age=30" },
      { tx: 1, text: "result 5" },
      { tx: 2, text: "insert waits", state: "placeholder" },
      { tx: 1, text: "result 5" },
      { tx: 1, text: "COMMIT" },
    ],
    rows: [{ title: "row 30" }, { title: "gap", tone: TX_TONE[1] }, { title: "new 30", state: "placeholder" }],
    note: ["The insert conflicts with the", "protected predicate range."],
  },
];

export function PhantomReadSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Tuple locks protect existing rows; range or predicate locks protect the set a scan depends on."}
      className={className}
    >
      <Row wrap gap={16} align="stretch">
        {PHANTOM.map((p) => (
          <Group key={p.title} title={p.title} gap={14}>
            <ScheduleGrid txs={[1, 2]} ops={p.ops} />
            <Row gap={8}>
              {p.rows.map((r, i) => (
                <Node key={i} title={r.title} tone={r.tone} state={r.state} />
              ))}
            </Row>
            <Col gap={2}>
              {p.note.map((l) => (
                <Text key={l} text={l} size="note" muted />
              ))}
            </Col>
          </Group>
        ))}
      </Row>
    </Diagram>
  );
}

const KEYS = [10, 12, 14, 16];
/** Strip positions: key i at 2i, the gap after it at 2i + 1. */
const KEY_MODES: { title: string; locked: number[]; span?: string; note: string }[] = [
  { title: "Key-value lock", locked: [4], note: "protects key 14, but not its neighboring gaps" },
  { title: "Gap lock", locked: [5], span: "$(14,16)$", note: "blocks inserts into the protected open interval" },
  { title: "Next-key lock", locked: [4, 5], span: "$[14,16)$", note: "locks key 14 plus the gap to the next key" },
  { title: "Prev-key lock", locked: [3, 4], span: "$(12,14]$", note: "locks the previous gap plus key 14" },
];
const KEY_CELL = 32;
const SPAN_TEXT = { size: "note", weight: 600 } as const;

/** The index order as one strip: keys and the gaps between them (hatched), with the locked span active and its interval centred above it. */
function KeyStrip({ locked, span }: { locked: number[]; span?: string }) {
  const items: CellItem[] = Array.from({ length: 2 * KEYS.length - 1 }, (_, i) => {
    const on = locked.includes(i);
    return i % 2 === 0 ? { label: String(KEYS[i / 2]), state: on ? "active" : undefined } : { state: on ? "active" : "free" };
  });
  const centre = ((Math.min(...locked) + Math.max(...locked) + 1) / 2) * KEY_CELL;
  return (
    <Col gap={6} align="start">
      {span ? (
        <Row gap={0}>
          <Space w={centre - measure(span, FONT.note, { weight: SPAN_TEXT.weight }) / 2} />
          <Text text={span} {...SPAN_TEXT} />
        </Row>
      ) : (
        <Space h={Math.round(FONT.note * 1.4)} />
      )}
      <Cells cell={KEY_CELL} items={items} />
    </Col>
  );
}

export function KeyRangeLockingSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Key-range locking turns an index order into locks on both existing keys and the gaps where new matching keys could appear."}
      className={className}
    >
      <Grid cols={2} gap={12} align="stretch">
        {KEY_MODES.map((m) => (
          <Group key={m.title} title={m.title} gap={10}>
            <KeyStrip locked={m.locked} span={m.span} />
            <Text text={m.note} size="note" muted />
          </Group>
        ))}
      </Grid>
    </Diagram>
  );
}

const REPLICAS = ["R1", "R2", "R3", "R4"];
const WRITE_QUORUM = [0, 1];
const QUORUMS = [
  { title: "$N=4, W=2, R=1$", read: [3], verdict: "no forced overlap" },
  { title: "$N=4, W=2, R=3$", read: [1, 2, 3], verdict: "overlap exists" },
];
const QUORUM_CELL = 40;

export function QuorumOverlapSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "When $R + W > N$, every read quorum intersects every completed write quorum."} className={className}>
      <Col gap={12}>
        <Row wrap gap={12} align="stretch">
          {QUORUMS.map((q) => (
            <Group key={q.title} title={q.title} gap={14}>
              <Grid cols={2} colGap={10} rowGap={4}>
                <Space />
                <Cells cell={QUORUM_CELL} items={REPLICAS} />
                <Text text="$W$" size="note" />
                <Cells cell={QUORUM_CELL} items={REPLICAS.map((_, i) => (WRITE_QUORUM.includes(i) ? { label: "ack", tone: TONE.write } : null))} />
                <Text text="$R$" size="note" />
                <Cells
                  cell={QUORUM_CELL}
                  items={REPLICAS.map((_, i) =>
                    !q.read.includes(i) ? null : WRITE_QUORUM.includes(i) ? { label: "both", state: "active" } : { label: "read", tone: TONE.read },
                  )}
                />
              </Grid>
              <Text text={q.verdict} weight={600} />
            </Group>
          ))}
        </Row>
        <Text text="$R + W > N$ is the overlap test." size="note" muted />
      </Col>
    </Diagram>
  );
}

/** One stage, so each replica keeps its place: writers on the left, the reader on the right, numbered edges in the order the versions travel. */
export function DynamoSiblingsSchema({ title, caption, className }: FigureProps) {
  const replica = (id: string, name: string) => <Node id={id} shape="cylinder" title={name} sub="$x_0=5$" />;
  return (
    <Diagram
      title={title}
      caption={caption ?? "Dynamo-style systems preserve conflicting versions as siblings and ask the application to reconcile them."}
      className={className}
    >
      <Col gap={16}>
        <Grid cols={3} colGap={88} rowGap={56}>
          <Space />
          {replica("r1", "R1")}
          <Space />
          <Node id="A" title="A writes" />
          {replica("r2", "R2")}
          <Node id="C" title="C reads" sub="$\{x_A, x_B\}$" />
          <Node id="B" title="B writes" />
          {replica("r3", "R3")}
          <Space />
        </Grid>
        <Col gap={2}>
          <Text text="$W=1$ accepts both writes" size="note" muted />
          <Text text="background propagation converges later" size="note" muted />
        </Col>
      </Col>
      <Edge from="A" to="r2" label="1 $x_A=7$" />
      <Edge from="B" to="r3" label="1 $x_B=9$" />
      <Edge from="r2" to="C" label="2 $x_A$" route="arc" bend={-28} />
      <Edge from="r3" to="C" label="2 $x_B$" fromSide="right" toSide="bottom" />
      <Edge from="C" to="r2" label="3 $x_C=11$" route="arc" bend={-28} />
      <Edge from="r2" to="r1" label="4 $x_C$" />
      <Edge from="r2" to="r3" label="4 $x_C$" />
    </Diagram>
  );
}

type Timeline = { process: string; events: [number, string][] };
const CAUSAL: { title: string; slots: number; lanes: Timeline[]; causal: [string, string][]; verdict: string; violation?: boolean }[] = [
  {
    title: "Dependent writes",
    slots: 5,
    lanes: [
      { process: "P1", events: [[0, "$W(a)$"]] },
      { process: "P2", events: [[1, "$R(a)$"], [2, "$W(b)$"]] },
      { process: "P3", events: [[3, "$R(b)$"], [4, "$R(a)$"]] },
    ],
    causal: [
      ["P1.0", "P2.1"],
      ["P2.2", "P3.3"],
    ],
    verdict: "$R(b)$ before $R(a)$ violates order",
    violation: true,
  },
  {
    title: "Concurrent writes",
    slots: 3,
    lanes: [
      { process: "P1", events: [[0, "$W(a)$"]] },
      { process: "P2", events: [[0, "$W(b)$"]] },
      { process: "P3", events: [[1, "$R(b)$"], [2, "$R(a)$"]] },
      { process: "P4", events: [[1, "$R(a)$"], [2, "$R(b)$"]] },
    ],
    causal: [],
    verdict: "both read orders are allowed",
  },
];
const LANE_LEAD = 10;

/** Space-time lanes: each process is a line through its events, and read-from arrows cross between lanes. */
function Lanes({ id, slots, lanes, causal }: { id: string; slots: number; lanes: Timeline[]; causal: [string, string][] }) {
  return (
    <>
      <Grid cols={slots + 3} colGap={6} rowGap={16}>
        {lanes.flatMap(({ process, events }) => {
          const at = new Map(events);
          return [
            <Text key={process} text={process} size="note" weight={600} />,
            <Row key={`${process}.s`} gap={0}>
              <Space id={`${id}.${process}.s`} />
              <Space w={LANE_LEAD} />
            </Row>,
            ...Array.from({ length: slots }, (_, s) =>
              at.has(s) ? <Node key={s} id={`${id}.${process}.${s}`} title={at.get(s)} w={48} /> : <Space key={s} />,
            ),
            <Row key={`${process}.e`} gap={0}>
              <Space w={LANE_LEAD} />
              <Space id={`${id}.${process}.e`} />
            </Row>,
          ];
        })}
      </Grid>
      {lanes.flatMap(({ process, events }) => {
        const stops = [`${id}.${process}.s`, ...events.map(([s]) => `${id}.${process}.${s}`), `${id}.${process}.e`];
        return stops.slice(1).map((to, i) => <Edge key={to} from={stops[i]} to={to} head="none" />);
      })}
      {causal.map(([from, to]) => (
        <Edge key={from} from={`${id}.${from}`} to={`${id}.${to}`} />
      ))}
    </>
  );
}

export function CausalConsistencySchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Causal consistency preserves cause-before-effect order, while concurrent writes may be observed in different orders."}
      className={className}
    >
      <Row wrap gap={12} align="stretch">
        {CAUSAL.map((c, k) => (
          <Group key={c.title} title={c.title} gap={16}>
            <Lanes id={`cc${k}`} slots={c.slots} lanes={c.lanes} causal={c.causal} />
            <Node title={c.verdict} state={c.violation ? "strong" : undefined} />
          </Group>
        ))}
      </Row>
    </Diagram>
  );
}
