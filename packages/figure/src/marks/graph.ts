/** Boxes and arrows with no fixed positions: `dagre` ranks them, orders them to minimise crossings, and routes long edges around what lies between. */
import dagre from "@dagrejs/dagre";
import type { ReactNode } from "react";
import { COMMON, idsUnder, mark, type Common, type Marker } from "../mark";
import type { AnyBlock, Block, EdgeSpec, LayoutCtx, Point, Rect, Size } from "../model";
import { labelPillW } from "../route";
import { EDGE_LABEL, GAP } from "../theme";
import { boxesAt } from "./layout";

export interface GraphProps extends Common {
  dir?: "right" | "down";
  /** between nodes of a rank */
  gap?: number;
  /** between ranks */
  rankGap?: number;
  children?: ReactNode;
}
interface GraphData {
  dir: "right" | "down";
  gap: number;
  rankGap: number;
}
interface GraphLayout {
  at: Map<string, { x: number; y: number }>;
  /** bends of the edges that span more than one rank, relative to the graph's box */
  bends: Map<string, Point[]>;
}

const ownerOf = (b: AnyBlock) => new Map(b.children.flatMap((c: AnyBlock) => [...idsUnder(c, new Set(), false)].map((id) => [id, c.id] as const)));

function layoutGraph(b: Block<GraphData>, kids: Size[], edges: EdgeSpec[]): GraphLayout {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: b.data.dir === "right" ? "LR" : "TB", nodesep: b.data.gap, ranksep: b.data.rankGap, edgesep: b.data.gap / 2, marginx: 0, marginy: 0 });
  b.children.forEach((c, i) => g.setNode(c.id, { width: kids[i].w, height: kids[i].h }));
  const owner = ownerOf(b);
  for (const e of edges) {
    const from = owner.get(e.from), to = owner.get(e.to);
    if (from && to && from !== to) g.setEdge(from, to, e.label ? { width: labelPillW(e.label), height: EDGE_LABEL.h } : {}, e.id);
  }
  dagre.layout(g);
  const nodes = b.children.map((c, i) => ({ id: c.id, x: g.node(c.id).x - kids[i].w / 2, y: g.node(c.id).y - kids[i].h / 2 }));
  const minX = Math.min(...nodes.map((n) => n.x), Infinity), minY = Math.min(...nodes.map((n) => n.y), Infinity);
  const bends = new Map<string, Point[]>();
  for (const e of g.edges()) {
    // dagre gives each end, on the node's box, around the bends; a single bend is just the middle of a short edge
    const mid = (g.edge(e).points as { x: number; y: number }[]).slice(1, -1);
    if (mid.length > 1 && e.name) bends.set(e.name, mid.map((p) => [p.x - minX, p.y - minY]));
  }
  return { at: new Map(nodes.map((n) => [n.id, { x: n.x - minX, y: n.y - minY }])), bends };
}

const layouts = new WeakMap<object, GraphLayout>();

/** Ortho from the parent's bottom to the child's top centre. */
export function treeConnector(e: EdgeSpec, rects: Record<string, Rect>): EdgeSpec {
  const down = rects[e.from].y <= rects[e.to].y;
  return { ...e, route: "ortho", fromSide: e.fromSide ?? (down ? "bottom" : "top"), toSide: e.toSide ?? (down ? "top" : "bottom") };
}

export const Graph: Marker<GraphProps> = mark<GraphProps, GraphData>({
  kind: "graph",
  props: { ...COMMON, children: true, dir: ["right", "down"], gap: "number", rankGap: "number" },
  data: (p) => ({ dir: p.dir ?? "right", gap: p.gap ?? GAP.graphNode, rankGap: p.rankGap ?? GAP.graphRank }),
  arrange(b, kids, ctx: LayoutCtx) {
    const layout = layoutGraph(b, kids, ctx.edges);
    layouts.set(b, layout);
    return boxesAt(b.children.map((c) => layout.at.get(c.id) ?? { x: 0, y: 0 }), kids);
  },
  /** A long edge follows its bends. Otherwise, inside a `dir="down"` graph, an edge is a tree connector. */
  connect(b, e, rects) {
    if (e.route !== "auto" || e.from === e.to) return e;
    const bends = layouts.get(b)?.bends.get(e.id);
    if (bends) return { ...e, via: bends.map(([x, y]) => ({ of: b.id, x, y })) };
    return b.data.dir === "down" ? treeConnector(e, rects) : e;
  },
});
