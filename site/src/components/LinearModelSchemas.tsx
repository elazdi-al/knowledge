import { Col, Diagram, Dot, Dots, Edge, Free, Node, Path, Poly, Row, Text } from "@/components/figure";
import { Arrow, At, Axes, plotArea, type Pt } from "@/components/PlotFigures";
import { ML_TONE } from "@/components/tones";

/** The perceptron as a computation: weighted inputs summed into the score, then thresholded. */
export function PerceptronUnitSchema() {
  const terms = ["w_1 x_1", "w_2 x_2", null, "w_n x_n", "b"];
  return (
    <Diagram caption="A perceptron sums its weighted inputs and the bias into the score z, then thresholds z at 0.">
      <Row gap={48}>
        <Col gap={10}>
          {terms.map((t, i) => (t ? <Node key={t} id={`t${i}`} title={t} w={72} /> : <Dots key="dots" dir="col" />))}
        </Col>
        <Node id="sum" title="Σ" shape="circle" />
        <Node id="step" title="threshold" sub="+1 if z ≥ 0, else -1" />
        <Node id="out" title="ŷ" w={44} />
      </Row>
      {terms.map((t, i) => t && <Edge key={t} from={`t${i}`} to="sum" route="straight" head="none" />)}
      <Edge from="sum" to="step" label="z" />
      <Edge from="step" to="out" />
    </Diagram>
  );
}

/** Two linearly separable classes, the boundary w·x + b = 0, its normal w, and the margin γ. */
export function PerceptronBoundarySchema() {
  const a = plotArea({ x: [0, 7.4], y: [0, 7], w: 296, h: 280, at: [12, 22] });
  const neg: Pt[] = [[0.9, 1.3], [1.6, 2.3], [2.4, 0.9], [2.1, 1.7]];
  const pos: Pt[] = [[3.9, 3.6], [4.8, 3.3], [4.2, 4.6], [5.1, 4.3]];
  // boundary x1 + x2 = 6 (w = (1, 1), b = -6); the band x1 + x2 in [4.5, 7.5] is the boundary widened by the margin
  const band: Pt[] = [[0, 4.5], [4.5, 0], [6, 1.5], [1.5, 6]];
  return (
    <Diagram caption="The decision boundary is the line where the score is 0, and w is normal to it. The margin γ is the distance from the boundary to the closest example.">
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
    <Diagram caption="XOR: (0, 0) and (1, 1) are -1, (0, 1) and (1, 0) are +1. Any line leaves a point on the wrong side.">
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

/** Linear regression with two features: a plane over the (x1, x2) floor, and each residual as a vertical segment. */
export function RegressionPlaneSchema() {
  const S = 46, H = 5.4;
  // oblique projection: x1 to the right, x2 into the page, y up
  const P = (u: number, v: number, y: number): Pt => [16 + S * (u + 0.6 * v), 16 + S * (H - y - 0.35 * v)];
  const plane = (u: number, v: number) => 1.6 + 0.3 * u + 0.3 * v;
  const data: [u: number, v: number, r: number][] = [
    [0.6, 2.6, 0.8],
    [1.6, 2.4, -0.5],
    [2.8, 2.8, 0.5],
    [3.0, 1.0, -0.6],
    [3.6, 2.6, 1.0],
  ];
  const corners: [number, number][] = [[0, 0], [4, 0], [4, 3], [0, 3]];
  const [lu, lv, lr] = data[0];
  return (
    <Diagram caption="With two features the model is a plane. A residual is the vertical distance from an example to the plane, positive above it and negative below (dashed, hidden by the plane).">
      <Free>
        <Poly points={corners.map(([u, v]) => P(u, v, 0))} outline />
        <Arrow from={P(0, 0, 0)} to={P(4.7, 0, 0)} />
        <Arrow from={P(0, 0, 0)} to={P(0, 3.7, 0)} />
        <Arrow from={P(0, 0, 0)} to={P(0, 0, H)} />
        <At text="x_1" at={P(4.7, 0, 0)} anchor="w" gap={6} muted />
        <At text="x_2" at={P(0, 3.7, 0)} anchor="sw" gap={6} muted />
        <At text="y" at={P(0, 0, H)} anchor="s" gap={6} muted />
        {corners.slice(1).map(([u, v]) => (
          <Path key={`g${u}${v}`} points={[P(u, v, 0), P(u, v, plane(u, v))]} dashed state="ghost" />
        ))}
        <Poly points={corners.map(([u, v]) => P(u, v, plane(u, v)))} tone="blue" outline />
        {data.map(([u, v, r]) => (
          <Path key={`r${u}`} points={[P(u, v, plane(u, v)), P(u, v, plane(u, v) + r)]} tone={ML_TONE.residual} dashed={r < 0} />
        ))}
        {data.map(([u, v, r]) => (
          <Dot key={`d${u}`} at={P(u, v, plane(u, v) + r)} />
        ))}
        <At text="ŷ = w^T x + b" at={P(1.3, 1.0, plane(1.3, 1.0))} tone="blue" weight={500} />
        <At text="y_i - ŷ_i" at={P(lu, lv, plane(lu, lv) + (2 * lr) / 3)} anchor="e" gap={8} tone={ML_TONE.residual} weight={500} />
      </Free>
    </Diagram>
  );
}
