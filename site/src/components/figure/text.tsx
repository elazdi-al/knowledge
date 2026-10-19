/**
 * Label mini-syntax and the one `<Label>` the renderer uses. `_x` / `_{xy}`
 * is a subscript, `^x` / `^{xy}` a superscript. Dash variants normalise to
 * the ASCII hyphen; decorative unicode (bullets, arrows, ellipsis) is banned
 * and warned about in development: draw dots and chevrons instead.
 */
import type { CSSProperties } from "react";
import { FONT, r2, type TextStyle } from "./theme";

export interface Run {
  text: string;
  /** -1 sub, 0 base, 1 super */
  shift: -1 | 0 | 1;
}

export function normalizeLabel(s: string): string {
  return s.replace(/[‐-―−]/g, "-").replace(/ /g, " ");
}

const BANNED = /[•‣◦⋯…→←↔⇒⇐⟶⟵]/;

export function warnIfBanned(s: string) {
  if (process.env.NODE_ENV !== "production" && BANNED.test(s)) {
    console.warn(`[diagram] banned glyph in label ${JSON.stringify(s)}: draw dots/chevrons instead of unicode`);
  }
}

/** `\_` and `\^` are literal (ER names like `Works\_In`); mono labels never parse but still unescape. */
export const unescapeLabel = (s: string) => s.replace(/\\(.)/g, "$1");

export function parseLabel(label: string): Run[] {
  const out: Run[] = [];
  const push = (text: string, shift: Run["shift"]) => {
    const last = out[out.length - 1];
    if (last && last.shift === shift) last.text += text;
    else out.push({ text, shift });
  };
  for (let i = 0; i < label.length; i++) {
    const c = label[i];
    if (c === "\\" && i + 1 < label.length) {
      push(label[++i], 0);
    } else if (c === "_" || c === "^") {
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

export const plainLabel = (label: string) =>
  parseLabel(label)
    .map((r) => r.text)
    .join("");

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
  const runs = mono ? [{ text: unescapeLabel(normalized), shift: 0 as const }] : parseLabel(normalized);
  let prev: Run["shift"] = 0;
  return (
    <text
      x={r2(x)}
      y={r2(y)}
      textAnchor={anchor}
      dominantBaseline={baseline === "central" ? "central" : undefined}
      fontSize={size}
      fontWeight={weight === 400 ? undefined : weight}
      fontFamily={mono ? MONO : undefined}
      fontStyle={italic ? "italic" : undefined}
      style={halo ? { fill, stroke: "var(--dg-canvas)", strokeWidth: 8, strokeLinejoin: "round", paintOrder: "stroke", ...style } : { fill, ...style }}
    >
      {runs.map((run, i) => {
        // In user units, not em: em follows each tspan's own font size, so a shift and its return would not cancel.
        const dy = (prev - run.shift) * 0.2 * size;
        prev = run.shift;
        return (
          <tspan
            key={i}
            fontSize={run.shift === 0 ? undefined : r2(size * FONT.subScale)}
            dy={dy === 0 ? undefined : r2(dy)}
          >
            {run.text}
          </tspan>
        );
      })}
    </text>
  );
}
