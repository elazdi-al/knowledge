/**
 * Shared SVG primitives for the diagram family. Components own their layout
 * maths; these own the visual language, so every figure draws boxes, grids,
 * arrows and ellipses the same way.
 *
 * Rendered on the server (no client JS). All colours are `var(--mm-*)`
 * references via the theme, so figures re-theme on the light/dark switch.
 */
import type { CSSProperties, ReactNode } from "react";
import { COLOR, FONT, RADIUS, STROKE, r2 } from "./theme";
import { Label, type FontWeight } from "./text";

// --- ids -------------------------------------------------------------------

/**
 * Small stable hash → per-instance DOM ids (markers, clips), so several
 * diagrams on one page never collide, even with identical content prefixes.
 * (Server components can't use useId.)
 */
export function stableId(prefix: string, seed: unknown): string {
  const s = JSON.stringify(seed) ?? "";
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${prefix}-${(h >>> 0).toString(36)}`;
}

// --- svg root ----------------------------------------------------------------

interface DiagramSvgProps {
  /** viewBox size; also the natural rendered size (1 svg px = 1 css px). */
  w: number;
  h: number;
  /** Accessible figure description (falls back from the caption). */
  label: string;
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * The one svg root: natural-size rendering capped at container width (so
 * small figures never inflate and text never renders giant or tiny),
 * `currentColor` ink, the site sans, accessible labelling.
 */
export function DiagramSvg({ w, h, label, children, style }: DiagramSvgProps) {
  return (
    <svg
      width={r2(w)}
      viewBox={`0 0 ${r2(w)} ${r2(h)}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      fontFamily="var(--font-sans, ui-sans-serif, system-ui, sans-serif)"
      style={{ color: COLOR.fg, maxWidth: "100%", height: "auto", ...style }}
    >
      {children}
    </svg>
  );
}

// --- markers -----------------------------------------------------------------

/**
 * The family chevron arrowhead. Reference with `markerEnd={ref(id)}` (or
 * markerStart with orient handled automatically). One size everywhere;
 * `color` defaults to the connector ink.
 */
export function ArrowHead({
  id,
  color = COLOR.muted,
}: {
  id: string;
  color?: string;
}) {
  return (
    <marker
      id={id}
      viewBox="0 0 12 12"
      refX="9"
      refY="6"
      markerWidth="10"
      markerHeight="10"
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path
        d="M2.5,2.5 L9,6 L2.5,9.5"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </marker>
  );
}

export const ref = (id: string) => `url(#${id})`;

// --- arrows ------------------------------------------------------------------

export type Pt = { x: number; y: number };

interface ArrowProps {
  from: Pt;
  to: Pt;
  /** ArrowHead id; omit for a bare line. */
  markerId?: string;
  /** Also put a head on the start (mirror/double arrows). */
  both?: boolean;
  /** Bow the line into a quadratic: signed offset of the control point along
   *  the left normal of from→to. 0 = straight. */
  bend?: number;
  dashed?: boolean;
  color?: string;
  width?: number;
  /** Optional halo'd label, offset to the outside of the curve (or above a
   *  straight line). Supports `_`/`^` runs. */
  label?: string;
  labelSize?: number;
  labelColor?: string;
  /** Push the label further out (px, default 11). */
  labelOffset?: number;
}

/**
 * The one connector: straight or bowed, optional chevron(s), optional halo'd
 * midpoint label that never sits on the line.
 */
export function Arrow({
  from,
  to,
  markerId,
  both = false,
  bend = 0,
  dashed = false,
  color = COLOR.muted,
  width = STROKE.line,
  label,
  labelSize = FONT.note,
  labelColor = COLOR.muted,
  labelOffset = 11,
}: ArrowProps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // left normal of the travel direction
  const nx = -dy / len;
  const ny = dx / len;

  const ctrl: Pt = {
    x: (from.x + to.x) / 2 + nx * bend,
    y: (from.y + to.y) / 2 + ny * bend,
  };
  const d =
    bend === 0
      ? `M${r2(from.x)},${r2(from.y)} L${r2(to.x)},${r2(to.y)}`
      : `M${r2(from.x)},${r2(from.y)} Q${r2(ctrl.x)},${r2(ctrl.y)} ${r2(to.x)},${r2(to.y)}`;

  // curve midpoint (quad at t=0.5), then offset outward for the label
  const mid: Pt =
    bend === 0
      ? { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
      : {
          x: 0.25 * from.x + 0.5 * ctrl.x + 0.25 * to.x,
          y: 0.25 * from.y + 0.5 * ctrl.y + 0.25 * to.y,
        };
  const side = bend !== 0 ? Math.sign(bend) : Math.abs(ny) > 0.92 ? -1 : 1;
  const lx = mid.x + nx * side * labelOffset;
  const ly = mid.y + ny * side * labelOffset;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dashed ? STROKE.dash : undefined}
        markerEnd={markerId ? ref(markerId) : undefined}
        markerStart={both && markerId ? ref(markerId) : undefined}
      />
      {label && (
        <Label x={lx} y={ly} text={label} size={labelSize} fill={labelColor} halo />
      )}
    </g>
  );
}

// --- boxes -------------------------------------------------------------------

export type BoxState = "normal" | "emphasis" | "new" | "highlight";

interface BoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Centered label; `_`/`^` runs supported. */
  label?: string;
  /** normal = bg fill + ink stroke; emphasis = bold stroke; new = dashed;
   *  highlight = inverted ink box. */
  state?: BoxState;
  /** Use the container tint instead of the element fill. */
  tint?: boolean;
  rx?: number;
  fontSize?: number;
  fontWeight?: FontWeight;
  /** Override fill/stroke for special cases; prefer states. */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

/** The family element box: one rect, one centered label, state grammar. */
export function Box({
  x,
  y,
  w,
  h,
  label,
  state = "normal",
  tint = false,
  rx = RADIUS.box,
  fontSize = FONT.label,
  fontWeight = 400,
  fill,
  stroke,
  strokeWidth,
}: BoxProps) {
  const hi = state === "highlight";
  return (
    <g>
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(w)}
        height={r2(h)}
        rx={rx}
        fill={fill ?? (hi ? COLOR.hiBg : tint ? COLOR.node : COLOR.bg)}
        stroke={stroke ?? (hi ? COLOR.hiBg : COLOR.fg)}
        strokeWidth={
          strokeWidth ?? (state === "emphasis" ? STROKE.bold : STROKE.frame)
        }
        strokeDasharray={state === "new" ? STROKE.dash : undefined}
      />
      {label && (
        <Label
          x={x + w / 2}
          y={y + h / 2}
          text={label}
          size={fontSize}
          weight={fontWeight}
          fill={hi ? COLOR.hiFg : COLOR.fg}
        />
      )}
    </g>
  );
}

// --- single-stroke grids -------------------------------------------------------

export interface Cell {
  label?: string;
  state?: BoxState;
  tint?: boolean;
  /** Override the label colour (e.g. muted placeholders). */
  color?: string;
}

interface CellStripProps {
  x: number;
  y: number;
  /** Uniform cell size along the strip; or pass per-cell `widths`. */
  cellW?: number;
  cellH: number;
  widths?: number[];
  cells: Array<Cell | string | number | null>;
  orient?: "h" | "v";
  fontSize?: number;
  /** Tint the whole strip (container) instead of per cell. */
  tint?: boolean;
  rx?: number;
}

const asCell = (c: Cell | string | number | null): Cell =>
  c === null ? {} : typeof c === "object" ? c : { label: String(c) };

/**
 * A row/column of cells drawn the textbook way: ONE outer rounded rect plus
 * interior divider lines — shared edges are never double-stroked. State
 * fills (highlight/tint) are clipped to the outer radius.
 */
export function CellStrip({
  x,
  y,
  cellW,
  cellH,
  widths,
  cells,
  orient = "h",
  fontSize = FONT.label,
  tint = false,
  rx = RADIUS.box,
}: CellStripProps) {
  const items = cells.map(asCell);
  const n = items.length;
  const sizes =
    widths ?? Array.from({ length: n }, () => cellW ?? cellH);
  const starts: number[] = [];
  let acc = 0;
  for (const s of sizes) {
    starts.push(acc);
    acc += s;
  }
  const totalW = orient === "h" ? acc : (cellW ?? cellH);
  const totalH = orient === "h" ? cellH : acc;
  const clipId = stableId("strip", { x, y, cells, orient });

  return (
    <g>
      <clipPath id={clipId}>
        <rect x={r2(x)} y={r2(y)} width={r2(totalW)} height={r2(totalH)} rx={rx} />
      </clipPath>
      {/* base fill */}
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(totalW)}
        height={r2(totalH)}
        rx={rx}
        fill={tint ? COLOR.node : COLOR.bg}
      />
      {/* per-cell state fills, clipped so corners stay rounded */}
      <g clipPath={ref(clipId)}>
        {items.map((c, i) => {
          const fill =
            c.state === "highlight" ? COLOR.hiBg : c.tint ? COLOR.node : null;
          if (!fill) return null;
          const cx = orient === "h" ? x + starts[i] : x;
          const cy = orient === "h" ? y : y + starts[i];
          const cw = orient === "h" ? sizes[i] : totalW;
          const ch = orient === "h" ? cellH : sizes[i];
          return (
            <rect
              key={i}
              x={r2(cx)}
              y={r2(cy)}
              width={r2(cw)}
              height={r2(ch)}
              fill={fill}
            />
          );
        })}
      </g>
      {/* interior dividers — single stroke per shared edge */}
      {starts.slice(1).map((s, i) =>
        orient === "h" ? (
          <line
            key={i}
            x1={r2(x + s)}
            y1={r2(y)}
            x2={r2(x + s)}
            y2={r2(y + totalH)}
            stroke={COLOR.fg}
            strokeWidth={STROKE.divider}
          />
        ) : (
          <line
            key={i}
            x1={r2(x)}
            y1={r2(y + s)}
            x2={r2(x + totalW)}
            y2={r2(y + s)}
            stroke={COLOR.fg}
            strokeWidth={STROKE.divider}
          />
        ),
      )}
      {/* outer frame on top so dividers/fills never poke past it */}
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(totalW)}
        height={r2(totalH)}
        rx={rx}
        fill="none"
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      {/* labels */}
      {items.map((c, i) => {
        if (!c.label) return null;
        const cx = orient === "h" ? x + starts[i] + sizes[i] / 2 : x + totalW / 2;
        const cy = orient === "h" ? y + cellH / 2 : y + starts[i] + sizes[i] / 2;
        return (
          <Label
            key={i}
            x={cx}
            y={cy}
            text={c.label}
            size={fontSize}
            fill={
              c.color ?? (c.state === "highlight" ? COLOR.hiFg : COLOR.fg)
            }
          />
        );
      })}
    </g>
  );
}

// --- drawn ellipsis -------------------------------------------------------------

interface DotsProps {
  /** Centre of the middle dot. */
  x: number;
  y: number;
  orient?: "h" | "v";
  gap?: number;
  r?: number;
  color?: string;
}

/** "More of the same" as three drawn dots — never a unicode ⋯/… glyph. */
export function DotsEllipsis({
  x,
  y,
  orient = "h",
  gap = 5,
  r = 1.6,
  color = COLOR.muted,
}: DotsProps) {
  return (
    <g fill={color}>
      {[-1, 0, 1].map((k) => (
        <circle
          key={k}
          cx={r2(orient === "h" ? x + k * gap : x)}
          cy={r2(orient === "h" ? y : y + k * gap)}
          r={r}
        />
      ))}
    </g>
  );
}

// --- span bracket ------------------------------------------------------------------

interface BracketProps {
  x1: number;
  x2: number;
  /** y of the bracket bar; ticks descend toward the content below. */
  y: number;
  /** Bold label centred above the bar. */
  label?: string;
  drop?: number;
  color?: string;
}

/** A horizontal span bracket with end ticks and a label above its stem. */
export function Bracket({
  x1,
  x2,
  y,
  label,
  drop = 12,
  color = COLOR.muted,
}: BracketProps) {
  const mid = (x1 + x2) / 2;
  return (
    <g>
      <path
        d={`M${r2(x1)},${r2(y + drop)} L${r2(x1)},${r2(y)} L${r2(x2)},${r2(y)} L${r2(x2)},${r2(y + drop)}`}
        fill="none"
        stroke={color}
        strokeWidth={STROKE.divider}
      />
      <line
        x1={r2(mid)}
        y1={r2(y)}
        x2={r2(mid)}
        y2={r2(y - drop)}
        stroke={color}
        strokeWidth={STROKE.divider}
      />
      {label && (
        <Label
          x={mid}
          y={y - drop - 11}
          text={label}
          size={FONT.title}
          weight={700}
        />
      )}
    </g>
  );
}
