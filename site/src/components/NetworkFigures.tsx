import { Cells, Col, Edge, Group, Node, Table, type EdgeProps, type TableRow, type Tone } from "@/components/figure";
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

/** A router: square box, number badge in its hue, 3x3 switching glyph; `lit` cells (0-8, row-major) hint at the path; `table` hangs its forwarding table below; `x`/`y` place it inside a `Free`. */
export function Router({ id, n, lit = [], label, table, x, y }: { id: string; n?: number; lit?: number[]; label?: string; table?: Route[]; x?: number; y?: number }) {
  const tone = routerTone(n);
  const box = (
    <Group id={id} title={label} badge={n === undefined ? undefined : String(n)} tone={tone} pad={6} x={table ? undefined : x} y={table ? undefined : y}>
      <Cells cols={3} cell={10} items={Array.from({ length: 9 }, (_, i) => (lit.includes(i) ? { tone, state: "strong" } : {}))} />
    </Group>
  );
  if (!table) return box;
  return (
    <Col gap={14} align="center" x={x} y={y}>
      {box}
      <ForwardingTable of={id} rows={table} />
    </Col>
  );
}

/** An end system (laptop, server): its name and an optional address line. */
export function Host({ id, name, addr }: { id: string; name: string; addr?: string }) {
  return <Node id={id} title={name} sub={addr} />;
}

/** A link-layer switch: a wide flat box with a port strip, no number (it has no IP identity); `label` titles it like a router's. */
export function Switch({ id, label }: { id: string; label?: string }) {
  return (
    <Group id={id} title={label} pad={6}>
      <Cells cell={10} items={Array(6).fill(null)} />
    </Group>
  );
}

/** A subnet: a soft group titled with its prefix, holding hosts and a switch. */
export function Subnet({ prefix, children }: { prefix: string; children?: ReactNode }) {
  return (
    <Group title={prefix} gap={20}>
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
