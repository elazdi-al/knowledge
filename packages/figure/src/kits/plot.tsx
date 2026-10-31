/** Functions, data and geometry on axes. Everything is canvas marks, so plots share the look of every other figure. */
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Legend, type LegendItem } from "../marks/legend";
import { Canvas, Col } from "../marks/layout";
import { Dot, Line, Path } from "../marks/shapes";
import { Text } from "../marks/text";
import { measure } from "../measure";
import type { Point, State, Tone } from "../model";
import { FONT, LINE_H } from "../theme";

/** The data box `x` by `y` drawn `w` by `h` px with its top-left at `at` in the enclosing `Canvas`; y grows up. */
export function plotArea({ x: [x0, x1], y: [y0, y1], w, h, at = [0, 0] }: { x: Point; y: Point; w: number; h: number; at?: Point }) {
  const px = (v: number) => at[0] + ((v - x0) / (x1 - x0)) * w;
  const py = (v: number) => at[1] + h - ((v - y0) / (y1 - y0)) * h;
  return { px, py, p: ([a, b]: Point): Point => [px(a), py(b)] };
}
export type Area = ReturnType<typeof plotArea>;

/** `f` on `[a, b]`, sampled into `n` segments, in pixels. */
export const curve = (area: Area, f: (v: number) => number, [a, b]: Point, n = 96): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const v = a + ((b - a) * i) / n;
    return area.p([v, f(v)]);
  });

/** Horizontal and vertical axes spanning data ranges `x` and `y` through the data point `origin`, with arrows and labels at their tips. */
export function Axes({ area, x, y, origin = [0, 0], labels }: { area: Area; x: Point; y: Point; origin?: Point; labels: [string, string] }) {
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

export interface AxisSpec {
  domain: Point;
  title?: string;
  /** values to mark, or about how many; default about 5 */
  ticks?: number[] | number;
}

/** About `count` round values across `[a, b]`. */
function niceTicks([a, b]: Point, count = 5): number[] {
  const rough = (b - a) / count, mag = 10 ** Math.floor(Math.log10(rough)), unit = rough / mag;
  const step = (unit < 1.5 ? 1 : unit < 3 ? 2 : unit < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}
const ticksOf = ({ domain, ticks }: AxisSpec) => (Array.isArray(ticks) ? ticks : niceTicks(domain, ticks));

const TICK = 4, TICK_GAP = 3;

function Frame({ area, x, y }: { area: Area; x: AxisSpec; y: AxisSpec }) {
  const corner = area.p([x.domain[0], y.domain[0]]);
  const yTicks = ticksOf(y), xTicks = ticksOf(x);
  const labelW = Math.max(0, ...yTicks.map((t) => measure(String(t), FONT.note)));
  const right = area.p([x.domain[1], y.domain[0]]), top = area.p([x.domain[0], y.domain[1]]);
  return (
    <>
      <Line from={corner} to={right} />
      <Line from={corner} to={top} />
      {xTicks.map((t) => {
        const [px, py] = area.p([t, y.domain[0]]);
        return (
          <>
            <Line key={`x${t}`} from={[px, py]} to={[px, py + TICK]} thin />
            <Text key={`xl${t}`} size="note" muted text={String(t)} at={[px, py + TICK]} anchor="n" offset={TICK_GAP} />
          </>
        );
      })}
      {yTicks.map((t) => {
        const [px, py] = area.p([x.domain[0], t]);
        return (
          <>
            <Line key={`y${t}`} from={[px, py]} to={[px - TICK, py]} thin />
            <Text key={`yl${t}`} size="note" muted text={String(t)} at={[px - TICK, py]} anchor="e" offset={TICK_GAP} />
          </>
        );
      })}
      {x.title && <Text size="note" text={x.title} at={[(corner[0] + right[0]) / 2, corner[1] + TICK + TICK_GAP + LINE_H.note]} anchor="n" offset={TICK_GAP} />}
      {y.title && <Text size="note" text={y.title} rotate={-90} at={[corner[0] - TICK - TICK_GAP - labelW - TICK_GAP - LINE_H.note / 2, (corner[1] + top[1]) / 2]} />}
    </>
  );
}

interface Series {
  /** a legend entry */
  name?: string;
  tone?: Tone;
  state?: State;
  /** set by `Plot` */
  area?: Area;
}

export interface ScatterProps extends Series {
  points: Point[];
  r?: number;
}
/** Data points. */
export function Scatter({ points, area, tone, state, r }: ScatterProps) {
  return <>{points.map((p, i) => <Dot key={i} at={area!.p(p)} r={r} tone={tone} state={state} />)}</>;
}

export interface SeriesProps extends Series {
  points: Point[];
  dashed?: boolean;
}
/** Data points joined by a line. */
export function Series({ points, area, tone, state, dashed }: SeriesProps) {
  return <Path points={points.map(area!.p)} tone={tone} state={state} dashed={dashed} />;
}

export interface CurveProps extends Series {
  f: (x: number) => number;
  /** default the plot's x domain */
  over?: Point;
  dashed?: boolean;
  /** the plot's axes, set by `Plot`, to cut the curve where it leaves the frame */
  domains?: { x: Point; y: Point };
}
/** A function, cut where it leaves the plot. */
export function Curve({ f, over, area, domains, tone, state, dashed }: CurveProps) {
  const [a, b] = over ?? domains!.x;
  const [lo, hi] = domains!.y;
  const runs: Point[][] = [[]];
  for (let i = 0; i <= 96; i++) {
    const x = a + ((b - a) * i) / 96, y = f(x);
    if (Number.isFinite(y) && y >= lo && y <= hi) runs[runs.length - 1].push(area!.p([x, y]));
    else if (runs[runs.length - 1].length) runs.push([]);
  }
  return <>{runs.filter((r) => r.length > 1).map((r, i) => <Path key={i} points={r} tone={tone} state={state} dashed={dashed} />)}</>;
}

const LEGEND_KEY = new Map<unknown, LegendItem["key"]>([[Scatter, "dot"], [Series, "line"], [Curve, "line"]]);

export interface PlotProps {
  w?: number;
  h?: number;
  x: AxisSpec;
  y: AxisSpec;
  /** list each named series under the plot */
  legend?: boolean;
  /** `Scatter`, `Series`, `Curve`, or a function of the plot's area returning any canvas marks */
  children?: ReactNode | ((area: Area) => ReactNode);
}

/** Axes with ticks and titles around `Scatter`, `Series` and `Curve`. */
export function Plot({ w = 320, h = 200, x, y, legend, children }: PlotProps) {
  const area = plotArea({ x: x.domain, y: y.domain, w, h });
  const kids = typeof children === "function" ? [children(area)] : Children.toArray(children);
  const drawn = kids.map((c) => {
    if (!isValidElement(c) || !LEGEND_KEY.has(c.type)) return c;
    return cloneElement(c as ReactElement<CurveProps>, { area, domains: { x: x.domain, y: y.domain } });
  });
  const items = kids.flatMap((c) => {
    if (!isValidElement(c)) return [];
    const { name, tone, dashed } = c.props as CurveProps;
    return name ? [{ label: name, tone, key: dashed ? ("dashed" as const) : LEGEND_KEY.get(c.type) }] : [];
  });
  return (
    <Col gap={12}>
      <Canvas>
        <Frame area={area} x={x} y={y} />
        {drawn}
      </Canvas>
      {legend && items.length > 0 && <Legend items={items} />}
    </Col>
  );
}
