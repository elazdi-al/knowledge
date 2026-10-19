import { Diagram, Dot, Free, Path, Poly } from "@/components/figure";
import { Arrow, At, Axes, plotArea, type Pt } from "@/components/PlotFigures";
import { ML_TONE } from "@/components/tones";

/** Two linearly separable classes, the boundary w·x + b = 0, its normal w, and the margin γ. */
export function PerceptronBoundarySchema() {
  const a = plotArea({ x: [0, 7.4], y: [0, 7], w: 296, h: 280, at: [12, 22] });
  const neg: Pt[] = [[0.9, 1.3], [1.6, 2.3], [2.4, 0.9], [2.1, 1.7]];
  const pos: Pt[] = [[3.9, 3.6], [4.8, 3.3], [4.2, 4.6], [5.1, 4.3]];
  // boundary x1 + x2 = 6 (w = (1, 1), b = -6); the band x1 + x2 in [4.5, 7.5] is the boundary widened by the margin
  const band: Pt[] = [[0, 4.5], [4.5, 0], [6, 1.5], [1.5, 6]];
  return (
    <Diagram caption="The boundary, its normal w, and the margin γ to the closest example.">
      <Free>
        <Poly points={band.map(a.p)} />
        <Axes area={a} x={[0, 7.4]} y={[0, 7]} labels={["x_1", "x_2"]} />
        <Path points={[a.p([0, 4.5]), a.p([4.5, 0])]} dashed />
        <Path points={[a.p([1.5, 6]), a.p([6, 1.5])]} dashed />
        <Path points={[a.p([0.75, 5.25]), a.p([5.25, 0.75])]} state="strong" />
        <At text="w^T x + b = 0" at={a.p([5.25, 0.75])} anchor="w" gap={8} />
        <Arrow from={a.p([4.4, 1.6])} to={a.p([5.3, 2.5])} state="active" />
        <At text="w" at={a.p([5.3, 2.5])} anchor="sw" tone="blue" weight={500} />
        <Arrow from={a.p([3.15, 2.85])} to={a.p([3.82, 3.52])} head="both" />
        <At text="γ" at={a.p([3.45, 3.3])} anchor="se" gap={5} />
        {neg.map((p, i) => <Dot key={`n${i}`} at={a.p(p)} tone={ML_TONE.negative} />)}
        {pos.map((p, i) => <Dot key={`p${i}`} at={a.p(p)} tone={ML_TONE.positive} />)}
        <At text="y = -1" at={a.p([1.7, 0.45])} tone={ML_TONE.negative} weight={500} />
        <At text="y = +1" at={a.p([4.6, 5.45])} tone={ML_TONE.positive} weight={500} />
      </Free>
    </Diagram>
  );
}

/** XOR: the two classes sit on opposite corners of the square, so no line separates them. */
export function XorSchema() {
  const a = plotArea({ x: [0, 1.45], y: [0, 1.45], w: 160, h: 160, at: [24, 16] });
  const points: [Pt, "negative" | "positive"][] = [
    [[0, 0], "negative"],
    [[1, 1], "negative"],
    [[0, 1], "positive"],
    [[1, 0], "positive"],
  ];
  return (
    <Diagram caption="XOR: any line leaves a point on the wrong side.">
      <Free>
        <Path points={[a.p([0, 1]), a.p([1, 1]), a.p([1, 0])]} dashed state="ghost" />
        <Axes area={a} x={[0, 1.45]} y={[0, 1.45]} labels={["x_1", "x_2"]} />
        <At text="0" at={a.p([0, 0])} anchor="ne" gap={8} muted />
        <At text="1" at={a.p([1, 0])} anchor="n" gap={8} muted />
        <At text="1" at={a.p([0, 1])} anchor="e" gap={8} muted />
        {points.map(([p, cls]) => (
          <Dot key={p.join()} at={a.p(p)} r={4} tone={ML_TONE[cls]} />
        ))}
        {points.map(([p, cls]) => (
          <At key={`l${p.join()}`} text={cls === "positive" ? "+1" : "-1"} at={a.p(p)} anchor="sw" gap={7} tone={ML_TONE[cls]} weight={500} />
        ))}
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
