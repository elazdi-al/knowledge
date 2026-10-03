import type { ReactNode } from "react";
import { Cells, Col, Diagram, Edge, FONT, layoutScene, MAX_CONTENT_W, measure, Row, Space, Text, toScene } from "@/components/figure";
import { labelPillW } from "@/components/figure/layout";
import { LABEL_CLEAR } from "@/components/figure/theme";

export interface BPlusNode {
  /** Stable id referenced by links / promote / leafOrder. */
  id: string;
  /** Key cells, left to right. Numbers are coerced to strings. */
  keys: Array<string | number>;
  /** Visual state. `full` = bold outline (the node being changed), `new` =
   *  dashed outline (just created by a split), `highlight` = inverted box. */
  state?: "normal" | "full" | "new" | "highlight";
  /** Small muted label centred beneath the node. */
  note?: string;
}

export interface BPlusLink {
  parent: string;
  child: string;
  /** Routing label near the pointer's start, e.g. "< 20" or "≥ 20". */
  label?: string;
}

export interface BPlusPromote {
  /** Lower node the entry rises from. */
  from: string;
  /** Higher node the entry is copied/pushed into. */
  to: string;
  label?: string;
  /** Which side the arc bows and the label sits. Default "right". */
  side?: "left" | "right";
}

interface Props {
  nodes: BPlusNode[];
  /** Parent->child edges; they define both structure and node levels. */
  links: BPlusLink[];
  /** Connect the leaf row left to right. "double" (default) draws both heads,
   *  "single" draws one, false omits the sibling links. */
  leafLinks?: boolean | "single" | "double";
  /** Split-propagation arrows. */
  promote?: BPlusPromote[];
  /** Right-margin annotations per level, e.g. [{level:0,label:"root"}]. */
  roles?: Array<{ level: number; label: string }>;
  /** Explicit leaf order, left to right. Inferred from link order otherwise. */
  leafOrder?: string[];
  /** Bold heading inside the card (e.g. "Before"). */
  title?: string;
  caption?: string;
  /** Adds horizontal breathing room for narrow trees so they do not scale too tall. */
  minViewBoxWidth?: number;
  className?: string;
}

/** Key strips are a little tighter than the default cell so eight leaves fit the column. */
const CELL = 26;
const NOTE_H = Math.round(FONT.note * 1.4);
/** Namespaced item ids: author ids like "root" would collide with the engine's path ids. */
const nid = (id: string) => `n:${id}`;
/** Sideways bow of a promote arc, so it never runs along the pointer it climbs beside. */
const BOW = 34;

export function BPlusTree({ nodes, links, leafLinks = "double", promote = [], roles, leafOrder, title, caption, className }: Props) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const valid = links.filter((l) => byId.has(l.parent) && byId.has(l.child));
  const kids = (id: string) => valid.filter((l) => l.parent === id).map((l) => l.child);
  const roots = nodes.filter((n) => !valid.some((l) => l.child === n.id)).map((n) => n.id);
  const dfs = (id: string): string[] => (kids(id).length ? kids(id).flatMap(dfs) : [id]);
  const leaves = leafOrder ? leafOrder.filter((id) => byId.has(id) && !kids(id).length) : roots.flatMap(dfs);
  const linked = leafLinks !== false && leaves.length > 1;

  // full and new both mark the node the step is about; a highlighted node is the one "in progress":
  // accent it, unless nothing else is emphasised
  const emphasised = nodes.some((n) => n.state === "full");
  const STATE = { normal: undefined, full: "strong", new: "strong", highlight: emphasised ? "active" : "strong" } as const;

  // the key a promote carries is its label's last word; it lights up where it lands
  const carried = (p: BPlusPromote, id: string) => byId.get(id)!.keys.map(String).indexOf(p.label?.split(" ").at(-1) ?? "");
  const landed = new Map(promote.filter((p) => byId.has(p.to)).map((p) => [p.to, carried(p, p.to)]));

  // one level gap for the whole tree, wide enough for every routing label
  const gap = Math.max(44, ...valid.filter((l) => l.label).map((l) => labelPillW(l.label!) + LABEL_CLEAR));

  const strip = (n: BPlusNode) => (
    <Cells
      id={nid(n.id)}
      cell={CELL}
      items={n.keys.map((k, i) => ({ label: String(k), state: landed.get(n.id) === i ? ("active" as const) : undefined }))}
      state={STATE[n.state ?? "normal"]}
    />
  );

  // a note sits under a leaf, or beside any node whose underside carries a connector,
  // balanced by an equal space on the left so the strip stays centred over its children
  const block = (n: BPlusNode) => {
    if (!n.note) return strip(n);
    if (!kids(n.id).length && linked)
      return (
        <Col gap={4}>
          {strip(n)}
          <Text text={n.note} size="note" muted />
        </Col>
      );
    const side = measure(n.note, FONT.note) + 8;
    return (
      <Row gap={0}>
        <Space w={side} />
        {strip(n)}
        <Space w={8} />
        <Text text={n.note} size="note" muted />
      </Row>
    );
  };

  const levels = roles?.length ? Math.max(...roles.map((r) => r.level)) + 1 : 0;
  const role = (level: number) => roles?.find((r) => r.level === level)?.label;

  // a tree too wide for the column with arrowed leaf links keeps its links as plain connectors in tighter rows
  const tree = (compact: boolean) => {
    const sib = compact ? 12 : 18;
    const sub = (id: string): ReactNode => (
      <Col key={id} gap={gap}>
        {block(byId.get(id)!)}
        {kids(id).length > 0 && (
          <Row gap={sib} align="start">
            {kids(id).map(sub)}
          </Row>
        )}
      </Col>
    );
    return (
      <>
        <Row gap={28} align="start">
          <Row gap={sib} align="start">
            {roots.map(sub)}
          </Row>
          {levels > 0 && (
            <Col gap={0} align="start">
              <Space h={(CELL - NOTE_H) / 2} />
              <Col gap={CELL + gap - NOTE_H} align="start">
                {Array.from({ length: levels }, (_, l) =>
                  role(l) ? <Text key={l} text={role(l)!} size="note" muted /> : <Space key={l} h={NOTE_H} />,
                )}
              </Col>
            </Col>
          )}
        </Row>
        {valid.map((l) => (
          <Edge key={l.child} from={nid(l.parent)} to={nid(l.child)} fromSide="bottom" toSide="top" route="straight" label={l.label} />
        ))}
        {linked &&
          leaves
            .slice(1)
            .map((b, i) => <Edge key={b} from={nid(leaves[i])} to={nid(b)} head={compact ? "none" : leafLinks === "single" ? "end" : "both"} />)}
        {promote
          .filter((p) => byId.has(p.from) && byId.has(p.to))
          .map((p, i) => {
            // leave from the carried key's cell (or the side's end cell) and land on the cell it lights up
            const keys = byId.get(p.from)!.keys;
            const own = carried(p, p.from);
            const cell = own >= 0 ? own : p.side === "left" ? 0 : keys.length - 1;
            const land = landed.get(p.to) ?? -1;
            return (
              <Edge
                key={`p${i}`}
                from={`${nid(p.from)}.${cell}`}
                to={land >= 0 ? `${nid(p.to)}.${land}` : nid(p.to)}
                route="arc"
                bend={(2 * cell + 1 < keys.length || (2 * cell + 1 === keys.length && p.side === "left") ? -1 : 1) * BOW}
                dashed
                label={p.label}
                state="active"
              />
            );
          })}
      </>
    );
  };
  const compact = layoutScene(toScene(tree(false)), { lint: false }).w > MAX_CONTENT_W;

  return (
    <Diagram title={title} caption={caption} className={className}>
      {tree(compact)}
    </Diagram>
  );
}
