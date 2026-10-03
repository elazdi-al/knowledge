import { Col, Diagram, Dots, Edge, Grid, Group, measure, Node, Row, Space, Table, Text } from "@/components/figure";
import { FONT, NODE } from "@/components/figure/theme";
import { ScheduleGrid, TX_TONE, type TxId } from "@/components/ScheduleGrid";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

const txCircle = (id: string, tx: TxId) => <Node id={id} shape="circle" title={`T_${tx}`} tone={TX_TONE[tx]} />;

const PRECEDENCE: { title: string; ops: [TxId, string][]; edges: [TxId, TxId, string][]; verdict: string; cyclic?: boolean }[] = [
  {
    title: "Acyclic graph",
    ops: [[1, "R_1(A)"], [1, "W_1(A)"], [2, "R_2(A)"], [2, "W_2(A)"], [1, "R_1(B)"], [1, "W_1(B)"], [2, "R_2(B)"]],
    edges: [[1, 2, "A, B"]],
    verdict: "acyclic: serial order T_1, T_2",
  },
  {
    title: "Cyclic graph",
    ops: [[1, "R_1(A)"], [1, "W_1(A)"], [2, "R_2(A)"], [2, "W_2(A)"], [2, "R_2(B)"], [2, "W_2(B)"], [1, "R_1(B)"]],
    edges: [
      [1, 2, "A"],
      [2, 1, "B"],
    ],
    verdict: "cycle: no equivalent serial order",
    cyclic: true,
  },
];

export function ConflictSerializabilitySchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "A precedence graph turns conflict-order constraints into a cycle test."} className={className}>
      <Row wrap gap={12} align="stretch">
        {PRECEDENCE.map((p, k) => (
          <Group key={p.title} title={p.title} gap={14} align="stretch">
            <Row gap={24}>
              <ScheduleGrid txs={[1, 2]} ops={p.ops.map(([tx, text]) => ({ tx, text }))} />
              <Col gap={36}>
                {txCircle(`pg${k}.1`, 1)}
                {txCircle(`pg${k}.2`, 2)}
              </Col>
            </Row>
            <Node title={p.verdict} state={p.cyclic ? "strong" : undefined} />
            {/* anti-parallel arcs share one bend so they bow apart */}
            {p.edges.map(([a, b, label]) => (
              <Edge key={label} from={`pg${k}.${a}`} to={`pg${k}.${b}`} label={label} route={p.cyclic ? "arc" : "auto"} bend={p.cyclic ? -26 : undefined} />
            ))}
          </Group>
        ))}
      </Row>
    </Diagram>
  );
}

/** Phases are consecutive runs of `counts`; a zero-length phase (release) sits on the axis tail after the marker. */
const LOCK_CURVES: { title: string; marker: string; counts: number[]; phases: [string, number][]; note: string }[] = [
  {
    title: "Basic 2PL",
    marker: "lock point",
    counts: [1, 2, 3, 4, 3, 2, 1],
    phases: [
      ["growing", 4],
      ["shrinking", 3],
    ],
    note: "after release: no new locks",
  },
  {
    title: "Strict 2PL",
    marker: "commit / abort",
    counts: [1, 2, 3, 4, 4, 4, 4],
    phases: [
      ["acquire", 4],
      ["hold locks", 3],
      ["release", 0],
    ],
    note: "release only at transaction end",
  },
];
/** pitch per lock event, height per held lock, lead before the first event, gap beside axis words */
const PLOT = { pitch: 20, unit: 12, lead: 10, gap: 4, headroom: 12 };
const NOTE_H = Math.round(FONT.note * 1.4);
const noteW = (s: string) => measure(s, FONT.note);

/** Texts centred on x positions (in the row's coordinates), left to right. */
function TextsAt({ items }: { items: { text: string; x: number; id?: string }[] }) {
  let cursor = 0;
  return (
    <Row gap={0}>
      {items.flatMap(({ text, x, id }) => {
        const pad = x - noteW(text) / 2 - cursor;
        cursor = x + noteW(text) / 2;
        return [<Space key={`${text}.s`} w={pad} />, <Text key={text} id={id} text={text} size="note" muted />];
      })}
    </Row>
  );
}

/** A zero-size anchor on the axis line; the axis sits NOTE_H / 2 above the plot row's bottom so axis words centre on it. */
const AxisPoint = ({ id }: { id: string }) => (
  <Col gap={0}>
    <Space id={id} />
    <Space h={NOTE_H / 2} />
  </Col>
);

/**
 * Lock count over time drawn as its exact step function: a crisp outline from straight edges between
 * zero-size anchors on each event's top corners, over a time axis, with a dashed marker at the phase change.
 */
function LockPlot({ id, counts, phases, marker }: { id: string; counts: number[]; phases: [string, number][]; marker: string }) {
  const { pitch, unit, lead, gap, headroom } = PLOT;
  const tail = Math.max(20, ...phases.filter(([, n]) => n === 0).map(([name]) => noteW(name) + 12));
  const yAxisX = noteW("locks") + gap;
  const split = phases.slice(0, -1).reduce((s, [, n]) => s + n, 0);
  const xAt = (col: number) => yAxisX + lead + col * pitch;
  let start = 0;
  const phaseLabels = phases.map(([name, n]) => {
    const x = n ? xAt(start + n / 2) : xAt(start) + tail / 2;
    start += n;
    return { text: name, x };
  });
  const a = (s: string) => `${id}.${s}`;
  const outline = [a("b0")];
  counts.forEach((c, i) => {
    if (c !== counts[i - 1]) outline.push(a(`t${i}l`));
    outline.push(a(`t${i}r`));
  });
  outline.push(a("bn"));
  return (
    <>
      <Col gap={4} align="start">
        <TextsAt items={[{ text: marker, x: xAt(split), id: a("marker") }]} />
        <Row gap={0} align="end">
          <Col gap={0} align="end">
            <Row gap={gap}>
              <Text text="locks" size="note" muted />
              <Space id={a("ytip")} />
            </Row>
            <Space h={Math.max(...counts) * unit + headroom - NOTE_H / 2} />
            <AxisPoint id={a("o")} />
          </Col>
          <Space w={lead} />
          <AxisPoint id={a("b0")} />
          {counts.flatMap((c, i) => [
            i === split && <AxisPoint key="split" id={a("split")} />,
            <Col key={i} gap={0}>
              <Row gap={0}>
                <Space id={a(`t${i}l`)} />
                <Space w={pitch} />
                <Space id={a(`t${i}r`)} />
              </Row>
              <Space h={c * unit + NOTE_H / 2} />
            </Col>,
          ])}
          <AxisPoint id={a("bn")} />
          {split === counts.length && <AxisPoint id={a("split")} />}
          <Space w={tail} />
          <Row gap={gap}>
            <Space id={a("xtip")} />
            <Text text="time" size="note" muted />
          </Row>
        </Row>
        <TextsAt items={phaseLabels} />
      </Col>
      <Edge from={a("o")} to={a("ytip")} route="straight" />
      <Edge from={a("o")} to={a("xtip")} route="straight" />
      {outline.slice(1).map((to, i) => (
        <Edge key={to} from={outline[i]} to={to} route="straight" head="none" thick />
      ))}
      <Edge from={a("marker")} to={a("split")} fromSide="bottom" toSide="top" route="straight" head="none" dashed />
    </>
  );
}

/** Lock count is a step function, so the outline is exact; the marker splits the phases. */
export function LockPhaseSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "2PL forbids new locks after release; strict 2PL delays release until the transaction ends."}
      className={className}
    >
      <Row wrap gap={12} align="stretch">
        {LOCK_CURVES.map((c, k) => (
          <Group key={c.title} title={c.title} gap={12}>
            <LockPlot id={`lp${k}`} counts={c.counts} phases={c.phases} marker={c.marker} />
            <Text text={c.note} size="note" />
          </Group>
        ))}
      </Row>
    </Diagram>
  );
}

/** Each blocked request adds one wait-for edge, numbered in request order; the third closes the cycle. */
export function WaitForGraphSchema({ title, caption, className }: FigureProps) {
  const waits: { from: TxId; to: TxId; text: string; lock: string }[] = [
    { from: 1, to: 2, text: "S(B) waits", lock: "S(B)" },
    { from: 2, to: 3, text: "X(C) waits", lock: "X(C)" },
    { from: 3, to: 1, text: "X(A) waits", lock: "X(A)" },
  ];
  return (
    <Diagram title={title} caption={caption ?? "A deadlock appears as a cycle in the wait-for graph."} className={className}>
      <Row wrap gap={16} align="stretch">
        <Group title="Blocked lock requests" gap={6}>
          <ScheduleGrid
            txs={[1, 2, 3]}
            ops={[
              { tx: 1, text: "S(A)" },
              { tx: 2, text: "X(B)" },
              { tx: 3, text: "S(C)" },
              ...waits.map((w) => ({ tx: w.from, text: w.text, state: "placeholder" as const })),
            ]}
          />
          <Space h={6} />
          <Text text="T_1 waits for T_2, T_2 waits for T_3," size="note" muted />
          <Text text="and T_3 waits for T_1." size="note" muted />
        </Group>
        <Group title="Wait-for graph" gap={24}>
          <Col gap={40}>
            <Row gap={72}>
              {txCircle("wf1", 1)}
              {txCircle("wf2", 2)}
            </Row>
            {txCircle("wf3", 3)}
          </Col>
          <Node title="cycle means deadlock" state="strong" />
        </Group>
      </Row>
      {waits.map((w, i) => (
        <Edge key={i} from={`wf${w.from}`} to={`wf${w.to}`} route="arc" bend={-14} label={`${i + 1} ${w.lock}`} />
      ))}
    </Diagram>
  );
}

const SCHEMES = [
  { title: "Wait-die", rule: "old waits for young", note: "wait edges go from older to younger", oldWaits: true },
  { title: "Wound-wait", rule: "young waits for old", note: "wait edges go from younger to older", oldWaits: false },
];

export function DeadlockPreventionSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Timestamp schemes force waiting in one priority direction, so cycles cannot form."}
      className={className}
    >
      <Row wrap gap={12} align="stretch">
        {SCHEMES.map((s, k) => (
          <Group key={s.title} title={s.title} gap={14}>
            <Text text={s.rule} size="note" muted />
            <Row gap={40}>
              <Node id={`dp${k}.old`} title="T_{old}" />
              <Node id={`dp${k}.young`} title="T_{young}" />
            </Row>
            <Text text={s.note} size="note" muted />
            <Edge from={`dp${k}.${s.oldWaits ? "old" : "young"}`} to={`dp${k}.${s.oldWaits ? "young" : "old"}`} label="waits" />
          </Group>
        ))}
      </Row>
    </Diagram>
  );
}

type LockLevel = { id: string; title: string; kids?: (LockLevel | null)[] };
/** `null` children are drawn ellipses ("and so on"). */
const HIERARCHY: LockLevel = {
  id: "db",
  title: "Database",
  kids: [
    {
      id: "tR",
      title: "Table R",
      kids: [
        { id: "p1", title: "Page 1" },
        {
          id: "p2",
          title: "Page 2",
          kids: [
            { id: "u1", title: "Tuple 1" },
            { id: "u2", title: "Tuple 2", kids: [{ id: "a1", title: "Attr 1" }, null, { id: "an", title: "Attr n" }] },
            null,
            { id: "un", title: "Tuple n" },
          ],
        },
        null,
        { id: "pn", title: "Page n" },
      ],
    },
    { id: "tS", title: "Table S" },
  ],
};

/** Dots on the nodes' centreline, so they read as one more sibling. */
const SiblingDots = () => (
  <Row gap={0}>
    <Space h={NODE.h} />
    <Dots />
  </Row>
);

function Level({ level }: { level: LockLevel }) {
  return (
    <Col gap={28}>
      <Node id={level.id} title={level.title} />
      {level.kids && (
        <Row gap={8} align="start">
          {level.kids.map((k, i) => (k ? <Level key={k.id} level={k} /> : <SiblingDots key={i} />))}
        </Row>
      )}
      {level.kids?.map((k) => k && <Edge key={k.id} from={level.id} to={k.id} fromSide="bottom" toSide="top" route="straight" head="none" />)}
    </Col>
  );
}

export function LockGranularitySchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "A lock hierarchy lets the DBMS choose the object size protected by each lock."} className={className}>
      <Level level={HIERARCHY} />
    </Diagram>
  );
}

/** Intention locks go on the parent before the explicit lock on the child; IS and IX coexist on Table R. */
export function MultiGranularityLockingSchema({ title, caption, className }: FigureProps) {
  const locks: [string, string, TxId, string][] = [
    ["t1", "R", 1, "IS"],
    ["t1", "A", 1, "S"],
    ["t2", "R", 2, "IX"],
    ["t2", "B", 2, "X"],
  ];
  return (
    <Diagram title={title} caption={caption ?? "Intention locks on ancestors advertise lower-level explicit locks."} className={className}>
      <Col gap={14}>
        <Row wrap gap={16} align="stretch">
          <Group title="Two-level hierarchy">
            <Grid cols={3} colGap={24} rowGap={56}>
              <Node id="t1" title="T_1" tone={TX_TONE[1]} />
              <Space />
              <Node id="t2" title="T_2" tone={TX_TONE[2]} />
              <Space />
              <Node id="R" title="Table R" />
              <Space />
              <Node id="A" title="Tuple A" />
              <Dots />
              <Node id="B" title="Tuple B" />
            </Grid>
          </Group>
          <Group title="Compatibility">
            <Table id="compat" columns={["", "IS", "IX"]} rows={[{ cells: ["IS", "yes", "yes"], state: "active" }, ["IX", "yes", "yes"]]} />
          </Group>
        </Row>
        <Text text="IS and IX can coexist on Table R, because the real conflict is checked at the tuple level." size="note" muted />
      </Col>
      <Edge from="R" to="A" fromSide="bottom" toSide="top" route="straight" head="none" />
      <Edge from="R" to="B" fromSide="bottom" toSide="top" route="straight" head="none" />
      {locks.map(([from, to, tx, mode], i) => (
        <Edge key={i} from={from} to={to} label={`${i + 1} ${mode}`} tone={TX_TONE[tx]} />
      ))}
    </Diagram>
  );
}
