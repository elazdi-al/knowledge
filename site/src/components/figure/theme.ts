/**
 * Sizes, spacing and strokes for the figure engine. No colours here:
 * every colour is a `var(--dg-*)` token from `app/diagram-tokens.css`.
 */

export const FONT = {
  title: 13,
  label: 12.5,
  mono: 12,
  note: 11.5,
  groupTitle: 12.5,
  edgeLabel: 12,
  tag: 11,
  /** `$...$` TeX size relative to the base size, KaTeX's ratio in the prose */
  mathScale: 1.21,
  /** mono advance per glyph, in em */
  monoAdvance: 0.6,
} as const;

/** A text role: the renderer draws it this way and layout measures it this way. */
export interface TextStyle {
  size: number;
  weight?: number;
  mono?: boolean;
}

export const TEXT = {
  groupTitle: { size: FONT.groupTitle, weight: 500 },
  tag: { size: FONT.tag, weight: 500 },
  tableHeader: { size: FONT.note, weight: 500 },
  edgeLabel: { size: FONT.edgeLabel },
  badge: { size: 10.5, weight: 500, mono: true },
  /** toned table chip; `mono` follows the cell */
  chip: { size: FONT.note, weight: 500 },
} as const satisfies Record<string, TextStyle>;

export const NODE = {
  padX: 14,
  h: 34,
  hSub: 46,
  minW: 44,
  circleMin: 40,
  /** cylinder cap height (the top ellipse) */
  cap: 8,
  badge: 18,
  /** diamond height (with `sub`: +16) and minimum width */
  diamondH: 40,
  diamondMinW: 72,
  /** triangle height and minimum width; long labels widen it */
  triangleH: 44,
  /** second outline inset for `double` */
  doubleInset: 4,
} as const;

export const CELL = { size: 28, pad: 10, index: 14, ellipsis: 18 } as const;
/** Edge label box (text plus its knockout halo): height, horizontal padding, and the gap a self-loop's label keeps from the loop's apex. */
export const EDGE_LABEL = { h: 16, pad: 10, loopGap: 3 } as const;
export const TABLE = { rowH: 26, padX: 8, emptyH: 36 } as const;
export const GROUP = { pad: 16, titleBand: 24 } as const;
export const TAG = { h: 18, padX: 7 } as const;
export const GAP = { stack: 16, graphNode: 32, graphRank: 64 } as const;
/** Shortest gap between two stacked items an edge joins, so every arrow reads as an arrow. */
export const EDGE_GAP = 32;

export const STROKE = {
  border: 1,
  strong: 1.5,
  edge: 1.5,
  /** `thick` edges (total participation); the head scales by the square root of the width ratio */
  thick: 2.75,
  divider: 1,
  dash: "4 4",
  head: 8,
} as const;

/** Default radius of a plotted data point. */
export const DOT_R = 3.5;

export const RADIUS ={ node: 4, group: 8, cell: 3, tag: 4, corner: 8 } as const;

/** Frame margin so strokes, badges and arrow heads never clip. */
export const MARGIN = 10;
export const PORT_INSET = 8;
/** Clearance a labelled edge needs beyond its pill between two items. */
export const LABEL_CLEAR = 40;
export const MAX_CONTENT_W = 660;

export const r2 = (n: number) => Math.round(n * 100) / 100;
