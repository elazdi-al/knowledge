import type { ReactNode } from "react";
import { Cells, Col, Diagram, Edge, FONT, Free, measure, Node, Row, Space, Table, Text, type TableRow, type Tone } from "@/components/figure";
import { Host, Link, NET_TONE, Router } from "@/components/NetworkFigures";
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

const ROUTER = 42;
const routerTone = (n: number) => (NET_TONE.router as Record<number, Tone>)[n];

/** A forwarding entry: prefix, next hop (a router number drawn as a chip in its hue, or text such as `direct`), and how the packet in focus treats it. */
type Entry = [prefix: string, hop: number | string, mark?: "used" | "lost"];

/** A forwarding table tethered under router `of`: the entry the packet uses is outlined, a matching but shorter entry drawn light. */
function Fib({ of, rows, columns }: { of: string; rows: (Entry | [string, number | string, string])[]; columns?: string[] }) {
  const toRow = (r: Entry | [string, number | string, string]): TableRow => {
    const [prefix, hop, third] = r;
    const lost = third === "lost";
    const chip = typeof hop === "number" ? { text: String(hop), tone: routerTone(hop), solid: !lost } : hop;
    const extra = third && third !== "used" && third !== "lost" ? [third] : [];
    return { cells: [prefix, chip, ...extra], state: third === "used" ? "strong" : lost ? "placeholder" : undefined };
  };
  return (
    <>
      <Table id={`${of}-fib`} columns={columns} rows={rows.map(toRow)} />
      <Edge from={of} to={`${of}-fib`} dashed head="none" />
    </>
  );
}

// --- longest prefix match across routers -------------------------------------------------------------------------

const LPM_TABLES: Record<number, Entry[]> = {
  1: [["B.*", 2, "used"], ["A.*", "direct"]],
  2: [["A.*", 1], ["B.D.*", "direct", "used"], ["B.*", 3, "lost"]],
  3: [["A.*", 2], ["B.D.*", 2], ["B.C.*", "direct"]],
};
/** Cells of each router's glyph that light up along the packet's path (0 to 8, row-major). */
const LPM_LIT: Record<number, number[]> = { 1: [3, 4, 5], 2: [3, 4, 1], 3: [] };

export function LongestPrefixMatchSchema({ title, caption, className }: FigureProps) {
  const top = 92;
  const xs = { 1: 168, 2: 318, 3: 468 } as Record<number, number>;
  const tableW = (n: number) => Math.max(...LPM_TABLES[n].map(([p]) => measure(p, FONT.mono, { mono: true }))) + 16 + measure("direct", FONT.mono, { mono: true }) + 16;
  const hostY = top + ROUTER / 2 - 23;
  const bobX = xs[2] + 13;
  const pathText = "to B.D.H2";
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "A packet from Alice to Bob (B.D.H2) takes the thick links. R1 uses B.*; at R2 both B.D.* and B.* match, and the longer B.D.* wins."
      }
      className={className}
    >
      <Free>
        <Col x={0} y={hostY}>
          <Host id="alice" name="Alice" addr="A.H1" />
        </Col>
        <Text text={pathText} size="note" mono muted x={66} y={top - 4} />
        {[1, 2, 3].map((n) => (
          <Col key={n} x={xs[n] - ROUTER / 2} y={top}>
            <Router id={`r${n}`} n={n} lit={LPM_LIT[n]} />
          </Col>
        ))}
        {[1, 2, 3].map((n) => (
          <Col key={`t${n}`} x={xs[n] - tableW(n) / 2} y={top + ROUTER + 16}>
            <Fib of={`r${n}`} rows={LPM_TABLES[n]} />
          </Col>
        ))}
        <Col x={bobX - 34} y={top - 36 - 46}>
          <Host id="bob" name="Bob" addr="B.D.H2" />
        </Col>
        {at("r2.port", bobX, top)}
        <Col x={xs[3] + 21 + 54} y={hostY}>
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
        "Under mask 255.255.254.0 the prefix is 23 bits. Both choices for H match the router's north interface on all 23; the south interface differs in three of them."
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

/** Name and address lines beside or under a router, right-aligned when `end`. */
function Caption({ x, y, lines, end = false }: { x: number; y: number; lines: [string, string?, string?]; end?: boolean }) {
  const [name, addr, role] = lines;
  const width = (t: string, mono = false) => measure(t, FONT.note - (mono ? 0.5 : 0), { mono, weight: mono ? 400 : 400 });
  const left = (t: string, mono = false) => (end ? x - width(t, mono) : x);
  return (
    <>
      <Text text={name} size="note" weight={600} x={left(name)} y={y} />
      {addr && <Text text={addr} size="note" mono x={left(addr, true)} y={y + 16} />}
      {role && <Text text={role} size="note" muted x={left(role)} y={y + 32} />}
    </>
  );
}

export function EpflForwardingSchema({ title, caption, className }: FigureProps) {
  const cx = 250;
  const y0 = 12, y1 = 112, yJ = y1 + ROUTER + 34, y2 = yJ + 30;
  const half = ROUTER / 2;
  const spread = 120;
  return (
    <Diagram
      title={title}
      caption={caption ?? "Router ed0-swi and its IPv4 forwarding table: each entry names a destination prefix, the next-hop router, and the interface toward it."}
      className={className}
    >
      <Free>
        <Col x={cx - half} y={y0}>
          <Router id="sw" n={1} />
        </Col>
        <Caption x={cx - half - 12} y={y0 - 2} end lines={["sw-la-01", "128.178.47.3", "toward the Internet"]} />
        <Col x={cx - half} y={y1}>
          <Router id="ed0" />
        </Col>
        <Caption x={cx - half - 12} y={y1 + 12} end lines={["ed0-swi"]} />
        <Col x={cx + half + 36} y={y1 + half - 52}>
          <Fib
            of="ed0"
            columns={["destination", "next hop", "interface"]}
            rows={[
              ["128.178.29/24", 3, "south"],
              ["128.178/16", 2, "south"],
              ["0/0", 1, "north"],
            ]}
          />
        </Col>
        {at("bb", cx, yJ)}
        <Col x={cx - spread - half} y={y2}>
          <Router id="in" n={2} />
        </Col>
        <Caption x={cx - spread - half} y={y2 + ROUTER + 10} lines={["ed2-in", "128.178.100.3", "rest of EPFL"]} />
        <Col x={cx + spread - half} y={y2}>
          <Router id="el" n={3} />
        </Col>
        <Caption x={cx + spread - half} y={y2 + ROUTER + 10} lines={["ed2-el", "128.178.100.2", "LEMA, 128.178.29/24"]} />
      </Free>
      <Link from="sw" to="ed0" label="north" route="straight" />
      <Link from="ed0" to="bb" label="south" route="straight" fromSide="bottom" />
      <Link from="bb" to="in" route="ortho" fromSide="bottom" toSide="right" />
      <Link from="bb" to="el" route="ortho" fromSide="bottom" toSide="left" />
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
        "Two EPFL addresses on the same subnet 1a6. The global one nests inside EPFL's /48, itself inside SWITCH's /32; the private one starts with fd and 40 random bits."
      }
      className={className}
    >
      <Free>
        {dim("sw", bx(0), bx(32) - 2, 8, "SWITCH /32")}
        {dim("epfl", bx(0), bx(48) - 2, 28, "EPFL /48")}
        {dim("lan", bx(0), bx(64) - 2, 48, "subnet /64")}
        {dim("host", bx(64) + 1, bx(128), 48, "host part: 64 bits")}
        {items}
        {dim("rnd", bx(8) + 1, bx(48) - 2, rowY(1) + 34 + 14, "random: 40 bits")}
      </Free>
    </Diagram>
  );
}

// --- NAT ---------------------------------------------------------------------------------------------------------

/** A packet's address fields as a two-row strip; the row the NAT rewrites is the focus. */
function Pkt({ id, src, dst, rewritten }: { id: string; src: string; dst: string; rewritten: "src" | "dst" }) {
  return (
    <Table
      id={id}
      rows={[
        { cells: ["src", src], state: rewritten === "src" ? "active" : undefined },
        { cells: ["dst", dst], state: rewritten === "dst" ? "active" : undefined },
      ]}
    />
  );
}

export function NatTranslationSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={
        caption ??
        "Outbound, the NAT rewrites the source and records the mapping; inbound, it finds that mapping by exact match and rewrites the destination back."
      }
      className={className}
    >
      <Col gap={14}>
        <Row gap={44} align="center">
          <Col gap={14} align="end">
            <Text text="LAN side, private" size="note" muted />
            <Pkt id="o1" src="192.168.10.11:1029" dst="1.2.3.4:53" rewritten="src" />
            <Pkt id="i2" src="1.2.3.4:53" dst="192.168.10.11:1029" rewritten="dst" />
          </Col>
          <Router id="nat" label="NAT" />
          <Col gap={14} align="start">
            <Text text="Internet side, public" size="note" muted />
            <Pkt id="o2" src="130.104.228.200:3441" dst="1.2.3.4:53" rewritten="src" />
            <Pkt id="i1" src="1.2.3.4:53" dst="130.104.228.200:3441" rewritten="dst" />
          </Col>
        </Row>
        <Table
          id="nattab"
          columns={["internal IP", "port", "proto", "NAT IP", "NAT port"]}
          rows={[
            { cells: ["192.168.10.11", "1029", "udp", "130.104.228.200", "3441"], state: "active" },
            ["192.168.10.10", "1029", "udp", "130.104.228.200", "3442"],
          ]}
        />
      </Col>
      <Edge from="o1" to="nat" />
      <Edge from="nat" to="o2" />
      <Edge from="i1" to="nat" />
      <Edge from="nat" to="i2" />
      <Edge from="nat" to="nattab" dashed head="none" />
    </Diagram>
  );
}

export const ipAddressingSchemas = {
  LongestPrefixMatchSchema,
  SubnetBitsSchema,
  Ipv4HeaderSchema,
  EpflForwardingSchema,
  Ipv6AddressSchema,
  Ipv6HeaderSchema,
  NatTranslationSchema,
};
