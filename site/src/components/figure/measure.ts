/**
 * Text measurement without a DOM: Inter glyph advances (generated tables) for
 * sans, a fixed 0.6em advance for the mono face. A 2% safety factor absorbs
 * the kerning the tables ignore.
 */
import { INTER_400, INTER_700 } from "./font-metrics";
import { FONT, type TextStyle } from "./theme";
import { normalizeLabel, parseLabel, unescapeLabel } from "./text";

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

/** Width in px of `text` (with `_`/`^` runs) at `size` px. */
export function measure(text: string, size: number, opts: TextOpts = {}): number {
  const { weight = 400, mono = false } = opts;
  const s = normalizeLabel(text);
  if (mono) return Array.from(unescapeLabel(s)).length * FONT.monoAdvance * size;
  let w = 0;
  for (const run of parseLabel(s)) {
    const px = run.shift === 0 ? size : size * FONT.subScale;
    let em = 0;
    for (const ch of run.text) em += advance(ch, weight);
    w += em * px;
  }
  return w * SAFETY;
}

/** Width of `text` drawn in a text role. */
export const measureStyle = (text: string, s: TextStyle) => measure(text, s.size, { weight: s.weight, mono: s.mono });
