/**
 * Text measurement without a DOM: Inter glyph advances (generated tables) for
 * sans, a fixed 0.6em advance for the mono face. A 2% safety factor absorbs
 * the kerning the tables ignore.
 */
import { INTER_400, INTER_700 } from "./font-metrics";
import { typeset } from "./math";
import { FONT, type TextStyle } from "./theme";
import { normalizeLabel, splitMath, unescapeLabel } from "./text";

const SAFETY = 1.02;

/** Glyphs Inter lacks (they fall back to the system font); approximate ems. */
const FALLBACK: Record<string, number> = {
  "⋈": 0.95, "∈": 0.68, "∉": 0.68, "∪": 0.66, "∩": 0.66, "⊆": 0.68, "⊥": 0.66,
  "⟨": 0.39, "⟩": 0.39, "⌈": 0.36, "⌉": 0.36, "⌊": 0.36, "⌋": 0.36, "✓": 0.7,
};

function advance(ch: string, weight: number): number {
  const a4 = INTER_400.advances[ch] ?? FALLBACK[ch] ?? INTER_400.avg;
  const a7 = INTER_700.advances[ch] ?? FALLBACK[ch] ?? INTER_700.avg;
  const mix = Math.min(1, Math.max(0, (weight - 400) / 300));
  return a4 + (a7 - a4) * mix;
}

export interface TextOpts {
  weight?: number;
  mono?: boolean;
}

/** Width in px of `text` (with `$...$` TeX) at `size` px. */
export function measure(text: string, size: number, opts: TextOpts = {}): number {
  const { weight = 400, mono = false } = opts;
  const s = normalizeLabel(text);
  if (mono) return Array.from(unescapeLabel(s)).length * FONT.monoAdvance * size;
  return splitMath(s).reduce((w, part, i) => w + (i % 2 ? typeset(part).w * size * FONT.mathScale : textWidth(part, size, weight) * SAFETY), 0);
}

/** Width of plain text from the tables alone, without the kerning allowance. */
export function textWidth(s: string, size: number, weight: number): number {
  let em = 0;
  for (const ch of unescapeLabel(s)) em += advance(ch, weight);
  return em * size;
}

/** Width of `text` drawn in a text role. */
export const measureStyle = (text: string, s: TextStyle) => measure(text, s.size, { weight: s.weight, mono: s.mono });
