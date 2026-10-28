import type { ReactNode } from "react";
import { Col, Diagram, Dot, Edge, FONT, Free, Group, measure, Node, NODE, Path, Row, Text, type EdgeState } from "@/components/figure";
import { Link, NET_TONE, Switch } from "@/components/NetworkFigures";
import { SequenceChart, TimeSpace } from "@/components/PacketFigures";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

/** A's frames in the link hue, B's in the rival hue, jam signals in the drop hue. */
const A = NET_TONE.link, B = NET_TONE.rival, JAM = NET_TONE.drop;

/** CSMA/CD with T = 1: B starts at 0.9, both detect the collision and jam, B's shorter back-off wins the retry. */
export function CsmaCdSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "CSMA/CD, time running down. B starts just before A's first bit arrives. Both detect the collision, jam (red) and back off, A for $\\Delta t_1$ and B for $\\Delta t_2$. B retries first; A then senses B's frame and defers."
      }
      className={className}
    >
      <TimeSpace
        lanes={["A", "B"]}
        prop={1}
        pitch={220}
        sends={[
          { from: 0, to: 1, at: 0, tx: 1.9, label: "A's frame", tone: A },
          { from: 0, to: 1, at: 1.9, tx: 0.3, label: "jam", tone: JAM },
          { from: 1, to: 0, at: 0.9, tx: 0.1, tone: B },
          { from: 1, to: 0, at: 1, tx: 0.3, tone: JAM },
          { from: 1, to: 0, at: 3.5, tx: 2, label: "B's frame", tone: B },
        ]}
        spans={[
          { from: 0, to: 1, label: "$T$" },
          { from: 2.2, to: 5.2, label: "$\\Delta t_1$" },
          { from: 1.3, to: 3.5, label: "$\\Delta t_2$", side: "right" },
        ]}
      />
    </Diagram>
  );
}

/** Same collision, two frame lengths: only the longer frame is still on the wire at A when B's first bit returns. */
export function MinFrameSizeSchema({ title, caption, className }: FigureProps) {
  const panel = (id: string, name: string, tx: number) => (
    <Col gap={10} align="start">
      <Text text={name} weight={500} />
      <TimeSpace
        id={id}
        lanes={["A", "C", "B"]}
        prop={1}
        end={2.8}
        pitch={92}
        sends={[
          { from: 0, to: 2, at: 0, tx, tone: A },
          { from: 2, to: 0, at: 0.95, tx: 0.4, tone: B },
        ]}
        spans={[{ from: 0, to: tx, label: "$L/b$" }]}
      />
    </Col>
  );
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "A's frame (blue) meets B's (teal); $L/b$ is A's transmission time. Left: A stops before B's first bit arrives and never detects the collision. Right: A is still sending and detects it."
      }
      className={className}
    >
      <Row wrap gap={48} align="start">
        {panel("short", "Frame too short", 1.2)}
        {panel("long", "Frame long enough", 2.4)}
      </Row>
    </Diagram>
  );
}

/** RTS/CTS: the CTS silences the hidden station C, which never hears A. */
export function RtsCtsSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "RTS/CTS on a WiFi network. A and C both hear the base station B, but not each other. The CTS reaches both, so the hidden station C stays silent while A sends."}
      className={className}
    >
      <SequenceChart
        id="rts"
        lanes={["A", "B", "C"]}
        messages={[
          { from: 0, to: 1, label: "RTS", note: "A asks to send" },
          { from: 1, to: 0, label: "CTS", note: "A may send" },
          { from: 1, to: 2, label: "CTS", dashed: true, note: "C hears the same CTS and stays silent" },
          { from: 0, to: 1, label: "data", note: "the MAC header carries its duration" },
          { from: 1, to: 0, label: "ACK", note: "A knows the frame arrived" },
        ]}
      />
    </Diagram>
  );
}

// --- switch topologies -------------------------------------------------------------------------------------------

const SW_W = 52;
const HOST_D = 34;
type Spot = [id: string, cx: number, cy: number];

/** Node id of `name`, prefixed with its panel when one figure draws the same topology twice. */
const inPanel = (name: string, panel?: string) => (panel ? `${panel}.${name}` : name);

/** Switches as named boxes and hosts as circles, each centred on its spot; a switch marked `root` gets a strong outline and the word above it. */
function Topology({ switches, hosts = [], panel }: { switches: (Spot | [...Spot, "root"])[]; hosts?: Spot[]; panel?: string }) {
  const h = NODE.h;
  const items: ReactNode[] = [
    ...switches.flatMap(([name, cx, cy, root]) => [
      <Node key={name} id={inPanel(name, panel)} title={name} x={cx - SW_W / 2} y={cy - h / 2} w={SW_W} h={h} state={root ? "strong" : undefined} />,
      root && <Text key={`${name}.root`} text="root" size="note" muted x={cx - measure("root", FONT.note) / 2} y={cy - h / 2 - 20} />,
    ]),
    ...hosts.map(([name, cx, cy]) => <Node key={name} id={inPanel(name, panel)} title={name} shape="circle" x={cx - HOST_D / 2} y={cy - HOST_D / 2} w={HOST_D} h={HOST_D} />),
  ];
  return <Free>{items}</Free>;
}

/**
 * A link between two nodes of a topology: `[from, to, label?, state?]`; a ghost link is also dashed, so it never relies on colour alone.
 * A `failed` link is dashed in the drop hue.
 */
type Wire = [from: string, to: string, label?: string, state?: EdgeState | "failed"];
const wires = (list: Wire[], panel?: string) =>
  list.map(([from, to, label, state]) => (
    <Link
      key={`${from}-${to}`}
      from={inPanel(from, panel)}
      to={inPanel(to, panel)}
      label={label}
      state={state === "failed" ? undefined : state}
      tone={state === "failed" ? NET_TONE.drop : undefined}
      dashed={state === "ghost" || state === "failed"}
      route="straight"
    />
  ));

/** Four switches, six hosts, nine full-duplex links. */
export function SwitchedLanSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "A switched Ethernet LAN: four switches (boxes) and six hosts (circles), joined by nine full-duplex links."} className={className}>
      <Topology
        switches={[
          ["Sw1", 150, 100],
          ["Sw0", 290, 100],
          ["Sw3", 430, 100],
          ["Sw2", 290, 200],
        ]}
        hosts={[
          ["A", 30, 100],
          ["B", 150, 200],
          ["C", 410, 200],
          ["D", 290, 290],
          ["E", 430, 20],
          ["F", 550, 100],
        ]}
      />
      {wires([
        ["A", "Sw1"],
        ["B", "Sw1"],
        ["Sw1", "Sw0"],
        ["Sw0", "Sw3"],
        ["Sw3", "E"],
        ["Sw3", "F"],
        ["Sw0", "Sw2"],
        ["Sw2", "C"],
        ["Sw2", "D"],
      ])}
    </Diagram>
  );
}

/** Three switches in a loop, A's flood drawn in A's hue: each arrow is labelled with the step of the prose that sends it. */
export function SwitchLoopSchema({ title, caption, className }: FigureProps) {
  const flood = (from: string, to: string, label?: string, head: "end" | "both" = "end") => (
    <Edge key={`${from}-${to}`} from={from} to={to} label={label} head={head} tone={A} route="straight" />
  );
  return (
    <Diagram
      title={title}
      caption={caption ?? "A frame from A on a loop of three switches. S1 floods it to S2 and S3 (1), and S2 and S3 flood their copies to each other (2). S3 thus receives the same frame from S1 and from S2."}
      className={className}
    >
      <Topology
        switches={[
          ["S3", 290, 30],
          ["S1", 150, 170],
          ["S2", 430, 170],
        ]}
        hosts={[["A", 30, 170]]}
      />
      {flood("A", "S1")}
      {flood("S1", "S3", "1")}
      {flood("S1", "S2", "1")}
      {flood("S2", "S3", "2", "both")}
    </Diagram>
  );
}

/** The loop of `SwitchLoopSchema` after STP, root on top so the tree hangs from it: the dashed S2–S3 base is blocked. */
export function LoopTreeSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "The same loop after STP, with equal link costs. S1 has the smallest ID and is the root. S2 and S3 keep their direct links to S1 (blue), and STP blocks link S2–S3 (dashed). A frame from A now reaches each switch once."
      }
      className={className}
    >
      <Topology
        switches={[
          ["S1", 290, 40, "root"],
          ["S2", 150, 180],
          ["S3", 430, 180],
        ]}
        hosts={[["A", 150, 40]]}
      />
      {wires([
        ["A", "S1"],
        ["S1", "S3", undefined, "active"],
        ["S1", "S2", undefined, "active"],
        ["S2", "S3", "blocked", "ghost"],
      ])}
    </Diagram>
  );
}

/** Six switches with link costs; S1 is the root, and the two dashed links stay off the tree. */
export function SpanningTreeSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "Six switches, each link labelled with its cost. S1 has the smallest ID and is the root. The solid blue links form the spanning tree; STP deactivates the two dashed links. Host A sits on S5 and host B on S4."
      }
      className={className}
    >
      <Topology
        switches={[
          ["S1", 230, 50, "root"],
          ["S2", 430, 50],
          ["S5", 70, 130],
          ["S3", 430, 170],
          ["S4", 230, 230],
          ["S6", 430, 290],
        ]}
        hosts={[
          ["A", 70, 230],
          ["B", 230, 320],
        ]}
      />
      {wires([
        ["S1", "S2", "100", "active"],
        ["S1", "S5", "100", "active"],
        ["S1", "S3", "1", "active"],
        ["S3", "S4", "100", "active"],
        ["S3", "S6", "100", "active"],
        ["S2", "S3", "100", "ghost"],
        ["S5", "S4", "100", "ghost"],
        ["S5", "A"],
        ["S4", "B"],
      ])}
    </Diagram>
  );
}

/** Example 6's square, stood on its corner so link S1–S3 runs straight down, before and after that link fails: S3 moves onto S2, and S3–S4 stays off the tree. */
export function LinkFailureSchema({ title, caption, className }: FigureProps) {
  const square = (panel: string, name: string, links: Wire[]) => (
    <Col gap={12} align="center">
      <Text text={name} weight={500} />
      <Topology
        panel={panel}
        switches={[
          ["S1", 146, 37, "root"],
          ["S4", 26, 112],
          ["S2", 266, 112],
          ["S3", 146, 187],
        ]}
      />
      {wires(links, panel)}
    </Col>
  );
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "Example 6, each link labelled with its cost. Blue links form the spanning tree and dashed grey links are inactive. When link S1–S3 fails (red), S3 reaches the root S1 through S2 at cost 2, so link S2–S3 joins the tree."
      }
      className={className}
    >
      <Row wrap gap={56} align="start">
        {square("before", "Before", [
          ["S1", "S2", "1", "active"],
          ["S1", "S3", "1", "active"],
          ["S1", "S4", "1", "active"],
          ["S2", "S3", "1", "ghost"],
          ["S4", "S3", "2", "ghost"],
        ])}
        {square("after", "After S1–S3 fails", [
          ["S1", "S2", "1", "active"],
          ["S1", "S3", "failed", "failed"],
          ["S1", "S4", "1", "active"],
          ["S2", "S3", "1", "active"],
          ["S4", "S3", "2", "ghost"],
        ])}
      </Row>
    </Diagram>
  );
}

// --- shared media ------------------------------------------------------------------------------------------------

type Pt = [number, number];

/** Host `name` as a circle at `c`, wired to the medium at `tap`: a grey stub, or a blue spoke when the wire is itself the medium. */
function tapped(panel: string, name: string, c: Pt, tap: Pt, spoke = false) {
  const dx = c[0] - tap[0], dy = c[1] - tap[1], k = 1 - HOST_D / 2 / Math.hypot(dx, dy);
  const wire: Pt[] = [tap, [tap[0] + k * dx, tap[1] + k * dy]];
  return [
    <Path key={`${panel}.${name}.wire`} points={wire} thick={spoke} tone={spoke ? NET_TONE.link : undefined} />,
    <Node key={name} id={`${panel}.${name}`} title={name} shape="circle" x={c[0] - HOST_D / 2} y={c[1] - HOST_D / 2} w={HOST_D} h={HOST_D} />,
  ];
}

const panel = (name: string, drawing: ReactNode[]) => (
  <Col gap={12} align="center">
    <Text text={name} weight={500} />
    <Free>{drawing}</Free>
  </Col>
);

/** Four hosts on one medium, wired three ways; all three drawings share the centre line y = 94. */
export function SharedMediumSchema({ title, caption, className }: FigureProps) {
  const ring: Pt[] = Array.from({ length: 96 }, (_, i) => [94 + 46 * Math.sin((i * Math.PI) / 48), 94 - 46 * Math.cos((i * Math.PI) / 48)]);
  return (
    <Diagram
      title={title}
      caption={caption ?? "Four hosts share one medium (blue): a bus, a ring, or a star around a hub."}
      className={className}
    >
      <Row wrap gap={48} align="start">
        {panel("Bus", [
          <Path key="bus" points={[[4, 94], [208, 94]]} thick tone={NET_TONE.link} />,
          ...tapped("bus", "A", [40, 51], [40, 94]),
          ...tapped("bus", "B", [84, 137], [84, 94]),
          ...tapped("bus", "C", [128, 51], [128, 94]),
          ...tapped("bus", "D", [172, 137], [172, 94]),
        ])}
        {panel("Ring", [
          <Path key="ring" points={ring} closed thick tone={NET_TONE.link} />,
          ...tapped("ring", "A", [94, 17], [94, 48]),
          ...tapped("ring", "B", [171, 94], [140, 94]),
          ...tapped("ring", "C", [94, 171], [94, 140]),
          ...tapped("ring", "D", [17, 94], [48, 94]),
        ])}
        {panel("Star", [
          ...tapped("star", "A", [17, 39], [72, 94], true),
          ...tapped("star", "B", [127, 39], [72, 94], true),
          ...tapped("star", "C", [127, 149], [72, 94], true),
          ...tapped("star", "D", [17, 149], [72, 94], true),
          <Dot key="hub" at={[72, 94]} r={5} tone={NET_TONE.link} />,
        ])}
      </Row>
    </Diagram>
  );
}

/** One frame, three networks: the hosts cannot tell a coaxial cable, a hub and a switch apart. All drawings share the centre line y = 60. */
export function TransparentSwitchSchema({ title, caption, className }: FigureProps) {
  const field = measure("destination", FONT.note) + 2 * NODE.padX;
  return (
    <Diagram
      title={title}
      caption={caption ?? "A sends B the same Ethernet frame on a coaxial cable, a hub and a switch. Blue is one shared medium; the switch gives each host its own link."}
      className={className}
    >
      <Col gap={32} align="center">
        <Row wrap gap={48} align="start">
          {panel("Coaxial cable", [
            <Path key="bus" points={[[4, 60], [180, 60]]} thick tone={NET_TONE.link} />,
            ...tapped("coax", "A", [36, 17], [36, 60]),
            ...tapped("coax", "B", [148, 17], [148, 60]),
            ...tapped("coax", "C", [92, 103], [92, 60]),
          ])}
          {panel("Hub", [
            ...tapped("hub", "A", [20, 17], [72, 60], true),
            ...tapped("hub", "B", [124, 17], [72, 60], true),
            ...tapped("hub", "C", [72, 111], [72, 60], true),
            <Dot key="hub" at={[72, 60]} r={5} tone={NET_TONE.link} />,
          ])}
          {panel("Switch", [
            ...tapped("sw", "A", [20, 17], [50, 49]),
            ...tapped("sw", "B", [124, 17], [94, 49]),
            ...tapped("sw", "C", [72, 111], [72, 71]),
            <Free key="switch" x={36} y={49}>
              <Switch id="sw.switch" />
            </Free>,
          ])}
        </Row>
        <Group title="Ethernet frame" tone={NET_TONE.link} dir="row" gap={4} pad={8}>
          <Node title="B" sub="destination" tone={NET_TONE.link} w={field} />
          <Node title="A" sub="source" tone={NET_TONE.link} w={field} />
          <Node title="data" w={field} />
        </Group>
      </Col>
    </Diagram>
  );
}
