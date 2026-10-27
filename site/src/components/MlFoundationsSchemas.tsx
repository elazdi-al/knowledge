import type { ReactNode } from "react";
import { Cells, Col, Diagram, Dot, Free, Path, Poly, Row, Text, type CellInput } from "@/components/figure";
import { At, Axes, curve, plotArea, type Pt } from "@/components/PlotFigures";
import { ML_TONE } from "@/components/tones";

/** The per-example squared, absolute, Huber and Tukey losses as functions of the residual. */
export function LossShapesSchema() {
  const a = plotArea({ x: [-4, 4.1], y: [0, 4.5], w: 320, h: 180, at: [12, 22] });
  const delta = 1, c = 2.5;
  const huber = (e: number) => (Math.abs(e) <= delta ? (e * e) / 2 : delta * (Math.abs(e) - delta / 2));
  const tukey = (e: number) => ((c * c) / 6) * (1 - Math.max(0, 1 - (e / c) ** 2) ** 3);
  return (
    <Diagram caption="Per-example losses of one residual $e$, with $\delta = 1$ and $c = 2.5$.">
      <Free>
        <Path points={[a.p([delta, 0]), a.p([delta, huber(delta)])]} dashed state="ghost" />
        <Path points={[a.p([c, 0]), a.p([c, tukey(c)])]} dashed state="ghost" />
        <Axes area={a} x={[-4, 4.1]} y={[0, 4.5]} labels={["$e$", "$\\ell(e)$"]} />
        <Path points={curve(a, (e) => (e * e) / 2, [-2.9, 2.9])} tone={ML_TONE.mse} />
        <Path points={curve(a, Math.abs, [-3.7, 3.7], 74)} tone={ML_TONE.mae} />
        <Path points={curve(a, huber, [-3.7, 3.7], 148)} tone="blue" />
        <Path points={curve(a, tukey, [-3.7, 3.7], 148)} tone="blue" dashed />
        <At text="$\delta$" at={a.p([delta, 0])} anchor="n" gap={6} muted />
        <At text="$c$" at={a.p([c, 0])} anchor="n" gap={6} muted />
        <At text="MSE" at={a.p([2.9, 4.2])} anchor="w" gap={6} tone={ML_TONE.mse} weight={500} />
        <At text="MAE" at={a.p([3.7, 3.7])} anchor="w" gap={6} tone={ML_TONE.mae} weight={500} />
        <At text="Huber" at={a.p([3.7, huber(3.7)])} anchor="w" gap={6} tone="blue" weight={500} />
        <At text="Tukey" at={a.p([3.7, tukey(3.7)])} anchor="w" gap={6} tone="blue" weight={500} />
      </Free>
    </Diagram>
  );
}

/** A grid search with 4 candidate values per parameter, for d = 1, 2, 3 parameters: one cell per grid point. */
export function CurseOfDimensionalitySchema() {
  const s = 22, n = 4;
  const strip: CellInput[] = Array.from({ length: n }, (_, i) => (i === n - 1 ? { tone: "blue" } : null));
  const square: CellInput[] = Array.from({ length: n * n }, (_, i) => (i === n - 1 ? { tone: "blue" } : null));
  // oblique cube: a to the right, b up, c into the page
  const y0 = s * n * 0.35 + 2;
  const P = (a: number, b: number, c: number): Pt => [s * (a + 0.5 * c), y0 + s * (n - b - 0.35 * c)];
  const quad = (pts: [number, number, number][]) => pts.map(([a, b, c]) => P(a, b, c));
  const top = (a: number, c: number) => quad([[a, n, c], [a + 1, n, c], [a + 1, n, c + 1], [a, n, c + 1]]);
  const side = (b: number, c: number) => quad([[n, b, c], [n, b + 1, c], [n, b + 1, c + 1], [n, b, c + 1]]);
  const lines: Pt[][] = Array.from({ length: n + 1 }, (_, i) => [
    [P(i, n, 0), P(i, n, n)],
    [P(0, n, i), P(n, n, i)],
    [P(n, i, 0), P(n, i, n)],
    [P(n, 0, i), P(n, n, i)],
  ]).flat();
  const panel = (d: number, count: string, drawing: ReactNode) => (
    <Col key={d} gap={10}>
      {drawing}
      <Col gap={2}>
        <Text text={`$d = ${d}$`} />
        <Text text={count} size="note" muted />
      </Col>
    </Col>
  );
  return (
    <Diagram caption="Four candidate values per parameter give a grid of 4, 16 and 64 points for $d = 1, 2, 3$.">
      <Row gap={48} align="end" wrap>
        {panel(1, "4 points", <Cells items={strip} cell={s} />)}
        {panel(2, "$4^2 = 16$ points", <Cells items={square} cols={n} cell={s} />)}
        {panel(
          3,
          "$4^3 = 64$ points",
          <Free>
            <Poly points={quad([[0, n, 0], [n, n, 0], [n, n, n], [0, n, n]])} />
            <Poly points={quad([[n, 0, 0], [n, n, 0], [n, n, n], [n, 0, n]])} />
            <Poly points={top(n - 1, 0)} tone="blue" />
            <Poly points={side(n - 1, 0)} tone="blue" />
            {lines.map((pts, i) => <Path key={i} points={pts} state="ghost" thin />)}
            <Cells items={square} cols={n} cell={s} x={0} y={P(0, n, 0)[1]} />
          </Free>,
        )}
      </Row>
    </Diagram>
  );
}

/** Points of a cubic Bézier from `p0` to `p3` with controls `c1`, `c2`. */
const bezier = (p0: Pt, p3: Pt, c1: Pt, c2: Pt, n = 24): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [0, 1].map((d) => k[0] * p0[d] + k[1] * c1[d] + k[2] * c2[d] + k[3] * p3[d]) as Pt;
  });

/** A loss with a strict local minimum, a flat (non-strict) local minimum, and the strict global minimum. */
export function MinimaSchema() {
  const a = plotArea({ x: [0, 7.8], y: [0, 4.7], w: 370, h: 223, at: [12, 22] });
  // horizontal tangent at every extremum
  const pieces: [Pt, Pt, Pt, Pt][] = [
    [[0.2, 4.2], [1.2, 2.6], [0.5, 2.9], [0.8, 2.6]],
    [[1.2, 2.6], [2.3, 3.6], [1.6, 2.6], [1.9, 3.6]],
    [[2.3, 3.6], [3.3, 2.2], [2.7, 3.6], [2.9, 2.2]],
    [[4.5, 2.2], [5.3, 3.2], [4.9, 2.2], [4.9, 3.2]],
    [[5.3, 3.2], [6.3, 1.0], [5.7, 3.2], [5.9, 1.0]],
    [[6.3, 1.0], [7.3, 4.0], [6.7, 1.0], [7.0, 2.0]],
  ];
  const left = pieces.slice(0, 3).flatMap((p) => bezier(...p));
  const right = pieces.slice(3).flatMap((p) => bezier(...p));
  return (
    <Diagram caption="A strict local minimum with its ball, a flat local minimum and the strict global one.">
      <Free>
        <Path points={[a.p([1.2, 2.6]), a.p([1.2, 0])]} dashed state="ghost" />
        <Axes area={a} x={[0, 7.8]} y={[0, 4.7]} labels={["$\\theta$", "$L(\\theta)$"]} />
        <Path points={[a.p([0.75, 0]), a.p([1.65, 0])]} state="strong" thick />
        <Path points={[...left.map(a.p), a.p([4.5, 2.2]), ...right.map(a.p)]} state="strong" />
        <Path points={[a.p([3.3, 2.2]), a.p([4.5, 2.2])]} tone="blue" thick />
        <Dot at={a.p([1.2, 2.6])} tone="blue" r={4} />
        <Dot at={a.p([6.3, 1.0])} tone="blue" r={4} />
        <At text="$B_\epsilon$" at={a.p([1.2, 0])} anchor="n" gap={8} muted />
        <At text="strict local" at={a.p([1.2, 2.6])} anchor="nw" gap={8} tone="blue" weight={500} />
        <At text="local, not strict" at={a.p([3.9, 2.2])} anchor="n" gap={10} tone="blue" weight={500} />
        <At text="strict global" at={a.p([6.3, 1.0])} anchor="n" gap={10} tone="blue" weight={500} />
      </Free>
    </Diagram>
  );
}

/** Points of the ellipse with half-axes `rx`, `ry` around `c`, in data units. */
const ellipse = (c: Pt, rx: number, ry: number, n = 72): Pt[] =>
  Array.from({ length: n }, (_, i) => [c[0] + rx * Math.cos((2 * Math.PI * i) / n), c[1] + ry * Math.sin((2 * Math.PI * i) / n)]);

/** Gradient descent on the loss contours of unscaled and of standardized features. */
export function FeatureScalingSchema() {
  const panels: [title: string, rx: number, ry: number, path: Pt[]][] = [
    ["unscaled", 1.5, 0.7, [[-3.6, 1.2], [-3.2, -1.0], [-2.4, 0.85], [-1.7, -0.65], [-1.1, 0.45], [-0.6, -0.25], [0, 0]]],
    ["standardized", 0.75, 0.75, [[-1.85, 1.1], [-1.05, 0.62], [-0.5, 0.3], [0, 0]]],
  ];
  return (
    <Diagram caption="Gradient descent zig-zags on stretched contours and heads straight on round ones.">
      <Row gap={36} wrap>
        {panels.map(([title, rx, ry, path]) => {
          const a = plotArea({ x: [-4.8, 4.8], y: [-2.5, 2.6], w: 230, h: 122, at: [4, 22] });
          return (
            <Col key={title} gap={8}>
              <Free>
                <Axes area={a} x={[-4.8, 4.8]} y={[-2.5, 2.6]} labels={["$w_1$", "$w_2$"]} />
                {[1, 2, 3].map((k) => <Path key={k} points={ellipse([0, 0], rx * k, ry * k).map(a.p)} closed thin state="ghost" />)}
                <Path points={path.map(a.p)} tone="blue" />
                {path.map((p) => <Dot key={p.join()} at={a.p(p)} tone="blue" r={2.5} />)}
              </Free>
              <Text text={title} weight={500} />
            </Col>
          );
        })}
      </Row>
    </Diagram>
  );
}
