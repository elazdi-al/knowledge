import type { ReactNode } from "react";
import { Cells, Col, Diagram, Edge, Free, Group, Node, Row, Space, Table, Text } from "@/components/figure";
import { Host, Link, NET_TONE, Router, Subnet, Switch } from "@/components/NetworkFigures";
import { SequenceChart } from "@/components/PacketFigures";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
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
          { from: 1, to: 0, label: "AAAA answer", note: "synthesized" },
          { from: 0, to: 2, label: "IPv6 packet", note: "to 64:ff9b::cb00:7105" },
          { from: 2, to: 3, label: "IPv4 packet", note: "to 203.0.113.5" },
          { from: 3, to: 2, label: "IPv4 reply" },
          { from: 2, to: 0, label: "IPv6 reply" },
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
          { from: 2, to: 0, label: "OFFER", note: "proposes a configuration" },
          { from: 0, to: 2, label: "REQUEST", note: "commits to the offer" },
          { from: 2, to: 0, label: "ACK", note: "confirms; the server records the lease" },
        ]}
      />
    </Diagram>
  );
}

const SUBNETS = ["cc00", "cc01", "cc02", "cc03", "cc04", "cc05", "cc06", "cc07", "cc08", "cc09", "cc0a", "cc0b", "cc0c", "cc0d", "cc0e", "cc0f"];

/** The ISP delegates a /60 to the home router, which advertises one /64 of it on the home LAN. */
export function PrefixDelegationSchema({ title, caption, className }: FigureProps) {
  const r0 = NET_TONE.router[1];
  return (
    <Diagram
      title={title}
      caption={caption ?? "Prefix delegation: the ISP's DHCP server hands R0 a /60, R0 advertises cc02::/64 on the home LAN, and the hosts configure themselves by SLAAC."}
      className={className}
    >
      <Col gap={28}>
        <Row gap={150}>
          <Node id="isp" title="ISP DHCP server" sub="delegating router" />
          <Router id="r0" n={1} label="R0" />
          <Node id="lan" title="Home hosts" sub="cc02::EUI_B, cc02::EUI_C" mono />
        </Row>
        <Group title="2004:aaaa:bbbb:cc00::/60 holds 16 /64 prefixes" gap={10}>
          <Cells
            cols={8}
            cell={44}
            items={SUBNETS.map((s, i) => (i === 1 ? { label: s, state: "placeholder" } : i === 2 ? { label: s, tone: r0, state: "strong" } : { label: s }))}
          />
          <Row gap={20}>
            <Text text="cc01: ISP link, excluded" size="note" muted />
            <Text text="cc02: home LAN" size="note" tone={r0} />
          </Row>
        </Group>
      </Col>
      <Edge from="isp" to="r0" label="DHCP: cc00::/60" />
      <Edge from="r0" to="lan" label="RA: cc02::/64" />
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
          { from: 0, to: 1, label: "TTL=1", drop: true, note: "R1 takes it to 0" },
          { from: 1, to: 0, label: "ICMP error", note: "hop 1 = sender, R1" },
          { from: 0, to: 2, label: "TTL=2", drop: true, note: "R2 takes it to 0" },
          { from: 2, to: 0, label: "ICMP error", note: "hop 2 = sender, R2" },
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

/** One row: a title line, then the address as byte cells starting at column `col`; `copied` bytes take the network hue. */
function ByteRow({ id, name, value, hex, col = 0, copied, y }: { id: string; name: string; value: string; hex: string; col?: number; copied: number[]; y: number }): ReactNode[] {
  return [
    <Text key={`${id}.n`} text={name} weight={500} x={col * CELL} y={y} />,
    <Text key={`${id}.v`} text={value} mono muted x={col * CELL + 132} y={y} />,
    <Cells
      key={id}
      id={id}
      x={col * CELL}
      y={y + 22}
      cell={CELL}
      items={bytes(hex).map((b, i) => ({ label: b, tone: copied.includes(i) ? NET_TONE.network : undefined }))}
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
      caption={caption ?? "Where an NS for B goes: the last 24 bits of B's address complete the solicited-node prefix ff02::1:ff00:0/104, and 33:33 plus the last 32 bits of that group give the multicast MAC."}
      className={className}
    >
      <Free>
        {ByteRow({ id: "tgt", name: "B's address", value: "2001:620:618:1a6:1:80b2:f66:1", hex: "20010620061801a6000180b20f660001", copied: [13, 14, 15], y: row(0) })}
        {ByteRow({ id: "sn", name: "Solicited node", value: "ff02::1:ff66:1", hex: "ff0200000000000000000001ff660001", copied: [13, 14, 15], y: row(1) })}
        {ByteRow({ id: "mac", name: "Multicast MAC", value: "33:33:ff:66:00:01", hex: "3333ff660001", col: 10, copied: [3, 4, 5], y: row(2) })}
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
      caption={caption ?? "M3 sits in another subnet, so M1 hands its packet to the router: the address M1 must resolve is the gateway's, p.1."}
      className={className}
    >
      <Row gap={110} align="end">
        <Subnet prefix="subnet p">
          <Row gap={14}>
            <Host id="m1" name="M1" addr="p.h1" />
            <Host id="m2" name="M2" addr="p.h2" />
          </Row>
          <Switch id="sp" />
        </Subnet>
        <Router id="rt" label="Router" />
        <Subnet prefix="subnet q">
          <Row gap={14}>
            <Host id="m3" name="M3" addr="q.h1" />
            <Host id="m4" name="M4" addr="q.h3" />
          </Row>
          <Switch id="sq" />
        </Subnet>
      </Row>
      <Link from="m1" to="sp" route="ortho" />
      <Link from="m2" to="sp" route="ortho" />
      <Link from="m3" to="sq" route="ortho" />
      <Link from="m4" to="sq" route="ortho" />
      <Link from="sp" to="rt" label="p.1, M9" />
      <Link from="rt" to="sq" label="q.1, M8" />
    </Diagram>
  );
}

export const ipServicesSchemas = {
  HolePunchingSchema,
  Nat64Schema,
  DhcpRelaySchema,
  PrefixDelegationSchema,
  TracerouteSchema,
  SolicitedNodeSchema,
  GatewayResolutionSchema,
};
