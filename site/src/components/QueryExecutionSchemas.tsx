import { Col, Diagram, Dots, Edge, Grid, Group, measure, Node, Row, Space, Text } from "@/components/figure";
import { FONT, NODE } from "@/components/figure/theme";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

const STAGES: [string, string?][] = [
  ["Parse and rewrite query", "expression tree"],
  ["Select logical plan", "logical plan"],
  ["Select physical plan", "physical plan"],
  ["Query execution"],
];
const CHAIN = ["sql", ...STAGES.map((_, i) => `stage${i}`), "disk"];
const CHAIN_LABELS = [undefined, ...STAGES.map(([, out]) => out)];

export function QueryProcessingFlow({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "Query compilation pipeline."} className={className}>
      <Col gap={20}>
        <Node id="sql" title="SQL query" shape="pill" tone="orange" />
        <Col gap={20} align="stretch">
          {STAGES.map(([s], i) => (
            <Node key={s} id={`stage${i}`} title={s} state={i === STAGES.length - 1 ? "strong" : undefined} />
          ))}
        </Col>
        <Node id="disk" shape="cylinder" title="Disk pages" />
      </Col>
      {CHAIN.slice(1).map((to, i) => (
        <Edge key={to} from={CHAIN[i]} to={to} label={CHAIN_LABELS[i]} />
      ))}
    </Diagram>
  );
}

export function OptimizerArchitectureSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "Cost-based optimizer architecture."} className={className}>
      <Col gap={28}>
        <Row gap={40}>
          <Node id="sql" title="SQL query" shape="pill" tone="orange" />
          <Node id="parser" title="Parser" />
          <Node id="rewrite" title="Rewrite" state="placeholder" />
        </Row>
        <Row gap={24}>
          <Group id="cbo" title="Cost-based optimizer">
            <Row gap={64} pad={10}>
              <Node id="gen" title="Plan generator" />
              <Node id="est" title="Cost estimator" />
            </Row>
          </Group>
          <Group id="cat" title="Catalog" gap={8}>
            <Node shape="cylinder" title="Schema" />
            <Node shape="cylinder" title="Stats" />
          </Group>
        </Row>
        <Node id="plan" title="Physical plan" shape="pill" tone="orange" />
      </Col>
      <Edge from="sql" to="parser" />
      <Edge from="parser" to="rewrite" />
      <Edge from="rewrite" to="cbo" />
      <Edge from="gen" to="est" route="arc" bend={-24} label="plans" />
      <Edge from="est" to="gen" route="arc" bend={-24} label="costs" />
      <Edge from="cat" to="est" label="metadata" />
      <Edge from="cbo" to="plan" />
    </Diagram>
  );
}

/** Read a page, hash each tuple to an output buffer, flush full buffers to their partitions. */
export function HashProjectionSchema({ title, caption, className }: FigureProps) {
  const outs = [
    { id: "o1", part: "p1", label: "1" },
    { id: "o2", part: "p2", label: "2" },
    { id: "ob", part: "pb", label: "B-1" },
  ];
  const stack = (kind: "out" | "part") => (
    <Col gap={8} align="stretch">
      {outs.map((o, i) => [
        i === outs.length - 1 && <Dots key="dots" dir="col" />,
        kind === "out" ? (
          <Node key={o.id} id={o.id} title={o.label} />
        ) : (
          <Node key={o.part} id={o.part} title={o.label} shape="cylinder" h={32} />
        ),
      ])}
    </Col>
  );
  return (
    <Diagram title={title} caption={caption ?? "Hash projection partitions by h1."} className={className}>
      <Row gap={36}>
        <Node id="R" shape="cylinder" title="Original relation" />
        <Row gap={36} align="end">
          <Group id="mem" title="B main-memory buffers" dir="row" gap={28}>
            <Col gap={4}>
              <Text text="Input" size="note" weight={600} />
              <Node id="in" w={60} />
            </Col>
            <Col gap={4}>
              <Text text="hash" size="note" muted />
              <Node id="h1" shape="circle" title="h_1" />
            </Col>
            <Col gap={4}>
              <Text text="Output" size="note" weight={600} />
              {stack("out")}
            </Col>
          </Group>
          <Group title="Partitions">{stack("part")}</Group>
        </Row>
      </Row>
      <Edge from="R" to="in" label="1 page" />
      <Edge from="in" to="h1" />
      {outs.map((o) => [<Edge key={o.id} from="h1" to={o.id} />, <Edge key={o.part} from={o.id} to={o.part} label="2 flush" />])}
    </Diagram>
  );
}

/** Build before probe: R_i becomes the hash table, then S_i streams through it and matches flow out. */
export function GraceProbeSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "Grace hash join, probe phase."} className={className}>
      <Row gap={36}>
        <Group title="Partitions">
          <Col gap={8} align="stretch">
            <Node id="Ri" shape="cylinder" title="R_i" />
            <Node id="Si" shape="cylinder" title="S_i" />
            <Dots dir="col" />
          </Col>
        </Group>
        <Group title="B main-memory buffers">
          <Grid cols={1} rowGap={44} align="stretch">
            <Node id="ht" title="hash table on R_i (h_2)" sub="at most B-2 pages" />
            <Row gap={56}>
              <Node id="sin" title="S_i input" />
              <Node id="out" title="output" />
            </Row>
          </Grid>
        </Group>
        <Node id="res" shape="cylinder" title="Join result" sub="⟨r, s⟩ pairs" />
      </Row>
      <Edge from="Ri" to="ht" label="1 load" />
      <Edge from="Si" to="sin" label="2 stream" />
      <Edge from="sin" to="ht" label="3 probe" />
      <Edge from="ht" to="out" label="4 match" />
      <Edge from="out" to="res" label="5 write" />
    </Diagram>
  );
}

const HISTOGRAM_VALUES = [2, 3, 3, 1, 2, 1, 3, 8, 4, 2, 0, 1, 2, 4, 8];
const HISTOGRAMS: { title: string; sub: string; buckets: [number, number][] }[] = [
  { title: "Equi-width", sub: "equal value ranges", buckets: [[0, 2], [3, 5], [6, 8], [9, 11], [12, 14]] },
  { title: "Equi-depth", sub: "similar tuple counts", buckets: [[0, 2], [3, 6], [7, 7], [8, 12], [13, 14]] },
];
const BAR = { w: 12, unit: 8, gap: 2, pad: 4, bucketGap: 6 };
const BAR_TOP = Math.max(...HISTOGRAM_VALUES) * BAR.unit;
const TICKS = [0, 7, 14];

/** Texts centred on x positions (in the row's coordinates), left to right. */
function TextsAt({ items, muted, weight }: { items: { text: string; x: number }[]; muted?: boolean; weight?: 500 }) {
  let cursor = 0;
  return (
    <Row gap={0}>
      {items.flatMap(({ text, x }) => {
        const w = measure(text, FONT.note, { weight });
        const space = x - w / 2 - cursor;
        cursor = x + w / 2;
        return [<Space key={`${text}.s`} w={space} />, <Text key={text} text={text} size="note" muted={muted} weight={weight} />];
      })}
    </Row>
  );
}

/** Every bucket is a panel of the same height (a zero-width spacer sets it) with its bars on the floor; each bar's centre feeds the value ticks. */
function Histogram({ title, sub, buckets }: (typeof HISTOGRAMS)[number]) {
  const bars: number[] = [];
  const centres: number[] = [];
  let x = 0;
  for (const [from, to] of buckets) {
    const n = to - from + 1;
    const inner = BAR.gap + n * BAR.w + (n - 1) * BAR.gap;
    for (let j = 0; j < n; j++) bars.push(x + BAR.pad + BAR.gap + j * (BAR.w + BAR.gap) + BAR.w / 2);
    centres.push(x + BAR.pad + inner / 2);
    x += inner + 2 * BAR.pad + BAR.bucketGap;
  }
  const sum = (from: number, to: number) => HISTOGRAM_VALUES.slice(from, to + 1).reduce((a, v) => a + v, 0);
  return (
    <Col gap={6} align="start">
      <Text text={title} weight={600} />
      <Text text={sub} size="note" muted />
      <Space h={4} />
      <Row gap={BAR.bucketGap} align="end">
        {buckets.map(([from, to], b) => (
          <Group key={b} dir="row" gap={BAR.gap} pad={BAR.pad} align="end" dashed>
            <Space h={BAR_TOP} />
            {HISTOGRAM_VALUES.slice(from, to + 1).map((v, j) => (v ? <Node key={j} w={BAR.w} h={v * BAR.unit} tone="blue" /> : <Space key={j} w={BAR.w} />))}
          </Group>
        ))}
      </Row>
      <TextsAt items={TICKS.map((t) => ({ text: String(t), x: bars[t] }))} muted />
      <TextsAt items={buckets.map((_, b) => ({ text: `B${b + 1}`, x: centres[b] }))} weight={500} />
      <TextsAt items={buckets.map(([from, to], b) => ({ text: String(sum(from, to)), x: centres[b] }))} muted />
    </Col>
  );
}

export function HistogramBucketSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Row wrap gap={56} align="start">
        {HISTOGRAMS.map((h) => (
          <Histogram key={h.title} {...h} />
        ))}
      </Row>
    </Diagram>
  );
}

type JoinTree = string | [JoinTree, JoinTree];
const PLANS: { title: string; tree: JoinTree; kept?: boolean }[] = [
  { title: "Left-deep", tree: [[["A", "B"], "C"], "D"], kept: true },
  { title: "Right-deep", tree: ["A", ["B", ["C", "D"]]] },
  { title: "Bushy", tree: [["A", "B"], ["C", "D"]] },
];
const LEVEL = { gap: 22 };
const levels = (t: JoinTree): number => (typeof t === "string" ? 1 : 1 + Math.max(levels(t[0]), levels(t[1])));
const MAX_LEVELS = Math.max(...PLANS.map((p) => levels(p.tree)));

/** A join tree by nesting: each join is centred over its two inputs. */
function Plan({ id, tree, kept, root = true }: { id: string; tree: JoinTree; kept: boolean; root?: boolean }) {
  const state = kept ? (root ? "strong" : undefined) : "ghost";
  if (typeof tree === "string") return <Node id={id} title={tree} w={32} state={kept ? undefined : "ghost"} />;
  return (
    <Col gap={LEVEL.gap}>
      <Node id={id} title="join" state={state} />
      <Row gap={10} align="start">
        {tree.map((t, i) => (
          <Plan key={i} id={`${id}.${i}`} tree={t} kept={kept} root={false} />
        ))}
      </Row>
      {tree.map((_, i) => (
        <Edge key={i} from={id} to={`${id}.${i}`} fromSide="bottom" toSide="top" route="straight" head="none" />
      ))}
    </Col>
  );
}

export function LeftDeepPlanSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "System R keeps left-deep join trees and prunes right-deep and bushy trees."}
      className={className}
    >
      <Row wrap gap={12} align="stretch">
        {PLANS.map((p, i) => (
          <Group key={p.title} title={p.title} gap={16} state={p.kept ? undefined : "ghost"}>
            <Col gap={0}>
              <Plan id={`plan${i}`} tree={p.tree} kept={p.kept === true} />
              <Space h={(MAX_LEVELS - levels(p.tree)) * (NODE.h + LEVEL.gap)} />
            </Col>
            <Text text={p.kept ? "kept" : "pruned"} size="note" weight={p.kept ? 600 : undefined} muted={!p.kept} />
          </Group>
        ))}
      </Row>
    </Diagram>
  );
}

type ExecMode = "iterator" | "materialized";

/** One call in order, as [from, to, label]. A call down the plan is dashed; data comes back up. */
const EXEC_FLOW: Record<ExecMode, [string, string, string][]> = {
  iterator: [
    ["client", "proj", "Next()"],
    ["proj", "join", "Next()"],
    ["scanR", "join", "R"],
    ["join", "selS", "Next()"],
    ["scanS", "selS", "s"],
    ["selS", "join", "s"],
    ["join", "proj", "r, s"],
    ["proj", "client", "tuple"],
  ],
  materialized: [
    ["client", "proj", "Output()"],
    ["scanR", "join", "all of R"],
    ["scanS", "selS", "all of S"],
    ["selS", "join", "filtered S"],
    ["join", "proj", "join result"],
    ["proj", "client", "result"],
  ],
};
const DEPTH: Record<string, number> = { client: 0, proj: 1, join: 2, scanR: 3, selS: 3, scanS: 4 };

/** Numbered edges trace one request down the plan's spine and the tuples back up; a link used both ways bows into two arcs. Scan R hangs off the spine (mirrored by a spacer) and feeds the join from the side. */
export function ExecutionModelSchema({
  mode,
  title,
  caption,
  className,
}: {
  mode: "iterator" | "materialized";
  title?: string;
  caption?: string;
  className?: string;
}) {
  const flow = EXEC_FLOW[mode];
  const both = (from: string, to: string) => flow.some(([f, t]) => f === to && t === from);
  return (
    <Diagram
      title={title}
      caption={caption ?? (mode === "iterator" ? "Iterator model: one tuple at a time." : "Materialization model: full outputs.")}
      className={className}
    >
      <Col gap={40}>
        <Node id="client" title="client" shape="pill" />
        <Node id="proj" title="Project" sub="R.id, S.cdate" />
        <Node id="join" title="Hash join" sub="R.id = S.id" />
        <Row gap={56} align="start">
          <Node id="scanR" title="Scan R" w={72} />
          <Col gap={40}>
            <Node id="selS" title="Select S" sub="value > 100" />
            <Node id="scanS" title="Scan S" />
          </Col>
          <Space w={72} />
        </Row>
      </Col>
      {flow.map(([from, to, label], i) => {
        const down = DEPTH[to] > DEPTH[from];
        if (both(from, to)) return <Edge key={i} from={from} to={to} label={`${i + 1} ${label}`} dashed={down} route="arc" bend={64} />;
        const side = from === "scanR" ? "left" : "bottom";
        return <Edge key={i} from={from} to={to} label={`${i + 1} ${label}`} fromSide="top" toSide={side} route={side === "left" ? "curve" : "straight"} />;
      })}
    </Diagram>
  );
}
