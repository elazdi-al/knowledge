/** The string rules of a label: `$...$` is TeX, `\x` is a literal `x`, dash variants are one hyphen. */

export function normalizeLabel(s: string): string {
  return s.replace(/[‐-―−]/g, "-").replace(/ /g, " ");
}

/** Decorative unicode that should be drawn instead: dots and chevrons. */
export const BANNED_GLYPH = /[•‣◦⋯…→←↔⇒⇐⟶⟵]/;

/** A backslash makes the next character literal: `\$` is a dollar, not TeX. */
export const unescapeLabel = (s: string) => s.replace(/\\(.)/g, "$1");

/** Text and TeX alternate: odd indices are the insides of `$...$`; `\$` is a literal dollar. */
export const splitMath = (label: string) => label.split(/(?<!\\)\$/);
