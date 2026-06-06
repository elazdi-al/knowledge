import { cn } from "@/lib/cn";

/**
 * A finite-automaton diagram in the textbook style: light-grey circular
 * states on a single baseline, a bare arrow into the start state, a double
 * ring for accepting states, curved labelled transitions, and self-loops
 * drawn above each node.
 *
 * Why a bespoke SVG instead of Mermaid: the academic automaton look — clean
 * round states, a start arrow with no source node, paired arcs that bow apart,
 * and tidy self-loops — is exactly what flowchart engines render badly. Here
 * we lay states out on a row and draw every edge as a single quadratic (or the
 * self-loop as one cubic), so the geometry is fully under our control.
 *
 * Rendered once on the server (no client JS, no flash). Every colour is a
 * `var(--mm-*)` reference, so it shares the diagram palette with <Mermaid> and
 * re-themes live on the light/dark switch. `currentColor` (set to --mm-fg on
 * the root) drives strokes, text and arrowheads as one ink.
 */

export interface AutoState {
  /** Stable id used by transitions and the `start`/`accepting` props. */
  id: string;
  /** Display label. `_` marks a subscript: `q_1` → q₁, `(r_1,r_2)` works too. */
  label?: string;
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

const STATE_FONT = 17;
const SUB_FONT = 11.5;
const SUB_DY = 3.6; // baseline drop for a subscript tspan
const EDGE_FONT = 14;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Small stable hash → a per-diagram marker id, so multiple automata on one
 *  page never share a DOM id (e.g. two automata with the same state names). */
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// --- label parsing (subscripts) -------------------------------------------

interface Token {
  t: string;
  sub: boolean;
}

/** Split a label into runs, treating `_x` / `_{xy}` as subscript tokens. */
function parseTokens(label: string): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < label.length; i++) {
    const c = label[i];
    if (c === "_") {
      i++;
      if (label[i] === "{") {
        let s = "";
        i++;
        while (i < label.length && label[i] !== "}") s += label[i++];
        out.push({ t: s, sub: true });
      } else if (i < label.length) {
        out.push({ t: label[i], sub: true });
      }
    } else {
      const last = out[out.length - 1];
      if (last && !last.sub) last.t += c;
      else out.push({ t: c, sub: false });
    }
  }
  return out;
}

/** Rough advance width of a parsed label at STATE_FONT, for ellipse sizing. */
function labelWidth(tokens: Token[]): number {
  return tokens.reduce((a, t) => a + t.t.length * (t.sub ? 5.6 : 8.7), 0);
}

// --- node + edge maths ----------------------------------------------------

interface Node extends AutoState {
  index: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  tokens: Token[];
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

function labelTspans(tokens: Token[]) {
  let prevSub = false;
  return tokens.map((tok, i) => {
    const dy = tok.sub === prevSub ? 0 : tok.sub ? SUB_DY : -SUB_DY;
    prevSub = tok.sub;
    return (
      <tspan key={i} fontSize={tok.sub ? SUB_FONT : STATE_FONT} dy={dy}>
        {tok.t}
      </tspan>
    );
  });
}

export function Automaton({
  states,
  transitions,
  start,
  accepting,
  gap = GAP,
  caption,
  className,
}: Props) {
  const acceptingSet = new Set(accepting ?? []);
  const startId = start ?? states[0]?.id;

  // Lay the states out on one baseline; widen the ellipse for long labels so
  // text never clips, while keeping the height (ry) uniform across the row.
  const nodes: Node[] = states.map((s, index) => {
    const tokens = parseTokens(s.label ?? s.id);
    const rx = Math.max(R, labelWidth(tokens) / 2 + 13);
    return {
      ...s,
      index,
      tokens,
      rx,
      ry: R,
      cx: 0,
      cy: 0,
      isAccepting: acceptingSet.has(s.id) || !!s.accepting,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n] as const));

  let cx = MARGIN + START_LEN + (nodes[0]?.rx ?? R);
  nodes.forEach((n, i) => {
    if (i > 0) cx += gap;
    n.cx = cx;
  });

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
  nodes.forEach((n) => (n.cy = cy));

  const last = nodes[nodes.length - 1];
  const width = (last?.cx ?? 0) + (last?.rx ?? R) + MARGIN;
  const height = topPad + bottomPad;

  // A per-instance marker id keeps multiple automata on one page valid, even
  // when two diagrams share state names (e.g. M and M′ in a complement proof).
  const arrowId = `aut-arrow-${hash(
    JSON.stringify({ states, transitions, start, accepting }),
  )}`;

  const edges = transitions.map((t, i) => {
    const a = byId.get(t.from);
    const b = byId.get(t.to);
    if (!a || !b) return null;

    if (a === b) {
      // Self-loop: one cubic bowing above the node, arrow returning on the right.
      const lp = edgePoint(a, -0.55, -1);
      const rp = edgePoint(a, 0.55, -1);
      const c0 = { x: lp.x - 11, y: lp.y - LOOP_RISE };
      const c1 = { x: rp.x + 11, y: rp.y - LOOP_RISE };
      const apexY = 0.125 * lp.y + 0.375 * c0.y + 0.375 * c1.y + 0.125 * rp.y;
      return (
        <g key={i}>
          <path
            d={`M${r2(lp.x)},${r2(lp.y)} C${r2(c0.x)},${r2(c0.y)} ${r2(c1.x)},${r2(c1.y)} ${r2(rp.x)},${r2(rp.y)}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            markerEnd={`url(#${arrowId})`}
          />
          {t.label && (
            <text
              x={r2(a.cx)}
              y={r2(apexY - 7)}
              textAnchor="middle"
              fontSize={EDGE_FONT}
              fill="currentColor"
            >
              {t.label}
            </text>
          )}
        </g>
      );
    }

    const dir = bendDir(t);
    const span = Math.abs(a.index - b.index);
    const mag = BEND_BASE + (span - 1) * BEND_STEP;
    const apex = { x: (a.cx + b.cx) / 2, y: cy + dir * mag };
    const p0 = edgePoint(a, apex.x - a.cx, apex.y - a.cy);
    const p1 = edgePoint(b, apex.x - b.cx, apex.y - b.cy);
    const mid = quadAt(0.5, p0, apex, p1);
    return (
      <g key={i}>
        <path
          d={`M${r2(p0.x)},${r2(p0.y)} Q${r2(apex.x)},${r2(apex.y)} ${r2(p1.x)},${r2(p1.y)}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          markerEnd={`url(#${arrowId})`}
        />
        {t.label && (
          <text
            x={r2(mid.x)}
            y={r2(dir < 0 ? mid.y - 9 : mid.y + 17)}
            textAnchor="middle"
            fontSize={EDGE_FONT}
            fill="currentColor"
          >
            {t.label}
          </text>
        )}
      </g>
    );
  });

  const startNode = byId.get(startId);
  const startArrow = startNode
    ? (() => {
        const tip = edgePoint(startNode, -1, 0);
        return (
          <path
            d={`M${r2(tip.x - START_LEN)},${r2(cy)} L${r2(tip.x)},${r2(cy)}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            markerEnd={`url(#${arrowId})`}
          />
        );
      })()
    : null;

  return (
    <figure className={cn("automaton", className)}>
      <div className="automaton__card">
        <div className="automaton__canvas">
          <svg
            width="100%"
            viewBox={`0 0 ${r2(width)} ${r2(height)}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={caption ?? "Finite automaton diagram"}
            style={{ color: "var(--mm-fg)" }}
          >
            <defs>
              <marker
                id={arrowId}
                viewBox="0 0 12 12"
                refX="9"
                refY="6"
                markerWidth="11"
                markerHeight="11"
                markerUnits="userSpaceOnUse"
                orient="auto"
              >
                <path
                  d="M2.5,2.5 L9,6 L2.5,9.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </marker>
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
                  fill="var(--mm-node)"
                  stroke="currentColor"
                  strokeWidth={1.5}
                />
                {n.isAccepting && (
                  <ellipse
                    cx={r2(n.cx)}
                    cy={r2(n.cy)}
                    rx={r2(n.rx - ACCEPT_INSET)}
                    ry={r2(n.ry - ACCEPT_INSET)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.3}
                  />
                )}
                <text
                  x={r2(n.cx)}
                  y={r2(n.cy)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={STATE_FONT}
                  fill="currentColor"
                >
                  {labelTspans(n.tokens)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      {caption && <figcaption className="automaton__caption">{caption}</figcaption>}
    </figure>
  );
}
