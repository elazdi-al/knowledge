import { FONT, measure, Path, STROKE, Text, type PathProps, type TextProps } from "@/components/figure";

/**
 * Plot vocabulary over the figure engine: a data box mapped to the pixels of a `Free`, sampled curves, labels anchored
 * to a point, and arrows. Everything it returns is engine markers, so plots share the look of every other figure.
 */

export type Pt = [number, number];

/** The data box `x` × `y` drawn `w` × `h` px with its top-left at `at` in the enclosing `Free`; y grows up. */
export function plotArea({ x: [x0, x1], y: [y0, y1], w, h, at = [0, 0] }: { x: Pt; y: Pt; w: number; h: number; at?: Pt }) {
  const px = (v: number) => at[0] + ((v - x0) / (x1 - x0)) * w;
  const py = (v: number) => at[1] + h - ((v - y0) / (y1 - y0)) * h;
  return { px, py, p: ([a, b]: Pt): Pt => [px(a), py(b)] };
}
export type Area = ReturnType<typeof plotArea>;

/** `f` on `[a, b]`, sampled into `n` segments, in pixels. */
export const curve = (area: Area, f: (v: number) => number, [a, b]: Pt, n = 96): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const v = a + ((b - a) * i) / n;
    return area.p([v, f(v)]);
  });

/** Compass side of a label that touches its point: `w` puts the text to the right of the point, `n` below it. */
export type Anchor = "c" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const TEXT_PX = { title: FONT.title, label: FONT.label, note: FONT.note } as const;

/** A `Text` whose `anchor` side sits `gap` px from the pixel point `at`. */
export function At({ at: [x, y], anchor = "c", gap = 4, size = "note", ...props }: Omit<TextProps, "x" | "y"> & { at: Pt; anchor?: Anchor; gap?: number }) {
  const px = TEXT_PX[size];
  const w = measure(props.text, px, { weight: props.weight ?? (size === "title" ? 600 : 400) });
  const h = Math.round(px * 1.4);
  const dx = anchor.includes("w") ? gap : anchor.includes("e") ? -w - gap : -w / 2;
  const dy = anchor.startsWith("n") ? gap : anchor.startsWith("s") ? -h - gap : -h / 2;
  return <Text size={size} {...props} x={x + dx} y={y + dy} />;
}

/** Open chevron at `tip` for a line arriving from `from`, the shape the engine draws on edges. */
function head(from: Pt, tip: Pt): Pt[] {
  const angle = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const leg = (a: number): Pt => [tip[0] - STROKE.head * Math.cos(angle + a), tip[1] - STROKE.head * Math.sin(angle + a)];
  return [leg(-0.62), tip, leg(0.62)];
}

/**
 * A straight arrow between two pixel points; `head="both"` makes it a dimension line. Drawn as paths rather than an
 * edge, so it paints in source order instead of over every item.
 */
export function Arrow({ from, to, head: heads = "end", ...line }: { from: Pt; to: Pt; head?: "end" | "both" | "none" } & Omit<PathProps, "points" | "closed">) {
  return (
    <>
      <Path points={[from, to]} {...line} />
      {heads !== "none" && <Path points={head(from, to)} {...line} dashed={false} />}
      {heads === "both" && <Path points={head(to, from)} {...line} dashed={false} />}
    </>
  );
}

/** Horizontal and vertical axes spanning data ranges `x` and `y` through the data point `origin`, labelled at their tips. */
export function Axes({ area, x, y, origin = [0, 0], labels }: { area: Area; x: Pt; y: Pt; origin?: Pt; labels: [string, string] }) {
  const tipX = area.p([x[1], origin[1]]), tipY = area.p([origin[0], y[1]]);
  return (
    <>
      <Arrow from={area.p([x[0], origin[1]])} to={tipX} />
      <Arrow from={area.p([origin[0], y[0]])} to={tipY} />
      <At text={labels[0]} at={tipX} anchor="w" gap={6} muted />
      <At text={labels[1]} at={tipY} anchor="s" gap={6} muted />
    </>
  );
}
