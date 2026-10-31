import type { ReactNode } from "react";
import { Cells, Col, Edge, FONT, Canvas, Group, measure, Node, NODE, Poly, Row, Space, Text, type Tone, labelPillW } from "figure";
import { SequenceChart, TimeSpace, headWidth } from "figure";
import { NET_TONE } from "@/components/NetworkFigures";

export type Layer = "application" | "transport" | "network" | "link" | "physical";
/** Layers that add a header, each in its course hue; application data and the physical layer stay neutral. */
type HeaderLayer = "transport" | "network" | "link";

const LAYERS: Layer[] = ["application", "transport", "network", "link", "physical"];
const LAYER_NAME: Record<Layer, string> = { application: "Application", transport: "Transport", network: "Network", link: "Link", physical: "Physical" };
const LAYER_TONE: Partial<Record<Layer, Tone>> = { transport: NET_TONE.transport, network: NET_TONE.network, link: NET_TONE.link };


// --- protocol stacks ---------------------------------------------------------------------------------------------

export interface Stack {
  title?: string;
  /** highest layer the device runs: a router stops at `network`, a switch at `link` */
  top?: Layer;
  /** link technology per interface, e.g. `["Ethernet"]`; two names split the link and physical layers into one box per interface, the path entering by the first and leaving by the second */
  link?: string[];
}

/** Devices' layer columns side by side, bottom-aligned so layers line up; `path` threads a packet down the first, over each middle device's top layer, and up the last, always in the gutters beside the boxes; `highlight` keeps only that layer's hue. */
export function ProtocolStack({ id = "stack", stacks, path = false, highlight }: { id?: string; stacks: Stack[]; path?: boolean; highlight?: Layer }) {
  const threaded = path && stacks.length > 1;
  // G: gutter between a box and the path beside it; the ortho router turns a same-side elbow TURN px out
  const H = 30, GAP = 4, G = threaded ? 9 : 0, TURN = 24, CLEAR = 10, TOP = threaded ? CLEAR : 0;
  const split = (s: Stack) => (s.link?.length ?? 0) > 1;
  // one width for whole boxes and one for half boxes, so a layer's boxes match across devices
  const W = headWidth([...Object.values(LAYER_NAME), ...stacks.flatMap((s) => (split(s) ? [] : (s.link ?? [])))]);
  const HALF = headWidth([LAYER_NAME.physical, ...stacks.flatMap((s) => (split(s) ? s.link! : []))]);
  const edges: ReactNode[] = [];
  const line = (from: string, to: string, head: "end" | "none" = "none") => edges.push(<Edge key={`${from}>${to}`} from={from} to={to} route="straight" head={head} />);
  const cols = stacks.map((s, i) => {
    const k = `${id}.${i}`;
    const layers = LAYERS.slice(LAYERS.indexOf(s.top ?? "application"));
    const bottom = TOP + layers.length * (H + GAP) - GAP;
    const wide = split(s) ? 2 * HALF + GAP : W;
    const L = 0, R = wide + 2 * G;
    const role = !threaded ? null : i === 0 ? "first" : i === stacks.length - 1 ? "last" : "middle";
    const anchors: ReactNode[] = [];
    if (role === "first") {
      anchors.push(<Space key={`${k}.top`} id={`${k}.top`} at={[R, TOP]} />, <Space key={`${k}.out`} id={`${k}.out`} at={[R, bottom]} />);
      line(`${k}.top`, `${k}.out`);
    } else if (role === "middle") {
      // up the left gutter, over the top layer CLEAR px above it, down the right gutter
      const turn = TOP - CLEAR + TURN;
      anchors.push(<Space key={`${k}.in`} id={`${k}.in`} at={[L, bottom]} />, <Space key={`${k}.up`} id={`${k}.up`} at={[L, turn]} />, <Space key={`${k}.dn`} id={`${k}.dn`} at={[R, turn]} />, <Space key={`${k}.out`} id={`${k}.out`} at={[R, bottom]} />);
      line(`${k}.in`, `${k}.up`);
      edges.push(<Edge key={`${k}.turn`} from={`${k}.up`} to={`${k}.dn`} route="ortho" fromSide="top" toSide="top" head="none" />);
      line(`${k}.dn`, `${k}.out`);
    } else if (role === "last") {
      anchors.push(<Space key={`${k}.in`} id={`${k}.in`} at={[L, bottom]} />, <Space key={`${k}.top`} id={`${k}.top`} at={[L, TOP]} />);
      line(`${k}.in`, `${k}.top`, "end");
    }
    if (role && role !== "last")
      edges.push(<Edge key={`${k}.wire`} from={`${k}.out`} to={`${id}.${i + 1}.in`} route="ortho" fromSide="bottom" toSide="bottom" />);
    const box = (l: Layer, key: string, x: number, w: number, title: string, y: number) => (
      <Node
        key={key}
        id={`${k}.${key}`}
        at={[x, y]} anchor="nw"
        w={w}
        h={H}
        title={title}
        tone={highlight && l !== highlight ? undefined : LAYER_TONE[l]}
        state={l === highlight ? "strong" : undefined}
      />
    );
    const boxes = layers.flatMap((l, j) => {
      const y = TOP + j * (H + GAP);
      if (split(s) && (l === "link" || l === "physical"))
        return [0, 1].map((n) => box(l, `${l}${n}`, G + n * (HALF + GAP), HALF, l === "link" ? s.link![n] : LAYER_NAME[l], y));
      return [box(l, l, G, wide, l === "link" ? (s.link?.[0] ?? LAYER_NAME.link) : LAYER_NAME[l], y)];
    });
    return (
      <Col key={k} gap={8}>
        <Canvas>
          {boxes}
          {anchors}
          {/* room for the gutters and for the wire that runs under the stacks */}
          {threaded && <Space at={[R, bottom + TURN + 2]} />}
        </Canvas>
        {s.title && <Text text={s.title} weight={500} />}
      </Col>
    );
  });
  return (
    <>
      <Row gap={threaded ? 32 : 40} align="end">
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

/** The addresses a frame carries, each as [source, destination]; `n` is the numbered point it was captured at. */
export interface FrameAddrs {
  n?: number;
  mac: [string, string];
  ip: [string, string];
}

/** Frames as their MAC and IP headers side by side, one row per frame, every field one width so columns line up. */
export function FrameHeaders({ frames }: { frames: FrameAddrs[] }) {
  const w = Math.max(measure("destination", FONT.note), ...frames.flatMap((f) => [...f.mac, ...f.ip]).map((s) => measure(s, FONT.title, { weight: 500 }))) + 2 * NODE.padX;
  const header = (name: string, layer: HeaderLayer, [src, dst]: [string, string]) => (
    <Group title={name} tone={LAYER_TONE[layer]} dir="row" gap={4} pad={8}>
      <Node title={src} sub="source" tone={LAYER_TONE[layer]} w={w} />
      <Node title={dst} sub="destination" tone={LAYER_TONE[layer]} w={w} />
    </Group>
  );
  return (
    <Col gap={12} align="start">
      {frames.map((f, i) => (
        <Row key={i} gap={12} align="center">
          {f.n !== undefined && <Node title={String(f.n)} shape="circle" w={22} />}
          {header("MAC header", "link", f.mac)}
          {header("IP header", "network", f.ip)}
        </Row>
      ))}
    </Col>
  );
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
        at={[col * BIT, top + row * (ROW_H + SEAM)]} anchor="nw"
        w={Math.min(bits, 32) * BIT - SEAM}
        h={rows * (ROW_H + SEAM) - SEAM}
        tone={highlight.includes(name) ? LAYER_TONE[layer] : undefined}
      />
    );
  });
  const ruler = [0, 8, 16, 24].map((b) => <Text key={b} text={String(b)} size="note" mono muted at={[b * BIT, 0]} anchor="nw" />);
  return (
    <Canvas>
      {ruler}
      <Text text="31" size="note" mono muted at={[32 * BIT - SEAM - measure("31", FONT.note - 0.5, { mono: true }), 0]} anchor="nw" />
      {boxes}
    </Canvas>
  );
}

// --- addresses ---------------------------------------------------------------------------------------------------

/** An IPv4 address in CIDR form split into prefix and host part, octets drawn to bit scale; `mask` adds the netmask row in binary, so its 1s visibly span the prefix; `octet` (0 to 3) spells that octet out in bits. */
export function AddressBits({ id = "addr", cidr, mask = false, octet }: { id?: string; cidr: string; mask?: boolean; octet?: number }) {
  const [ip, len] = cidr.split("/");
  const p = Number(len ?? 32);
  const octets = ip.split(".").map(Number);
  const inPrefix = (k: number) => p >= 8 * (k + 1);
  const masks = octets.map((_, k) => (0xff << (8 - Math.min(8, Math.max(0, p - 8 * k)))) & 0xff);
  const tone = NET_TONE.network;
  const OW = 8 * BIT - SEAM;
  const rowY = (r: number) => 26 + r * (ROW_H + 8);
  const row = (values: string[], r: number) =>
    values.map((v, k) => <Node key={`${r}.${k}`} title={v} mono at={[8 * k * BIT, rowY(r)]} anchor="nw" w={OW} h={ROW_H} tone={inPrefix(k) ? tone : undefined} />);
  const binary = (n: number) => n.toString(2).padStart(8, "0");
  // a dimension line per part, its bit count on the line; the words drop when the span is too short for them
  const dim = (key: string, x0: number, x1: number, words: string, n: number) => {
    const label = [`${words}: ${n} bits`, `${n} bits`, `${n}`].find((l) => labelPillW(l) + 24 <= x1 - x0) ?? `${n}`;
    return [<Space key={`${id}.${key}0`} id={`${id}.${key}0`} at={[x0, 8]} />, <Space key={`${id}.${key}1`} id={`${id}.${key}1`} at={[x1, 8]} />, <Edge key={key} from={`${id}.${key}0`} to={`${id}.${key}1`} route="straight" head="both" label={label} />];
  };
  const rows = mask ? 2 : 1;
  const bits = octet === undefined ? null : binary(octets[octet]).split("");
  return (
    <Canvas>
      {p > 0 && dim("pre", 0, p * BIT - SEAM, "prefix", p)}
      {p < 32 && dim("host", p * BIT, 32 * BIT - SEAM, "host", 32 - p)}
      {row(octets.map(String), 0)}
      {mask && row(masks.map(binary), 1)}
      {bits && (
        <Cells
          at={[8 * octet! * BIT, rowY(rows) + 2]} anchor="nw"
          cell={OW / 8}
          items={bits.map((b, j) => ({ label: b, tone: 8 * octet! + j < p ? tone : undefined }))}
        />
      )}
    </Canvas>
  );
}

/** Building blocks a note may also compose directly inside `<Diagram>`. */
export const packetFigures = { ProtocolStack, Packet, FrameHeaders, HeaderFormat, AddressBits, SequenceChart, TimeSpace };
