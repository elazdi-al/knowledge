import type { ReactNode } from "react";
import { Cells, Col, Diagram, Dot, Free, Path, Poly, Row, Text, type CellInput } from "@/components/figure";
import { At, Axes, curve, plotArea, type Pt } from "@/components/PlotFigures";
import { ML_TONE } from "@/components/tones";

/** The per-example losses of MSE and MAE as functions of the residual. */
export function LossShapesSchema() {
  const a = plotArea({ x: [-3.3, 3.4], y: [0, 4.5], w: 268, h: 180, at: [12, 22] });
  return (
    <Diagram caption="Squared and absolute error of one residual r. Past |r| = 2 the squared error is larger.">
      <Free>
        {[-2, 2].map((r) => (
          <Path key={r} points={[a.p([r, 0]), a.p([r, 2])]} dashed state="ghost" />
        ))}
        <Axes area={a} x={[-3.3, 3.4]} y={[0, 4.5]} labels={["r", "ℓ(r)"]} />
        <Path points={curve(a, (r) => (r * r) / 2, [-2.9, 2.9])} tone={ML_TONE.mse} />
        <Path points={curve(a, Math.abs, [-3.1, 3.1], 62)} tone={ML_TONE.mae} />
        <At text="-2" at={a.p([-2, 0])} anchor="n" gap={6} muted />
        <At text="2" at={a.p([2, 0])} anchor="n" gap={6} muted />
        <At text="MSE" at={a.p([2.9, 4.2])} anchor="w" gap={6} tone={ML_TONE.mse} weight={500} />
        <At text="MAE" at={a.p([3.1, 3.1])} anchor="w" gap={6} tone={ML_TONE.mae} weight={500} />
      </Free>
    </Diagram>
  );
}

/** Least-squares polynomial of degree `deg` through the points (normal equations, Gaussian elimination). */
function polyfit(xs: number[], ys: number[], deg: number): (x: number) => number {
  const n = deg + 1;
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n + 1 }, (_, j) => xs.reduce((s, x, k) => s + x ** i * (j < n ? x ** j : ys[k]), 0)));
  for (let c = 0; c < n; c++) {
    const p = A.slice(c).reduce((best, row, k) => (Math.abs(row[c]) > Math.abs(A[best][c]) ? c + k : best), c);
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  const coef = A.map((row, i) => row[n] / row[i]);
  return (x) => coef.reduce((s, c, i) => s + c * x ** i, 0);
}

/** One data set fitted by a line, a cubic, and a polynomial through every point. */
export function FitRegimesSchema() {
  const xs = [0.04, 0.17, 0.3, 0.42, 0.55, 0.67, 0.8, 0.94];
  const noise = [0.07, -0.08, 0.05, -0.07, 0.09, -0.05, 0.08, -0.06];
  const ys = xs.map((x, i) => 0.5 + 0.32 * Math.sin(2 * Math.PI * (x - 0.08)) + noise[i]);
  const panels: [title: string, note: string, deg: number][] = [
    ["underfit", "high training loss", 1],
    ["good fit", "low training loss", 3],
    ["overfit", "zero training loss", xs.length - 1],
  ];
  const X: Pt = [-0.08, 1.08], Y: Pt = [-0.12, 1.12];
  return (
    <Diagram caption="A line, a cubic and a degree 7 polynomial. The last swings between the examples.">
      <Row gap={28} wrap>
        {panels.map(([title, note, deg]) => {
          const a = plotArea({ x: X, y: Y, w: 150, h: 112, at: [4, 18] });
          const f = polyfit(xs, ys, deg);
          return (
            <Col key={title} gap={10}>
              <Free>
                <Axes area={a} x={X} y={Y} origin={[X[0], Y[0]]} labels={["x", "y"]} />
                <Path points={curve(a, f, [xs[0], xs[xs.length - 1]])} tone="blue" />
                {xs.map((x, i) => <Dot key={x} at={a.p([x, ys[i]])} />)}
              </Free>
              <Col gap={2}>
                <Text text={title} weight={500} />
                <Text text={note} size="note" muted />
              </Col>
            </Col>
          );
        })}
      </Row>
    </Diagram>
  );
}

/** k-fold cross-validation with k = 5: round i validates on fold i. */
export function CrossValidationSchema() {
  const k = 5, S = 40, x0 = 64, y0 = 24;
  const items: CellInput[] = Array.from({ length: k * k }, (_, i) => (i % (k + 1) === 0 ? { label: "val", tone: "blue" } : null));
  const rows = Array.from({ length: k }, (_, i) => i);
  return (
    <Diagram caption="5-fold cross-validation. Each round validates on one fold and trains on four.">
      <Free>
        {rows.map((i) => (
          <At key={`f${i}`} text={`fold ${i + 1}`} at={[x0 + S * i + S / 2, y0 - 6]} anchor="s" gap={0} muted />
        ))}
        {rows.map((i) => (
          <At key={`r${i}`} text={`round ${i + 1}`} at={[x0 - 10, y0 + S * i + S / 2]} anchor="e" gap={0} muted />
        ))}
        <Cells items={items} cols={k} cell={S} mono={false} x={x0} y={y0} />
        {rows.map((i) => (
          <At key={`s${i}`} text={`s_${i + 1}`} at={[x0 + k * S + 10, y0 + S * i + S / 2]} anchor="w" gap={0} />
        ))}
        <At text="score = (s_1 + s_2 + s_3 + s_4 + s_5) / 5" at={[x0 + (k * S) / 2, y0 + k * S + 12]} anchor="n" gap={0} />
      </Free>
    </Diagram>
  );
}

/** Grid search over the degree and λ of a ridge regression, scored by validation MSE. */
export function GridSearchSchema() {
  const lambdas = ["10^{-3}", "10^{-2}", "10^{-1}", "1", "10"];
  // validation MSE; rows = degree 1..5, columns = λ
  const err = [
    [0.92, 0.92, 0.91, 0.93, 1.05],
    [0.55, 0.54, 0.52, 0.58, 0.84],
    [0.47, 0.41, 0.33, 0.44, 0.79],
    [0.71, 0.52, 0.36, 0.45, 0.8],
    [1.3, 0.88, 0.45, 0.49, 0.82],
  ];
  const best = Math.min(...err.flat());
  const S = 44, x0 = 56, y0 = 22;
  const items: CellInput[] = err.flat().map((e) => ({
    label: e.toFixed(2),
    tone: e <= 0.45 ? "blue" : undefined,
    state: e === best ? "strong" : undefined,
  }));
  return (
    <Diagram caption="Validation MSE of ridge regression. The best, outlined, is degree 3 with λ = 0.1.">
      <Free>
        <At text="degree" at={[x0 - 10, y0 - 8]} anchor="se" gap={0} muted />
        {err.map((_, r) => (
          <At key={`d${r}`} text={String(r + 1)} at={[x0 - 10, y0 + S * r + S / 2]} anchor="e" gap={0} muted />
        ))}
        <Cells items={items} cols={5} cell={S} mono={false} x={x0} y={y0} />
        {lambdas.map((l, c) => (
          <At key={l} text={l} at={[x0 + S * c + S / 2, y0 + 5 * S + 10]} anchor="n" gap={0} muted />
        ))}
        <At text="λ" at={[x0 + 2.5 * S, y0 + 5 * S + 32]} anchor="n" gap={0} muted />
      </Free>
    </Diagram>
  );
}

/** Cells of side 1/4 needed to cover [0, 1]^d for d = 1, 2, 3; one cell is highlighted in each. */
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
        <Text text={`d = ${d}`} weight={500} />
        <Text text={count} size="note" muted />
      </Col>
    </Col>
  );
  return (
    <Diagram caption="One cell of side 1/4 holds 1/4 of a segment, 1/16 of a square, 1/64 of a cube.">
      <Row gap={48} align="end" wrap>
        {panel(1, "4 cells", <Cells items={strip} cell={s} />)}
        {panel(2, "4^2 = 16 cells", <Cells items={square} cols={n} cell={s} />)}
        {panel(
          3,
          "4^3 = 64 cells",
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
        <Axes area={a} x={[0, 7.8]} y={[0, 4.7]} labels={["θ", "L(θ)"]} />
        <Path points={[a.p([0.75, 0]), a.p([1.65, 0])]} state="strong" thick />
        <Path points={[...left.map(a.p), a.p([4.5, 2.2]), ...right.map(a.p)]} state="strong" />
        <Path points={[a.p([3.3, 2.2]), a.p([4.5, 2.2])]} tone="blue" thick />
        <Dot at={a.p([1.2, 2.6])} tone="blue" r={4} />
        <Dot at={a.p([6.3, 1.0])} tone="blue" r={4} />
        <At text="B_ε" at={a.p([1.2, 0])} anchor="n" gap={8} muted />
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
                <Axes area={a} x={[-4.8, 4.8]} y={[-2.5, 2.6]} labels={["w_1", "w_2"]} />
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
