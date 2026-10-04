import { Col, Diagram, Edge, Free, Node, Row, Space, type Side } from "@/components/figure";
import { nodeTitleW } from "@/components/figure/layout";
import { TONE } from "@/components/tones";

/**
 * A finite-automaton diagram in the textbook style: round states (one
 * diameter per figure), a bare arrow into the start state, a double ring in
 * the accept tone for accepting states, arcs that bow apart, and self-loops
 * on the free side of their state. States sit on one baseline unless the
 * author places them.
 */

export interface AutoState {
  /** Stable id used by transitions and the `start`/`accepting` props. */
  id: string;
  /** Display label. `_` marks a subscript: `q_1` → q₁, `(r_1,r_2)` works too. */
  label?: string;
  /** Optional manual position for diagrams that should not be laid out in a row. */
  x?: number;
  y?: number;
  /** Mark as accepting (double ring, accept tone). Alternative to the top-level `accepting`. */
  accepting?: boolean;
}

export type Dir = "up" | "down" | "left" | "right";

export interface AutoTransition {
  from: string;
  to: string;
  label?: string;
  /** Force the arc's bow. Defaults to up for left→right, down for right→left. */
  bend?: "up" | "down";
  /**
   * For a self-loop (`from === to`), which side of the node it bows toward.
   * Defaults to `"up"`. For ordinary edges this is ignored.
   */
  loop?: Dir;
  /**
   * Override the perpendicular bow of an ordinary edge, in px (0 = straight).
   * Defaults to the automatic, span-scaled bow. Useful in manual layouts to
   * keep a dense diagram's edges straight or to draw one long sweeping arc.
   */
  curve?: number;
}

interface Props {
  states: AutoState[];
  transitions: AutoTransition[];
  /** Start state id. Defaults to the first state; it should be the leftmost. */
  start?: string;
  /** Which side the bare start arrow enters from. Defaults to `"left"`. */
  startDir?: Dir;
  /** Accepting state ids (or set `accepting` on the state objects). */
  accepting?: string[];
  /** Centre-to-centre spacing between states, in px. */
  gap?: number;
  /** Bold heading inside the card (e.g. "Before"). */
  title?: string;
  caption?: string;
  className?: string;
}

const START = "__start";
const START_LEN = 40;
const SIDE: Record<Dir, Side> = { up: "top", down: "bottom", left: "left", right: "right" };
type Pt = { x: number; y: number };
const UNIT: Record<Dir, Pt> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / (xs.length || 1);
/** The engine's `arc` control point: the chord midpoint moved `bend` px along the travel normal. */
function ctrlOf(a: Pt, b: Pt, bend: number): Pt {
  const dx = b.x - a.x, dy = b.y - a.y, k = bend / (Math.hypot(dx, dy) || 1);
  return { x: (a.x + b.x) / 2 - dy * k, y: (a.y + b.y) / 2 + dx * k };
}
/** Edge labels are mono and print literally, so digit subscripts (`N_1`) become subscript glyphs. */
const edgeLabel = (s?: string) => s?.replace(/_(\d)/g, (_, d: string) => String.fromCharCode(0x2080 + Number(d)));

export function Automaton({ states, transitions, start, startDir = "left", accepting, gap = 150, title, caption, className }: Props) {
  const startId = start ?? states[0]?.id;
  const index = new Map(states.map((s, i) => [s.id, i]));
  const manual = states.some((s) => s.x !== undefined || s.y !== undefined);
  const pos = new Map(states.map((s, i) => [s.id, manual ? { x: s.x ?? i * gap, y: s.y ?? 0 } : { x: i * gap, y: 0 }]));
  const D = Math.max(48, ...states.map((s) => nodeTitleW({ title: s.label ?? s.id, state: "default", shape: "circle" }) + 24));

  const known = transitions.filter((t) => index.has(t.from) && index.has(t.to));
  const arcs = known.filter((t) => t.from !== t.to);
  const centre = { x: avg([...pos.values()].map((p) => p.x)), y: avg([...pos.values()].map((p) => p.y)) };

  // Bow in px along the travel normal, as the engine's `arc` reads it. Rows bow on screen (up = above the
  // baseline). Placed figures bow relative to travel, and an edge with no `bend` bows away from the figure's centre.
  const bendOf = (t: AutoTransition) => {
    const ia = index.get(t.from)!, ib = index.get(t.to)!;
    const mag = t.curve ?? 38 + (Math.abs(ia - ib) - 1) * 28;
    const forced = t.bend && (t.bend === "up" ? -1 : 1);
    if (!manual) return (forced || (ia < ib ? -1 : 1)) * mag * (ib > ia ? 1 : -1);
    if (forced) return forced * mag;
    const a = pos.get(t.from)!, b = pos.get(t.to)!, mid = ctrlOf(a, b, 0), n = ctrlOf(a, b, 1);
    const inward = (n.x - mid.x) * (centre.x - mid.x) + (n.y - mid.y) * (centre.y - mid.y);
    return (Math.abs(inward) < 1 ? (ia < ib ? -1 : 1) : inward > 0 ? -1 : 1) * mag;
  };
  // Both edges of an anti-parallel pair take one value so they bow apart; an author's `bend` on either one leads.
  const bend = new Map<AutoTransition, number>();
  for (const t of arcs) {
    if (bend.has(t)) continue;
    const pair = [t, ...arcs.filter((u) => u.from === t.to && u.to === t.from)];
    const v = bendOf(pair.find((u) => u.bend) ?? t);
    for (const u of pair) bend.set(u, v);
  }

  // A loop goes on top unless an edge leaves its state within 45 degrees of straight up; then on the clearest side.
  const leaving = (id: string) => {
    const c = pos.get(id)!;
    const dirs = arcs.flatMap((t) => {
      if (t.from !== id && t.to !== id) return [];
      const ctrl = ctrlOf(pos.get(t.from)!, pos.get(t.to)!, bend.get(t)!);
      return [{ x: ctrl.x - c.x, y: ctrl.y - c.y }];
    });
    if (id === startId) dirs.push(UNIT[startDir]);
    return dirs.map((d) => ({ x: d.x / (Math.hypot(d.x, d.y) || 1), y: d.y / (Math.hypot(d.x, d.y) || 1) }));
  };
  const loopSide = (t: AutoTransition): Side => {
    if (t.loop) return SIDE[t.loop];
    const dirs = leaving(t.from);
    const crowd = (d: Dir) => Math.max(-1, ...dirs.map((v) => v.x * UNIT[d].x + v.y * UNIT[d].y));
    if (crowd("up") <= Math.SQRT1_2) return "top";
    const best = (["down", "right", "left"] as const).reduce((a, d) => (crowd(d) < crowd(a) ? d : a));
    return SIDE[best];
  };

  const node = (s: AutoState, x?: number, y?: number) => {
    const acc = !!s.accepting || !!accepting?.includes(s.id);
    return <Node key={s.id} id={s.id} shape="circle" w={D} title={s.label ?? s.id} double={acc} tone={acc ? TONE.accept : undefined} x={x} y={y} />;
  };

  let body;
  if (manual) {
    const p = pos.get(startId)!, u = UNIT[startDir];
    const anchor = { x: p.x + u.x * (D / 2 + START_LEN), y: p.y + u.y * (D / 2 + START_LEN) };
    const minX = Math.min(anchor.x, ...[...pos.values()].map((q) => q.x - D / 2));
    const minY = Math.min(anchor.y, ...[...pos.values()].map((q) => q.y - D / 2));
    body = (
      <Free>
        {states.map((s) => node(s, pos.get(s.id)!.x - D / 2 - minX, pos.get(s.id)!.y - D / 2 - minY))}
        <Space id={START} w={0} h={0} x={anchor.x - minX} y={anchor.y - minY} />
      </Free>
    );
  } else {
    const anchor = <Space id={START} w={0} h={0} />;
    const blank = <Space w={0} h={0} />;
    const withStart = (s: AutoState) => {
      const n = node(s);
      if (startDir === "left") return <Row key={s.id} gap={START_LEN}>{anchor}{n}</Row>;
      if (startDir === "right") return <Row key={s.id} gap={START_LEN}>{n}{anchor}</Row>;
      return (
        <Col key={s.id} gap={START_LEN}>
          {startDir === "up" ? anchor : blank}
          {n}
          {startDir === "down" ? anchor : blank}
        </Col>
      );
    };
    body = <Row gap={gap - D}>{states.map((s) => (s.id === startId ? withStart(s) : node(s)))}</Row>;
  }

  return (
    <Diagram title={title} caption={caption} className={className}>
      {body}
      {startId && <Edge from={START} to={startId} route="straight" />}
      {known.map((t, i) =>
        t.from === t.to ? (
          <Edge key={i} from={t.from} to={t.to} loop={loopSide(t)} label={edgeLabel(t.label)} />
        ) : (
          <Edge key={i} from={t.from} to={t.to} route="arc" bend={bend.get(t)} label={edgeLabel(t.label)} />
        ),
      )}
    </Diagram>
  );
}
