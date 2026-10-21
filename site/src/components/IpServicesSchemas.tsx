import type { ReactNode } from "react";
import { Cells, Col, Diagram, Edge, FONT, Free, Group, measure, Node, NODE, Row, Space, Table, Tag, Text } from "@/components/figure";
import { labelPillW } from "@/components/figure/route";
import { GROUP, TAG } from "@/components/figure/theme";
import { DEVICE_NAME, Host, Link, NET_TONE, Router, ROUTER_SIZE, Subnet, Switch } from "@/components/NetworkFigures";
import { SequenceChart } from "@/components/PacketFigures";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

/** One lane spacing for the setup row and both charts, so each device sits on its lifelines: the widest label, GetExternalIPAddress, plus SequenceChart's clearance. */
const NAT_PITCH = labelPillW("GetExternalIPAddress") + 40;
/** A and S share one width, set by the wider of their second lines; the first lane runs through its centre. */
const NAT_HOST_W = Math.max(...["192.168.1.10", "STUN server"].map((s) => measure(s, FONT.note))) + 2 * NODE.padX;
const natLane = (l: number) => NAT_HOST_W / 2 + l * NAT_PITCH;

/** A, its NAT, and optionally the STUN server, each on its chart lane. */
function NatRow({ stun }: { stun?: boolean }) {
  const host = (id: string, l: number, name: string, sub: string) => <Node id={id} title={name} sub={sub} x={natLane(l) - NAT_HOST_W / 2} y={0} w={NAT_HOST_W} />;
  const natTop = (NODE.hSub - ROUTER_SIZE) / 2;
  const natAddr = "198.51.100.1";
  return (
    <Free>
      {host("a", 0, "A", "192.168.1.10")}
      <Router id="nat" label="NAT A" x={natLane(1) - ROUTER_SIZE / 2} y={natTop} />
      <Text text={natAddr} size="note" mono x={natLane(1) - measure(natAddr, FONT.note - 0.5, { mono: true }) / 2} y={natTop + ROUTER_SIZE + DEVICE_NAME} />
      {stun && host("s", 2, "S", "STUN server")}
    </Free>
  );
}

/** UPnP: A asks its own NAT to open a port and to name its public address. */
export function UpnpSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "A asks its own NAT to open a port and to name its public address."} className={className}>
      <Col gap={10} align="start">
        <NatRow />
        <Space h={14} />
        <SequenceChart
          id="upnp"
          lanes={["A", "NAT A"]}
          pitch={NAT_PITCH}
          inset={natLane(0)}
          headless
          messages={[
            { from: 0, to: 1, label: "AddPortMapping", note: "asks for public port 5000" },
            { from: 1, to: 0, label: "OK", note: "NAT A now forwards :5000 to A" },
            { from: 0, to: 1, label: "GetExternalIPAddress", note: "asks for the public address" },
            { from: 1, to: 0, label: "198.51.100.1", note: "A can advertise 198.51.100.1:5000" },
          ]}
        />
      </Col>
      <Link from="a" to="nat" label="LAN" route="straight" />
    </Diagram>
  );
}

/** STUN: a server outside reports the IP:port that the NAT rewrote the request to. */
export function StunSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "S reports the IP:port that NAT A rewrote the request to."} className={className}>
      <Col gap={10} align="start">
        <NatRow stun />
        <Space h={14} />
        <SequenceChart
          id="stun"
          lanes={["A", "NAT A", "S"]}
          pitch={NAT_PITCH}
          inset={natLane(0)}
          headless
          messages={[
            { from: 0, to: 1, label: "request", note: "from 192.168.1.10:5000" },
            { from: 1, to: 2, label: "request", note: "rewritten to 198.51.100.1:40001" },
            { from: 2, to: 0, label: "198.51.100.1:40001", relayed: true, note: "S reports the source it saw" },
          ]}
        />
      </Col>
      <Link from="a" to="nat" label="LAN" route="straight" />
      <Link from="nat" to="s" label="internet" route="straight" />
    </Diagram>
  );
}

/** Two peers behind port-restricted cone NATs: the first packets die at the far NAT but open the near one. */
export function HolePunchingSchema({ title, caption, className }: FigureProps) {
  const filter = (nat: string, peer: string) => (
    <Group title={`NAT ${nat} filter`} gap={0} pad={10}>
      <Table rows={[["203.0.113.9:3478 (S)"], { cells: [peer], state: "active" }]} />
    </Group>
  );
  return (
    <Diagram
      title={title}
      caption={caption ?? "Hole punching: each first packet is dropped by the far NAT, yet it opens its own NAT's filter for the peer, so the retransmissions get through."}
      className={className}
    >
      <Col gap={20}>
        <SequenceChart
          id="hp"
          lanes={["A", "NAT A", "NAT B", "B"]}
          messages={[
            { from: 0, to: 3, label: "swap addresses", dashed: true, note: "via the signalling server" },
            { from: 0, to: 2, label: "to :50001", drop: true, note: "NAT A now admits B" },
            { from: 3, to: 1, label: "to :40001", drop: true, note: "NAT B now admits A" },
            { from: 0, to: 3, label: "retransmission", note: "NAT B lets it in" },
            { from: 3, to: 0, label: "retransmission", note: "NAT A lets it in" },
          ]}
        />
        <Row gap={24} align="start">
          {filter("A", "198.51.100.2:50001 (B)")}
          {filter("B", "198.51.100.1:40001 (A)")}
        </Row>
      </Col>
    </Diagram>
  );
}

/** Two peers behind symmetric NATs talk through a TURN relay: each NAT only ever sees traffic with T. */
export function TurnRelaySchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "TURN: A borrows a public address on the relay T. Every packet of the call crosses T, so each NAT only sees replies from the address its own host contacted."}
      className={className}
    >
      <SequenceChart
        id="turn"
        lanes={["A", "T", "B"]}
        messages={[
          { from: 0, to: 1, label: "allocate", note: "A asks T for an address" },
          { from: 1, to: 0, label: ":49152", note: "T lends 203.0.113.20:49152" },
          { from: 0, to: 2, label: "relayed address", dashed: true, note: "via the signalling server" },
          { from: 2, to: 0, label: "media", relayed: true, note: "B sends to :49152" },
          { from: 0, to: 2, label: "media", relayed: true, note: "T sends from :49152" },
        ]}
      />
    </Diagram>
  );
}

/** ICE on two port-restricted cone NATs: one pair of each kind, its path drawn through the boxes it crosses, checked from the most direct down. */
export function IceSchema({ title, caption, className }: FigureProps) {
  const pairs = [
    { name: "host", via: [] as number[], result: "no answer", tone: NET_TONE.drop },
    { name: "server reflexive", via: [1, 3], result: "answers, kept", state: "active" as const },
    { name: "relayed", via: [1, 2, 3], result: "answers, longer path", muted: true },
  ];
  const textH = Math.round(FONT.label * 1.4);
  const labelW = Math.max(...pairs.map((p) => measure(p.name, FONT.label))) + 28;
  const pitch = 72;
  const col = (k: number) => labelW + 28 + NODE.minW / 2 + k * pitch;
  const rowY = (i: number) => 40 + i * 60;
  const top = (h: number, i: number) => rowY(i) - h / 2;
  const items: ReactNode[] = [];
  const edges: ReactNode[] = [];
  ["NAT A", "", "NAT B"].forEach((name, k) => name && items.push(<Text key={name} text={name} size="note" weight={600} x={col(k + 1) - measure(name, FONT.note, { weight: 600 }) / 2} y={0} />));
  pairs.forEach((p, i) => {
    const stops = [0, ...p.via, 4];
    items.push(
      <Tag key={`n${i}`} text={String(i + 1)} x={0} y={top(TAG.h, i)} />,
      <Text key={`l${i}`} text={p.name} x={28} y={top(textH, i)} />,
      <Text key={`r${i}`} text={p.result} tone={p.tone} state={p.state} muted={p.muted} x={col(4) + NODE.minW / 2 + 24} y={top(textH, i)} />,
    );
    stops.forEach((k) => {
      const id = `ice${i}.${k}`, x = col(k);
      if (k === 1 || k === 3) items.push(<Router key={id} id={id} x={x - ROUTER_SIZE / 2} y={top(ROUTER_SIZE, i)} />);
      else items.push(<Node key={id} id={id} title={["A", "", "T", "", "B"][k]} x={x - NODE.minW / 2} y={top(NODE.h, i)} w={NODE.minW} />);
    });
    stops.slice(1).forEach((k, j) => edges.push(<Link key={`e${i}.${j}`} from={`ice${i}.${stops[j]}`} to={`ice${i}.${k}`} route="straight" tone={p.tone} state={p.state} />));
  });
  return (
    <Diagram
      title={title}
      caption={caption ?? "ICE between two port-restricted cone NATs. The host pair gets no answer, because A and B sit in different LANs. Both other pairs answer, and ICE keeps the more direct one."}
      className={className}
    >
      <Free>{items}</Free>
      {edges}
    </Diagram>
  );
}

/** DNS64 invents the AAAA record, NAT64 turns the IPv6 packet into an IPv4 one. */
export function Nat64Schema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "An IPv6-only client reaches an IPv4-only server: DNS64 synthesizes the AAAA record, and the NAT64 box translates the packet in both directions."}
      className={className}
    >
      <SequenceChart
        id="n64"
        lanes={["client6", "DNS64", "NAT64", "server4"]}
        messages={[
          { from: 0, to: 1, label: "AAAA query", note: "only an A record exists" },
          { from: 1, to: 0, label: "AAAA answer", note: "64:ff9b::cb00:7105" },
          { from: 0, to: 2, label: "IPv6 packet", note: "routed to NAT64" },
          { from: 2, to: 3, label: "IPv4 packet", note: "to 203.0.113.5" },
          { from: 3, to: 2, label: "IPv4 reply" },
          { from: 2, to: 0, label: "IPv6 reply", note: "translated back" },
        ]}
      />
    </Diagram>
  );
}

/** Stateful DHCP when the server sits behind the gateway. */
export function DhcpRelaySchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Stateful DHCP through a relay: the client broadcasts, the gateway relays to the server, and the exchange commits in two phases."}
      className={className}
    >
      <SequenceChart
        id="dhcp"
        lanes={["Client", "Relay", "Server"]}
        messages={[
          { from: 0, to: 1, label: "DISCOVER", dashed: true, note: "from 0.0.0.0:68 to 255.255.255.255:67" },
          { from: 1, to: 2, label: "DISCOVER", note: "relayed to the server" },
          { from: 2, to: 0, label: "OFFER", relayed: true, note: "proposes a configuration" },
          { from: 0, to: 2, label: "REQUEST", relayed: true, note: "commits to the offer" },
          { from: 2, to: 0, label: "ACK", relayed: true, note: "confirms; the server records the lease" },
        ]}
      />
    </Diagram>
  );
}

const SUBNETS = ["cc00", "cc01", "cc02", "cc03", "cc04", "cc05", "cc06", "cc07", "cc08", "cc09", "cc0a", "cc0b", "cc0c", "cc0d", "cc0e", "cc0f"];

/** The ISP delegates a /60 to the home router, which advertises one /64 of it on the home LAN. */
export function PrefixDelegationSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Prefix delegation: the ISP's DHCP server hands R0 a /60. R0 advertises one /64 of it, 2004:aaaa:bbbb:cc02::/64, on the home LAN, where the hosts configure themselves by SLAAC."}
      className={className}
    >
      <Col gap={28}>
        <Row gap={150} align="start">
          <Node id="isp" title="ISP DHCP server" sub="delegating router" />
          {/* level with the two-line nodes, its name hanging below */}
          <Col gap={0}>
            <Space h={(NODE.hSub - ROUTER_SIZE) / 2} />
            <Router id="r0" label="R0" />
          </Col>
          <Node id="lan" title="Home hosts" sub="B and C, by SLAAC" />
        </Row>
        <Group title="2004:aaaa:bbbb:cc00::/60 holds 16 /64 prefixes" gap={10}>
          <Cells
            cols={8}
            cell={44}
            items={SUBNETS.map((s, i) => (i === 1 ? { label: s, state: "placeholder" } : i === 2 ? { label: s, state: "active" } : { label: s }))}
          />
          <Row gap={20}>
            <Text text="cc01: ISP link, excluded" size="note" muted />
            <Text text="cc02: home LAN" size="note" state="active" />
          </Row>
        </Group>
      </Col>
      <Edge from="isp" to="r0" label="DHCP: the /60" />
      <Edge from="r0" to="lan" label="RA: the cc02 /64" />
    </Diagram>
  );
}

/** Each probe lives one hop longer; the router where it expires reports back. */
export function TracerouteSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Traceroute: the probe with TTL n expires at the n-th router, whose ICMP error reveals that router's address."}
      className={className}
    >
      <SequenceChart
        id="tr"
        lanes={["Source", "R1", "R2", "Destination"]}
        messages={[
          { from: 0, to: 1, label: "TTL=1", drop: true, note: "expires at R1" },
          { from: 1, to: 0, label: "ICMP error", note: "reveals R1's address" },
          { from: 0, to: 2, label: "TTL=2", drop: true, note: "expires at R2" },
          { from: 2, to: 0, label: "ICMP error", note: "reveals R2's address" },
          { from: 0, to: 3, label: "TTL=3", note: "reaches the host" },
          { from: 3, to: 0, label: "reply", note: "trace complete" },
        ]}
      />
    </Diagram>
  );
}

const CELL = 28;
const STRIP_GAP = 64;
const bytes = (hex: string) => hex.match(/../g)!;
/** A point edges attach to. */
const pin = (id: string, x: number, y: number) => <Space key={id} id={id} x={x} y={y} />;

/** Copied bits: blue, since purple means "network prefix" in the course's bit figures and these are host bits. */
const COPY = "blue" as const;

/** One row: a title line, then the address as byte cells from column `col`; `copied` bytes (B's last 24 bits) are drawn strong, `carried` ones (the rest of the 32 bits the MAC takes) light. */
function ByteRow({ id, name, value, hex, col = 0, copied, carried = [], y }: { id: string; name: string; value: string; hex: string; col?: number; copied: number[]; carried?: number[]; y: number }): ReactNode[] {
  return [
    <Text key={`${id}.n`} text={name} weight={500} x={0} y={y} />,
    <Text key={`${id}.v`} text={value} mono muted x={132} y={y} />,
    <Cells
      key={id}
      id={id}
      x={col * CELL}
      y={y + 22}
      cell={CELL}
      items={bytes(hex).map((b, i) => (copied.includes(i) ? { label: b, tone: COPY, state: "strong" } : carried.includes(i) ? { label: b, tone: COPY } : { label: b }))}
    />,
  ];
}

/** NS destination: the last 24 bits of B's address give the solicited-node group, whose last 32 bits give the multicast MAC. */
export function SolicitedNodeSchema({ title, caption, className }: FigureProps) {
  const row = (r: number) => r * (22 + CELL + STRIP_GAP);
  const top = (r: number) => row(r) + 22;
  const bottom = (r: number) => top(r) + CELL;
  return (
    <Diagram
      title={title}
      caption={caption ?? "Where an NS for B goes. The last 24 bits of B's address complete the solicited-node prefix ff02::1:ff00:0/104. The multicast MAC is 33:33 followed by the last 32 bits of that group."}
      className={className}
    >
      <Free>
        {ByteRow({ id: "tgt", name: "B's address", value: "2001:620:618:1a6:1:80b2:f66:1", hex: "20010620061801a6000180b20f660001", copied: [13, 14, 15], y: row(0) })}
        {ByteRow({ id: "sn", name: "Solicited node", value: "ff02::1:ff66:1", hex: "ff0200000000000000000001ff660001", copied: [13, 14, 15], carried: [12], y: row(1) })}
        {ByteRow({ id: "mac", name: "Multicast MAC", value: "33:33:ff:66:00:01", hex: "3333ff660001", col: 10, copied: [3, 4, 5], carried: [2], y: row(2) })}
        {pin("a0", 14.5 * CELL, bottom(0))}
        {pin("a1", 14.5 * CELL, top(1))}
        {pin("b0", 14 * CELL, bottom(1))}
        {pin("b1", 14 * CELL, top(2))}
      </Free>
      <Edge from="a0" to="a1" route="straight" label="last 24 bits" />
      <Edge from="b0" to="b1" route="straight" label="last 32 bits" />
    </Diagram>
  );
}

/** M1 must leave subnet p, so it resolves its gateway's address p.1, not M3's. */
export function GatewayResolutionSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Two subnets joined by one router, whose interfaces are p.1 (MAC address M9) on subnet p and q.1 (MAC address M8) on subnet q."}
      className={className}
    >
      <Row gap={110} align="center">
        <Subnet prefix="subnet p">
          <Host id="m1" name="M1" addr="p.h1" />
          <Switch id="sp" />
          <Host id="m2" name="M2" addr="p.h2" />
        </Subnet>
        {/* the subnets' title band and the router's name, so the centred router sits level with the switches */}
        <Col gap={0}>
          <Space h={GROUP.titleBand + DEVICE_NAME} />
          <Router id="rt" label="Router" />
        </Col>
        <Subnet prefix="subnet q">
          <Host id="m3" name="M3" addr="q.h1" />
          <Switch id="sq" />
          <Host id="m4" name="M4" addr="q.h3" />
        </Subnet>
      </Row>
      <Link from="m1" to="sp" />
      <Link from="sp" to="m2" />
      <Link from="m3" to="sq" />
      <Link from="sq" to="m4" />
      <Link from="sp" to="rt" label="p.1, M9" />
      <Link from="rt" to="sq" label="q.1, M8" />
    </Diagram>
  );
}
