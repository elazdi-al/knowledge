import {
  Arrow,
  ArrowHead,
  Box,
  CellStrip,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  Label,
  MAX_CONTENT_W,
  RADIUS,
  SPACE,
  STROKE,
  measureLabel,
  measureText,
  r2,
  stableId,
  type Pt,
} from "@/components/diagram";

/**
 * A B+-tree in the textbook style: rounded multi-key nodes laid out on rigid
 * level rows, routing pointers fanning out from a parent's base to its
 * children (children = keys + 1), double-headed sibling links across the leaf
 * row, and dashed promote arcs for split propagation.
 *
 * The author gives nodes and parent->child links; the layout is derived. Leaf
 * x-positions are packed left to right, every internal node is centred over
 * its children, and pointer start points are spread across the parent's base
 * exactly like the TikZ sources. Each node is one single-stroke key strip
 * (one outer rect plus interior dividers, the CellStrip discipline), with
 * cells sized from real font metrics and uniform within the node.
 *
 * Routing labels ("< 20", "≥ 20") sit beside their edge, pushed out along the
 * edge normal far enough that the label box clears the line, and carry a halo
 * so a crossing sibling edge never strikes through them. Promote labels hang
 * off the outside of their arc the same way. The svg renders at natural size
 * (capped at container width), so figures must stay inside MAX_CONTENT_W
 * instead of shrinking their text; a dev warning flags offenders.
 */

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

// --- geometry -------------------------------------------------------------

const NODE_H = 28; // key-strip height
const CELL_PAD_X = 6; // each side of a key within its cell
const CELL_MIN_W = 26; // floor so single-digit cells stay square-ish
const LEAF_GAP = 16; // horizontal gap between leaf nodes
const ROW_GAP = 76; // centre-to-centre between levels
const ROLE_GAP = 20; // gap before the right-margin role labels
const NOTE_DROP = 14; // note centre below a node's bottom edge
const EDGE_GAP = 2; // edges stop shy of a node so marker tips stay crisp
const EDGE_INSET = RADIUS.box; // pointer fan keeps off the rounded corners
const EDGE_LABEL_T = 0.42; // how far down its edge a routing label sits
const LABEL_PAD = 4; // clearance between a line and its label box

interface Laid extends BPlusNode {
  keysS: string[];
  cellW: number; // uniform cell width within this node
  w: number;
  level: number;
  cx: number;
  cy: number;
  isLeaf: boolean;
}

/** Uniform cell width for a node: its widest key plus padding. */
const cellWidth = (keys: string[]) =>
  Math.max(
    CELL_MIN_W,
    ...keys.map((k) => measureLabel(k, FONT.label) + 2 * CELL_PAD_X),
  );

export function BPlusTree({
  nodes,
  links,
  leafLinks = "double",
  promote = [],
  roles,
  leafOrder,
  title,
  caption,
  minViewBoxWidth,
  className,
}: Props) {
  const byId = new Map<string, Laid>();
  for (const n of nodes) {
    const keysS = n.keys.map(String);
    const cellW = cellWidth(keysS);
    byId.set(n.id, {
      ...n,
      keysS,
      cellW,
      w: cellW * Math.max(1, keysS.length),
      level: 0,
      cx: 0,
      cy: 0,
      isLeaf: true,
    });
  }

  // children in link order; parents for root detection.
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const l of links) {
    if (!byId.has(l.parent) || !byId.has(l.child)) continue;
    const arr = children.get(l.parent) ?? [];
    arr.push(l.child);
    children.set(l.parent, arr);
    hasParent.add(l.child);
    byId.get(l.parent)!.isLeaf = false;
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
    for (const c of children.get(id) ?? []) queue.push({ id: c, level: level + 1 });
  }

  // leaf order: explicit, or a left-to-right DFS following link order.
  const leaves: string[] = [];
  if (leafOrder) {
    for (const id of leafOrder) if (byId.get(id)?.isLeaf) leaves.push(id);
  } else {
    const visit = (id: string) => {
      const node = byId.get(id);
      if (!node) return;
      const kids = children.get(id);
      if (!kids || kids.length === 0) {
        if (node.isLeaf) leaves.push(id);
        return;
      }
      for (const c of kids) visit(c);
    };
    for (const r of roots) visit(r.id);
  }

  // pack leaves left to right (from 0; a final shift sets the margin).
  let cursor = 0;
  for (const id of leaves) {
    const n = byId.get(id)!;
    n.cx = cursor + n.w / 2;
    cursor = n.cx + n.w / 2 + LEAF_GAP;
  }

  // centre internal nodes over their children, deepest level upward.
  for (let lvl = maxLevel - 1; lvl >= 0; lvl--) {
    for (const n of byId.values()) {
      if (n.level !== lvl) continue;
      const kids = (children.get(n.id) ?? []).map((c) => byId.get(c)!);
      if (kids.length) n.cx = kids.reduce((a, k) => a + k.cx, 0) / kids.length;
    }
  }

  for (const n of byId.values()) n.cy = SPACE.margin + NODE_H / 2 + n.level * ROW_GAP;

  // --- routing pointers: spread across the parent's base, off the corners.
  // Geometry first (labels feed the viewBox extents), JSX after.
  interface RouteGeom {
    from: Pt;
    to: Pt;
    label?: string;
    lx: number;
    ly: number;
    lw: number;
  }
  const routeGeoms: Array<RouteGeom | null> = links.map((l) => {
    const p = byId.get(l.parent);
    const c = byId.get(l.child);
    if (!p || !c) return null;
    const kids = children.get(l.parent) ?? [];
    const idx = kids.indexOf(l.child);
    const n = kids.length;
    const span = p.w - 2 * EDGE_INSET;
    const sx = n <= 1 ? p.cx : p.cx - span / 2 + (idx / (n - 1)) * span;
    const sy = p.cy + NODE_H / 2;
    const ex = c.cx;
    const ey = c.cy - NODE_H / 2 - EDGE_GAP;
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    // outward unit normal: up-left for left-fanning edges, up-right for
    // right-fanning ones, right for verticals — always away from the fan.
    const ux = (dx >= 0 ? dy : -dy) / len;
    const uy = (dx >= 0 ? -dx : dx) / len;
    const lw = l.label ? measureLabel(l.label, FONT.note) : 0;
    // push the whole label box clear of the edge: project its half-extents
    // onto the normal, then add breathing room (B1).
    const clear =
      (lw / 2) * Math.abs(ux) + (FONT.note / 2) * Math.abs(uy) + LABEL_PAD;
    return {
      from: { x: sx, y: sy },
      to: { x: ex, y: ey },
      label: l.label,
      lx: sx + dx * EDGE_LABEL_T + ux * clear,
      ly: sy + dy * EDGE_LABEL_T + uy * clear,
      lw,
    };
  });

  // --- promote arcs (dashed, bowed): geometry first, like the routes. The
  // label hangs off the outside of the bow (Arrow anchors it at the curve
  // midpoint plus this offset along the normal), so it never sits on the arc
  // and its halo keeps crossing fan edges from striking through it (B3).
  interface PromoteGeom {
    from: Pt;
    to: Pt;
    bend: number;
    label?: string;
    off: number;
    lxMin: number;
    lxMax: number;
  }
  const promoteGeoms: Array<PromoteGeom | null> = promote.map((pr) => {
    const a = byId.get(pr.from);
    const b = byId.get(pr.to);
    if (!a || !b) return null;
    const from = { x: a.cx, y: a.cy - NODE_H / 2 - EDGE_GAP };
    const to = { x: b.cx, y: b.cy + NODE_H / 2 + EDGE_GAP };
    const dir = pr.side === "left" ? -1 : 1;
    const bend = dir * Math.max(26, Math.abs(to.x - from.x) * 0.25);
    const lw = pr.label ? measureLabel(pr.label, FONT.note) : 0;
    const off = lw / 2 + 2 * LABEL_PAD;
    // replicate Arrow's label anchor to budget the viewBox for it.
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ctrlX = (from.x + to.x) / 2 + nx * bend;
    const midX = 0.25 * from.x + 0.5 * ctrlX + 0.25 * to.x;
    const lx = midX + nx * dir * off;
    return {
      from,
      to,
      bend,
      label: pr.label,
      off,
      lxMin: lx - lw / 2,
      lxMax: lx + lw / 2,
    };
  });

  // --- viewBox: nodes, labels and roles all count toward the extents.
  const laid = [...byId.values()];
  const treeRight = Math.max(...laid.map((n) => n.cx + n.w / 2));
  const rolesW = roles?.length
    ? Math.max(...roles.map((r) => measureText(r.label, FONT.note)))
    : 0;
  const xs: number[] = [];
  for (const n of laid) xs.push(n.cx - n.w / 2, n.cx + n.w / 2);
  for (const g of routeGeoms)
    if (g?.label) xs.push(g.lx - g.lw / 2, g.lx + g.lw / 2);
  for (const g of promoteGeoms) if (g?.label) xs.push(g.lxMin, g.lxMax);
  if (rolesW) xs.push(treeRight + ROLE_GAP + rolesW);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  let shift = SPACE.margin - minX;
  let width = maxX - minX + 2 * SPACE.margin;
  if (minViewBoxWidth && width < minViewBoxWidth) {
    shift += (minViewBoxWidth - width) / 2;
    width = minViewBoxWidth;
  }
  const bottom = Math.max(
    ...laid.map(
      (n) =>
        n.cy + NODE_H / 2 + (n.note ? NOTE_DROP + FONT.note / 2 + 2 : 0),
    ),
  );
  const height = bottom + SPACE.margin;

  if (process.env.NODE_ENV !== "production" && width > MAX_CONTENT_W) {
    console.warn(
      `[diagram] BPlusTree ${Math.round(width)}px wide exceeds ${MAX_CONTENT_W}px — tighten or restructure the example`,
    );
  }

  const arrowId = stableId("bpt-arrow", { nodes, links, title });

  // --- edges -----------------------------------------------------------------
  const routeEdges = routeGeoms.map((g, i) =>
    g ? <Arrow key={`r${i}`} from={g.from} to={g.to} markerId={arrowId} /> : null,
  );

  const leafEdges =
    leafLinks === false
      ? []
      : leaves.slice(0, -1).map((id, i) => {
          const a = byId.get(id)!;
          const b = byId.get(leaves[i + 1])!;
          return (
            <Arrow
              key={`l${i}`}
              from={{ x: a.cx + a.w / 2 + EDGE_GAP, y: a.cy }}
              to={{ x: b.cx - b.w / 2 - EDGE_GAP, y: b.cy }}
              markerId={arrowId}
              both={leafLinks === true || leafLinks === "double"}
            />
          );
        });

  const promoteEdges = promoteGeoms.map((g, i) =>
    g ? (
      <Arrow
        key={`p${i}`}
        from={g.from}
        to={g.to}
        bend={g.bend}
        dashed
        markerId={arrowId}
        label={g.label}
        labelOffset={g.off}
      />
    ) : null,
  );

  // routing labels above the lines, halo'd so nothing strikes through (B1).
  const routeLabels = routeGeoms.map((g, i) =>
    g?.label ? (
      <Label
        key={`rl${i}`}
        x={g.lx}
        y={g.ly}
        text={g.label}
        size={FONT.note}
        fill={COLOR.muted}
        halo
      />
    ) : null,
  );

  // --- nodes: one single-stroke key strip each ---------------------------------
  const nodeEls = laid.map((n) => {
    const x = n.cx - n.w / 2;
    const y = n.cy - NODE_H / 2;
    // CellStrip cannot bolden or dash its outer frame, so full/new nodes
    // restate the same geometry single-stroked: one Box + interior dividers.
    const framed = n.state === "full" || n.state === "new";
    return (
      <g key={n.id}>
        {framed ? (
          <g>
            <Box
              x={x}
              y={y}
              w={n.w}
              h={NODE_H}
              state={n.state === "full" ? "emphasis" : "new"}
              tint={!n.isLeaf}
            />
            {n.keysS.slice(1).map((_, i) => (
              <line
                key={`d${i}`}
                x1={r2(x + (i + 1) * n.cellW)}
                y1={r2(y)}
                x2={r2(x + (i + 1) * n.cellW)}
                y2={r2(y + NODE_H)}
                stroke={COLOR.fg}
                strokeWidth={STROKE.divider}
              />
            ))}
            {n.keysS.map((k, i) => (
              <Label key={`k${i}`} x={x + (i + 0.5) * n.cellW} y={n.cy} text={k} />
            ))}
          </g>
        ) : (
          <CellStrip
            x={x}
            y={y}
            cellW={n.cellW}
            cellH={NODE_H}
            cells={n.keysS.map((k) =>
              n.state === "highlight"
                ? { label: k, state: "highlight" as const }
                : k,
            )}
            tint={!n.isLeaf}
          />
        )}
        {n.note && (
          <Label
            x={n.cx}
            y={n.cy + NODE_H / 2 + NOTE_DROP}
            text={n.note}
            size={FONT.note}
            fill={COLOR.caption}
            halo
          />
        )}
      </g>
    );
  });

  const roleEls = (roles ?? []).map((r, i) => (
    <Label
      key={`role${i}`}
      x={treeRight + ROLE_GAP}
      y={SPACE.margin + NODE_H / 2 + r.level * ROW_GAP}
      text={r.label}
      size={FONT.note}
      fill={COLOR.caption}
      anchor="start"
    />
  ));

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg w={width} h={height} label={caption ?? "B+ tree diagram"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        <g transform={`translate(${r2(shift)},0)`}>
          {routeEdges}
          {leafEdges}
          {promoteEdges}
          {routeLabels}
          {nodeEls}
          {roleEls}
        </g>
      </DiagramSvg>
    </DiagramFigure>
  );
}
