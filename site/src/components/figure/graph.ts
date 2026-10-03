/**
 * Layered graph layout (Sugiyama-lite): break cycles by DFS back-edge
 * reversal, rank by longest path, order each rank with barycenter sweeps,
 * then nudge every node toward the median of its neighbours where that keeps
 * the rank free of overlaps. Deterministic; no dependency.
 */
import { LABEL_CLEAR } from "./theme";

export interface GNode {
  id: string;
  w: number;
  h: number;
}
export interface GEdge {
  from: string;
  to: string;
  /** pill width of the edge label, if any; the rank gap grows to clear it */
  label?: number;
}

export function layoutGraph(
  nodes: GNode[],
  edges: GEdge[],
  dir: "right" | "down",
  gap: number,
  rankGap: number,
): Map<string, { x: number; y: number }> {
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const n = nodes.length;
  const out = Array.from({ length: n }, () => [] as number[]);
  for (const e of edges) {
    const a = index.get(e.from), b = index.get(e.to);
    if (a === undefined || b === undefined || a === b) continue;
    out[a].push(b);
  }

  // cycle breaking: reverse back edges found by DFS in input order
  const colour = new Array<0 | 1 | 2>(n).fill(0);
  const dfs = (u: number) => {
    colour[u] = 1;
    for (let i = 0; i < out[u].length; i++) {
      const v = out[u][i];
      if (colour[v] === 1) {
        out[u].splice(i--, 1);
        out[v].push(u);
      } else if (colour[v] === 0) dfs(v);
    }
    colour[u] = 2;
  };
  for (let u = 0; u < n; u++) if (colour[u] === 0) dfs(u);

  const inn = Array.from({ length: n }, () => [] as number[]);
  out.forEach((vs, u) => vs.forEach((v) => inn[v].push(u)));

  // longest-path ranking over the DAG
  const rank = new Array<number>(n).fill(0);
  const indeg = inn.map((xs) => xs.length);
  const queue = nodes.map((_, i) => i).filter((i) => indeg[i] === 0);
  for (let qi = 0; qi < queue.length; qi++) {
    const u = queue[qi];
    for (const v of out[u]) {
      rank[v] = Math.max(rank[v], rank[u] + 1);
      if (--indeg[v] === 0) queue.push(v);
    }
  }
  const R = n ? Math.max(...rank) + 1 : 0;
  const ranks: number[][] = Array.from({ length: R }, () => []);
  for (let i = 0; i < n; i++) ranks[rank[i]].push(i);

  // barycenter ordering, 4 sweeps
  const pos = new Array<number>(n).fill(0);
  const setPos = () => ranks.forEach((r) => r.forEach((v, i) => (pos[v] = i)));
  setPos();
  for (let sweep = 0; sweep < 4; sweep++) {
    const down = sweep % 2 === 0;
    for (let ri = down ? 1 : R - 2; down ? ri < R : ri >= 0; down ? ri++ : ri--) {
      const nb = (v: number) => (down ? inn[v] : out[v]).filter((u) => rank[u] === (down ? ri - 1 : ri + 1));
      const bary = ranks[ri].map((v) => {
        const ns = nb(v);
        return ns.length ? ns.reduce((s, u) => s + pos[u], 0) / ns.length : pos[v];
      });
      const order = ranks[ri].map((v, i) => i).sort((a, b) => bary[a] - bary[b] || a - b);
      ranks[ri] = order.map((i) => ranks[ri][i]);
      setPos();
    }
  }

  const main = (i: number) => (dir === "right" ? nodes[i].w : nodes[i].h);
  const cross = (i: number) => (dir === "right" ? nodes[i].h : nodes[i].w);

  // main-axis position per rank; a gap grows to clear the labels crossing it
  const gapAfter = new Array<number>(R).fill(rankGap);
  for (const e of edges) {
    const a = index.get(e.from), b = index.get(e.to);
    if (a === undefined || b === undefined || !e.label || Math.abs(rank[a] - rank[b]) !== 1) continue;
    const lo = Math.min(rank[a], rank[b]);
    gapAfter[lo] = Math.max(gapAfter[lo], e.label + LABEL_CLEAR);
  }
  const rankStart: number[] = [];
  let acc = 0;
  ranks.forEach((r, ri) => {
    rankStart[ri] = acc;
    acc += Math.max(0, ...r.map(main)) + gapAfter[ri];
  });

  // initial cross positions: stack each rank from 0
  const c = new Array<number>(n).fill(0);
  for (const r of ranks) {
    let y = 0;
    for (const v of r) {
      c[v] = y;
      y += cross(v) + gap;
    }
  }
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const centre = (v: number) => c[v] + cross(v) / 2;
  const nudge = (ri: number, nbrs: (v: number) => number[]) => {
    const r = ranks[ri];
    for (let i = 0; i < r.length; i++) {
      const v = r[i];
      const ns = nbrs(v);
      if (!ns.length) continue;
      const want = median(ns.map(centre)) - cross(v) / 2;
      const lo = i > 0 ? c[r[i - 1]] + cross(r[i - 1]) + gap : -Infinity;
      const hi = i < r.length - 1 ? c[r[i + 1]] - gap - cross(v) : Infinity;
      if (lo <= hi) c[v] = Math.min(hi, Math.max(lo, want));
    }
  };
  for (let ri = 1; ri < R; ri++) nudge(ri, (v) => inn[v]);
  for (let ri = R - 2; ri >= 0; ri--) nudge(ri, (v) => out[v]);
  for (let ri = 1; ri < R; ri++) nudge(ri, (v) => inn[v]);

  const minC = n ? Math.min(...c) : 0;
  const result = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, i) => {
    const m = rankStart[rank[i]];
    const cr = c[i] - minC;
    result.set(node.id, dir === "right" ? { x: m, y: cr } : { x: cr, y: m });
  });
  return result;
}
