import type { ReactNode } from "react";
import { Cells, Col, Edge, FONT, Free, Group, measure, Node, NODE, Row, Space, Text, type Tone } from "@/components/figure";
import { labelPillW } from "@/components/figure/route";
import { NET_TONE } from "@/components/NetworkFigures";

export type Layer = "application" | "transport" | "network" | "link" | "physical";
/** Layers that add a header, each in its course hue; application data and the physical layer stay neutral. */
type HeaderLayer = "transport" | "network" | "link";

const LAYERS: Layer[] = ["application", "transport", "network", "link", "physical"];
const LAYER_NAME: Record<Layer, string> = { application: "Application", transport: "Transport", network: "Network", link: "Link", physical: "Physical" };
const LAYER_TONE: Partial<Record<Layer, Tone>> = { transport: NET_TONE.transport, network: NET_TONE.network, link: NET_TONE.link };

/** A zero-size anchor that edges attach to. */
const at = (id: string, x: number, y: number) => <Space key={id} id={id} x={x} y={y} />;
/** Lane header width: the widest name, so every header box matches. */
const headWidth = (names: string[]) => Math.max(...names.map((n) => measure(n, FONT.title, { weight: 500 }))) + 2 * NODE.padX;

// --- protocol stacks ---------------------------------------------------------------------------------------------

export interface Stack {
  title?: string;
  /** highest layer the device runs: a router stops at `network`, a switch at `link` */
  top?: Layer;
}

/** Devices' layer columns side by side, bottom-aligned so layers line up; `path` threads a packet down the first, over each middle device's top layer, and up the last; `highlight` keeps only that layer's hue. */
export function ProtocolStack({ id = "stack", stacks, path = false, highlight }: { id?: string; stacks: Stack[]; path?: boolean; highlight?: Layer }) {
  const threaded = path && stacks.length > 1;
  // the box width leaves a lane each side of the widest label for the path's verticals
  const W = 128, H = 30, GAP = 4, IN = 13, WIRE = 24, TOP = threaded ? 12 : 0;
  const edges: ReactNode[] = [];
  const line = (from: string, to: string, head: "end" | "none" = "none") => edges.push(<Edge key={`${from}>${to}`} from={from} to={to} route="straight" head={head} />);
  const cols = stacks.map((s, i) => {
    const k = `${id}.${i}`;
    const layers = LAYERS.slice(LAYERS.indexOf(s.top ?? "application"));
    const bottom = TOP + layers.length * (H + GAP) - GAP;
    const role = !threaded ? null : i === 0 ? "first" : i === stacks.length - 1 ? "last" : "middle";
    const anchors: ReactNode[] = [];
    if (role === "first") {
      anchors.push(at(`${k}.top`, W - IN, 0), at(`${k}.out`, W - IN, bottom));
      line(`${k}.top`, `${k}.out`);
    } else if (role === "middle") {
      // up the left lane, over the top layer, down the right lane
      anchors.push(at(`${k}.in`, IN, bottom), at(`${k}.up`, IN, WIRE), at(`${k}.dn`, W - IN, WIRE), at(`${k}.out`, W - IN, bottom));
      line(`${k}.in`, `${k}.up`);
      edges.push(<Edge key={`${k}.turn`} from={`${k}.up`} to={`${k}.dn`} route="ortho" fromSide="top" toSide="top" head="none" />);
      line(`${k}.dn`, `${k}.out`);
    } else if (role === "last") {
      anchors.push(at(`${k}.in`, IN, bottom), at(`${k}.top`, IN, 0));
      line(`${k}.in`, `${k}.top`, "end");
    }
    if (role && role !== "last")
      edges.push(<Edge key={`${k}.wire`} from={`${k}.out`} to={`${id}.${i + 1}.in`} route="ortho" fromSide="bottom" toSide="bottom" />);
    return (
      <Col key={k} gap={6}>
        <Free>
          {layers.map((l, j) => (
            <Node
              key={l}
              id={`${k}.${l}`}
              x={0}
              y={TOP + j * (H + GAP)}
              w={W}
              h={H}
              title={LAYER_NAME[l]}
              tone={highlight && l !== highlight ? undefined : LAYER_TONE[l]}
              state={l === highlight ? "strong" : undefined}
            />
          ))}
          {anchors}
          {/* room for the wire that runs under the stacks */}
          {threaded && <Space x={0} y={bottom + WIRE + 4} />}
        </Free>
        {s.title && <Text text={s.title} weight={500} />}
      </Col>
    );
  });
  return (
    <>
      <Row gap={40} align="end">
        {cols}
      </Row>
      {edges}
    </>
  );
}

// --- encapsulation -----------------------------------------------------------------------------------------------

export type Segment = string | { text: string; layer?: HeaderLayer; unit?: string };
const UNIT: Record<HeaderLayer, string> = { link: "Frame", network: "Packet", transport: "Segment" };

/** An encapsulated packet as a strip of headers, payload and trailers, each header in its layer's hue; `nested` draws the onion, each layer's unit wrapping the one above. */
export function Packet({ segments, nested = false }: { segments: Segment[]; nested?: boolean }) {
  const segs = segments.map((s) => (typeof s === "string" ? { text: s } : s));
  const node = (s: (typeof segs)[number], key: string | number) => (
    <Node key={key} title={s.text} tone={s.layer && LAYER_TONE[s.layer]} h={32} w={s.layer || nested ? undefined : Math.max(96, measure(s.text, FONT.title, { weight: 500 }) + 2 * NODE.padX)} />
  );
  if (!nested) return <Row gap={3}>{segs.map(node)}</Row>;
  // leading layered segments are headers, outermost first; after them, neutral ones are payload and layered ones trailers
  const body = segs.findIndex((s) => !s.layer);
  const headers = body < 0 ? segs : segs.slice(0, body);
  const rest = segs.slice(headers.length);
  const wrap = (i: number): ReactNode => {
    if (i === headers.length) return rest.map((s, j) => (s.layer ? null : node(s, `p${j}`)));
    const h = headers[i];
    const layer = h.layer!;
    return (
      <Group key={i} title={h.unit ?? UNIT[layer]} tone={LAYER_TONE[layer]} dir="row" gap={4} pad={8} align="stretch">
        {node(h, i)}
        {wrap(i + 1)}
        {rest.map((t, j) => (t.layer === layer ? node(t, `t${j}`) : null))}
      </Group>
    );
  };
  return wrap(0);
}

// --- header formats ----------------------------------------------------------------------------------------------

export type Field = [name: string, bits: number];
const HEADERS: Record<"ipv4" | "ipv6", Field[]> = {
  ipv4: [
    ["Version", 4], ["IHL", 4], ["DSCP/ECN", 8], ["Total Length", 16],
    ["Identification", 16], ["Flags", 3], ["Fragment Offset", 13],
    ["TTL", 8], ["Protocol", 8], ["Header Checksum", 16],
    ["Source Address", 32],
    ["Destination Address", 32],
  ],
  ipv6: [
    ["Version", 4], ["Traffic Class", 8], ["Flow Label", 20],
    ["Payload Length", 16], ["Next Header", 8], ["Hop Limit", 8],
    ["Source Address", 128],
    ["Destination Address", 128],
  ],
};
/** Pixels per bit, so a 32-bit row is 576 wide; shared by headers and addresses. */
const BIT = 18;
/** Gap between neighbouring boxes on the bit scale. */
const SEAM = 3;
const ROW_H = 30;

/** A protocol header drawn 32 bits per row under a bit ruler, each field as wide as its bit count (a field of 64 or 128 bits spans whole rows); `highlight` tints the named fields in the header's layer hue. */
export function HeaderFormat({ fields, highlight = [], layer = "network" }: { fields: "ipv4" | "ipv6" | Field[]; highlight?: string[]; layer?: HeaderLayer }) {
  const list = typeof fields === "string" ? HEADERS[fields] : fields;
  const top = 22;
  let bit = 0;
  const boxes = list.map(([name, bits], i) => {
    const row = Math.floor(bit / 32), col = bit % 32;
    const rows = Math.max(1, bits / 32);
    bit += bits;
    return (
      <Node
        key={i}
        title={name}
        sub={rows > 1 ? `${bits} bits` : undefined}
        x={col * BIT}
        y={top + row * (ROW_H + SEAM)}
        w={Math.min(bits, 32) * BIT - SEAM}
        h={rows * (ROW_H + SEAM) - SEAM}
        tone={highlight.includes(name) ? LAYER_TONE[layer] : undefined}
      />
    );
  });
  const ruler = [0, 8, 16, 24].map((b) => <Text key={b} text={String(b)} size="note" mono muted x={b * BIT} y={0} />);
  return (
    <Free>
      {ruler}
      <Text text="31" size="note" mono muted x={32 * BIT - SEAM - measure("31", FONT.note - 0.5, { mono: true })} y={0} />
      {boxes}
    </Free>
  );
}

// --- addresses ---------------------------------------------------------------------------------------------------

/** An IPv4 address in CIDR form split into network prefix and host part, octets drawn to bit scale; `mask` adds the netmask row, `octet` (0 to 3) spells that octet out in bits. */
export function AddressBits({ id = "addr", cidr, mask = false, octet }: { id?: string; cidr: string; mask?: boolean; octet?: number }) {
  const [ip, len] = cidr.split("/");
  const p = Number(len ?? 32);
  const octets = ip.split(".").map(Number);
  const inPrefix = (k: number) => p >= 8 * (k + 1);
  const masks = octets.map((_, k) => (0xff << (8 - Math.min(8, Math.max(0, p - 8 * k)))) & 0xff);
  const tone = NET_TONE.network;
  const OW = 8 * BIT - SEAM;
  const rowY = (r: number) => 26 + r * (ROW_H + 8);
  const row = (values: number[], r: number) =>
    values.map((v, k) => <Node key={`${r}.${k}`} title={String(v)} mono x={8 * k * BIT} y={rowY(r)} w={OW} h={ROW_H} tone={inPrefix(k) ? tone : undefined} />);
  // a dimension line per part, its bit count on the line; the words drop when the span is too short for them
  const dim = (key: string, x0: number, x1: number, words: string, n: number) => {
    const label = [`${words}: ${n} bits`, `${n} bits`, `${n}`].find((l) => labelPillW(l) + 24 <= x1 - x0) ?? `${n}`;
    return [at(`${id}.${key}0`, x0, 8), at(`${id}.${key}1`, x1, 8), <Edge key={key} from={`${id}.${key}0`} to={`${id}.${key}1`} route="straight" head="both" label={label} />];
  };
  const rows = mask ? 2 : 1;
  const bits = octet === undefined ? null : octets[octet].toString(2).padStart(8, "0").split("");
  return (
    <Free>
      {p > 0 && dim("pre", 0, p * BIT - SEAM, "network prefix", p)}
      {p < 32 && dim("host", p * BIT, 32 * BIT - SEAM, "host", 32 - p)}
      {row(octets, 0)}
      {mask && row(masks, 1)}
      {bits && (
        <Cells
          x={8 * octet! * BIT}
          y={rowY(rows) + 2}
          cell={OW / 8}
          items={bits.map((b, j) => ({ label: b, tone: 8 * octet! + j < p ? tone : undefined }))}
        />
      )}
    </Free>
  );
}

// --- message sequence charts -------------------------------------------------------------------------------------

export interface Message {
  /** sender's lane index */
  from: number;
  /** receiver's lane index; a fraction such as 0.5 stops between lanes, for a message lost on the way */
  to: number;
  label?: string;
  /** muted text in the right margin, on the message's row */
  note?: string;
  /** dashed, e.g. a broadcast */
  dashed?: boolean;
  /** discarded where it ends: red, with a cross in place of the chevron */
  drop?: boolean;
}

/** A message sequence chart: lanes across the top, time running down, one numbered message per row; `slant` makes every message take a row to arrive. */
export function SequenceChart({ id = "seq", lanes, messages, slant = false }: { id?: string; lanes: string[]; messages: Message[]; slant?: boolean }) {
  const headW = headWidth(lanes);
  // a label needs clear line on both sides, also on a message that stops short of the next lane
  const pitch = Math.max(headW + 24, 150, ...messages.map((m) => (m.label ? (labelPillW(m.label) + 40) / Math.min(1, Math.abs(m.to - m.from)) : 0)));
  const x = (lane: number) => headW / 2 + lane * pitch;
  const ROW = 36;
  const dep = (i: number) => NODE.h + 26 + i * ROW;
  const bottom = dep(messages.length - 1) + (slant ? ROW : 0) + 18;
  const noteX = x(lanes.length - 1) + 24;
  const crossR = 4;

  const items: ReactNode[] = [];
  const edges: ReactNode[] = [];
  lanes.forEach((name, l) => {
    items.push(<Node key={`h${l}`} id={`${id}.l${l}`} title={name} x={x(l) - headW / 2} y={0} w={headW} />, at(`${id}.end${l}`, x(l), bottom));
    edges.push(<Edge key={`life${l}`} from={`${id}.l${l}`} to={`${id}.end${l}`} route="straight" head="none" state="ghost" />);
  });
  messages.forEach((m, i) => {
    const dir = Math.sign(m.to - m.from);
    const stops = [m.from];
    for (let l = m.from + dir; dir > 0 ? l < m.to : l > m.to; l += dir) stops.push(l);
    stops.push(m.to);
    // a slanted message drops one row per whole lane distance, so a message lost halfway is lost halfway in time too
    const span = Math.max(1, Math.ceil(Math.abs(m.to - m.from)));
    const y = (lane: number) => dep(i) + (slant ? (ROW * Math.abs(lane - m.from)) / span : 0);
    const mid = dep(i) + (slant ? ROW / 2 : 0);
    const n = stops.length - 1;
    const labelAt = Math.floor((n - 1) / 2);
    const tone = m.drop ? NET_TONE.drop : undefined;
    stops.forEach((l, k) => items.push(at(`${id}.m${i}.${k}`, x(l), y(l))));
    for (let k = 0; k < n; k++)
      edges.push(
        <Edge
          key={`m${i}.${k}`}
          from={`${id}.m${i}.${k}`}
          to={`${id}.m${i}.${k + 1}`}
          route="straight"
          head={k === n - 1 && !m.drop ? "end" : "none"}
          dashed={m.dashed}
          tone={tone}
          label={k === labelAt ? m.label : undefined}
        />,
      );
    if (m.drop) {
      const ex = x(m.to), ey = y(m.to);
      [[-1, -1, 1, 1], [-1, 1, 1, -1]].forEach(([ax, ay, bx, by], c) => {
        items.push(at(`${id}.x${i}.${c}a`, ex + ax * crossR, ey + ay * crossR), at(`${id}.x${i}.${c}b`, ex + bx * crossR, ey + by * crossR));
        edges.push(<Edge key={`x${i}.${c}`} from={`${id}.x${i}.${c}a`} to={`${id}.x${i}.${c}b`} route="straight" head="none" tone={tone} />);
      });
    }
    items.push(<Text key={`n${i}`} text={String(i + 1)} size="note" mono muted x={0} y={mid - 8} />);
    if (m.note) items.push(<Text key={`t${i}`} text={m.note} size="note" muted x={noteX} y={mid - 8} />);
  });
  return (
    <>
      <Free>{items}</Free>
      {edges}
    </>
  );
}

// --- time-space diagrams -----------------------------------------------------------------------------------------

export interface Send {
  from: number;
  to: number;
  /** time the first bit leaves */
  at: number;
  /** transmission time L/R: the last bit leaves at `at + tx` */
  tx: number;
  label?: string;
  /** default: the link hue */
  tone?: Tone;
}

export interface Span {
  from: number;
  to: number;
  label: string;
  /** margin it sits in: left of the first axis (default) or right of the last */
  side?: "left" | "right";
}

/** A time-space diagram: one time axis per node, time running down; each send is a band whose top edge is its first bit and bottom edge its last, arriving `prop` later; spans measure intervals in the margins. */
export function TimeSpace({ id = "ts", lanes, prop, sends, spans = [] }: { id?: string; lanes: string[]; prop: number; sends: Send[]; spans?: Span[] }) {
  const headW = headWidth(lanes);
  const PITCH = Math.max(headW + 40, 168), HEIGHT = 230;
  const end = Math.max(...sends.map((s) => s.at + s.tx + prop), ...spans.map((s) => s.to));
  const pill = (side: "left" | "right") => Math.max(0, ...spans.filter((s) => (s.side ?? "left") === side).map((s) => labelPillW(s.label)));
  const x0 = Math.max(headW / 2, pill("left") + 12);
  const x = (lane: number) => x0 + lane * PITCH;
  const last = lanes.length - 1;
  const y = (t: number) => NODE.h + 18 + (t * HEIGHT) / end;
  const bottom = y(end) + 26;
  const dimX = { left: x0 - 8 - pill("left") / 2, right: x(last) + 8 + pill("right") / 2 };

  const items: ReactNode[] = [];
  const guides: ReactNode[] = [];
  const edges: ReactNode[] = [];
  lanes.forEach((name, l) => {
    items.push(<Node key={`h${l}`} id={`${id}.l${l}`} title={name} x={x(l) - headW / 2} y={0} w={headW} />, at(`${id}.end${l}`, x(l), bottom));
    edges.push(<Edge key={`axis${l}`} from={`${id}.l${l}`} to={`${id}.end${l}`} route="straight" />);
  });
  /** Every corner of every band, as [lane, time]. */
  const events = sends.flatMap((s) => [[s.from, s.at], [s.from, s.at + s.tx], [s.to, s.at + prop], [s.to, s.at + s.tx + prop]]);
  sends.forEach((s, i) => {
    const tone = s.tone ?? NET_TONE.link;
    const p = (c: string, lane: number, t: number) => items.push(at(`${id}.s${i}${c}`, x(lane), y(t)));
    p("a", s.from, s.at);
    p("b", s.from, s.at + s.tx);
    p("c", s.to, s.at + prop);
    p("d", s.to, s.at + s.tx + prop);
    const seg = (a: string, b: string, thick?: boolean) => (
      <Edge key={`s${i}${a}${b}`} from={`${id}.s${i}${a}`} to={`${id}.s${i}${b}`} route="straight" head="none" tone={tone} thick={thick} />
    );
    edges.push(seg("a", "c"), seg("b", "d"), seg("a", "b", true), seg("c", "d", true));
    if (s.label) {
      const w = measure(s.label, FONT.note);
      items.push(<Text key={`sl${i}`} text={s.label} size="note" tone={tone} x={(x(s.from) + x(s.to)) / 2 - w / 2} y={y(s.at + (s.tx + prop) / 2) - 8} />);
    }
  });
  spans.forEach((sp, i) => {
    const side = sp.side ?? "left";
    const dx = dimX[side];
    [sp.from, sp.to].forEach((t, e) => {
      // a guide runs from the span to the nearest axis where something happens at that time, so it never crosses a band
      const lanesAt = events.filter(([, et]) => Math.abs(et - t) < 1e-9).map(([l]) => l);
      const lane = !lanesAt.length ? (side === "left" ? 0 : last) : side === "left" ? Math.min(...lanesAt) : Math.max(...lanesAt);
      items.push(at(`${id}.d${i}${e}`, dx, y(t)), at(`${id}.g${i}${e}`, x(lane), y(t)));
      guides.push(<Edge key={`g${i}${e}`} from={`${id}.d${i}${e}`} to={`${id}.g${i}${e}`} route="straight" head="none" dashed state="ghost" />);
    });
    edges.push(<Edge key={`d${i}`} from={`${id}.d${i}0`} to={`${id}.d${i}1`} route="straight" head="both" label={sp.label} />);
  });
  return (
    <>
      <Free>{items}</Free>
      {guides}
      {edges}
    </>
  );
}

/** Building blocks a note may also compose directly inside `<Diagram>`. */
export const packetFigures = { ProtocolStack, Packet, HeaderFormat, AddressBits, SequenceChart, TimeSpace };
