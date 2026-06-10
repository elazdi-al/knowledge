/**
 * Text for diagrams: exact measurement and a shared <Label>.
 *
 * Measurement sums real Inter glyph advances (generated from the font file by
 * scripts/gen-font-metrics.mjs), so boxes sized with `measureText` never
 * overflow — no more `label.length * 7.1` guesses. A 2% safety factor absorbs
 * kerning, which the table ignores.
 *
 * Labels share one mini-syntax across the family: `_x` / `_{xy}` renders a
 * subscript (`K_{q-1}` → K with a q-1 subscript), `^x` / `^{xy}` a
 * superscript. Dash variants normalize to the ASCII hyphen; decorative
 * unicode (bullets, arrows, ellipsis) is banned from rendered output and
 * warned about in development — draw dots and marker arrows instead.
 */
import { INTER_400, INTER_700, type FontMetrics } from "./font-metrics";
import { COLOR, FONT, r2 } from "./theme";

export type FontWeight = 400 | 600 | 700;

// --- normalization ---------------------------------------------------------

/** Dash/minus variants → ASCII hyphen; NBSP → space. */
export function normalizeLabel(s: string): string {
  return s.replace(/[‐-―−]/g, "-").replace(/ /g, " ");
}

const BANNED = /[•‣◦⋯…→←↔⇒⇐⟶⟵]/;

function warnIfBanned(s: string) {
  if (process.env.NODE_ENV !== "production" && BANNED.test(s)) {
    console.warn(
      `[diagram] banned glyph in label ${JSON.stringify(s)} — draw dots/arrows instead of unicode`,
    );
  }
}

// --- label mini-syntax -----------------------------------------------------

export interface Run {
  text: string;
  /** -1 sub, 0 base, 1 super */
  shift: -1 | 0 | 1;
}

/** Split a label into runs, treating `_x`/`_{xy}` as subscript and
 *  `^x`/`^{xy}` as superscript tokens. */
export function parseLabel(label: string): Run[] {
  const out: Run[] = [];
  const push = (text: string, shift: Run["shift"]) => {
    const last = out[out.length - 1];
    if (last && last.shift === shift) last.text += text;
    else out.push({ text, shift });
  };
  for (let i = 0; i < label.length; i++) {
    const c = label[i];
    if (c === "_" || c === "^") {
      const shift = c === "_" ? -1 : 1;
      i++;
      if (label[i] === "{") {
        let s = "";
        i++;
        while (i < label.length && label[i] !== "}") s += label[i++];
        push(s, shift);
      } else if (i < label.length) {
        push(label[i], shift);
      }
    } else {
      push(c, 0);
    }
  }
  return out;
}

/** A label without its `_`/`^` markup, for measuring or plain rendering. */
export const plainLabel = (label: string) =>
  parseLabel(label)
    .map((r) => r.text)
    .join("");

// --- measurement -----------------------------------------------------------

const SAFETY = 1.02;

/** Glyphs Inter does not ship (they render in the system fallback font);
 *  approximate em widths so measurement still holds. */
const FALLBACK_ADVANCES: Record<string, number> = {
  "⋈": 0.95,
  "∈": 0.68,
  "∉": 0.68,
  "∪": 0.66,
  "∩": 0.66,
  "⊆": 0.68,
  "⊥": 0.66,
  "⟨": 0.39,
  "⟩": 0.39,
  "⌈": 0.36,
  "⌉": 0.36,
  "⌊": 0.36,
  "⌋": 0.36,
};

function metricsFor(weight: FontWeight): FontMetrics {
  return weight >= 700 ? INTER_700 : INTER_400;
}

function advance(ch: string, weight: FontWeight): number {
  const fallback = FALLBACK_ADVANCES[ch];
  if (weight === 600) {
    // Inter advances scale almost linearly with weight; interpolate 400↔700.
    const a4 = INTER_400.advances[ch] ?? fallback ?? INTER_400.avg;
    const a7 = INTER_700.advances[ch] ?? fallback ?? INTER_700.avg;
    return a4 + (a7 - a4) * (2 / 3);
  }
  const m = metricsFor(weight);
  return m.advances[ch] ?? fallback ?? m.avg;
}

/** Exact width of a plain string at `size` px in Inter. */
export function measureText(
  s: string,
  size: number,
  weight: FontWeight = 400,
): number {
  let em = 0;
  for (const ch of normalizeLabel(s)) em += advance(ch, weight);
  return em * size * SAFETY;
}

/** Width of a label with `_`/`^` runs at `size` px. */
export function measureLabel(
  label: string,
  size: number,
  weight: FontWeight = 400,
): number {
  return parseLabel(normalizeLabel(label)).reduce(
    (w, run) =>
      w +
      measureText(run.text, run.shift === 0 ? size : size * FONT.subScale, weight),
    0,
  );
}

// --- shared <Label> ---------------------------------------------------------

interface LabelProps {
  x: number;
  y: number;
  /** Label text; `_`/`^` runs become sub/superscripts. */
  text: string;
  size?: number;
  weight?: FontWeight;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  /** Vertical alignment. "central" centres on y (the default); "baseline"
   *  puts the baseline on y, e.g. for titles above a box. */
  baseline?: "central" | "baseline";
  /** Paint a bg-coloured halo behind the text so it stays readable when it
   *  crosses a line or arc. */
  halo?: boolean;
}

/**
 * The one way diagrams render text: normalized, subscript-aware, optionally
 * halo'd. Inherits the svg font (the site sans).
 */
export function Label({
  x,
  y,
  text,
  size = FONT.label,
  weight = 400,
  fill = COLOR.fg,
  anchor = "middle",
  baseline = "central",
  halo = false,
}: LabelProps) {
  const normalized = normalizeLabel(text);
  warnIfBanned(normalized);
  const runs = parseLabel(normalized);

  let prev: Run["shift"] = 0;
  const tspans = runs.map((run, i) => {
    // dy is cumulative across tspans, so emit only the change in shift.
    const dyEm = (prev - run.shift) * 0.28;
    prev = run.shift;
    return (
      <tspan
        key={i}
        fontSize={run.shift === 0 ? undefined : r2(size * FONT.subScale)}
        dy={dyEm === 0 ? undefined : `${r2(dyEm)}em`}
      >
        {run.text}
      </tspan>
    );
  });

  return (
    <text
      x={r2(x)}
      y={r2(y)}
      textAnchor={anchor}
      dominantBaseline={baseline === "central" ? "central" : undefined}
      fontSize={size}
      fontWeight={weight === 400 ? undefined : weight}
      fill={fill}
      stroke={halo ? COLOR.bg : undefined}
      strokeWidth={halo ? 3 : undefined}
      strokeLinejoin={halo ? "round" : undefined}
      style={halo ? { paintOrder: "stroke" } : undefined}
    >
      {tspans}
    </text>
  );
}
