import {
  ArrowHead,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  Label,
  STROKE,
  measureLabel,
  r2,
  ref,
  stableId,
} from "@/components/diagram";

/**
 * A finite-automaton diagram in the textbook style: light-grey circular
 * states on a single baseline, a bare arrow into the start state, a double
 * ring for accepting states, curved labelled transitions, and self-loops
 * drawn above each node.
 *
 * Why a bespoke SVG instead of Mermaid: the academic automaton look - clean
 * round states, a start arrow with no source node, paired arcs that bow apart,
 * and tidy self-loops - is exactly what flowchart engines render badly. Here
 * we lay states out on a row and draw every edge as a single quadratic (or the
 * self-loop as one cubic), so the geometry is fully under our control.
 *
 * Rendered once on the server (no client JS, no flash). Chrome, text and
 * palette come from the shared diagram core, so it reads as one family with
 * the other figures and re-themes live on the light/dark switch.
 * `currentColor` (the core sets it to the figure ink) drives strokes, text
 * and arrowheads as one ink.
 */

export interface AutoState {
  /** Stable id used by transitions and the `start`/`accepting` props. */
  id: string;
  /** Display label. `_` marks a subscript: `q_1` → q₁, `(r_1,r_2)` works too. */
  label?: string;
  /** Optional manual position for diagrams that should not be laid out in a row. */
  x?: number;
  y?: number;
  /** Mark as accepting (double ring). Alternative to the top-level `accepting`. */
  accepting?: boolean;
}

export interface AutoTransition {
  from: string;
  to: string;
  label?: string;
  /** Force the arc's bow. Defaults to up for left→right, down for right→left. */
  bend?: "up" | "down";
}

interface Props {
  states: AutoState[];
  transitions: AutoTransition[];
  /** Start state id. Defaults to the first state; it should be the leftmost. */
  start?: string;
  /** Accepting state ids (or set `accepting` on the state objects). */
  accepting?: string[];
  /** Centre-to-centre spacing between states, in px. */
  gap?: number;
  /** Bold heading inside the card (e.g. "Before"). */
  title?: string;
  caption?: string;
  className?: string;
}

// --- geometry constants ---------------------------------------------------

const R = 28; // state radius (also the ellipse ry for wide labels)
const ACCEPT_INSET = 5; // gap between outer ring and accepting inner ring
const GAP = 150; // default centre-to-centre spacing
const START_LEN = 40; // length of the bare start arrow
const MARGIN = 12; // svg padding around the content
const LOOP_RISE = 36; // how far a self-loop bows above the node
const BEND_BASE = 38; // arc bow for adjacent states
const BEND_STEP = 28; // extra bow per skipped state

const EDGE_FONT = 14; // transition labels (between note and node scale)

// --- node + edge maths ----------------------------------------------------

interface Node extends AutoState {
  index: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  text: string;
  isAccepting: boolean;
}

type Pt = { x: number; y: number };

/** Point on a node's ellipse boundary along the direction (dx, dy) from centre. */
function edgePoint(n: Node, dx: number, dy: number): Pt {
  const s = 1 / Math.sqrt((dx / n.rx) ** 2 + (dy / n.ry) ** 2);
  return { x: n.cx + dx * s, y: n.cy + dy * s };
}

const quadAt = (t: number, p0: Pt, c: Pt, p1: Pt): Pt => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
};

export function Automaton({
  states,
  transitions,
  start,
  accepting,
  gap = GAP,
  title,
  caption,
  className,
}: Props) {
  const acceptingSet = new Set(accepting ?? []);
  const startId = start ?? states[0]?.id;

  // Lay the states out on one baseline; widen the ellipse for long labels so
  // text never clips, while keeping the height (ry) uniform across the row.
  const nodes: Node[] = states.map((s, index) => {
    const text = s.label ?? s.id;
    const rx = Math.max(R, measureLabel(text, FONT.node) / 2 + 13);
    return {
      ...s,
      index,
      text,
      rx,
      ry: R,
      cx: 0,
      cy: 0,
      isAccepting: acceptingSet.has(s.id) || !!s.accepting,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n] as const));

  const isManualLayout = nodes.some(
    (n) => typeof n.x === "number" || typeof n.y === "number",
  );

  if (isManualLayout) {
    nodes.forEach((n, i) => {
      n.cx = n.x ?? MARGIN + START_LEN + n.rx + i * gap;
      n.cy = n.y ?? R + LOOP_RISE + 24;
    });
  } else {
    let cx = MARGIN + START_LEN + (nodes[0]?.rx ?? R);
    nodes.forEach((n, i) => {
      if (i > 0) cx += gap;
      n.cx = cx;
    });
  }

  const bendDir = (t: AutoTransition): -1 | 1 => {
    if (t.bend) return t.bend === "up" ? -1 : 1;
    const a = byId.get(t.from);
    const b = byId.get(t.to);
    return a && b && a.index < b.index ? -1 : 1; // forward bows up
  };

  const hasSelf = transitions.some((t) => t.from === t.to);
  const hasUp = transitions.some((t) => t.from !== t.to && bendDir(t) === -1);
  const hasDown = transitions.some((t) => t.from !== t.to && bendDir(t) === 1);

  const topPad = hasSelf ? 88 : hasUp ? 60 : R + 16;
  const bottomPad = hasDown ? 60 : R + 16;
  const cy = topPad;
  if (!isManualLayout) {
    nodes.forEach((n) => (n.cy = cy));
  }

  // Edge geometry is computed before the svg is sized, so manual layouts can
  // include arcs and labels in the viewBox (a vertical edge's side label used
  // to fall outside the node-extent bounds and get clipped).
  interface EdgeLabel {
    x: number;
    y: number;
    text: string;
    anchor: "start" | "middle" | "end";
    baseline: "central" | "baseline";
  }
  interface EdgeGeom {
    key: number;
    d: string;
    maxX: number;
    maxY: number;
    label?: EdgeLabel;
  }

  const edgeGeoms = transitions.flatMap((t, i): EdgeGeom[] => {
    const a = byId.get(t.from);
    const b = byId.get(t.to);
    if (!a || !b) return [];

    if (a === b) {
      // Self-loop: one cubic bowing above the node, arrow returning on the right.
      const lp = edgePoint(a, -0.55, -1);
      const rp = edgePoint(a, 0.55, -1);
      const c0 = { x: lp.x - 11, y: lp.y - LOOP_RISE };
      const c1 = { x: rp.x + 11, y: rp.y - LOOP_RISE };
      const apexY = 0.125 * lp.y + 0.375 * c0.y + 0.375 * c1.y + 0.125 * rp.y;
      return [
        {
          key: i,
          d: `M${r2(lp.x)},${r2(lp.y)} C${r2(c0.x)},${r2(c0.y)} ${r2(c1.x)},${r2(c1.y)} ${r2(rp.x)},${r2(rp.y)}`,
          maxX: c1.x,
          maxY: lp.y,
          label: t.label
            ? {
                x: a.cx,
                y: apexY - 7,
                text: t.label,
                anchor: "middle",
                baseline: "baseline",
              }
            : undefined,
        },
      ];
    }

    const dir = bendDir(t);
    const span = Math.abs(a.index - b.index);
    const mag = BEND_BASE + (span - 1) * BEND_STEP;
    const apex = isManualLayout
      ? (() => {
          const dx = b.cx - a.cx;
          const dy = b.cy - a.cy;
          const len = Math.hypot(dx, dy) || 1;
          const normal = { x: -dy / len, y: dx / len };
          return {
            x: (a.cx + b.cx) / 2 + normal.x * dir * mag,
            y: (a.cy + b.cy) / 2 + normal.y * dir * mag,
          };
        })()
      : { x: (a.cx + b.cx) / 2, y: cy + dir * mag };
    const p0 = edgePoint(a, apex.x - a.cx, apex.y - a.cy);
    const p1 = edgePoint(b, apex.x - b.cx, apex.y - b.cy);
    const mid = quadAt(0.5, p0, apex, p1);

    // Offset the label along the arc's outward normal so it clears the curve
    // whatever its orientation (vertical edges in manual layouts used to get
    // a vertical offset that left the text on the arc); the halo keeps it
    // readable when the gap to the arc is tight.
    const chordMid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    let nx = apex.x - chordMid.x;
    let ny = apex.y - chordMid.y;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    const anchor = nx > 0.35 ? "start" : nx < -0.35 ? "end" : "middle";
    return [
      {
        key: i,
        d: `M${r2(p0.x)},${r2(p0.y)} Q${r2(apex.x)},${r2(apex.y)} ${r2(p1.x)},${r2(p1.y)}`,
        maxX: mid.x,
        maxY: mid.y,
        label: t.label
          ? {
              x: mid.x + nx * 12,
              y: mid.y + ny * 12,
              text: t.label,
              anchor,
              baseline: "central",
            }
          : undefined,
      },
    ];
  });

  // Right/bottom extent of a placed edge label, from real font metrics.
  const labelMaxX = (l: EdgeLabel) => {
    const w = measureLabel(l.text, EDGE_FONT);
    return l.anchor === "start" ? l.x + w : l.anchor === "end" ? l.x : l.x + w / 2;
  };
  const labelMaxY = (l: EdgeLabel) =>
    l.baseline === "central" ? l.y + EDGE_FONT * 0.6 : l.y;

  const last = nodes[nodes.length - 1];
  const width = isManualLayout
    ? Math.max(
        ...nodes.map((n) => n.cx + n.rx),
        ...edgeGeoms.map((e) => Math.max(e.maxX, e.label ? labelMaxX(e.label) : 0)),
        0,
      ) + MARGIN
    : (last?.cx ?? 0) + (last?.rx ?? R) + MARGIN;
  const height = isManualLayout
    ? Math.max(
        ...nodes.map((n) => n.cy + n.ry),
        ...edgeGeoms.map((e) => Math.max(e.maxY, e.label ? labelMaxY(e.label) : 0)),
        0,
      ) + MARGIN
    : topPad + bottomPad;

  // A per-instance marker id keeps multiple automata on one page valid, even
  // when two diagrams share state names (e.g. M and M' in a complement proof).
  const arrowId = stableId("aut-arrow", { states, transitions, start, accepting });

  const edges = edgeGeoms.map((e) => (
    <g key={e.key}>
      <path
        d={e.d}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE.line}
        markerEnd={ref(arrowId)}
      />
      {e.label && (
        <Label
          x={e.label.x}
          y={e.label.y}
          text={e.label.text}
          size={EDGE_FONT}
          fill="currentColor"
          anchor={e.label.anchor}
          baseline={e.label.baseline}
          halo
        />
      )}
    </g>
  ));

  const startNode = byId.get(startId);
  const startArrow = startNode
    ? (() => {
        const tip = edgePoint(startNode, -1, 0);
        const y = startNode.cy;
        return (
          <path
            d={`M${r2(tip.x - START_LEN)},${r2(y)} L${r2(tip.x)},${r2(y)}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE.line}
            markerEnd={ref(arrowId)}
          />
        );
      })()
    : null;

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={width}
        h={height}
        label={caption ?? "Finite automaton diagram"}
      >
        <defs>
          <ArrowHead id={arrowId} color="currentColor" />
        </defs>

        {startArrow}
        {edges}

        {nodes.map((n) => (
          <g key={n.id}>
            <ellipse
              cx={r2(n.cx)}
              cy={r2(n.cy)}
              rx={r2(n.rx)}
              ry={r2(n.ry)}
              fill={COLOR.node}
              stroke="currentColor"
              strokeWidth={STROKE.frame}
            />
            {n.isAccepting && (
              <ellipse
                cx={r2(n.cx)}
                cy={r2(n.cy)}
                rx={r2(n.rx - ACCEPT_INSET)}
                ry={r2(n.ry - ACCEPT_INSET)}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE.frame}
              />
            )}
            <Label
              x={n.cx}
              y={n.cy}
              text={n.text}
              size={FONT.node}
              fill="currentColor"
            />
          </g>
        ))}
      </DiagramSvg>
    </DiagramFigure>
  );
}
