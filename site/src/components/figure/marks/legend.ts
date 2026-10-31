import { createElement as h, type ReactNode } from "react";
import type { Tone } from "../model";
import { Canvas, Row } from "./layout";
import { Dot, Line, Poly } from "./shapes";
import { Text } from "./text";

export interface LegendItem {
  label: string;
  tone?: Tone;
  /** what the key shows; default a filled square */
  key?: "swatch" | "line" | "dashed" | "dot";
}
export interface LegendProps {
  items: LegendItem[];
  gap?: number;
}

const KEYS: Record<NonNullable<LegendItem["key"]>, (tone?: Tone) => ReactNode> = {
  swatch: (tone) => h(Poly, { points: [[0, 0], [10, 0], [10, 10], [0, 10]], tone, outline: true }),
  line: (tone) => h(Line, { from: [0, 5], to: [18, 5], tone, thick: true }),
  dashed: (tone) => h(Line, { from: [0, 5], to: [18, 5], tone, dashed: true }),
  dot: (tone) => h(Dot, { at: [5, 5], tone }),
};

/** What each colour or line means, so colour is never the only signal. */
export function Legend({ items, gap = 14 }: LegendProps): ReactNode {
  return h(Row, { gap }, items.map(({ label, tone, key = "swatch" }) => h(Row, { key: label, gap: 5 }, h(Canvas, null, KEYS[key](tone)), h(Text, { text: label, size: "note", muted: true }))));
}
