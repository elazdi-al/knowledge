import { createElement as h, type ReactNode } from "react";
import { COMMON, mark, type Common, type Marker } from "../mark";
import { Edge } from "../marks/edge";
import { treeConnector } from "../marks/graph";
import { boxesAt } from "../marks/layout";
import { Node } from "../marks/node";
import type { Size, State, Tone } from "../model";
import { GAP } from "../theme";

export interface TreeNode {
  id: string;
  title?: string;
  sub?: string;
  tone?: Tone;
  state?: State;
  /** on the edge from its parent */
  edge?: string;
  children?: TreeNode[];
}

interface TreeLayoutProps extends Common {
  /** the tree, whose ids name the children by which it is arranged */
  shape: TreeNode;
  gap: number;
  rankGap: number;
  children?: ReactNode;
}

/** Each subtree takes the width it needs and its parent centres over it; siblings keep their order. */
const TreeLayout: Marker<TreeLayoutProps> = mark<TreeLayoutProps, Omit<TreeLayoutProps, "children">>({
  kind: "tree",
  props: { ...COMMON, shape: true, gap: "number", rankGap: "number", children: true },
  data: ({ shape, gap, rankGap }) => ({ shape, gap, rankGap }),
  arrange(b, kids) {
    const { shape, gap, rankGap } = b.data;
    const sizes = new Map<string, Size>(b.children.map((c, i) => [c.id, kids[i]]));
    const rankH: number[] = [];
    const measureRanks = (n: TreeNode, rank: number) => {
      rankH[rank] = Math.max(rankH[rank] ?? 0, sizes.get(n.id)!.h);
      n.children?.forEach((c) => measureRanks(c, rank + 1));
    };
    measureRanks(shape, 0);
    const rankY = rankH.map((_, i) => rankH.slice(0, i).reduce((a, x) => a + x + rankGap, 0));
    const at = new Map<string, { x: number; y: number }>();
    /** Lays `n` out from `left`, and returns the right edge of its subtree. */
    const place = (n: TreeNode, left: number, rank: number): number => {
      const self = sizes.get(n.id)!;
      let right = left;
      const centres: number[] = [];
      n.children?.forEach((c, i) => {
        right = place(c, i ? right + gap : left, rank + 1);
        const placed = at.get(c.id)!;
        centres.push(placed.x + sizes.get(c.id)!.w / 2);
      });
      const centre = centres.length ? (centres[0] + centres[centres.length - 1]) / 2 : left + self.w / 2;
      const x = Math.max(left, centre - self.w / 2);
      at.set(n.id, { x, y: rankY[rank] + (rankH[rank] - self.h) / 2 });
      return Math.max(right, x + self.w);
    };
    place(shape, 0, 0);
    return boxesAt(b.children.map((c) => at.get(c.id)!), kids);
  },
  connect: (_b, e, rects) => (e.route === "auto" && e.from !== e.to ? treeConnector(e, rects) : e),
});

export interface TreeProps {
  root: TreeNode;
  gap?: number;
  rankGap?: number;
}

/** A tree from data: nodes in ranks, top down, siblings in the order given. */
export function Tree({ root, gap = GAP.graphNode, rankGap = GAP.graphRank }: TreeProps): ReactNode {
  const nodes: TreeNode[] = [];
  const edges: { from: string; to: string; label?: string }[] = [];
  const walk = (n: TreeNode) => {
    nodes.push(n);
    for (const c of n.children ?? []) {
      edges.push({ from: n.id, to: c.id, label: c.edge });
      walk(c);
    }
  };
  walk(root);
  return h(
    TreeLayout,
    { shape: root, gap, rankGap },
    nodes.map(({ id, title, sub, tone, state }) => h(Node, { key: id, id, title, sub, tone, state })),
    edges.map((e) => h(Edge, { key: `${e.from}>${e.to}`, ...e, head: "none" })),
  );
}
