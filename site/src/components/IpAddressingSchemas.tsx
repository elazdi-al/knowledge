import type { ReactNode } from "react";
import { Cells, Col, Diagram, Edge, FONT, Free, Group, measure, Node, NODE, Row, Space, Table, Text, type TableRow } from "@/components/figure";
import { tableColumnWidths } from "@/components/figure/layout";
import { GROUP } from "@/components/figure/theme";
import { ForwardingTable, Link, NET_TONE, Router, ROUTER_BADGE, ROUTER_SIZE, Switch, type Route } from "@/components/NetworkFigures";
import { FrameHeaders, HeaderFormat, type Field } from "@/components/PacketFigures";

/** Advanced Networks, Lecture 2 figures: forwarding, IPv4 and IPv6 addresses, NAT. */

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

/** A zero-size anchor that edges attach to. */
const at = (id: string, x: number, y: number) => <Space key={id} id={id} x={x} y={y} />;
/** A dimension line from x0 to x1 at height y, its label on the line. */
const dim = (id: string, x0: number, x1: number, y: number, label: string) => [
  at(`${id}.a`, x0, y),
  at(`${id}.b`, x1, y),
  <Edge key={id} from={`${id}.a`} to={`${id}.b`} route="straight" head="both" label={label} />,
];

// --- subnets ------------------------------------------------------------------------------------------------------

/** Height of a switch or base station: its 10px port strip plus 6px padding each side; its width holds 6 cells. */
const SWITCH_H = 22;
const SWITCH_W = 72;
/** Horizontal room between a host and the link-layer device it hangs off. */
const REACH = 32;

/** Two hosts stacked on one side of a switch, joined to it by straight links; `flip` puts the hosts on the right. */
const Star = ({ sw, label, hosts, flip = false }: { sw: string; label: string; hosts: [string, string]; flip?: boolean }) => {
  const gap = 28;
  const mid = NODE.h + gap / 2;
  const hostX = flip ? SWITCH_W + REACH : 0;
  const swX = flip ? 0 : NODE.minW + REACH;
  return (
    <Free>
      <Node id={hosts[0]} title={hosts[0]} x={hostX} y={0} />
      <Node id={hosts[1]} title={hosts[1]} x={hostX} y={NODE.h + gap} />
      <Free x={swX} y={mid - SWITCH_H / 2}>
        <Switch id={sw} label={label} />
      </Free>
    </Free>
  );
};
/** The centre line of a `Star`, measured from the top of its subnet's outline. */
const STAR_MID = GROUP.pad + GROUP.titleBand + NODE.h + 14;

export function SubnetRuleSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "Inside a subnet, hosts reach each other through the switch or the base station, never through the gateway. W's packet to E (blue) crosses the gateway, whose two interfaces sit in different subnets."
      }
      className={className}
    >
      <Row gap={100} align="start">
        <Group title="Ethernet, 10.10.2.0/24" dashed>
          <Star sw="sw" label="Switch" hosts={["W", "P"]} />
        </Group>
        <Col gap={0}>
          <Space h={STAR_MID - ROUTER_SIZE / 2} />
          <Router id="gw" label="Gateway" />
        </Col>
        <Group title="WiFi, 10.10.1.0/24" dashed>
          <Star sw="bs" label="Base station" hosts={["B", "E"]} flip />
        </Group>
      </Row>
      <Link from="W" to="sw" route="straight" thick state="active" />
      <Link from="P" to="sw" route="straight" />
      <Link from="sw" to="gw" route="straight" thick state="active" label="10.10.2.1" />
      <Link from="gw" to="bs" route="straight" thick state="active" label="10.10.1.1" />
      <Link from="bs" to="B" route="straight" />
      <Link from="bs" to="E" route="straight" thick state="active" />
    </Diagram>
  );
}

export function LanCaptureSchema({ title, caption, className }: FigureProps) {
  const line = NODE.h / 2;
  const pt = NODE.minW + 28, swX = pt + 22 + 28, pX = swX + SWITCH_W + 28;
  return (
    <Diagram
      title={title}
      caption={caption ?? "The frame at point 1. Inside one subnet, P is both the next hop and the destination, so both headers name P. The switch appears in neither."}
      className={className}
    >
      <Col gap={20} align="center">
        <Group title="Ethernet, 10.10.2.0/24" dashed>
          <Free>
            <Node id="W" title="W" x={0} y={0} />
            <Node id="pt" title="1" shape="circle" w={22} x={pt} y={line - 11} />
            <Free x={swX} y={line - SWITCH_H / 2}>
              <Switch id="sw" label="Switch" />
            </Free>
            <Node id="P" title="P" x={pX} y={0} />
          </Free>
        </Group>
        <FrameHeaders frames={[{ n: 1, mac: ["W", "P"], ip: ["W", "P"] }]} />
      </Col>
      <Link from="W" to="pt" route="straight" />
      <Link from="pt" to="sw" route="straight" />
      <Link from="sw" to="P" route="straight" />
    </Diagram>
  );
}

// --- longest prefix match across routers -------------------------------------------------------------------------

const LPM_TABLES: Record<number, Route[]> = {
  1: [["128.178.0.0/16", 2, "used"], ["129.132.0.0/16", "direct"]],
  2: [["129.132.0.0/16", 1], ["128.178.71.0/24", "direct", "used"], ["128.178.0.0/16", 3, "light"]],
  3: [["129.132.0.0/16", 2], ["128.178.71.0/24", 2], ["128.178.156.0/24", "direct"]],
};
/** Cells of each router's glyph that light up along the packet's path (0 to 8, row-major): in from the top, out to the right, then in from the left, out the top. */
const LPM_LIT: Record<number, number[]> = { 1: [1, 4, 5], 2: [3, 4, 1], 3: [] };
/** The host above each router. */
const LPM_HOSTS: Record<number, [name: string, addr: string]> = { 1: ["Alice", "129.132.66.46"], 2: ["Bob", "128.178.71.202"], 3: ["Bart", "128.178.156.23"] };

export function LongestPrefixMatchSchema({ title, caption, className }: FigureProps) {
  const mono = (t: string) => measure(t, FONT.mono, { mono: true }) + 16;
  // every table here holds a `direct` entry, the widest next hop
  const colW = (n: number) => Math.max(ROUTER_SIZE, Math.max(...LPM_TABLES[n].map(([p]) => mono(p))) + mono("direct"));
  const GAP = 20, DROP = 36;
  const xs: Record<number, number> = { 1: colW(1) / 2 };
  xs[2] = colW(1) + GAP + colW(2) / 2;
  xs[3] = colW(1) + GAP + colW(2) + GAP + colW(3) / 2;
  const hostW = Math.max(...Object.values(LPM_HOSTS).map(([, a]) => measure(a, FONT.note))) + 2 * NODE.padX;
  const top = NODE.hSub + DROP + ROUTER_BADGE;
  return (
    <Diagram
      title={title}
      caption={caption ?? "Alice's packet to Bob takes the thick links, and each router uses its outlined entry. A chip names the next-hop router, and direct marks an attached subnet."}
      className={className}
    >
      <Free>
        {[1, 2, 3].map((n) => [
          <Node key={`h${n}`} id={`h${n}`} title={LPM_HOSTS[n][0]} sub={LPM_HOSTS[n][1]} x={xs[n] - hostW / 2} y={0} w={hostW} />,
          at(`r${n}.north`, xs[n], top - ROUTER_BADGE),
          <Router key={n} id={`r${n}`} n={n} lit={LPM_LIT[n]} table={LPM_TABLES[n]} x={xs[n] - colW(n) / 2} y={top} />,
        ])}
      </Free>
      <Link from="h1" to="r1.north" route="straight" thick />
      <Link from="r1" to="r2" route="straight" thick />
      <Link from="r2.north" to="h2" route="straight" thick />
      <Link from="r2" to="r3" route="straight" state="ghost" />
      <Link from="h3" to="r3.north" route="straight" state="ghost" />
    </Diagram>
  );
}

// --- masks and prefixes in bits ----------------------------------------------------------------------------------

const BIT = 18;
const OCTET_GAP = 6;
const bitX = (i: number) => i * BIT + Math.floor(i / 8) * OCTET_GAP;
const toBits = (dotted: string) => dotted.split(".").flatMap((o) => Number(o).toString(2).padStart(8, "0").split(""));

interface BitRow {
  role: string;
  addr: string;
  /** bits drawn as the focus: they differ where they should not */
  clash?: number[];
  /** bits outlined: they differ, but in the host part */
  differ?: number[];
}

/** Rows of 32 bits, octet by octet, the first `prefix` bits tinted; each row titled by its role and dotted-decimal value. */
function BitRows({ prefix, rows, prefixLabel, hostLabel }: { prefix: number; rows: BitRow[]; prefixLabel: string; hostLabel: string }) {
  const end = bitX(31) + BIT;
  const head = 30;
  const pitch = 16 + BIT + 12;
  const items: ReactNode[] = [];
  rows.forEach((r, k) => {
    const y = head + k * pitch;
    const bits = toBits(r.addr);
    items.push(
      <Text key={`${k}.role`} text={r.role} size="note" muted x={0} y={y} />,
      <Text key={`${k}.addr`} text={r.addr} size="note" mono x={measure(r.role, FONT.note) + 8} y={y} />,
    );
    for (let o = 0; o < 4; o++)
      items.push(
        <Cells
          key={`${k}.${o}`}
          x={bitX(8 * o)}
          y={y + 17}
          cell={BIT}
          items={bits.slice(8 * o, 8 * o + 8).map((b, j) => {
            const i = 8 * o + j;
            return {
              label: b,
              tone: i < prefix ? NET_TONE.network : undefined,
              state: r.clash?.includes(i) ? "active" : r.differ?.includes(i) ? "strong" : undefined,
            };
          })}
        />,
      );
  });
  return (
    <Free>
      {dim("pre", 0, bitX(prefix) - (prefix % 8 === 0 ? OCTET_GAP : 0), 8, prefixLabel)}
      {dim("host", bitX(prefix), end, 8, hostLabel)}
      {items}
    </Free>
  );
}

export function SubnetBitsSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "Both choices for H match the north interface on all 23 prefix bits. Choice B differs only in a host bit (outlined). The south interface differs in three prefix bits (blue)."
      }
      className={className}
    >
      <BitRows
        prefix={23}
        prefixLabel="prefix: 23 bits"
        hostLabel="host: 9 bits"
        rows={[
          { role: "mask", addr: "255.255.254.0" },
          { role: "router, north", addr: "2.4.8.1" },
          { role: "H, choice A", addr: "2.4.8.2" },
          { role: "H, choice B", addr: "2.4.9.1", differ: [23] },
          { role: "router, south", addr: "2.4.7.1", clash: [20, 21, 22] },
        ]}
      />
    </Diagram>
  );
}

// --- headers -----------------------------------------------------------------------------------------------------

/** The IPv4 header with the field names of the classic RFC 791 drawing. */
const IPV4: Field[] = [
  ["Version", 4], ["IHL", 4], ["Type of Service", 8], ["Total Length", 16],
  ["Identification", 16], ["Flags", 3], ["Fragment Offset", 13],
  ["Time to Live", 8], ["Protocol", 8], ["Header Checksum", 16],
  ["Source Address", 32],
  ["Destination Address", 32],
];

export function Ipv4HeaderSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram title={title} caption={caption ?? "The IPv4 header: five rows of 32 bits, 20 bytes before any options. Tinted: the addresses and the Protocol field."} className={className}>
      <HeaderFormat fields={IPV4} highlight={["Protocol", "Source Address", "Destination Address"]} />
    </Diagram>
  );
}

export function Ipv6HeaderSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "The IPv6 header: 40 bytes, of which 32 are the two addresses. Tinted: the addresses and Next Header, the counterpart of IPv4's Protocol."}
      className={className}
    >
      <HeaderFormat fields="ipv6" highlight={["Next Header", "Source Address", "Destination Address"]} />
    </Diagram>
  );
}

// --- a real forwarding table: ed0-swi at EPFL --------------------------------------------------------------------

/** Name, address and role lines beside or under a router; `align` anchors them at `x` by their start, end or centre. */
function Caption({ x, y, lines, align = "start" }: { x: number; y: number; lines: [string, string?, string?]; align?: "start" | "end" | "center" }) {
  const [name, addr, role] = lines;
  const shift = { start: 0, center: 0.5, end: 1 }[align];
  const place = (t: string, w: number) => x - shift * w;
  return (
    <>
      <Text text={name} size="note" weight={600} x={place(name, measure(name, FONT.note, { weight: 600 }))} y={y} />
      {addr && <Text text={addr} size="note" mono x={place(addr, measure(addr, FONT.note - 0.5, { mono: true }))} y={y + 16} />}
      {role && <Text text={role} size="note" muted x={place(role, measure(role, FONT.note))} y={y + 32} />}
    </>
  );
}

export function EpflForwardingSchema({ title, caption, className }: FigureProps) {
  const cx = 250, half = ROUTER_SIZE / 2, spread = 120;
  // the backbone LAN joining ed0-swi, ed2-in and ed2-el runs at yB
  const y0 = 12 + ROUTER_BADGE, y1 = 112 + ROUTER_BADGE, yB = y1 + ROUTER_SIZE + 64, y2 = yB - half;
  return (
    <Diagram
      title={title}
      caption={caption ?? "Router ed0-swi and its IPv4 forwarding table: each entry names a destination prefix, the next-hop router, and the interface toward it."}
      className={className}
    >
      <Free>
        <Router id="sw" n={1} x={cx - half} y={y0} />
        <Caption x={cx - half - 12} y={y0 - 2} align="end" lines={["sw-la-01", "128.178.47.3", "toward the Internet"]} />
        <Router id="ed0" x={cx - half} y={y1} />
        <Caption x={cx - half - 12} y={y1 + 12} align="end" lines={["ed0-swi"]} />
        <Col x={cx + half + 36} y={y1 + half - 52}>
          <ForwardingTable
            of="ed0"
            columns={["destination", "next hop", "interface"]}
            rows={[
              ["128.178.29/24", 3, null, "south"],
              ["128.178/16", 2, null, "south"],
              ["0/0", 1, null, "north"],
            ]}
          />
        </Col>
        {at("bb", cx, yB)}
        <Router id="in" n={2} x={cx - spread - half} y={y2} />
        <Caption x={cx - spread} y={y2 + ROUTER_SIZE + 10} align="center" lines={["ed2-in", "128.178.100.3", "rest of EPFL"]} />
        <Router id="el" n={3} x={cx + spread - half} y={y2} />
        <Caption x={cx + spread} y={y2 + ROUTER_SIZE + 10} align="center" lines={["ed2-el", "128.178.100.2", "LEMA, 128.178.29/24"]} />
      </Free>
      <Link from="sw" to="ed0" label="north" route="straight" />
      <Link from="ed0" to="bb" label="south" route="straight" fromSide="bottom" />
      <Link from="in" to="el" route="straight" />
    </Diagram>
  );
}

// --- anatomy of an IPv6 address ----------------------------------------------------------------------------------

const K = 4.25;
type Seg = [text: string, bits: number];
const SEGS: { label: string; segs: Seg[] }[] = [
  { label: "global", segs: [["2001:620", 32], [":618", 16], [":1a6", 16], ["::9", 64]] },
  { label: "private", segs: [["fd", 8], ["24:ec43:12ca", 40], [":1a6", 16], [":a00:20ff:fe78:30f9", 64]] },
];

export function Ipv6AddressSchema({ title, caption, className }: FigureProps) {
  const x0 = Math.max(...SEGS.map((s) => measure(s.label, FONT.note))) + 12;
  const bx = (bit: number) => x0 + bit * K;
  const rowY = (r: number) => 70 + r * 44;
  const items: ReactNode[] = [];
  SEGS.forEach(({ label, segs }, r) => {
    items.push(<Text key={`l${r}`} text={label} size="note" muted x={0} y={rowY(r) + 9} />);
    let bit = 0;
    segs.forEach(([text, bits], s) => {
      items.push(<Node key={`${r}.${s}`} title={text} mono x={bx(bit) + 1} y={rowY(r)} w={bits * K - 3} h={34} tone={bit < 64 ? NET_TONE.network : undefined} />);
      bit += bits;
    });
  });
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "Two EPFL addresses with subnet ID 1a6. The global one nests inside EPFL's /48, itself inside SWITCH's /32; the private one starts with fd and 40 random bits."
      }
      className={className}
    >
      <Free>
        {dim("sw", bx(0), bx(32) - 2, 8, "SWITCH /32")}
        {dim("epfl", bx(0), bx(48) - 2, 28, "EPFL /48")}
        {dim("lan", bx(0), bx(64) - 2, 48, "subnet /64")}
        {dim("host", bx(64) + 1, bx(128), 48, "host: 64 bits")}
        {items}
        {dim("rnd", bx(8) + 1, bx(48) - 2, rowY(1) + 34 + 14, "random: 40 bits")}
      </Free>
    </Diagram>
  );
}

// --- NAT ---------------------------------------------------------------------------------------------------------

/** A packet's address fields as two rows; the row the NAT rewrites is the focus. */
const pkt = (src: string, dst: string, rewritten: "src" | "dst"): TableRow[] => [
  { cells: ["src", src], state: rewritten === "src" ? "active" : undefined },
  { cells: ["dst", dst], state: rewritten === "dst" ? "active" : undefined },
];
const tableW = (rows: TableRow[]) => tableColumnWidths(undefined, rows, true).reduce((a, w) => a + w, 0);

export function NatTranslationSchema({ title, caption, className }: FigureProps) {
  const LAN = "192.168.10.11:1029", WAN = "130.104.228.200:3441", DNS = "1.2.3.4:53";
  const strips = { o1: pkt(LAN, DNS, "src"), i2: pkt(DNS, LAN, "dst"), o2: pkt(WAN, DNS, "src"), i1: pkt(DNS, WAN, "dst") };
  // each side's two strips hold the same addresses, so they share a width
  const wL = tableW(strips.o1), wR = tableW(strips.o2);
  const GAP = 14, ARROW = 44, PKT_H = 2 * 26;
  const head = Math.round(FONT.note * 1.4) + GAP;
  const xNat = wL + ARROW, xR = xNat + ROUTER_SIZE + ARROW;
  const mid = head + PKT_H + GAP / 2;
  // outbound above the NAT's centre, inbound below: four straight arrows, each meeting an outline
  const yOut = mid - 20, yIn = mid + 20;
  const heading = (t: string, x0: number, w: number) => <Text text={t} size="note" muted x={x0 + (w - measure(t, FONT.note)) / 2} y={0} />;
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "Outbound, the NAT rewrites the source and records the mapping. Inbound, it finds that mapping by exact match and rewrites the destination back."
      }
      className={className}
    >
      <Col gap={GAP}>
        <Free>
          {heading("LAN side, private", 0, wL)}
          {heading("Internet side, public", xR, wR)}
          <Table id="o1" rows={strips.o1} x={0} y={head} />
          <Table id="i2" rows={strips.i2} x={0} y={head + PKT_H + GAP} />
          <Router id="nat" label="NAT" x={xNat} y={mid - ROUTER_SIZE / 2} />
          <Table id="o2" rows={strips.o2} x={xR} y={head} />
          <Table id="i1" rows={strips.i1} x={xR} y={head + PKT_H + GAP} />
          {at("o.a", wL, yOut)}
          {at("o.b", xNat, yOut)}
          {at("o.c", xNat + ROUTER_SIZE, yOut)}
          {at("o.d", xR, yOut)}
          {at("i.d", xR, yIn)}
          {at("i.c", xNat + ROUTER_SIZE, yIn)}
          {at("i.b", xNat, yIn)}
          {at("i.a", wL, yIn)}
        </Free>
        <Table
          id="nattab"
          columns={["internal IP", "port", "proto", "NAT IP", "NAT port"]}
          rows={[
            { cells: ["192.168.10.11", "1029", "udp", "130.104.228.200", "3441"], state: "active" },
            ["192.168.10.10", "1029", "udp", "130.104.228.200", "3442"],
          ]}
        />
      </Col>
      <Edge from="o.a" to="o.b" route="straight" />
      <Edge from="o.c" to="o.d" route="straight" />
      <Edge from="i.d" to="i.c" route="straight" />
      <Edge from="i.b" to="i.a" route="straight" />
      <Edge from="nat.name" to="nattab" dashed head="none" />
    </Diagram>
  );
}
