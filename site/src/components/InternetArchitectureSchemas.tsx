import type { ReactNode } from "react";
import { Col, Diagram, Edge, FONT, Free, Group, measure, Node, NODE, Row, Space, Text, type Tone } from "@/components/figure";
import { labelPillW } from "@/components/figure/route";
import { Host, Link, NET_TONE, Router, Switch } from "@/components/NetworkFigures";
import { AddressBits, ProtocolStack, TimeSpace } from "@/components/PacketFigures";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

// --- LANs joined by routers --------------------------------------------------------------------------------------

/** Padding of a LAN panel; a host is 46px tall, so the link line runs 23px below the panel's content top. */
const LAN_PAD = 12;
const LINE = 23;
const LINE_Y = LAN_PAD + 24 + LINE;
const ADDR_PX = FONT.note - 0.5;
const addrW = (s: string) => measure(s, ADDR_PX, { mono: true });

/** An interface address written just under the link line, in the hue of the router that owns it. */
const Addr = ({ text, x, tone }: { text: string; x: number; tone?: Tone }) => <Text text={text} size="note" mono tone={tone} x={x} y={LINE + 5} />;

/** A LAN as a soft panel titled with its prefix; `children` are placed freely around the link line at y = LINE. */
const Lan = ({ title, children }: { title: string; children: ReactNode }) => (
  <Group title={title} pad={LAN_PAD}>
    <Free>
      <Space x={0} y={0} h={2 * LINE} />
      {children}
    </Free>
  </Group>
);

/** A router lowered so its centre sits on the panels' link line. */
const OnLine = ({ children }: { children: ReactNode }) => (
  <Col gap={0}>
    <Space h={LINE_Y - 21} />
    {children}
  </Col>
);

export function SubnetChainSchema({ title, caption, className }: FigureProps) {
  const r = NET_TONE.router;
  const a = 48, b = 80, gap = 22;
  const w12 = addrW("10.10.1.2"), w21 = addrW("10.10.2.1");
  return (
    <Diagram
      title={title}
      caption={caption ?? "Three Ethernet LANs in a row. Every address on a LAN starts with the LAN's prefix, and each router has one address on each LAN it joins."}
      className={className}
    >
      <Row gap={0} align="start">
        <Lan title="10.10.3.0/24">
          <Node id="a" title="A" sub="?" x={0} y={0} w={a} />
          <Addr text="10.10.3.1" x={a + gap} tone={r[1]} />
        </Lan>
        <OnLine>
          <Router id="r" n={1} lit={[3, 4, 5]} />
        </OnLine>
        <Lan title="10.10.1.0/24">
          <Addr text="10.10.1.2" x={0} tone={r[1]} />
          <Addr text="10.10.1.1" x={w12 + 2 * gap} tone={r[2]} />
        </Lan>
        <OnLine>
          <Router id="s" n={2} lit={[3, 4, 5]} />
        </OnLine>
        <Lan title="10.10.2.0/24">
          <Addr text="10.10.2.1" x={0} tone={r[2]} />
          <Node id="b" title="B" sub="10.10.2.33" x={w21 + gap} y={0} w={b} />
        </Lan>
      </Row>
      <Link from="a" to="r" route="straight" />
      <Link from="r" to="s" route="straight" />
      <Link from="s" to="b" route="straight" />
    </Diagram>
  );
}

export function GatewayPathSchema({ title, caption, className }: FigureProps) {
  const server = 96;
  return (
    <Diagram
      title={title}
      caption={caption ?? "The web server on LAN B sends to Eliane's phone on LAN A. Point 1 lies on LAN B, between the switch and the gateway router; point 2 on LAN A, between the gateway and the phone."}
      className={className}
    >
      <Row gap={0} align="start">
        <Lan title="LAN B (Ethernet)">
          <Node id="srv" title="Web server" x={0} y={LINE - NODE.h / 2} w={server} />
          <Free x={server + 32} y={LINE - 11}>
            <Switch id="sw" />
          </Free>
        </Lan>
        <OnLine>
          <Router id="gw" />
        </OnLine>
        <Lan title="LAN A (WiFi)">
          <Node id="eli" title="Eliane" x={0} y={LINE - NODE.h / 2} />
        </Lan>
      </Row>
      <Link from="srv" to="sw" route="straight" />
      <Link from="sw" to="gw" route="straight" label="1" />
      <Link from="gw" to="eli" route="straight" label="2" />
    </Diagram>
  );
}

// --- encapsulation -----------------------------------------------------------------------------------------------

export function EncapsulationSchema({ title, caption, className }: FigureProps) {
  const layer = (unit: string, header: string, holds: string, tone: Tone, inner: ReactNode) => (
    <Group title={unit} tone={tone} dir="row" gap={4} pad={8} align="stretch">
      <Node title={header} sub={holds} tone={tone} />
      {inner}
    </Group>
  );
  return (
    <Diagram
      title={title}
      caption={caption ?? "Encapsulation: the TCP segment is the payload of the IP packet, which is the payload of the MAC frame. Each header carries the addresses its layer works with."}
      className={className}
    >
      {layer(
        "MAC frame",
        "MAC header",
        "src, dst MAC",
        NET_TONE.link,
        layer("IP packet", "IP header", "src, dst IP", NET_TONE.network, layer("TCP segment", "TCP header", "src, dst port", NET_TONE.transport, <Node title="application data" />)),
      )}
    </Diagram>
  );
}

export function PathStacksSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "The same transfer, layer by layer. The switch handles frames only; the gateway router goes up to IP and back down, replacing the Ethernet header with a WiFi one; only the two hosts run TCP and the application."}
      className={className}
    >
      <ProtocolStack path stacks={[{ title: "Web server" }, { title: "Switch", top: "link" }, { title: "Router", top: "network" }, { title: "Eliane" }]} />
    </Diagram>
  );
}

// --- addresses ---------------------------------------------------------------------------------------------------

export function AddressPrefixSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "128.178.71.34/24 (top) and its mask 255.255.255.0 (bottom): the mask's 1s cover the first 24 bits, the prefix every device of the LAN shares."}
      className={className}
    >
      <AddressBits cidr="128.178.71.34/24" mask />
    </Diagram>
  );
}

// --- delays ------------------------------------------------------------------------------------------------------

interface Band {
  from: number;
  to: number;
  at: number;
  tx: number;
  label?: string;
}

/** A time-space panel on a fixed time scale, so two panels drawn with the same `end` compare by height; `total` adds the end-to-end span on the right. */
function Bands({ id, lanes, prop, end, bands, total }: { id: string; lanes: string[]; prop: number; end: number; bands: Band[]; total: string }) {
  const PITCH = 92, HEIGHT = 240;
  const headW = Math.max(...lanes.map((n) => measure(n, FONT.title, { weight: 500 }))) + 2 * NODE.padX;
  const x = (l: number) => headW / 2 + l * PITCH;
  const y = (t: number) => NODE.h + 18 + (t * HEIGHT) / end;
  const last = lanes.length - 1;
  const finish = Math.max(...bands.map((s) => s.at + s.tx + prop));
  const bottom = y(end) + 22;
  const dimX = x(last) + 8 + labelPillW(total) / 2;
  const at = (k: string, px: number, py: number) => <Space key={k} id={`${id}.${k}`} x={px} y={py} />;
  const items: ReactNode[] = [];
  const edges: ReactNode[] = [];
  lanes.forEach((name, l) => {
    items.push(<Node key={`h${l}`} id={`${id}.l${l}`} title={name} x={x(l) - headW / 2} y={0} w={headW} />, at(`end${l}`, x(l), bottom));
    edges.push(<Edge key={`axis${l}`} from={`${id}.l${l}`} to={`${id}.end${l}`} route="straight" />);
  });
  bands.forEach((s, i) => {
    const pts: [string, number, number][] = [["a", s.from, s.at], ["b", s.from, s.at + s.tx], ["c", s.to, s.at + prop], ["d", s.to, s.at + s.tx + prop]];
    pts.forEach(([c, l, t]) => items.push(at(`s${i}${c}`, x(l), y(t))));
    const seg = (p: string, q: string, thick?: boolean) => (
      <Edge key={`s${i}${p}${q}`} from={`${id}.s${i}${p}`} to={`${id}.s${i}${q}`} route="straight" head="none" tone={NET_TONE.link} thick={thick} />
    );
    edges.push(seg("a", "c"), seg("b", "d"), seg("a", "b", true), seg("c", "d", true));
    if (s.label) {
      const w = measure(s.label, FONT.note);
      items.push(<Text key={`t${i}`} text={s.label} size="note" tone={NET_TONE.link} x={(x(s.from) + x(s.to)) / 2 - w / 2} y={y(s.at + (s.tx + prop) / 2) - 8} />);
    }
  });
  const ghosts: ReactNode[] = [];
  [
    [0, 0],
    [finish, last],
  ].forEach(([t, lane], e) => {
    items.push(at(`d${e}`, dimX, y(t)), at(`g${e}`, x(lane), y(t)));
    ghosts.push(<Edge key={`g${e}`} from={`${id}.d${e}`} to={`${id}.g${e}`} route="straight" head="none" dashed state="ghost" />);
  });
  edges.push(<Edge key="total" from={`${id}.d0`} to={`${id}.d1`} route="straight" head="both" label={total} />);
  return (
    <>
      <Free>
        {items}
        <Space x={dimX + labelPillW(total) / 2} y={0} />
      </Free>
      {ghosts}
      {edges}
    </>
  );
}

/** Four packets of 1 ms transmission each, two hops of 0.5 ms propagation: 9 ms whole, 6 ms pipelined. */
const PACKETS = [0, 1, 2, 3];

export function PacketSwitchingSchema({ title, caption, className }: FigureProps) {
  const lanes = ["A", "R", "B"];
  const panel = (name: string, body: ReactNode) => (
    <Col gap={10} align="start">
      <Text text={name} weight={500} />
      {body}
    </Col>
  );
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "A 4-packet message from A to B through router R, time running down, drawn to the same scale. Each band is a transmission (1 ms per packet) and its slope the propagation (0.5 ms per link). Relaying the whole message takes 9 ms; packet switching pipelines the two links and takes 6 ms."
      }
      className={className}
    >
      <Row wrap gap={40} align="start">
        {panel(
          "Entire message relay",
          <Bands
            id="msg"
            lanes={lanes}
            prop={0.5}
            end={9}
            total="9 ms"
            bands={[
              { from: 0, to: 1, at: 0, tx: 4, label: "message" },
              { from: 1, to: 2, at: 4.5, tx: 4, label: "message" },
            ]}
          />,
        )}
        {panel(
          "Packet switching",
          <Bands
            id="pkt"
            lanes={lanes}
            prop={0.5}
            end={9}
            total="6 ms"
            bands={PACKETS.flatMap((i) => [
              { from: 0, to: 1, at: i, tx: 1, label: String(i + 1) },
              { from: 1, to: 2, at: i + 1.5, tx: 1, label: String(i + 1) },
            ])}
          />,
        )}
      </Row>
    </Diagram>
  );
}

// --- throughput --------------------------------------------------------------------------------------------------

export function StopAndGoSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "One Stop & Go cycle, time running down: A transmits the packet for T, the last bit reaches B after D, B transmits the ack for T', and its last bit reaches A after another D. Only then may A send again."}
      className={className}
    >
      <TimeSpace
        lanes={["A", "B"]}
        prop={1}
        sends={[
          { from: 0, to: 1, at: 0, tx: 1, label: "packet" },
          { from: 1, to: 0, at: 2, tx: 0.35, label: "ack", tone: NET_TONE.transport },
        ]}
        spans={[
          { from: 0, to: 1, label: "T = L/b" },
          { from: 1, to: 3, label: "2D" },
          { from: 3, to: 3.35, label: "T' = L'/b" },
          { from: 0, to: 3.35, label: "one cycle", side: "right" },
        ]}
      />
    </Diagram>
  );
}

export const internetArchitectureSchemas = {
  SubnetChainSchema,
  GatewayPathSchema,
  EncapsulationSchema,
  PathStacksSchema,
  AddressPrefixSchema,
  PacketSwitchingSchema,
  StopAndGoSchema,
};
