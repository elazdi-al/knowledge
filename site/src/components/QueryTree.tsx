import {
  Box,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  Label,
  MAX_CONTENT_W,
  SPACE,
  STROKE,
  measureLabel,
  r2,
} from "@/components/diagram";

/**
 * A relational-algebra expression tree (a.k.a. logical query plan) in the
 * textbook style: operators (π, σ, ⋈) drawn as glyph nodes with real
 * subscript conditions, italic relation names at the leaves, straight
 * parent->child edges, laid out top-down. Exactly one node may carry
 * `state: "highlight"` to mark the operator the surrounding prose is about
 * (it replaces the red ellipse in the TikZ sources, where the σ is circled
 * before and after it is pushed down).
 *
 * Why a bespoke SVG instead of a flowchart engine: query plans need glyph
 * operators with mathematical subscripts, italic leaf relations, and a tight
 * binary layout that centres each parent over its children — exactly what
 * generic engines render badly. The author supplies the node set and the
 * parent->child links; the layout is derived. Leaf x-positions are packed
 * left to right, every internal node is centred over its children (the
 * BPlusTree idea), and a sweep then pushes subtrees apart until every pair of
 * boxes on a level clears a guaranteed gap — node widths come from real font
 * metrics, so the gap holds in the rendered output too (Q1).
 *
 * Subscripts render through the shared label mini-syntax (`σ_{...}`), so
 * conditions are true subscripts rather than literal `_{...}` text (S2).
 */

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

// --- geometry -------------------------------------------------------------

const NODE_H = 30; // node box height
const PAD_X = 9; // horizontal padding inside a node box
const MIN_W = 30; // minimum node box width
const LEAF_GAP = 26; // horizontal gap between adjacent leaves
const SIBLING_GAP = 16; // guaranteed clearance between boxes on a level
const ROW_GAP = 70; // centre-to-centre between levels
const EDGE_GAP = 3; // gap so an edge stops just shy of the node box

interface Laid extends QueryNode {
  isLeaf: boolean;
  /** Full label: glyph with its `_{...}` subscript, or the relation name. */
  text: string;
  w: number;
  level: number;
  cx: number;
  cy: number;
}

export function QueryTree({
  nodes,
  links,
  leafOrder,
  title,
  caption,
  className,
}: QueryTreeProps) {
  const byId = new Map<string, Laid>();
  for (const n of nodes) {
    const isLeaf = n.relation != null;
    const glyph = n.glyph ?? (n.op ? OP_GLYPH[n.op] : "");
    const text = isLeaf
      ? (n.relation ?? n.id)
      : n.sub
        ? `${glyph}_{${n.sub}}`
        : glyph;
    const size = isLeaf ? FONT.label : FONT.node;
    byId.set(n.id, {
      ...n,
      isLeaf,
      text,
      w: Math.max(MIN_W, measureLabel(text, size) + 2 * PAD_X),
      level: 0,
      cx: 0,
      cy: 0,
    });
  }

  // children in link order; track parents for root detection. A node with no
  // outgoing links is treated as a leaf even if `relation` was omitted.
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const l of links) {
    if (!byId.has(l.parent) || !byId.has(l.child)) continue;
    const arr = children.get(l.parent) ?? [];
    arr.push(l.child);
    children.set(l.parent, arr);
    hasParent.add(l.child);
  }

  const roots = [...byId.values()].filter((n) => !hasParent.has(n.id));

  // levels via BFS from the roots.
  const queue: Array<{ id: string; level: number }> = roots.map((r) => ({
    id: r.id,
    level: 0,
  }));
  const seen = new Set<string>();
  let maxLevel = 0;
  while (queue.length) {
    const { id, level } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id)!;
    node.level = level;
    maxLevel = Math.max(maxLevel, level);
    for (const c of children.get(id) ?? [])
      queue.push({ id: c, level: level + 1 });
  }

  // leaf = no children in the plan.
  const isLeafNode = (id: string) => (children.get(id)?.length ?? 0) === 0;

  // leaf order: explicit, or a left-to-right DFS following link order.
  const leaves: string[] = [];
  if (leafOrder) {
    for (const id of leafOrder) if (byId.has(id) && isLeafNode(id)) leaves.push(id);
  } else {
    const visit = (id: string) => {
      if (!byId.has(id)) return;
      const kids = children.get(id);
      if (!kids || kids.length === 0) {
        leaves.push(id);
        return;
      }
      for (const c of kids) visit(c);
    };
    for (const r of roots) visit(r.id);
  }

  // pack leaves left to right.
  let cursor = 0;
  for (const id of leaves) {
    const n = byId.get(id)!;
    n.cx = cursor + n.w / 2;
    cursor = n.cx + n.w / 2 + LEAF_GAP;
  }

  // centre internal nodes over their children, deepest level upward.
  const recenter = () => {
    for (let lvl = maxLevel - 1; lvl >= 0; lvl--) {
      for (const n of byId.values()) {
        if (n.level !== lvl) continue;
        const kids = (children.get(n.id) ?? []).map((c) => byId.get(c)!);
        if (kids.length)
          n.cx = kids.reduce((a, k) => a + k.cx, 0) / kids.length;
      }
    }
  };
  recenter();

  const allNodes = [...byId.values()];

  // Centring a parent over its children can land it on a neighbouring subtree
  // (e.g. a wide π over a narrow leaf, beside another leaf). Resolve by
  // sweeping each level left to right and pushing the right node's whole
  // subtree right until every pair clears SIBLING_GAP, then recentring
  // ancestors. Widths are measured, so the cleared gap survives rendering.
  const shiftSubtree = (id: string, dx: number, moved = new Set<string>()) => {
    if (moved.has(id)) return;
    moved.add(id);
    const n = byId.get(id);
    if (!n) return;
    n.cx += dx;
    for (const c of children.get(id) ?? []) shiftSubtree(c, dx, moved);
  };
  for (let iter = 0; iter < 24; iter++) {
    let moved = false;
    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const row = allNodes
        .filter((n) => n.level === lvl)
        .sort((a, b) => a.cx - b.cx);
      for (let i = 1; i < row.length; i++) {
        const need =
          row[i - 1].cx +
          row[i - 1].w / 2 +
          SIBLING_GAP -
          (row[i].cx - row[i].w / 2);
        if (need > 0.25) {
          shiftSubtree(row[i].id, need);
          moved = true;
        }
      }
    }
    if (!moved) break;
    recenter();
  }

  for (const n of byId.values())
    n.cy = SPACE.margin + NODE_H / 2 + n.level * ROW_GAP;
  const maxRight = Math.max(...allNodes.map((n) => n.cx + n.w / 2));
  const minLeft = Math.min(...allNodes.map((n) => n.cx - n.w / 2));
  const shift = SPACE.margin - minLeft;
  const width = maxRight - minLeft + 2 * SPACE.margin;
  const height = SPACE.margin + NODE_H + maxLevel * ROW_GAP + SPACE.margin;

  if (process.env.NODE_ENV !== "production" && width > MAX_CONTENT_W) {
    console.warn(
      `[diagram] QueryTree ${Math.round(width)}px wide exceeds ${MAX_CONTENT_W}px — tighten or restructure the example`,
    );
  }

  // --- edges: straight parent->child, stopping just shy of each box ----------
  const edgeEls = links.map((l, i) => {
    const p = byId.get(l.parent);
    const c = byId.get(l.child);
    if (!p || !c) return null;
    return (
      <line
        key={`e${i}`}
        x1={r2(p.cx)}
        y1={r2(p.cy + NODE_H / 2 + EDGE_GAP)}
        x2={r2(c.cx)}
        y2={r2(c.cy - NODE_H / 2 - EDGE_GAP)}
        stroke={COLOR.muted}
        strokeWidth={STROKE.line}
      />
    );
  });

  // --- nodes: operator boxes carry their glyph + subscript as one label;
  // leaves render the relation name in italic on a plain box.
  const nodeEls = allNodes.map((n) => {
    const hi = n.state === "highlight";
    return (
      <g key={n.id}>
        <Box
          x={n.cx - n.w / 2}
          y={n.cy - NODE_H / 2}
          w={n.w}
          h={NODE_H}
          state={n.state}
          tint={!n.isLeaf}
          label={n.isLeaf ? undefined : n.text}
          fontSize={FONT.node}
        />
        {n.isLeaf && (
          <g fontStyle="italic">
            <Label
              x={n.cx}
              y={n.cy}
              text={n.text}
              fill={hi ? COLOR.hiFg : COLOR.fg}
            />
          </g>
        )}
      </g>
    );
  });

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={width}
        h={height}
        label={caption ?? "Relational-algebra query plan tree"}
      >
        <g transform={`translate(${r2(shift)},0)`}>
          {edgeEls}
          {nodeEls}
        </g>
      </DiagramSvg>
    </DiagramFigure>
  );
}
