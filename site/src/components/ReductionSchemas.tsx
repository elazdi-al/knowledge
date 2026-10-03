import { Col, Diagram, Edge, Grid, Group, Node, Row, Space, Text } from "@/components/figure";

const notes = (lines: string[]) => lines.map((t) => <Text key={t} text={t} size="note" muted />);
const down = (from: string, to: string) => <Edge key={to} from={from} to={to} fromSide="bottom" toSide="top" route="ortho" />;

export function NpCompletenessChainSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "Each arrow means a polynomial-time reduction from the source problem to the target problem."
      }
      className={className}
    >
      <Col gap={24}>
        <Col gap={36}>
          <Node id="sat" title="SAT" state="strong" />
          <Row gap={56} align="start">
            <Col gap={36}>
              <Node id="indset" title="INDSET" state="strong" />
              <Grid cols={2} colGap={40} rowGap={36}>
                <Node id="vc" title="VERTEX COVER" />
                <Node id="clique" title="CLIQUE" />
                <Node id="sc" title="SET COVER" />
                <Node id="ss" title="SUBSET-SUM" state="placeholder" />
              </Grid>
            </Col>
            <Node id="3sat" title="3SAT" />
          </Row>
        </Col>
        {notes(["known complete sources feed later complete targets by transitivity"])}
      </Col>
      {down("sat", "indset")}
      {down("sat", "3sat")}
      {down("indset", "vc")}
      {down("indset", "clique")}
      {down("vc", "sc")}
      <Edge from="sc" to="ss" dashed />
    </Diagram>
  );
}

const CLAUSES: Array<Array<{ id: string; label: string; chosen?: boolean }>> = [
  [{ id: "k1n1", label: "¬x_1", chosen: true }],
  [
    { id: "k2p1", label: "x_1" },
    { id: "k2n2", label: "¬x_2", chosen: true },
  ],
  [
    { id: "k3p1", label: "x_1" },
    { id: "k3p2", label: "x_2" },
    { id: "k3n3", label: "¬x_3", chosen: true },
  ],
  [
    { id: "k4p1", label: "x_1" },
    { id: "k4p2", label: "x_2" },
    { id: "k4p3", label: "x_3" },
    { id: "k4n4", label: "¬x_4", chosen: true },
  ],
];
const CONFLICTS: Array<[string, string]> = [
  ["k1n1", "k2p1"],
  ["k1n1", "k3p1"],
  ["k1n1", "k4p1"],
  ["k2n2", "k3p2"],
  ["k2n2", "k4p2"],
  ["k3n3", "k4p3"],
];

export function SatToIndsetReductionSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const D = 40;
  const literal = (l: (typeof CLAUSES)[number][number]) => (
    <Node key={l.id} id={l.id} shape="circle" w={D} title={l.label} state={l.chosen ? "active" : undefined} />
  );
  // each clause is a polygon, so no clique edge passes through a vertex
  const polygon = (ls: (typeof CLAUSES)[number]) =>
    ls.length === 3 ? (
      <Col gap={24}>
        <Row gap={36}>{ls.slice(0, 2).map(literal)}</Row>
        {literal(ls[2])}
      </Col>
    ) : ls.length === 4 ? (
      <Grid cols={2} gap={36}>
        {ls.map(literal)}
      </Grid>
    ) : (
      <Row gap={36}>{ls.map(literal)}</Row>
    );
  const cliques = CLAUSES.flatMap((ls) => ls.flatMap((a, i) => ls.slice(i + 1).map((b) => [a.id, b.id] as const)));
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "SAT reduces to INDSET by turning clauses into cliques and contradictions into conflict edges."
      }
      className={className}
    >
      <Col gap={14}>
        <Group title="example construction">
          <Grid cols={2} gap={48} align="center">
            {CLAUSES.map((ls, i) => (
              <Group key={i} id={`K${i + 1}`} title={`K_${i + 1}`}>
                {polygon(ls)}
              </Group>
            ))}
          </Grid>
        </Group>
        <Col gap={2}>{notes(["solid edges: clause cliques", "dashed edges: conflicting literals", "outlined nodes: chosen independent set"])}</Col>
      </Col>
      {cliques.map(([a, b]) => (
        <Edge key={a + b} from={a} to={b} route="arc" head="none" />
      ))}
      {CONFLICTS.map(([a, b]) => (
        <Edge key={a + b} from={a} to={b} dashed head="none" />
      ))}
    </Diagram>
  );
}

const DFA_D = 44;
const state = (id: string, label: string, double = false) => <Node id={id} shape="circle" w={DFA_D} title={label} double={double} />;
const hole = <Space w={DFA_D} h={DFA_D} />;

export function DfaToPathReductionSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "DFA nonemptiness becomes reachability: an accepting state is reachable iff the target is reachable."
      }
      className={className}
    >
      <Col gap={14}>
        <Row wrap gap={24} align="start">
          <Group id="dfa" title="DFA D" gap={14}>
            <Grid cols={3} colGap={48} rowGap={16}>
              {hole}
              {state("d-q1", "q_1")}
              {hole}
              {state("d-q0", "q_0")}
              {hole}
              {state("d-qf", "q_f", true)}
            </Grid>
            <Text text="accepting state reachable" size="note" muted />
          </Group>
          <Group id="graph" title="Graph instance" gap={14}>
            <Grid cols={4} colGap={36} rowGap={16}>
              {hole}
              {state("g-q1", "q_1")}
              {hole}
              {hole}
              {state("g-q0", "q_0")}
              {hole}
              {state("g-qf", "q_f")}
              <Node id="g-t" shape="circle" w={DFA_D} title="t" state="placeholder" />
            </Grid>
            <Text text="path from q_0 to t" size="note" muted />
          </Group>
        </Row>
        <Text text="<D> maps to <G,q_0,t>; transition labels are dropped" size="note" muted />
      </Col>
      <Edge from="dfa" to="graph" label="f" />
      <Edge from="d-q0" to="d-q1" route="arc" label="0" />
      <Edge from="d-q1" to="d-qf" route="arc" label="1" />
      <Edge from="d-q0" to="d-qf" route="arc" bend={40} label="1" />
      <Edge from="g-q0" to="g-q1" route="arc" />
      <Edge from="g-q1" to="g-qf" route="arc" />
      <Edge from="g-q0" to="g-qf" route="arc" bend={40} state="active" />
      <Edge from="g-qf" to="g-t" route="arc" state="active" />
    </Diagram>
  );
}

export function ReductionPipelineSchema({
  title,
  caption,
  solver = "M_B",
  solverNote = "decider for B",
  result = "machine for A",
  className,
}: {
  title?: string;
  caption?: string;
  solver?: string;
  solverNote?: string;
  result?: string;
  className?: string;
}) {
  return (
    <Diagram title={title} caption={caption ?? "Use the reduction first, then run the machine for B."} className={className}>
      <Col gap={10}>
        <Group title={result}>
          <Row wrap gap={36}>
            <Node id="w" title="w" mono />
            <Node id="f" title="f" sub="computable, total" />
            <Node id="fw" title="f(w)" mono />
            <Node id="m" title={solver} sub={solverNote} />
          </Row>
        </Group>
        {notes(["correctness condition: w ∈ A iff f(w) ∈ B"])}
      </Col>
      <Edge from="w" to="f" />
      <Edge from="f" to="fw" />
      <Edge from="fw" to="m" />
    </Diagram>
  );
}

export function RegTmReductionSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "The reduction builds M' so its language is either all strings or the known non-regular language B."
      }
      className={className}
    >
      <Col gap={20}>
        <Row wrap gap={36}>
          <Node id="mw" title="<M,w>" mono />
          <Node id="f" title="f" />
          <Node id="m2" title="<M'>" mono />
          <Node id="reg" title="R_{REG}" />
        </Row>
        <Group title="M' on input y" dir="row" gap={40}>
          <Node id="yb" title="y in B?" />
          <Col gap={20} align="start">
            <Node id="acc1" title="accept" />
            <Row gap={40}>
              <Node id="run" title="run M on w" />
              <Col gap={12} align="start">
                <Node id="acc2" title="accept" />
                <Node id="rej" title="no accept" state="placeholder" />
              </Col>
            </Row>
          </Col>
        </Group>
        <Col gap={2}>{notes(["if M accepts w: L(M') = Σ^*", "otherwise: L(M') = B = {0^n1^n | n ≥ 0}"])}</Col>
      </Col>
      <Edge from="mw" to="f" />
      <Edge from="f" to="m2" />
      <Edge from="m2" to="reg" />
      <Edge from="yb" to="acc1" label="yes" />
      <Edge from="yb" to="run" label="no" />
      <Edge from="run" to="acc2" label="accepts" />
      <Edge from="run" to="rej" label="otherwise" />
    </Diagram>
  );
}
