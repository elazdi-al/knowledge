import type { ReactNode } from "react";
import { Col, Diagram, Edge, FONT, Free, Group, measure, Node, NODE, Row, Space, Text, type Tone } from "@/components/figure";
import { DEVICE_NAME, Link, NET_TONE, Router, ROUTER_BADGE, ROUTER_SIZE, Switch } from "@/components/NetworkFigures";
import { AddressBits, FrameHeaders, ProtocolStack, TimeSpace } from "@/components/PacketFigures";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

// --- names -------------------------------------------------------------------------------------------------------

/** The labels of `ssc.epfl.ch`, left to right, each with its role. */
const NAME = [
  { label: "ssc", role: "host" },
  { label: "epfl", role: "second-level domain" },
  { label: "ch", role: "top-level domain" },
];

export function DomainNameSchema({ title, caption, className }: FigureProps) {
  const name = NAME.map((p) => p.label).join(".");
  const px = FONT.title - 0.5;
  const adv = measure("m", px, { mono: true });
  const UNDER = Math.round(FONT.title * 1.4) + 4;
  const ROW = 20;
  const labelX = name.length * adv + 20;
  const at = (id: string, x: number, y: number) => <Space key={id} id={id} x={x} y={y} />;
  let start = 0;
  return (
    <Diagram
      title={title}
      caption={caption ?? "The three labels of ssc.epfl.ch, read from the right."}
      className={className}
    >
      <Free>
        <Text text={name} size="title" weight={500} mono x={0} y={0} />
        {NAME.map((p, k) => {
          const x0 = start * adv;
          const x1 = x0 + p.label.length * adv;
          start += p.label.length + 1;
          // the rightmost label gets the top row, so the leaders step down to the left and never cross
          const y = UNDER + 16 + (NAME.length - 1 - k) * ROW;
          const state = k === NAME.length - 1 ? "active" : undefined;
          const id = `dn.${k}`;
          return [
            at(`${id}.a`, x0 + 1, UNDER),
            at(`${id}.b`, x1 - 1, UNDER),
            at(`${id}.m`, (x0 + x1) / 2, UNDER),
            at(`${id}.t`, labelX - 6, y),
            <Edge key={`${id}.u`} from={`${id}.a`} to={`${id}.b`} route="straight" head="none" thick state={state} />,
            <Edge key={`${id}.l`} from={`${id}.m`} to={`${id}.t`} route="ortho" fromSide="bottom" toSide="left" head="none" state={state} />,
            <Text key={`${id}.r`} text={p.role} size="note" muted={!state} state={state} x={labelX} y={y - 8} />,
          ];
        })}
      </Free>
    </Diagram>
  );
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

/** Gap between a LAN panel and the router beside it, so the link visibly leaves the LAN. */
const JOIN = 10;

/** A LAN as a dashed outline titled with its prefix; `children` are placed freely around the link line at y = LINE, in `h` of height. */
const Lan = ({ title, h = 2 * LINE, children }: { title: string; h?: number; children: ReactNode }) => (
  <Group title={title} pad={LAN_PAD} dashed>
    <Free>
      <Space x={0} y={0} h={h} />
      {children}
    </Free>
  </Group>
);

/** A router lowered so the point `mid` below its top (by default the centre of a numbered router's box) sits on the panels' link line. */
const OnLine = ({ mid = ROUTER_BADGE + ROUTER_SIZE / 2, children }: { mid?: number; children: ReactNode }) => (
  <Col gap={0}>
    <Space h={LINE_Y - mid} />
    {children}
  </Col>
);

export function SubnetChainSchema({ title, caption, className }: FigureProps) {
  const r = NET_TONE.router;
  const a = 48, b = 80, gap = 16;
  const w12 = addrW("10.10.1.2"), w21 = addrW("10.10.2.1");
  return (
    <Diagram
      title={title}
      caption={caption ?? "Three Ethernet LANs in a row. Every address on a LAN starts with the LAN's prefix, and each router has one interface, with its own address, on each LAN it joins."}
      className={className}
    >
      <Row gap={JOIN} align="start">
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

/** An observation point on a link: a small numbered circle the link passes through. */
const Point = ({ id, n, x }: { id: string; n: number; x: number }) => <Node id={id} title={String(n)} shape="circle" w={22} x={x} y={LINE - 11} />;

/** Height of a switch: its 10px port strip plus 6px padding each side. */
const SWITCH_H = 22;

export function GatewayPathSchema({ title, caption, className }: FigureProps) {
  const server = 96, sw = server + 32, p1 = sw + 72 + 32;
  // room for the switch's name under the line, in both LANs so they stay level
  const h = LINE + SWITCH_H / 2 + DEVICE_NAME;
  return (
    <Diagram
      title={title}
      caption={caption ?? "The web server on LAN B sends to Eliane's phone on LAN A through the gateway router. Point 1 lies on LAN B, between the switch and the gateway. Point 2 lies on LAN A, between the gateway and the phone."}
      className={className}
    >
      <Row gap={JOIN} align="start">
        <Lan title="LAN B (Ethernet)" h={h}>
          <Node id="srv" title="Web server" x={0} y={LINE - NODE.h / 2} w={server} />
          <Free x={sw} y={LINE - SWITCH_H / 2}>
            <Switch id="sw" label="Switch" />
          </Free>
          <Point id="p1" n={1} x={p1} />
          <Space x={p1 + 22 + 20} y={0} />
        </Lan>
        <OnLine mid={ROUTER_SIZE / 2}>
          <Router id="gw" label="Gateway" />
        </OnLine>
        <Lan title="LAN A (WiFi)" h={h}>
          <Point id="p2" n={2} x={20} />
          <Node id="eli" title="Eliane" x={20 + 22 + 32} y={LINE - NODE.h / 2} />
        </Lan>
      </Row>
      <Link from="srv" to="sw" route="straight" />
      <Link from="sw" to="p1" route="straight" />
      <Link from="p1" to="gw" route="straight" />
      <Link from="gw" to="p2" route="straight" />
      <Link from="p2" to="eli" route="straight" />
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
      caption={caption ?? "The same transfer, layer by layer. The switch handles frames only. The gateway goes up to IP and back down, replacing the Ethernet header with a WiFi one. Only the two hosts run TCP and the application."}
      className={className}
    >
      <ProtocolStack
        path
        stacks={[
          { title: "Web server", link: ["Ethernet"] },
          { title: "Switch", top: "link", link: ["Ethernet"] },
          { title: "Gateway", top: "network", link: ["Ethernet", "WiFi"] },
          { title: "Eliane", link: ["WiFi"] },
        ]}
      />
    </Diagram>
  );
}

export function FrameAddressesSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "The frame's headers at point 1 (top) and point 2 (bottom). The gateway writes a new MAC header. The IP header crosses unchanged."}
      className={className}
    >
      <FrameHeaders
        frames={[
          { n: 1, mac: ["Web server", "Gateway"], ip: ["Web server", "Eliane"] },
          { n: 2, mac: ["Gateway", "Eliane"], ip: ["Web server", "Eliane"] },
        ]}
      />
    </Diagram>
  );
}

// --- addresses ---------------------------------------------------------------------------------------------------

export function AddressPrefixSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "128.178.71.34/24 (top) and its mask 255.255.255.0 in binary (bottom). The mask's 1s cover the first 24 bits, the prefix every device of the LAN shares."}
      className={className}
    >
      <AddressBits cidr="128.178.71.34/24" mask />
    </Diagram>
  );
}

// --- delays ------------------------------------------------------------------------------------------------------

export function StoreForwardSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Time runs down. S starts sending only once the last bit from A has arrived, so the two transmission delays add up."}
      className={className}
    >
      <TimeSpace
        lanes={["A", "S", "B"]}
        prop={0}
        sends={[
          { from: 0, to: 1, at: 0, tx: 2, label: "packet" },
          { from: 1, to: 2, at: 2, tx: 1, label: "packet" },
        ]}
        spans={[
          { from: 0, to: 2, label: "L/b₁" },
          { from: 2, to: 3, label: "L/b₂" },
        ]}
      />
    </Diagram>
  );
}

/** Four packets of 1 ms transmission each, two hops of 0.5 ms propagation: 9 ms whole, 6 ms pipelined. */
const PACKETS = [0, 1, 2, 3];
/** Axis spacing that fits the two panels side by side. */
const PITCH = 92;

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
        "A 4-packet message from A to B through router R, both panels on one time scale, time running down. Each band is one transmission (1 ms per packet), and its slope is the propagation (0.5 ms per link). Relaying the whole message takes 9 ms. Packet switching pipelines the two links and takes 6 ms."
      }
      className={className}
    >
      <Row wrap gap={40} align="start">
        {panel(
          "Entire message relay",
          <TimeSpace
            id="msg"
            lanes={lanes}
            prop={0.5}
            end={9}
            pitch={PITCH}
            sends={[
              { from: 0, to: 1, at: 0, tx: 4, label: "message" },
              { from: 1, to: 2, at: 4.5, tx: 4, label: "message" },
            ]}
            spans={[{ from: 0, to: 9, label: "9 ms", side: "right" }]}
          />,
        )}
        {panel(
          "Packet switching",
          <TimeSpace
            id="pkt"
            lanes={lanes}
            prop={0.5}
            end={9}
            pitch={PITCH}
            sends={PACKETS.flatMap((i) => [
              { from: 0, to: 1, at: i, tx: 1, label: String(i + 1) },
              { from: 1, to: 2, at: i + 1.5, tx: 1, label: String(i + 1) },
            ])}
            spans={[{ from: 0, to: 6, label: "6 ms", side: "right" }]}
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
          { from: 1, to: 0, at: 2, tx: 0.5, label: "ack", tone: NET_TONE.transport },
        ]}
        spans={[
          { from: 0, to: 1, label: "T = L/b" },
          { from: 1, to: 3, label: "2D" },
          { from: 3, to: 3.5, label: "T' = L'/b" },
          { from: 0, to: 3.5, label: "one cycle", side: "right" },
        ]}
      />
    </Diagram>
  );
}
