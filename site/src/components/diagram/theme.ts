/**
 * The single source of visual truth for the bespoke diagram family.
 *
 * Every diagram component draws from these tokens — font roles, stroke
 * weights, radii, spacing — so the whole family reads as one hand. Colours are
 * `var(--mm-*)` references and re-theme on the light/dark switch; nothing in
 * an SVG may hardcode a hue.
 *
 * Visual grammar (keep to it):
 *  - Structure is ink: container frames and element boxes stroke `fg`.
 *  - Hierarchy is fill, not stroke: containers `node` tint, elements `bg`.
 *  - State is stroke treatment: emphasis = bold, new = dashed,
 *    highlight = inverted (`hiBg`/`hiFg`).
 *  - Flow is annotation: connectors/arrows stroke `muted`, one chevron marker.
 *  - Never encode meaning with saturated colour, en/em dashes, bullets, or
 *    unicode arrows. Ellipses are drawn dots, arrows are marker lines.
 */

export const FONT = {
  /** bold title above/inside a container (stage names, disk names) */
  title: 13.5,
  /** standard element/cell label */
  label: 12.5,
  /** secondary annotation, in-figure notes */
  note: 11,
  /** large node text (automaton states) */
  node: 17,
  /** subscript scale relative to its base size */
  subScale: 0.72,
} as const;

export const STROKE = {
  /** container frames, element box outlines */
  frame: 1.4,
  /** interior grid dividers (single-stroke grids) */
  divider: 1.1,
  /** emphasis outline */
  bold: 2.2,
  /** connector / arrow lines */
  line: 1.4,
  /** dash pattern for "new"/provisional elements */
  dash: "5 3",
} as const;

export const RADIUS = {
  /** outer container frames */
  frame: 8,
  /** element boxes */
  box: 5,
  /** cells inside a strip/grid */
  cell: 4,
} as const;

export const SPACE = {
  /** svg edge padding */
  margin: 14,
  /** default inner padding of a container */
  padX: 13,
  padY: 12,
  /** default gap between sibling elements */
  gap: 8,
  /** horizontal text padding inside a measured box */
  textPadX: 12,
} as const;

export const COLOR = {
  bg: "var(--mm-bg)",
  node: "var(--mm-node)",
  fg: "var(--mm-fg)",
  border: "var(--mm-border)",
  line: "var(--mm-line)",
  muted: "var(--mm-muted)",
  accent: "var(--mm-accent)",
  caption: "var(--mm-caption)",
  hiBg: "var(--mm-hi-bg)",
  hiFg: "var(--mm-hi-fg)",
} as const;

/**
 * ViewBox width budget. The card renders SVGs at natural size capped at
 * container width, so a figure wider than this starts shrinking its text on a
 * full-width note page. Figures that want more room must stack or wrap
 * instead of growing wider. Split panes get roughly half — components with a
 * `compact`/stacked variant should use it there.
 */
export const MAX_CONTENT_W = 660;

/** Round to 2 decimals to keep emitted SVG attributes tidy. */
export const r2 = (n: number) => Math.round(n * 100) / 100;
