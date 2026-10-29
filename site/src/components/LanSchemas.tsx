import type { ReactNode } from "react";
import { Cells, Col, Diagram, Edge, FONT, Free, Group, measure, Node, NODE, Path, Row, Space, Text, type Tone } from "@/components/figure";
import { Link, NET_TONE, Router, ROUTER_SIZE } from "@/components/NetworkFigures";
import { SequenceChart } from "@/components/PacketFigures";

interface FigureProps {
  title?: string;
  caption?: string;
  className?: string;
}

/** A zero-size anchor that edges attach to. */
const at = (id: string, x: number, y: number) => <Space key={id} id={id} x={x} y={y} />;

// --- frame formats -----------------------------------------------------------------------------------------------

/** One field of a frame: its name, its size, the link hue for MAC header fields, `strong` for the field in focus, `w` to widen it. */
interface Field {
  name: string;
  size: string;
  tone?: Tone;
  strong?: boolean;
  w?: number;
}
/** A dimension line above fields `from` to `to`, inclusive; the first span sits nearest the strip. */
type Span = [from: number, to: number, label: string];

const SEAM = 3;
const SPAN_ROW = 26;
const MAC = NET_TONE.link;

/** A frame as a strip of fields, in transmission order, not to scale; spans name groups of fields above it. */
function FrameStrip({ id, fields, spans = [] }: { id: string; fields: Field[]; spans?: Span[] }) {
  const w = fields.map((f) => f.w ?? Math.max(measure(f.name, FONT.title, { weight: 500 }), measure(f.size, FONT.note)) + 2 * NODE.padX);
  const x = w.map((_, i) => w.slice(0, i).reduce((sum, wi) => sum + wi + SEAM, 0));
  const top = spans.length * SPAN_ROW;
  return (
    <Free>
      {spans.flatMap(([from, to, label], r) => {
        const k = `${id}.s${r}`, y = top - (r + 1) * SPAN_ROW + 10;
        return [at(`${k}a`, x[from], y), at(`${k}b`, x[to] + w[to], y), <Edge key={k} from={`${k}a`} to={`${k}b`} route="straight" head="both" label={label} />];
      })}
      {fields.map((f, i) => (
        <Node key={i} title={f.name} sub={f.size} x={x[i]} y={top} w={w[i]} tone={f.tone} state={f.strong ? "strong" : undefined} />
      ))}
    </Free>
  );
}

const DST: Field = { name: "Destination", size: "6 B", tone: MAC };
const SRC: Field = { name: "Source", size: "6 B", tone: MAC };
const TYPE: Field = { name: "Ethertype", size: "2 B", tone: MAC };
const FCS: Field = { name: "FCS", size: "4 B", tone: MAC };

export function EthernetFrameSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "An Ethernet v2 frame in transmission order, not to scale. The MAC header and the FCS are blue. The preamble and the SFD come before the frame and do not count in its size."}
      className={className}
    >
      <FrameStrip
        id="eth"
        fields={[{ name: "Preamble", size: "7 B" }, { name: "SFD", size: "1 B" }, DST, SRC, TYPE, { name: "Payload", size: "46–1500 B" }, FCS]}
        spans={[
          [2, 4, "MAC header"],
          [2, 6, "frame: 64 to 1518 B"],
        ]}
      />
    </Diagram>
  );
}

export function MacsecFrameSchema({ title, caption, className }: FigureProps) {
  const payload = measure("incl. Ethertype, VLAN tag", FONT.note) + 2 * NODE.padX;
  return (
    <Diagram
      title={title}
      caption={caption ?? "A MACsec frame. Its Ethertype is 0x88e5, and the original Ethertype moves into the encrypted payload."}
      className={className}
    >
      <FrameStrip
        id="macsec"
        fields={[DST, SRC, TYPE, { name: "SecTAG", size: "16 B", tone: MAC }, { name: "Payload", size: "incl. Ethertype, VLAN tag", w: payload }, { name: "ICV", size: "16 B", tone: MAC }, FCS]}
        spans={[
          [4, 4, "encrypted"],
          [0, 4, "authenticated by the ICV"],
        ]}
      />
    </Diagram>
  );
}

// --- MAC addresses -----------------------------------------------------------------------------------------------

export function MacAddressSchema({ title, caption, className }: FigureProps) {
  const BYTE = 56, GAP = 6, BIT = 28, H = NODE.h;
  const bytes = ["08", "00", "20", "71", "0d", "d4"];
  const bx = (i: number) => i * (BYTE + GAP);
  const top = 2 * SPAN_ROW - 16, bitsY = top + H + 36;
  const bits = (0x08).toString(2).padStart(8, "0").split("");
  const tag = (text: string, cell: number) => (
    <Text key={text} text={text} size="note" weight={600} tone={MAC} x={cell * BIT + (BIT - measure(text, FONT.note, { weight: 600 })) / 2} y={bitsY + BIT + 6} />
  );
  const span = (k: string, a: number, b: number, label: string) => [
    at(`mac.${k}a`, bx(a), 10),
    at(`mac.${k}b`, bx(b) + BYTE, 10),
    <Edge key={k} from={`mac.${k}a`} to={`mac.${k}b`} route="straight" head="both" label={label} />,
  ];
  return (
    <Diagram
      title={title}
      caption={caption ?? "The MAC address 08:00:20:71:0d:d4. Its first byte, 0x08, is written below in binary, most significant bit first. Its last bit is the I/G bit and the one before it is the U/L bit. Both are 0: one interface, numbered by its manufacturer."}
      className={className}
    >
      <Free>
        {span("oui", 0, 2, "OUI")}
        {span("ser", 3, 5, "serial number")}
        {bytes.map((b, i) => (
          <Node key={b + i} title={b} mono x={bx(i)} y={top} w={BYTE} h={H} tone={i === 0 ? MAC : undefined} />
        ))}
        <Path points={[[0, top + H], [0, bitsY]]} thin />
        <Path points={[[BYTE, top + H], [8 * BIT, bitsY]]} thin />
        <Cells x={0} y={bitsY} cell={BIT} items={bits.map((b, j) => ({ label: b, tone: j >= 6 ? MAC : undefined }))} />
        {tag("U/L", 6)}
        {tag("I/G", 7)}
      </Free>
    </Diagram>
  );
}

// --- VLANs -------------------------------------------------------------------------------------------------------

const SW_W = 52;
const HOST_W = 72;

/** A switch box centred on (cx, cy), as in the switch topologies. */
const Sw = ({ id, cx, cy }: { id: string; cx: number; cy: number }) => <Node id={id} title={id} x={cx - SW_W / 2} y={cy - NODE.h / 2} w={SW_W} />;
/** A host box centred on (cx, cy), its VLAN underneath its name. */
const VlanHost = ({ id, vlan, cx, cy }: { id: string; vlan: number; cx: number; cy: number }) => (
  <Node id={id} title={id} sub={`VLAN ${vlan}`} x={cx - HOST_W / 2} y={cy - NODE.hSub / 2} w={HOST_W} />
);

export function VlanTrunkSchema({ title, caption, className }: FigureProps) {
  const hosts: [string, number, string, number][] = [
    ["A", 2, "S1", 50],
    ["C", 3, "S1", 190],
    ["Y", 2, "S2", 330],
    ["D", 3, "S2", 470],
  ];
  return (
    <Diagram
      title={title}
      caption={caption ?? "Two switches carry VLANs 2 and 3. Each host port belongs to one VLAN and carries untagged frames. The trunk link between S1 and S2 carries both VLANs, so each of its frames holds a VLAN tag."}
      className={className}
    >
      <Col gap={28} align="center">
        <Free>
          <Sw id="S1" cx={120} cy={NODE.h / 2} />
          <Sw id="S2" cx={400} cy={NODE.h / 2} />
          {hosts.map(([id, vlan, , cx]) => (
            <VlanHost key={id} id={id} vlan={vlan} cx={cx} cy={130} />
          ))}
        </Free>
        <Col gap={10} align="center">
          <Text text="A frame on the trunk link" weight={500} />
          <FrameStrip id="tagged" fields={[DST, SRC, { name: "VLAN tag", size: "4 B", tone: MAC, strong: true }, TYPE, { name: "Payload", size: "46–1500 B" }, FCS]} />
        </Col>
      </Col>
      <Link from="S1" to="S2" label="trunk" route="straight" />
      {hosts.map(([id, , sw]) => (
        <Link key={id} from={id} to={sw} route="straight" />
      ))}
    </Diagram>
  );
}

export function VlanRouterSchema({ title, caption, className }: FigureProps) {
  const cy = NODE.h / 2 + 8;
  const hosts: [string, number, number][] = [
    ["A", 2, 130],
    ["Y", 2, 240],
    ["C", 3, 350],
    ["D", 3, 460],
  ];
  return (
    <Diagram
      title={title}
      caption={caption ?? "VLAN 2 (A, Y) and VLAN 3 (C, D) share switch S1. Router R joins S1 through a trunk link and is the gateway of both VLANs."}
      className={className}
    >
      <Free>
        <Router id="R" label="R" x={90} y={cy - ROUTER_SIZE / 2} />
        <Sw id="S1" cx={295} cy={cy} />
        {hosts.map(([id, vlan, cx]) => (
          <VlanHost key={id} id={id} vlan={vlan} cx={cx} cy={cy + 120} />
        ))}
      </Free>
      <Link from="R" to="S1" label="trunk" route="straight" />
      {hosts.map(([id]) => (
        <Link key={id} from={id} to="S1" fromSide="top" toSide="bottom" route="straight" />
      ))}
    </Diagram>
  );
}

// --- bridges -----------------------------------------------------------------------------------------------------

/** Room a link needs between two row items to carry a short label such as `WiFi`. */
const LABELLED = 28;
/** An observation point on a link: a small numbered circle the link passes through. */
const Point = ({ id, n }: { id: string; n: number }) => <Node id={id} title={String(n)} shape="circle" w={22} />;
/** A device with two interfaces, each a box named by its MAC address. */
const TwoPorts = ({ id, name, ports }: { id: string; name: string; ports: [string, string] }) => (
  <Group title={name} dir="row" gap={4} pad={8}>
    <Node id={`${id}.0`} title={ports[0]} />
    <Node id={`${id}.1`} title={ports[1]} />
  </Group>
);
/** Device of an id: a port `x.0` or `x.1` belongs to `x`. */
const device = (id: string) => id.replace(/\.\d$/, "");
/** A chain of links through `ids`, labelled where `labels` says; the two ports of one device are not linked. */
const chain = (ids: string[], labels: Record<number, string> = {}) =>
  ids.slice(1).map((to, i) => (device(ids[i]) === device(to) ? null : <Link key={`${ids[i]}-${to}`} from={ids[i]} to={to} label={labels[i]} route="straight" />));

export function BridgedPathSchema({ title, caption, className }: FigureProps) {
  const panel = (k: string, name: string, middle: ReactNode, ids: string[], wifi: Record<number, string>) => (
    <Col key={k} gap={10} align="start">
      <Text text={name} weight={500} />
      <Row gap={24} align="center">
        <Node id={`${k}.srv`} title="Web server" sub="M1" />
        <Point id={`${k}.p1`} n={1} />
        {middle}
        <Node id={`${k}.eli`} title="Elaine" sub="M4" />
      </Row>
      {chain([`${k}.srv`, `${k}.p1`, ...ids, `${k}.eli`], wifi)}
    </Col>
  );
  return (
    <Diagram
      title={title}
      caption={caption ?? "The web server reaches Elaine's phone through one bridged network. Unlabelled links are Ethernet. Top: a bridge with interfaces M2 and M3 talks to a WiFi base station over WiFi. Bottom: an access point with Ethernet interface M2."}
      className={className}
    >
      <Col gap={28} align="start">
        {panel(
          "ext",
          "Bridge and base station",
          <>
            <TwoPorts id="ext.br" name="Bridge" ports={["M2", "M3"]} />
            <Space w={LABELLED} />
            <Node id="ext.bs" title="Base station" />
            <Space w={LABELLED} />
          </>,
          ["ext.br.0", "ext.br.1", "ext.bs"],
          { 3: "WiFi", 4: "WiFi" },
        )}
        {panel(
          "ap",
          "Access point",
          <>
            <Node id="ap.ap" title="Access point" sub="M2" />
            <Space w={LABELLED} />
          </>,
          ["ap.ap"],
          { 2: "WiFi" },
        )}
      </Col>
    </Diagram>
  );
}

export function MeshWifiSchema({ title, caption, className }: FigureProps) {
  const ids = ["A", "p1", "M1", "M2", "p2", "M3", "M4", "B"];
  return (
    <Diagram
      title={title}
      caption={caption ?? "A frame from A to B over mesh WiFi. Base stations M1 and M4 serve the hosts; relays M2 and M3 join them. Every link is WiFi."}
      className={className}
    >
      <Row gap={24} align="center">
        {ids.map((id) =>
          id.startsWith("p") ? <Point key={id} id={id} n={Number(id[1])} /> : <Node key={id} id={id} title={id} shape={id.startsWith("M") ? "box" : "circle"} />,
        )}
      </Row>
      {chain(ids)}
    </Diagram>
  );
}

// --- security ----------------------------------------------------------------------------------------------------

export function Dot1xSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "IEEE 802.1X admission, time running down. The base station relays the TLS messages (chevrons) but cannot read them. Only the server checks the credentials."}
      className={className}
    >
      <SequenceChart
        id="dot1x"
        lanes={["Host", "Base station", "RADIUS server"]}
        pitch={130}
        messages={[
          { from: 0, to: 1, label: "request", note: "the host asks to join" },
          { from: 1, to: 2, label: "request", note: "the base station asks the server" },
          { from: 0, to: 2, label: "TLS setup", relayed: true, note: "a secure tunnel, e.g. PEAP" },
          { from: 0, to: 2, label: "credentials", relayed: true, note: "inside the tunnel, e.g. MSCHAPv2" },
          { from: 2, to: 1, label: "accept", note: "the server admits the host" },
          { from: 0, to: 1, label: "frames", note: "authenticated and encrypted" },
        ]}
      />
    </Diagram>
  );
}

export function BartLisaSchema({ title, caption, className }: FigureProps) {
  return (
    <Diagram
      title={title}
      caption={caption ?? "Lisa plugs into the Ethernet port M2 of Bart's PC. Bart's PC reaches the EPFL base station over WiFi, from its interface M1."}
      className={className}
    >
      <Row gap={24} align="center">
        <Node id="lisa" title="Lisa" sub="M3" />
        <TwoPorts id="bart" name="Bart's PC" ports={["M2", "M1"]} />
        <Space w={LABELLED} />
        <Point id="p1" n={1} />
        <Node id="bs" title="Base station" sub="access control" />
      </Row>
      {chain(["lisa", "bart.0", "bart.1", "p1", "bs"], { 2: "WiFi" })}
    </Diagram>
  );
}
