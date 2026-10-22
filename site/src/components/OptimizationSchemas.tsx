import { Col, Diagram, Dot, Free, Path, Poly, Row, Text } from "@/components/figure";
import { Arrow, At, Axes, curve, plotArea, type Pt } from "@/components/PlotFigures";

/** Points of the ellipse with half-axes `rx`, `ry` around `c`, in data units. */
const ellipse = (c: Pt, rx: number, ry: number, n = 72): Pt[] =>
  Array.from({ length: n }, (_, i) => [c[0] + rx * Math.cos((2 * Math.PI * i) / n), c[1] + ry * Math.sin((2 * Math.PI * i) / n)]);

/** Gradient descent on L(w) = w²/2 (the mean example with ȳ = 0) from one start, for three learning rates. */
export function StepSizeSchema() {
  const panels: [eta: number, note: string][] = [
    [0.5, "converges from one side"],
    [1.5, "overshoots, converges"],
    [2.1, "overshoots, diverges"],
  ];
  const X: Pt = [-2.3, 2.3], Y: Pt = [0, 2.75];
  return (
    <Diagram caption="Example 1 with $\bar{y} = 0$: each step multiplies $w$ by $1 - \eta$.">
      <Row gap={28} wrap>
        {panels.map(([eta, note]) => {
          const a = plotArea({ x: X, y: Y, w: 150, h: 104, at: [4, 18] });
          const ws = Array.from({ length: 6 }, (_, t) => -1.3 * (1 - eta) ** t);
          const pts = ws.map((w): Pt => [w, (w * w) / 2]);
          return (
            <Col key={eta} gap={10}>
              <Free>
                <Axes area={a} x={X} y={Y} origin={[0, 0]} labels={["$w$", "$L$"]} />
                <Path points={curve(a, (w) => (w * w) / 2, X)} state="strong" />
                <Path points={pts.map(a.p)} tone="blue" />
                {pts.map((p, t) => <Dot key={t} at={a.p(p)} tone="blue" r={t === 0 ? 3.5 : 2.5} />)}
              </Free>
              <Col gap={2}>
                <Text text={`$\\eta = ${eta}$`} />
                <Text text={note} size="note" muted />
              </Col>
            </Col>
          );
        })}
      </Row>
    </Diagram>
  );
}

/** Training loss per step of gradient descent and of SGD (one example per step) on the same linear regression data. */
export function SgdNoiseSchema() {
  let seed = 12345;
  const rnd = () => (seed = (1103515245 * seed + 12345) % 2 ** 31) / 2 ** 31;
  const m = 50, T = 60;
  const X = Array.from({ length: m }, () => [rnd(), rnd(), 1]);
  const y = X.map(([a, b]) => 3 * a - 2 * b + 1 + 0.4 * (rnd() - 0.5));
  const residual = (w: number[], i: number) => y[i] - X[i].reduce((s, x, j) => s + x * w[j], 0);
  const loss = (w: number[]) => y.reduce((s, _, i) => s + residual(w, i) ** 2, 0) / (2 * m);
  const step = (w: number[], eta: number, batch: number[]) => {
    const e = batch.map((i) => residual(w, i));
    return w.map((wj, j) => wj + (eta / batch.length) * batch.reduce((s, i, k) => s + e[k] * X[i][j], 0));
  };
  const trace = (next: (w: number[]) => number[]) => {
    let w = [0, 0, 0];
    return Array.from({ length: T + 1 }, (_, t) => {
      if (t > 0) w = next(w);
      return loss(w);
    });
  };
  const all = Array.from({ length: m }, (_, i) => i);
  const gd = trace((w) => step(w, 0.9, all));
  const sgd = trace((w) => step(w, 0.5, [Math.floor(rnd() * m)]));
  // log scale, so the jitter near the minimum stays visible
  const Y: Pt = [-2.7, 0.5];
  const a = plotArea({ x: [0, T + 4], y: Y, w: 340, h: 160, at: [12, 22] });
  const p = (t: number, v: number) => a.p([t, Math.log10(v)]);
  return (
    <Diagram caption="Loss on a log scale. SGD is noisy and, with a constant $\eta$, keeps jittering above the minimum.">
      <Free>
        <Axes area={a} x={[0, T + 4]} y={Y} origin={[0, Y[0]]} labels={["step $t$", "$\\log L$"]} />
        <Path points={sgd.map((v, t) => p(t, v))} tone="purple" />
        <Path points={gd.map((v, t) => p(t, v))} tone="blue" thick />
        <At text="SGD" at={p(30, Math.max(...sgd.slice(26, 34)))} anchor="s" gap={8} tone="purple" weight={500} />
        <At text="gradient descent" at={p(48, gd[48])} anchor="n" gap={5} tone="blue" weight={500} />
      </Free>
    </Diagram>
  );
}

/** Fourteen steps on the stretched quadratic L = (0.3 θ1² + 10 θ2²)/2, without and with momentum. */
export function MomentumSchema() {
  const run = (eta: number, beta: number): Pt[] => {
    let [x, y] = [-4.2, 1.1], [vx, vy] = [0, 0];
    const pts: Pt[] = [[x, y]];
    for (let t = 0; t < 14; t++) {
      vx = beta * vx + (1 - beta) * 0.3 * x;
      vy = beta * vy + (1 - beta) * 10 * y;
      x -= eta * vx;
      y -= eta * vy;
      pts.push([x, y]);
    }
    return pts;
  };
  const panels: [title: string, path: Pt[]][] = [
    ["gradient descent", run(0.18, 0)],
    ["momentum", run(0.45, 0.8)],
  ];
  return (
    <Diagram caption="Fourteen steps from the same start. Gradient descent zig-zags and crawls; momentum smooths the path and gets further.">
      <Row gap={36} wrap>
        {panels.map(([title, path]) => {
          const a = plotArea({ x: [-4.8, 4.8], y: [-1.6, 1.7], w: 230, h: 100, at: [4, 22] });
          return (
            <Col key={title} gap={8}>
              <Free>
                <Axes area={a} x={[-4.8, 4.8]} y={[-1.6, 1.7]} labels={["$\\theta_1$", "$\\theta_2$"]} />
                {[1, 2, 3].map((k) => <Path key={k} points={ellipse([0, 0], 1.45 * k, 0.25 * k).map(a.p)} closed thin state="ghost" />)}
                <Path points={path.map(a.p)} tone="blue" />
                {path.map((p, t) => <Dot key={t} at={a.p(p)} tone="blue" r={2.5} />)}
              </Free>
              <Text text={title} weight={500} />
            </Col>
          );
        })}
      </Row>
    </Diagram>
  );
}

/** The absolute value |e| and three of its subgradients at the kink. */
export function SubgradientSchema() {
  const a = plotArea({ x: [-2.2, 2.4], y: [-0.9, 2.2], w: 260, h: 150, at: [12, 22] });
  const slopes = [-0.55, 0, 0.55];
  return (
    <Diagram caption="Any line through the kink with slope in $[-1, 1]$ stays below $|e|$.">
      <Free>
        <Axes area={a} x={[-2.2, 2.4]} y={[-0.9, 2.2]} labels={["$e$", "$|e|$"]} />
        {slopes.map((g) => (
          <Path key={g} points={[a.p([-1.6, -1.6 * g]), a.p([1.6, 1.6 * g])]} tone="blue" dashed />
        ))}
        <Path points={[a.p([-2.05, 2.05]), a.p([0, 0]), a.p([2.05, 2.05])]} state="strong" />
        <Dot at={a.p([0, 0])} tone="blue" r={3.5} />
        <At text="slope $-1$" at={a.p([-1.7, 1.7])} anchor="ne" gap={6} muted />
        <At text="slope $1$" at={a.p([1.7, 1.7])} anchor="nw" gap={6} muted />
        <At text="$g \in [-1, 1]$" at={a.p([1.6, 1.6 * slopes[2]])} anchor="w" gap={6} tone="blue" />
      </Free>
    </Diagram>
  );
}

/** One projected gradient step: the gradient step leaves the convex set C, and the projection returns to it. */
export function ProjectionSchema() {
  const C: Pt[] = [[0.4, 0.3], [3.0, 0.2], [3.9, 1.3], [3.4, 2.5], [0.6, 2.5]];
  const center: Pt = [5.6, 3.6];
  // L = ((θ1 − 5.6)²/2 + (θ2 − 3.6)²)/2, one gradient step with η = 0.9 from θ
  const theta: Pt = [1.2, 1.2];
  const stepped: Pt = [theta[0] - (0.9 * (theta[0] - center[0])) / 2, theta[1] - 0.9 * (theta[1] - center[1])];
  const nearest = (p: Pt, [ax, ay]: Pt, [bx, by]: Pt): Pt => {
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    return [ax + t * (bx - ax), ay + t * (by - ay)];
  };
  const projected = C.map((v, i) => nearest(stepped, v, C[(i + 1) % C.length])).reduce((best, q) =>
    Math.hypot(q[0] - stepped[0], q[1] - stepped[1]) < Math.hypot(best[0] - stepped[0], best[1] - stepped[1]) ? q : best,
  );
  // stop an arrow 5 px short of its target, so the dot there leaves its head visible
  const short = ([x0, y0]: Pt, [x1, y1]: Pt): Pt => {
    const k = 1 - 5 / Math.hypot(x1 - x0, y1 - y0);
    return [x0 + k * (x1 - x0), y0 + k * (y1 - y0)];
  };
  // equal units on both axes, so the projection meets the edge at a right angle
  const a = plotArea({ x: [0, 7.5], y: [0, 4.6], w: 345, h: 212, at: [12, 12] });
  return (
    <Diagram caption="The gradient step leaves $C$ at $\theta'$, and the projection returns to the nearest point of $C$.">
      <Free>
        {[0.4, 0.8, 1.2].map((r) => <Path key={r} points={ellipse(center, r * Math.SQRT2, r).map(a.p)} closed thin state="ghost" />)}
        <Poly points={C.map(a.p)} tone="blue" outline />
        <Arrow from={a.p(theta)} to={short(a.p(theta), a.p(stepped))} state="strong" />
        <Arrow from={a.p(stepped)} to={short(a.p(stepped), a.p(projected))} tone="blue" dashed />
        <Dot at={a.p(theta)} />
        <Dot at={a.p(stepped)} />
        <Dot at={a.p(projected)} tone="blue" r={3.5} />
        <At text="$C$" at={a.p([0.95, 2.15])} tone="blue" />
        <At text="$\theta^{(t)}$" at={a.p(theta)} anchor="n" gap={7} />
        <At text="$\theta'$" at={a.p(stepped)} anchor="w" gap={7} />
        <At text="$P_C(\theta')$" at={a.p(projected)} anchor="sw" gap={8} tone="blue" />
      </Free>
    </Diagram>
  );
}
