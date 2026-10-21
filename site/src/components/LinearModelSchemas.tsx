import { Diagram, Dot, Free, Path, Poly } from "@/components/figure";
import { Arrow, At, Axes, plotArea, type Pt } from "@/components/PlotFigures";
import { ML_TONE } from "@/components/tones";

/** Two linearly separable classes, the boundary w·x + b = 0 and its normal w. */
export function PerceptronBoundarySchema() {
  const a = plotArea({ x: [0, 7.4], y: [0, 7], w: 296, h: 280, at: [12, 22] });
  const neg: Pt[] = [[0.9, 1.3], [1.6, 2.3], [2.4, 0.9], [2.1, 1.7]];
  const pos: Pt[] = [[3.9, 3.6], [4.8, 3.3], [4.2, 4.6], [5.1, 4.3]];
  // boundary x1 + x2 = 6, so w = (1, 1) and b = -6
  return (
    <Diagram caption="The boundary and its normal w, which points to the side classified +1.">
      <Free>
        <Axes area={a} x={[0, 7.4]} y={[0, 7]} labels={["x_1", "x_2"]} />
        <Path points={[a.p([0.75, 5.25]), a.p([5.25, 0.75])]} state="strong" />
        <At text="w^T x + b = 0" at={a.p([5.25, 0.75])} anchor="w" gap={8} />
        <Arrow from={a.p([4.4, 1.6])} to={a.p([5.3, 2.5])} state="active" />
        <At text="w" at={a.p([5.3, 2.5])} anchor="sw" tone="blue" weight={500} />
        {neg.map((p, i) => <Dot key={`n${i}`} at={a.p(p)} tone={ML_TONE.negative} />)}
        {pos.map((p, i) => <Dot key={`p${i}`} at={a.p(p)} tone={ML_TONE.positive} />)}
        <At text="y = -1" at={a.p([1.7, 0.45])} tone={ML_TONE.negative} weight={500} />
        <At text="y = +1" at={a.p([4.6, 5.45])} tone={ML_TONE.positive} weight={500} />
      </Free>
    </Diagram>
  );
}

/**
 * Linear regression with two features: the plane ŷ over the input floor (x1, x2), and each residual as a vertical
 * segment. One example is traced from its input x_i on the floor, up to its prediction ŷ_i on the plane, to y_i.
 */
export function RegressionPlaneSchema() {
  const S = 52, H = 5;
  // Cabinet projection: x1 to the right, x2 into the page at 31° and half scale, y up.
  const P = (u: number, v: number, y: number): Pt => [28 + S * (u + 0.5 * v), 12 + S * (H - y - 0.3 * v)];
  const plane = (u: number, v: number) => 1.2 + 0.4 * u + 0.2 * v;
  const on = (u: number, v: number, r = 0) => P(u, v, plane(u, v) + r);
  // [x1, x2, residual]; the first is the traced example
  const data: [number, number, number][] = [
    [1.7, 1.6, 1.1],
    [3.0, 0.8, 0.8],
    [3.0, 2.8, -0.4],
    [3.7, 2.8, 0.7],
  ];
  const corners: Pt[] = [[0, 0], [4, 0], [4, 3], [0, 3]];
  const [iu, iv, ir] = data[0];
  const above = data.filter(([, , r]) => r > 0), below = data.filter(([, , r]) => r < 0);
  return (
    <Diagram caption="With two features the model is a plane. Residuals hidden below it are dashed.">
      <Free>
        <Poly points={corners.map(([u, v]) => P(u, v, 0))} outline />
        <Arrow from={P(0, 0, 0)} to={P(4.8, 0, 0)} />
        <Arrow from={P(0, 0, 0)} to={P(0, 3.8, 0)} />
        <Arrow from={P(0, 0, 0)} to={P(0, 0, H)} />
        <At text="x_1" at={P(4.8, 0, 0)} anchor="w" gap={6} muted />
        <At text="x_2" at={P(0, 3.8, 0)} anchor="w" gap={6} muted />
        <At text="y" at={P(0, 0, H)} anchor="s" gap={6} muted />
        {/* Drawn before the plane, so the plane covers whatever lies behind it. */}
        {corners.slice(1).map(([u, v]) => (
          <Path key={`c${u}${v}`} points={[P(u, v, 0), on(u, v)]} dashed state="ghost" />
        ))}
        <Path points={[P(iu, iv, 0), on(iu, iv)]} dashed state="ghost" />
        <Dot at={P(iu, iv, 0)} r={2.5} state="ghost" />
        <At text="x_i" at={P(iu, iv, 0)} anchor="e" gap={6} muted />
        <Poly points={corners.map(([u, v]) => on(u, v))} tone="blue" outline />
        {below.map(([u, v, r]) => (
          <Path key={`b${u}`} points={[on(u, v), on(u, v, r)]} tone={ML_TONE.residual} dashed />
        ))}
        {below.map(([u, v, r]) => (
          <Dot key={`bd${u}`} at={on(u, v, r)} state="ghost" />
        ))}
        {above.map(([u, v, r]) => (
          <Path key={`a${u}`} points={[on(u, v), on(u, v, r)]} tone={ML_TONE.residual} />
        ))}
        {above.map(([u, v, r]) => (
          <Dot key={`ad${u}`} at={on(u, v, r)} />
        ))}
        <Dot at={on(iu, iv)} r={3} tone="blue" />
        <At text="ŷ_i" at={on(iu, iv)} anchor="e" gap={7} tone="blue" weight={500} />
        <At text="y_i" at={on(iu, iv, ir)} anchor="e" gap={7} weight={500} />
        <At text="e_i" at={on(iu, iv, ir / 2)} anchor="w" gap={7} tone={ML_TONE.residual} weight={500} />
        <At text="ŷ = w^T x + b" at={on(4, 1.5)} anchor="w" gap={10} tone="blue" weight={500} />
      </Free>
    </Diagram>
  );
}
