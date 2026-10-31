import { Line, Text } from "@/components/figure";

/**
 * Plot vocabulary over the figure engine: a data box mapped to the pixels of a `Canvas`, and sampled curves. Everything it returns is engine markers, so plots share the look of every other figure.
 */

export type Pt = [number, number];

/** The data box `x` × `y` drawn `w` × `h` px with its top-left at `at` in the enclosing `Canvas`; y grows up. */
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

/** Horizontal and vertical axes spanning data ranges `x` and `y` through the data point `origin`, labelled at their tips. */
export function Axes({ area, x, y, origin = [0, 0], labels }: { area: Area; x: Pt; y: Pt; origin?: Pt; labels: [string, string] }) {
  const tipX = area.p([x[1], origin[1]]), tipY = area.p([origin[0], y[1]]);
  return (
    <>
      <Line head="end" from={area.p([x[0], origin[1]])} to={tipX} />
      <Line head="end" from={area.p([origin[0], y[0]])} to={tipY} />
      <Text size="note" text={labels[0]} at={tipX} anchor="w" offset={6} muted />
      <Text size="note" text={labels[1]} at={tipY} anchor="s" offset={6} muted />
    </>
  );
}
