import { Canvas, Col, Curve, Diagram, Edge, Fit, FONT, Grid, Group, LINE_H, measure, Node, Plot, Poly, Row, Scatter, Text, type FigureProps, type Tone } from "figure";

/** One hue per idea across the note: teal is what monster owns, purple is what it rents. */
const OWNED: Tone = "teal";
const RENTED: Tone = "purple";

const PLAN_W = 240;

export function MonsterPlanDiagram(props: FigureProps) {
  return (
    <Diagram caption="monster owns what runs all day. It rents what runs for a few hours." {...props}>
      <Row gap={24} align="stretch">
        <Group title="Owned, at home" tone={OWNED} gap={10} align="start">
          <Node title="CPU cores and memory" w={PLAN_W} />
          <Node title="Fast storage and backups" w={PLAN_W} />
          <Node title="One private GPU, day and night" w={PLAN_W} />
          <Node title="Websites, CTFs, CI, scrapers" w={PLAN_W} />
        </Group>
        <Group title="Rented, by the hour" tone={RENTED} gap={10} align="start">
          <Node title="H100s for big training runs" w={PLAN_W} />
          <Node title="Free student credits" w={PLAN_W} />
          <Node title="Free CI for public repos" w={PLAN_W} />
        </Group>
      </Row>
    </Diagram>
  );
}

const TIERS = [
  { id: "t1", title: "Tier 1\n32 cores, 128 GB\none RTX 3090", price: "CHF 3,300" },
  { id: "t2", title: "Tier 2\n32 cores, 512 GB\ntwo RTX 3090s", price: "CHF 6,770" },
  { id: "t3", title: "Tier 3\n64 cores, 512 GB\nfour RTX 3090s", price: "CHF 10,430" },
];

/** The three tiers in upgrade order; each edge is the cost of the next step. */
export function MonsterTiersDiagram(props: FigureProps) {
  const nodes = TIERS.map((t, i) => <Node key={t.id} id={t.id} title={t.title} sub={t.price} state={i === 0 ? "active" : undefined} />);
  const edges = [<Edge key="a" from="t1" to="t2" label="+ 4,070" />, <Edge key="b" from="t2" to="t3" label="+ 4,030" />];
  return (
    <Diagram caption="Every tier keeps the same board, power supply and case. An arrow shows what the upgrade costs in CHF, before the old parts are resold." {...props}>
      <Fit>
        <>
          <Row gap={40} uniform>{nodes}</Row>
          {edges}
        </>
        <>
          <Col gap={48} uniform>{nodes}</Col>
          {edges}
        </>
      </Fit>
    </Diagram>
  );
}

const ZONE_W = 170;

/** The internet reaches three zones through three doors; the other zones have no inbound path. */
export function MonsterZonesDiagram(props: FigureProps) {
  const zone = (id: string, title: string, sub: string) => <Node id={id} title={title} sub={sub} w={ZONE_W} />;
  return (
    <Diagram caption="Each zone is its own VM or container on its own VLAN. Only three doors lead in from the internet." {...props}>
      <Col gap={40}>
        <Row gap={16}>
          {zone("tunnel", "Cloudflare Tunnel", "websites")}
          {zone("ipv4", "Fixed IPv4", "CTF challenges")}
          {zone("vpn", "Headscale VPN", "admins only")}
        </Row>
        <Group tone={OWNED} gap={10}>
          <Grid cols={3} colGap={16} rowGap={12}>
            {zone("web", "Web", "containers and Caddy")}
            {zone("ctf", "CTF", "k3s and nsjail")}
            {zone("ml", "Personal ML", "VM with the GPUs")}
            {zone("scrape", "Scrapers", "one sandbox per job")}
            {zone("emu", "Emulation", "QEMU VM, any CPU")}
            {zone("ci", "CI", "one Firecracker VM per job")}
          </Grid>
          <Text text="one Proxmox VE host" size="note" weight={600} tone={OWNED} />
        </Group>
      </Col>
      <Edge from="tunnel" to="web" />
      <Edge from="ipv4" to="ctf" />
      <Edge from="vpn" to="ml" />
    </Diagram>
  );
}

const HOURS: { label: string; chf: number; tone: Tone }[] = [
  { label: "Own RTX 3090, electricity", chf: 0.11, tone: OWNED },
  { label: "Rented RTX 3090, Vast.ai", chf: 0.16, tone: RENTED },
  { label: "Rented RTX 3090, RunPod", chf: 0.41, tone: RENTED },
  { label: "Rented H100, Vast.ai", chf: 1.97, tone: RENTED },
];
const BAR_H = 22;
const BAR_GAP = 12;
const PX_PER_CHF = 150;

/** Bars to scale, so the eye sees that an owned hour and a cheap rented hour cost almost the same. */
export function MonsterHourCostDiagram(props: FigureProps) {
  const labelW = Math.max(...HOURS.map((h) => measure(h.label, FONT.label))) + 16;
  return (
    <Diagram caption="One GPU-hour in CHF. Running an owned 3090 costs almost as much as renting one." {...props}>
      <Canvas>
        {HOURS.map((h, i) => {
          const y = i * (BAR_H + BAR_GAP);
          const w = h.chf * PX_PER_CHF;
          return [
            <Text key={`${h.label}-label`} text={h.label} at={[0, y + (BAR_H - LINE_H.label) / 2]} anchor="nw" />,
            <Poly key={`${h.label}-bar`} points={[[labelW, y], [labelW + w, y], [labelW + w, y + BAR_H], [labelW, y + BAR_H]]} tone={h.tone} outline />,
            <Text key={`${h.label}-value`} text={`CHF ${h.chf.toFixed(2)}`} size="note" muted at={[labelW + w + 8, y + (BAR_H - LINE_H.note) / 2]} anchor="nw" />,
          ];
        })}
      </Canvas>
    </Diagram>
  );
}

/** Tier 2 capex CHF 6,770; net monthly benefit is benefit minus CHF 122 of cash cost. */
const CAPEX = 6770;
const NET_SERVICES = 340 - 122;
const NET_PROJECTS = 840 - 122;

export function MonsterBreakEvenPlot(props: FigureProps) {
  return (
    <Diagram caption="Tier 2 pays for itself where a savings line meets its price: after about 9 months with one project per semester, and after about 31 months without." {...props}>
      <Plot
        w={460}
        h={220}
        legend
        x={{ domain: [0, 36], title: "months", ticks: [0, 6, 12, 18, 24, 30, 36] }}
        y={{ domain: [0, 8000], title: "CHF saved", ticks: [0, 2000, 4000, 6000, 8000] }}
      >
        <Curve name="services and one project" f={(m) => NET_PROJECTS * m} over={[0, 11]} tone={OWNED} />
        <Curve name="services only" f={(m) => NET_SERVICES * m} tone="blue" />
        <Curve name="price of Tier 2" f={() => CAPEX} dashed tone={RENTED} />
        <Scatter points={[[CAPEX / NET_PROJECTS, CAPEX], [CAPEX / NET_SERVICES, CAPEX]]} />
      </Plot>
    </Diagram>
  );
}

const PHASES = [
  { id: "p0", title: "0. Clear the ground", sub: "Nov to Dec 2026" },
  { id: "p1", title: "1. Own use on Tier 1", sub: "months 0 to 6" },
  { id: "p2", title: "2. Paid services on Tier 2", sub: "months 6 to 18" },
  { id: "p3", title: "3. A company, if needed", sub: "after month 18" },
];
const GATES = ["written answers", "steady own use", "CHF 400 a month"];

/** Each edge names the proof that opens the next phase. */
export function MonsterRoadmapDiagram(props: FigureProps) {
  return (
    <Diagram caption="Each step starts only after the one before it proves itself." {...props}>
      <Col gap={52} uniform>
        {PHASES.map((p) => (
          <Node key={p.id} id={p.id} title={p.title} sub={p.sub} />
        ))}
      </Col>
      {GATES.map((g, i) => (
        <Edge key={g} from={PHASES[i].id} to={PHASES[i + 1].id} label={g} />
      ))}
    </Diagram>
  );
}
