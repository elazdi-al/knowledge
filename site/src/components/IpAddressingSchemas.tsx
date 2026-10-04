import type { ReactNode } from "react";
import { Cells, Col, Diagram, Edge, FONT, Free, measure, Node, Space, Table, Text, type TableRow } from "@/components/figure";
import { tableColumnWidths } from "@/components/figure/layout";
import { GROUP } from "@/components/figure/theme";
import { ForwardingTable, Host, Link, NET_TONE, Router, ROUTER_SIZE, type Route } from "@/components/NetworkFigures";
import { HeaderFormat, type Field } from "@/components/PacketFigures";

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

// --- longest prefix match across routers -------------------------------------------------------------------------

const LPM_TABLES: Record<number, Route[]> = {
  1: [["B.*", 2, "used"], ["A.*", "direct"]],
  2: [["A.*", 1], ["B.D.*", "direct", "used"], ["B.*", 3, "light"]],
  3: [["A.*", 2], ["B.D.*", 2], ["B.C.*", "direct"]],
};
/** Cells of each router's glyph that light up along the packet's path (0 to 8, row-major). */
const LPM_LIT: Record<number, number[]> = { 1: [3, 4, 5], 2: [3, 4, 5, 2], 3: [] };

export function LongestPrefixMatchSchema({ title, caption, className }: FigureProps) {
  const top = 92;
  const half = ROUTER_SIZE / 2;
  const xs: Record<number, number> = { 1: 140, 2: 285, 3: 430 };
  const mono = (t: string) => measure(t, FONT.mono, { mono: true }) + 16;
  // every table here holds a `direct` entry, the widest next hop
  const colW = (n: number) => Math.max(ROUTER_SIZE, Math.max(...LPM_TABLES[n].map(([p]) => mono(p))) + mono("direct"));
  const hostY = top + half - 23;
  const bobX = xs[2] + 13;
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "Alice's packet to Bob (B.D.H2) takes the thick links. R1 uses its entry B.*. At R2 both B.D.* and B.* match, and the longer B.D.* wins."
      }
      className={className}
    >
      <Free>
        <Col x={0} y={hostY}>
          <Host id="alice" name="Alice" addr="A.H1" />
        </Col>
        {[1, 2, 3].map((n) => (
          <Router key={n} id={`r${n}`} n={n} lit={LPM_LIT[n]} table={LPM_TABLES[n]} x={xs[n] - colW(n) / 2} y={top} />
        ))}
        <Col x={bobX - 34} y={top - 36 - 46}>
          <Host id="bob" name="Bob" addr="B.D.H2" />
        </Col>
        {at("r2.port", bobX, top)}
        <Col x={xs[3] + half + 56} y={hostY}>
          <Host id="bart" name="Bart" addr="B.C.H2" />
        </Col>
      </Free>
      <Link from="alice" to="r1" thick />
      <Link from="r1" to="r2" thick />
      <Link from="r2.port" to="bob" thick route="straight" />
      <Link from="r2" to="r3" />
      <Link from="r3" to="bart" />
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
        "Under mask 255.255.254.0 the prefix is 23 bits. Both choices for H match the router's north interface on all 23. Choice B differs only in a host bit (outlined). The south interface differs in three prefix bits (blue)."
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
  const y0 = 12, y1 = 112, yB = y1 + ROUTER_SIZE + 64, y2 = yB - half;
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
  const GAP = 14, ARROW = 44, PKT_H = 2 * 26, NAT_H = ROUTER_SIZE + GROUP.titleBand;
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
          <Router id="nat" label="NAT" x={xNat} y={mid - NAT_H / 2} />
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
      <Edge from="nat" to="nattab" dashed head="none" />
    </Diagram>
  );
}
