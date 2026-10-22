import { Col, Diagram, Edge, Group, Node, Row, Text } from "@/components/figure";

const notes = (lines: string[]) => lines.map((t) => <Text key={t} text={t} size="note" muted />);

export function VerifierSchema({
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
      caption={caption ?? "A verifier checks a proposed certificate; it does not have to find one."}
      className={className}
    >
      <Col gap={6}>
        <Group title="Verification view of a language">
          <Row wrap gap={36}>
            <Node id="x" title="x" mono />
            <Node id="c" title="C" mono />
            <Node id="v" title="verifier $V$" state="strong" />
            <Node id="acc" title="accept?" />
          </Row>
        </Group>
        <Col gap={2}>{notes(["$x \\in L$ iff some short $C$ makes $V$ accept", "$x \\notin L$ iff every $C$ is rejected"])}</Col>
      </Col>
      <Edge from="x" to="c" label="paired" />
      <Edge from="c" to="v" />
      <Edge from="v" to="acc" />
    </Diagram>
  );
}

/** Undirected graph edges: centre to centre, no head. */
const link = (p: string, a: string, b: string, bend?: number) => <Edge key={`${a}-${b}`} from={p + a} to={p + b} route="arc" bend={bend} head="none" />;
const vertex = (p: string, v: string, active = false) => <Node key={v} id={p + v} shape="circle" title={v} state={active ? "active" : undefined} />;

const K33: Array<[string, string]> = [
  ["1", "2"],
  ["3", "4"],
  ["5", "6"],
  ["1", "4"],
  ["1", "6"],
  ["3", "2"],
  ["5", "2"],
  ["3", "6"],
  ["5", "4"],
];

/** K3,3 drawn bipartite: odd vertices on top, even below. */
function Bipartite({ p, chosen = [] }: { p: string; chosen?: string[] }) {
  return (
    <>
      <Col gap={64}>
        <Row gap={36}>{["1", "3", "5"].map((v) => vertex(p, v, chosen.includes(v)))}</Row>
        <Row gap={36}>{["2", "4", "6"].map((v) => vertex(p, v))}</Row>
      </Col>
      {K33.map(([a, b]) => link(p, a, b))}
    </>
  );
}

/** The same graph as a hexagon with its three long diagonals; d-a bows so the diagonals never meet in one point. */
function Hexagon({ p }: { p: string }) {
  const row = (gap: number, a: string, b: string) => (
    <Row gap={gap}>
      {vertex(p, a)}
      {vertex(p, b)}
    </Row>
  );
  return (
    <>
      <Col gap={26}>
        {row(36, "c", "b")}
        {row(112, "d", "a")}
        {row(36, "e", "f")}
      </Col>
      {(
        [
          ["c", "b"],
          ["e", "f"],
          ["d", "c"],
          ["d", "e"],
          ["b", "a"],
          ["a", "f"],
          ["c", "f"],
          ["e", "b"],
        ] as const
      ).map(([a, b]) => link(p, a, b))}
      {link(p, "d", "a", 18)}
    </>
  );
}

export function GraphCertificateSchema({
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
        "Certificates can be concrete structures: a vertex bijection for GI, or a vertex subset for INDSET."
      }
      className={className}
    >
      <Col gap={16}>
        <Group title="GI certificate">
          <Row wrap gap={32}>
            <Hexagon p="g." />
            <Col gap={2}>
              <Text text="bijection $C$" size="note" muted />
              {["a->1", "b->2", "c->3", "d->4", "e->5", "f->6"].map((t) => (
                <Text key={t} text={t} size="note" mono muted />
              ))}
            </Col>
            <Bipartite p="h." />
          </Row>
        </Group>
        <Group title="INDSET certificate" gap={14}>
          <Bipartite p="s." chosen={["1", "3", "5"]} />
          <Col gap={2}>
            <Text text="S={1,3,5}" size="note" mono muted />
            <Text text="no selected edge exists" size="note" muted />
          </Col>
        </Group>
        <Col gap={2}>{notes(["GI checks all adjacencies under the bijection.", "INDSET checks all pairs inside the chosen subset."])}</Col>
      </Col>
    </Diagram>
  );
}

export function PnpContainmentSchema({
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
      caption={caption ?? "$P$ is contained in $NP$. Whether the containment is strict is the P versus NP problem."}
      className={className}
    >
      <Col gap={12}>
        <Row wrap gap={16} align="stretch">
          <Group title="possible: $P=NP$">
            <Group title="$P=NP$" dir="row" gap={8}>
              <Node title="SAT" />
              <Node title="INDSET" />
              <Node title="GI" />
            </Group>
          </Group>
          <Group title="possible: $P \subsetneq NP$">
            <Group title="$NP$" gap={10}>
              <Row gap={8}>
                <Node title="SAT" />
                <Node title="INDSET" />
              </Row>
              <Group title="$P$">
                <Node title="GI?" state="placeholder" />
              </Group>
            </Group>
          </Group>
        </Row>
        {notes(["SAT and INDSET are NP-complete: putting either in $P$ would force $P=NP$."])}
      </Col>
    </Diagram>
  );
}
