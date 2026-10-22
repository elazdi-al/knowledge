/**
 * The one `<Label>` the renderer uses. `$...$` is TeX, set like the prose
 * math (see `math.ts`); the rest is plain text, with `\x` a literal `x`.
 * Dash variants normalise to the ASCII hyphen; decorative unicode (bullets,
 * arrows, ellipsis) is banned and warned about in development: draw dots and
 * chevrons instead.
 */
import type { CSSProperties } from "react";
import { typeset } from "./math";
import { textWidth } from "./measure";
import { FONT, r2, type TextStyle } from "./theme";

export function normalizeLabel(s: string): string {
  return s.replace(/[‐-―−]/g, "-").replace(/ /g, " ");
}

const BANNED = /[•‣◦⋯…→←↔⇒⇐⟶⟵]/;

export function warnIfBanned(s: string) {
  if (process.env.NODE_ENV !== "production" && BANNED.test(s)) {
    console.warn(`[diagram] banned glyph in label ${JSON.stringify(s)}: draw dots/chevrons instead of unicode`);
  }
}

/** A backslash makes the next character literal: `\$` is a dollar, not TeX. */
export const unescapeLabel = (s: string) => s.replace(/\\(.)/g, "$1");

/** Text and TeX alternate: odd indices are the insides of `$...$`; `\$` is a literal dollar. */
export const splitMath = (label: string) => label.split(/(?<!\\)\$/);

/** `Label` props for `text` in a text role; pair with `measureStyle` so layout and render agree. */
export const styled = (text: string, s: TextStyle) => ({ text, size: s.size, weight: s.weight, mono: s.mono });

export const SANS = "var(--font-sans, ui-sans-serif, system-ui, sans-serif)";
export const MONO = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

interface LabelProps {
  x: number;
  y: number;
  text: string;
  size: number;
  fill: string;
  weight?: number;
  mono?: boolean;
  italic?: boolean;
  anchor?: "start" | "middle" | "end";
  /** vertical centring on y (default) or baseline on y */
  baseline?: "central" | "baseline";
  /** knockout halo in the canvas colour, so lines passing behind the text break around it */
  halo?: boolean;
  style?: CSSProperties;
}

export function Label({
  x,
  y,
  text,
  size,
  fill,
  weight = 400,
  mono = false,
  italic = false,
  anchor = "middle",
  baseline = "central",
  halo = false,
  style,
}: LabelProps) {
  const normalized = normalizeLabel(text);
  warnIfBanned(normalized);
  const paint: CSSProperties = halo
    ? { fill, stroke: "var(--dg-canvas)", strokeWidth: 8, strokeLinejoin: "round", paintOrder: "stroke", ...style }
    : { fill, ...style };
  const font = {
    fontSize: size,
    fontWeight: weight === 400 ? undefined : weight,
    fontFamily: mono ? MONO : undefined,
    fontStyle: italic ? "italic" : undefined,
  };
  const parts = mono ? [normalized] : splitMath(normalized);
  if (parts.length === 1) {
    return (
      <text x={r2(x)} y={r2(y)} textAnchor={anchor} dominantBaseline={baseline === "central" ? "central" : undefined} {...font} style={paint}>
        {unescapeLabel(normalized)}
      </text>
    );
  }
  // With TeX in it, the label is laid out piece by piece on one baseline, and `central` puts the math axis on y. TeX
  // widths are exact and text widths estimated, so text is anchored against its TeX neighbours: the estimate's error
  // lands on the label's outer edges, never in a gap.
  const mathPx = size * FONT.mathScale;
  const tex = parts.map((p, i) => (i % 2 ? typeset(p) : null));
  const widths = parts.map((p, i) => (tex[i] ? tex[i].w * mathPx : textWidth(p, size, weight)));
  const last = parts.length - 1;
  const total = widths.reduce((a, b) => a + b, 0);
  const base = r2(baseline === "central" ? y + 0.25 * mathPx : y);
  let at = anchor === "start" ? x : anchor === "end" ? x - total : x - total / 2;
  // TeX spacing leaves gaps wider than a stroked halo covers, and a stroked text piece would clip the TeX beside it,
  // so a TeX label knocks out a box instead.
  const up = Math.max(0.75 * size, ...tex.map((t) => (t ? t.h * mathPx : 0)));
  const down = Math.max(0.25 * size, ...tex.map((t) => (t ? t.d * mathPx : 0)));
  return (
    <g style={{ fill, ...style }}>
      {halo && <rect x={r2(at - 4)} y={r2(base - up - 2)} width={r2(total + 8)} height={r2(up + down + 4)} rx={3} style={{ fill: "var(--dg-canvas)" }} />}
      {parts.map((p, i) => {
        const px = at;
        at += widths[i];
        const t = tex[i];
        if (!p) return null;
        if (!t) {
          const [tx, ta] = i === 0 ? [px + widths[i], "end" as const] : i === last ? [px, "start" as const] : [px + widths[i] / 2, "middle" as const];
          return (
            <text key={i} x={r2(tx)} y={base} textAnchor={ta} xmlSpace="preserve" {...font}>
              {unescapeLabel(p)}
            </text>
          );
        }
        // The glyphs are drawn 1000 units to the em.
        return (
          <g
            key={i}
            transform={`translate(${r2(px)} ${base}) scale(${r2(mathPx) / 1000})`}
            dangerouslySetInnerHTML={{ __html: t.body }}
          />
        );
      })}
    </g>
  );
}
