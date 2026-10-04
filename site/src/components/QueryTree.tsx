import { Col, Diagram, Edge, Node, Row, type Tone } from "@/components/figure";
import { TONE } from "@/components/tones";

/** Built-in relational-algebra operator glyphs. Pass `glyph` for anything else. */
export type QueryOp =
  | "project" // π
  | "select" // σ
  | "join" // ⋈
  | "rename" // ρ
  | "group" // γ
  | "union" // ∪
  | "intersect" // ∩
  | "difference" // -
  | "product" // ×
  | "division"; // ÷

const OP_GLYPH: Record<QueryOp, string> = {
  project: "π",
  select: "σ",
  join: "⋈",
  rename: "ρ",
  group: "γ",
  union: "∪",
  intersect: "∩",
  difference: "-",
  product: "×",
  division: "÷",
};

export interface QueryNode {
  /** Stable id referenced by `links`. */
  id: string;
  /** A relation leaf is set by `relation`; an operator by `op` (or `glyph`). */
  relation?: string;
  /** Built-in operator; ignored when `glyph` is given. */
  op?: QueryOp;
  /** Override the operator glyph with an arbitrary symbol. */
  glyph?: string;
  /** Subscript on an operator, e.g. "name, title" or "dept_name = \"Music\"". */
  sub?: string;
  /** Visual state. `highlight` = inverted box (the key operator the prose is
   *  about); `emphasis` = heavier outline; `new` = dashed outline. */
  state?: "normal" | "highlight" | "emphasis" | "new";
}

export interface QueryLink {
  parent: string;
  child: string;
}

export interface QueryTreeProps {
  nodes: QueryNode[];
  /** Parent->child edges; they define both structure and node levels. */
  links: QueryLink[];
  /** Explicit leaf order, left to right. Inferred from link order otherwise. */
  leafOrder?: string[];
  /** Bold heading inside the card (e.g. "Initial" / "Optimized"). */
  title?: string;
  caption?: string;
  className?: string;
}

const STATE = { normal: undefined, highlight: "strong", emphasis: "strong", new: "placeholder" } as const;
const OP_TONE: Partial<Record<QueryOp, Tone>> = { select: TONE.selection, project: TONE.projection };

export function QueryTree({ nodes, links, leafOrder, title, caption, className }: QueryTreeProps) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kids = (id: string) => links.filter((l) => l.parent === id).map((l) => l.child);
  const rank = (id: string): number => (kids(id).length ? Math.min(...kids(id).map(rank)) : (leafOrder?.indexOf(id) ?? 0));
  const root = nodes.find((n) => !links.some((l) => l.child === n.id))!;

  const sub = (id: string) => {
    const n = byId.get(id)!;
    const children = kids(id).sort((a, b) => rank(a) - rank(b));
    const state = STATE[n.state ?? "normal"];
    return (
      <Col key={id} gap={36}>
        {n.relation ? (
          <Node id={id} title={n.relation} mono state={state} />
        ) : (
          <Node id={id} title={`${n.glyph ?? OP_GLYPH[n.op!]}${n.sub ? `_{${n.sub}}` : ""}`} state={state} tone={n.glyph ? undefined : OP_TONE[n.op!]} />
        )}
        {children.length > 0 && (
          <Row gap={24} align="start">
            {children.map(sub)}
          </Row>
        )}
      </Col>
    );
  };

  return (
    <Diagram title={title} caption={caption} className={className}>
      {sub(root.id)}
      {links.map((l) => (
        <Edge key={l.child} from={l.parent} to={l.child} fromSide="bottom" toSide="top" route="straight" head="none" />
      ))}
    </Diagram>
  );
}
