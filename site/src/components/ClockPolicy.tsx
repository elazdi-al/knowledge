import { Col, Diagram, Edge, Grid, Node, Row, Space, Text, type State } from "@/components/figure";
import { nodeTitleW } from "@/components/figure/layout";
import { NODE } from "@/components/figure/theme";

export interface ClockFrame {
  /** Stable id; also referenced by `hand` and used as the default label. */
  id: string;
  /** Page / frame label shown inside the cell. Defaults to `id`. */
  label?: string;
  /** Reference bit. Drawn as a small badge radially outside the cell:
   *  ref = 1 highlighted (inverted), ref = 0 normal outline. */
  ref?: 0 | 1;
  /** Marks this frame as the victim candidate (emphasised cell outline),
   *  independent of where the hand points. */
  victim?: boolean;
}

export interface ClockNote {
  /** Bold lead-in line, e.g. "If ref = 1". */
  head: string;
  /** Following body line(s); newlines wrap onto separate rows. */
  body: string;
}

interface Props {
  /** Frames in ring order, laid out clockwise starting at the top. */
  frames: ClockFrame[];
  /** Frame id the clock hand points at. Defaults to the first frame. */
  hand?: string;
  /** Label drawn alongside the hand. Defaults to "clock hand". */
  handLabel?: string;
  /** Right-margin rule cards (the Clock decision rules). */
  notes?: ClockNote[];
  /** Where the ring starts. "top" (default) places frame 0 at 12 o'clock. */
  start?: "top" | "right";
  /** Bold heading inside the card. */
  title?: string;
  caption?: string;
  className?: string;
}

/** The eight border cells of a 3x3 grid, clockwise from the top-left. */
const RING = [0, 1, 2, 5, 8, 7, 6, 3];

/** One step of the sweep: where the hand is and what it did there. */
interface Snap {
  hand: number;
  refs: (0 | 1 | undefined)[];
  free: boolean[];
  act?: "clear" | "evict";
}

/** Second chance from the hand: a set bit is cleared and the hand moves on; a clear bit is evicted. Two evictions show both rules. */
function sweep(frames: ClockFrame[], hand: number): Snap[] {
  let s: Snap = { hand, refs: frames.map((f) => f.ref), free: frames.map(() => false) };
  const out = [s];
  for (let cur = hand, evictions = 0; evictions < 2 && !s.free[cur]; cur = (cur + 1) % frames.length) {
    const act = s.refs[cur] === 1 ? "clear" : "evict";
    s = {
      hand: cur,
      act,
      refs: s.refs.map((r, i) => (i !== cur ? r : act === "clear" ? 0 : undefined)),
      free: s.free.map((f, i) => f || (i === cur && act === "evict")),
    };
    out.push(s);
    if (act === "evict") evictions++;
  }
  return out;
}

/** The ring before the sweep and after each miss: the hand moves clockwise, set bits clear to 0, and the frames it evicts turn free. */
export function ClockPolicy({ frames, hand, handLabel = "clock hand", notes = [], start = "top", title, caption, className }: Props) {
  const n = frames.length;
  const name = (i: number) => frames[i].label ?? frames[i].id;
  const snaps = sweep(frames, Math.max(0, frames.findIndex((f) => f.id === hand)));
  const misses = snaps.flatMap((s, k) => (s.act === "evict" ? [k] : []));
  const panels = [
    { head: "Start", sub: `${handLabel} at ${name(snaps[0].hand)}`, snap: snaps[0] },
    ...misses.map((k, m) => ({
      head: `Miss ${m + 1}`,
      sub: snaps
        .slice((misses[m - 1] ?? 0) + 1, k + 1)
        .map((s) => `${name(s.hand)} ${s.act === "clear" ? "cleared" : "evicted"}`)
        .join(", "),
      snap: snaps[k],
    })),
  ];

  // ponytail: up to 8 frames, one per border cell; a larger ring needs a bigger grid
  const off = start === "right" ? 2 : 0;
  const cellOf = (i: number) => RING[(off + Math.round((i * RING.length) / n)) % RING.length];
  const w = Math.max(...[...frames.map((_, i) => name(i)), "free"].map((t) => nodeTitleW({ title: t, mono: true, state: "default", shape: "box" }))) + 2 * NODE.padX;

  return (
    <Diagram title={title} caption={caption} className={className}>
      <Col gap={28} align="center">
        <Row gap={20} align="start">
          {panels.map(({ head, sub, snap }, p) => {
            const id = (i: number) => `${p}.${frames[i].id}`;
            return (
              <Col key={p} gap={14} align="center">
                <Col gap={2} align="center">
                  <Text text={head} weight={600} />
                  <Text text={sub} size="note" muted />
                </Col>
                <Grid cols={3} gap={24} align="center">
                  {Array.from({ length: 9 }, (_, c) => {
                    const i = frames.findIndex((_, i) => cellOf(i) === c);
                    if (c === 4) return <Node key={c} id={`${p}.hub`} shape="circle" w={8} h={8} state="active" />;
                    if (i < 0) return <Space key={c} />;
                    const free = snap.free[i];
                    const state: State | undefined = free ? "placeholder" : undefined;
                    return <Node key={c} id={id(i)} title={free ? "free" : name(i)} sub={free || snap.refs[i] === undefined ? undefined : `ref = ${snap.refs[i]}`} state={state} mono w={w} h={NODE.hSub} />;
                  })}
                </Grid>
                {n > 1 && frames.map((_, i) => <Edge key={i} from={id(i)} to={id((i + 1) % n)} route="arc" bend={-24} />)}
                <Edge from={`${p}.hub`} to={id(snap.hand)} route="arc" state="active" />
              </Col>
            );
          })}
        </Row>
        {notes.length > 0 && (
          <Row gap={12} align="stretch">
            {notes.map((note, i) => (
              <Node key={i} title={note.head} sub={note.body.replace(/\n/g, " ")} align="start" />
            ))}
          </Row>
        )}
      </Col>
    </Diagram>
  );
}
