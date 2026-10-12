import { Cells, Col, Edge, FONT, Group, Node, Space, Table, Tag, Text, type EdgeProps, type TableRow, type Tone } from "@/components/figure";
import { TAG } from "@/components/figure/theme";
import type { ReactNode } from "react";

/** Advanced Networks hues, one meaning each across the course. No orange anywhere. */
export const NET_TONE = {
  /** router identities: router 1, 2, 3 keep their hue in every figure */
  router: { 1: "blue", 2: "purple", 3: "green" },
  /** encapsulation headers, one per layer that adds one */
  link: "blue",
  network: "purple",
  transport: "green",
  /** dropped or rejected packets */
  drop: "red",
} as const satisfies { router: Record<number, Tone> } & Record<string, Tone | Record<number, Tone>>;

const routerTone = (n?: number): Tone | undefined => (n === undefined ? undefined : (NET_TONE.router as Record<number, Tone>)[n]);

/** Next hop: a router number (a solid chip in its hue) or an interface/text like `eth0` or `direct`. */
export type Hop = number | string;
/**
 * One forwarding entry: prefix, next hop, how the packet in focus treats it, and optionally the outgoing interface.
 * `used`: the entry the packet takes, outlined (neutral, so no router hue gains a second meaning);
 * `light`: matching but less specific, or derived, drawn lighter.
 */
export type Route = [prefix: string, hop: Hop, mark?: "used" | "light" | null, via?: string];

/** A router's forwarding table, tethered to router `of` by a short dashed line; `columns` adds a header row. */
export function ForwardingTable({ of, rows, columns }: { of: string; rows: Route[]; columns?: string[] }) {
  const id = `${of}-fib`;
  const toRow = ([prefix, hop, mark, via]: Route): TableRow => {
    const tone = typeof hop === "number" ? routerTone(hop) : undefined;
    const chip = tone ? { text: String(hop), tone, solid: mark !== "light" } : String(hop);
    return { cells: via ? [prefix, chip, via] : [prefix, chip], state: mark === "used" ? "strong" : mark === "light" ? "placeholder" : undefined };
  };
  return (
    <>
      <Table id={id} columns={columns} rows={rows.map(toRow)} />
      <Edge from={of} to={id} dashed head="none" />
    </>
  );
}

/** Side of a router box: 3 glyph cells of 10px plus 6px padding each side. */
export const ROUTER_SIZE = 42;
/** Height of a numbered router's badge, which rests on top of the box like a tab. */
export const ROUTER_BADGE = TAG.h;
/** Height a device's name adds under its box: a 4px gap and one line of note text. */
export const DEVICE_NAME = 4 + Math.round(FONT.note * 1.4);

/** A device's box with its name centred underneath, as every router and switch is named; the name's id is `${id}.name`, so a tether can start below it. */
const Named = ({ id, name, children }: { id: string; name?: string; children: ReactNode }) =>
  name === undefined ? (
    children
  ) : (
    <Col gap={0} align="center">
      {children}
      <Space h={DEVICE_NAME - Math.round(FONT.note * 1.4)} />
      <Text id={`${id}.name`} text={name} size="note" weight={600} />
    </Col>
  );

/** A router: square box, number badge in its hue on top, 3x3 switching glyph, `label` as its name underneath; `lit` cells (0-8, row-major) hint at the path; `table` hangs its forwarding table below; `x`/`y` place the box's top-left corner inside a `Free`, the badge sitting above it. */
export function Router({ id, n, lit = [], label, table, x, y }: { id: string; n?: number; lit?: number[]; label?: string; table?: Route[]; x?: number; y?: number }) {
  const tone = routerTone(n);
  const top = y === undefined || n === undefined ? y : y - ROUTER_BADGE;
  const box = (
    <Group id={id} tone={tone} pad={6}>
      <Cells cols={3} cell={10} items={Array.from({ length: 9 }, (_, i) => (lit.includes(i) ? { tone, state: "strong" } : {}))} />
    </Group>
  );
  return (
    <Col gap={14} align="center" x={x} y={top}>
      <Named id={id} name={label}>
        <Col gap={0} align="center">
          {n !== undefined && <Tag text={String(n)} tone={tone} />}
          {box}
        </Col>
      </Named>
      {table && <ForwardingTable of={label ? `${id}.name` : id} rows={table} />}
    </Col>
  );
}

/** An end system (laptop, server): its name and an optional address line. */
export function Host({ id, name, addr }: { id: string; name: string; addr?: string }) {
  return <Node id={id} title={name} sub={addr} />;
}

/** A link-layer switch: a wide flat box with a port strip, no number (it has no IP identity); `label` names it underneath, like a router. */
export function Switch({ id, label }: { id: string; label?: string }) {
  return (
    <Named id={id} name={label}>
      <Group id={id} pad={6}>
        <Cells cell={10} items={Array(6).fill(null)} />
      </Group>
    </Named>
  );
}

/** A subnet: a dashed outline titled with its prefix, holding hosts and a switch. */
export function Subnet({ prefix, children }: { prefix: string; children?: ReactNode }) {
  return (
    <Group title={prefix} gap={20} dashed>
      {children}
    </Group>
  );
}

/** A physical link: plain grey line, no arrowheads, optional label like `100 Mb/s`. */
export function Link(props: Omit<EdgeProps, "head">) {
  return <Edge {...props} head="none" />;
}

/** Building blocks a note may also compose directly inside `<Diagram>`. */
export const networkFigures = { Router, ForwardingTable, Host, Switch, Subnet, Link };
