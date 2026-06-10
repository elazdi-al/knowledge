import {
  Arrow,
  ArrowHead,
  Box,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  Label,
  RADIUS,
  SPACE,
  STROKE,
  measureLabel,
  r2,
  stableId,
} from "@/components/diagram";

/**
 * The Clock / second-chance page-replacement diagram in the textbook style:
 * buffer frames laid on a circle, each a rounded cell carrying its page label
 * and a reference-bit badge sitting radially outward, curved arrows walking
 * the ring clockwise, a small centre hub, and a clock hand swinging from the
 * hub to the current victim candidate. A short stack of rule cards sits to
 * the right.
 *
 * The author supplies the frames in ring order and (optionally) which frame
 * the hand points at; the circular layout (cos/sin around a centre) and the
 * arc geometry are derived. Ref bits use one state grammar uniformly: ref = 1
 * is a highlighted (inverted) badge, ref = 0 a normal outlined badge; the
 * victim candidate is marked by its emphasised cell outline and the hand. The
 * hand label sits just past the hub opposite the hand — the one region of the
 * ring interior nothing crosses — and carries a halo besides.
 *
 * Rendered once on the server (no client JS); all colour and stroke comes from
 * the diagram theme, so it re-themes with the family on the light/dark switch.
 */

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

// --- geometry ---------------------------------------------------------------

const RING_R = 92; // ring radius (centre to cell centre)
const CELL_W = 86; // frame cell width
const CELL_H = 34; // frame cell height
const HUB_R = 6; // centre hub radius
const BADGE_R = 12; // ref-bit badge radius
const BADGE_GAP = 13; // gap from cell edge to badge centre
const ARC_BOW = 18; // outward bow of the ring-walk arcs
const HAND_LABEL_GAP = 16; // hand label offset past the hub, opposite the hand
const NOTE_PAD = 11; // rule card inner padding
const NOTE_LINE = 17; // rule card line pitch
const NOTE_VGAP = 12; // vertical gap between rule cards
const NOTE_COL_GAP = 18; // gap between the ring block and the rule cards

/** Boundary point of a cell's rounded rect along direction (dx,dy) from centre,
 *  treated as an axis-aligned box (good enough for arc anchors / hand tips). */
function boxEdge(cx: number, cy: number, dx: number, dy: number) {
  const hw = CELL_W / 2;
  const hh = CELL_H / 2;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  // scale so the longer axis just reaches the box edge
  const s = ax * hh > ay * hw ? hw / (ax || 1e-6) : hh / (ay || 1e-6);
  return { x: cx + dx * s, y: cy + dy * s };
}

interface Laid extends ClockFrame {
  angle: number; // radians, 0 = +x (right), measured clockwise from start
  cx: number;
  cy: number;
}

export function ClockPolicy({
  frames,
  hand,
  handLabel = "clock hand",
  notes = [],
  start = "top",
  title,
  caption,
  className,
}: Props) {
  const n = frames.length || 1;
  const startAngle = start === "right" ? 0 : -Math.PI / 2; // top = -90 degrees

  // Centre the ring within its own block (cells + outward badges), offset by
  // the margin.
  const blockHalfW = RING_R + CELL_W / 2 + BADGE_GAP + BADGE_R;
  const blockHalfH = RING_R + CELL_H / 2 + BADGE_GAP + BADGE_R;
  const cx0 = SPACE.margin + blockHalfW;
  const cy0 = SPACE.margin + blockHalfH;

  const laid: Laid[] = frames.map((f, i) => {
    const angle = startAngle + (i / n) * 2 * Math.PI; // clockwise (screen y down)
    return {
      ...f,
      angle,
      cx: cx0 + RING_R * Math.cos(angle),
      cy: cy0 + RING_R * Math.sin(angle),
    };
  });
  const byId = new Map(laid.map((f) => [f.id, f] as const));

  const handId = hand ?? frames[0]?.id;
  const handTarget = handId ? byId.get(handId) : undefined;

  const ringRight = cx0 + blockHalfW;
  const ringBottom = cy0 + blockHalfH;

  // --- rule cards, sized from real font metrics ------------------------------
  const noteLines = (note: ClockNote) => note.body.split("\n");
  const noteW = notes.length
    ? 2 * NOTE_PAD +
      notes.reduce(
        (m, note) =>
          Math.max(
            m,
            measureLabel(note.head, FONT.label, 600),
            ...noteLines(note).map((l) => measureLabel(l, FONT.note)),
          ),
        0,
      )
    : 0;
  const noteHeights = notes.map(
    (note) => 2 * NOTE_PAD + (1 + noteLines(note).length) * NOTE_LINE,
  );
  const notesTotal =
    noteHeights.reduce((a, b) => a + b, 0) +
    Math.max(0, notes.length - 1) * NOTE_VGAP;
  const notesX = ringRight + NOTE_COL_GAP;
  const notesTop = Math.max(SPACE.margin, cy0 - notesTotal / 2);

  const width = (notes.length ? notesX + noteW : ringRight) + SPACE.margin;
  const height =
    Math.max(ringBottom, notes.length ? notesTop + notesTotal : 0) +
    SPACE.margin;

  const arrowId = stableId("clk-arc", { frames, hand, notes, start, title });

  // --- ring arrows: short arcs between consecutive cells, bowing outward -----
  const arcEls =
    n < 2
      ? []
      : laid.map((a, i) => {
          const b = laid[(i + 1) % n];
          const mid = a.angle + Math.PI / n; // halfway angle to the next cell
          // anchor each arc on the cell edge facing the next cell
          const p0 = boxEdge(a.cx, a.cy, Math.cos(mid), Math.sin(mid));
          const p1Dir = mid + Math.PI; // facing back toward a
          const p1 = boxEdge(b.cx, b.cy, Math.cos(p1Dir), Math.sin(p1Dir));
          // clockwise travel puts the left normal inward, so a negative bend
          // bows the arc radially outward
          return (
            <Arrow
              key={`arc${i}`}
              from={p0}
              to={p1}
              bend={-ARC_BOW}
              markerId={arrowId}
            />
          );
        });

  // --- clock hand -------------------------------------------------------------
  let handEl: React.ReactNode = null;
  if (handTarget) {
    const dx = handTarget.cx - cx0;
    const dy = handTarget.cy - cy0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const tip = boxEdge(handTarget.cx, handTarget.cy, -ux, -uy);
    const sx = cx0 + ux * HUB_R;
    const sy = cy0 + uy * HUB_R;
    // The ring-walk arcs sweep through the band alongside the hand, so the
    // label sits just past the hub on the opposite side — the one region of
    // the ring interior nothing else crosses — with a halo besides.
    const lx = cx0 - ux * (HUB_R + HAND_LABEL_GAP);
    const ly = cy0 - uy * (HUB_R + HAND_LABEL_GAP);
    const anchor = ux > 0.45 ? "end" : ux < -0.45 ? "start" : "middle";
    // The hand is structure (ink, bold), not a muted connector, so its tip is
    // the family chevron drawn inline — the one shared marker def stays muted.
    const tipDeg = (Math.atan2(uy, ux) * 180) / Math.PI;
    handEl = (
      <g>
        <line
          x1={r2(sx)}
          y1={r2(sy)}
          x2={r2(tip.x)}
          y2={r2(tip.y)}
          stroke={COLOR.fg}
          strokeWidth={STROKE.bold}
        />
        <path
          d="M-6.5,-3.5 L0,0 L-6.5,3.5"
          transform={`translate(${r2(tip.x)},${r2(tip.y)}) rotate(${r2(tipDeg)})`}
          fill="none"
          stroke={COLOR.fg}
          strokeWidth={STROKE.line}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Label
          x={lx}
          y={ly}
          text={handLabel}
          size={FONT.note}
          fill={COLOR.muted}
          anchor={anchor}
          halo
        />
      </g>
    );
  }

  // --- cells + ref badges -----------------------------------------------------
  const cellEls = laid.map((f) => {
    // badge sits radially outward from the cell centre
    const bx = f.cx + (CELL_W / 2 + BADGE_GAP) * Math.cos(f.angle);
    const by = f.cy + (CELL_H / 2 + BADGE_GAP) * Math.sin(f.angle);
    const refBadge = f.ref === 0 || f.ref === 1;
    const refSet = f.ref === 1;
    return (
      <g key={f.id}>
        <Box
          x={f.cx - CELL_W / 2}
          y={f.cy - CELL_H / 2}
          w={CELL_W}
          h={CELL_H}
          label={f.label ?? f.id}
          state={f.victim ? "emphasis" : "normal"}
        />
        {/* one badge grammar for every frame: ref = 1 inverted, ref = 0 outline */}
        {refBadge && (
          <g>
            <circle
              cx={r2(bx)}
              cy={r2(by)}
              r={BADGE_R}
              fill={refSet ? COLOR.hiBg : COLOR.bg}
              stroke={refSet ? COLOR.hiBg : COLOR.fg}
              strokeWidth={STROKE.frame}
            />
            <Label
              x={bx}
              y={by}
              text={String(f.ref)}
              fill={refSet ? COLOR.hiFg : COLOR.fg}
            />
          </g>
        )}
      </g>
    );
  });

  // --- hub ----------------------------------------------------------------------
  const hubEl = <circle cx={r2(cx0)} cy={r2(cy0)} r={HUB_R} fill={COLOR.fg} />;

  // --- rule cards ----------------------------------------------------------------
  let yCursor = notesTop;
  const noteEls = notes.map((note, i) => {
    const h = noteHeights[i];
    const top = yCursor;
    yCursor += h + NOTE_VGAP;
    const lines = noteLines(note);
    return (
      <g key={`note${i}`}>
        <rect
          x={r2(notesX)}
          y={r2(top)}
          width={r2(noteW)}
          height={r2(h)}
          rx={RADIUS.frame}
          fill={COLOR.node}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        <Label
          x={notesX + NOTE_PAD}
          y={top + NOTE_PAD + NOTE_LINE / 2}
          text={note.head}
          weight={600}
          anchor="start"
        />
        {lines.map((line, j) => (
          <Label
            key={j}
            x={notesX + NOTE_PAD}
            y={top + NOTE_PAD + NOTE_LINE + (j + 0.5) * NOTE_LINE}
            text={line}
            size={FONT.note}
            fill={COLOR.muted}
            anchor="start"
          />
        ))}
      </g>
    );
  });

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={width}
        h={height}
        label={caption ?? "Clock / second-chance replacement diagram"}
      >
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        {arcEls}
        {handEl}
        {hubEl}
        {cellEls}
        {noteEls}
      </DiagramSvg>
    </DiagramFigure>
  );
}
