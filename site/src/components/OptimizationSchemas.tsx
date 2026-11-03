import { Col, Diagram, Dot, Canvas, Path, Poly, Row, Text, Line, Axes, curve, plotArea, type Point as Pt } from "figure";

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
              <Canvas>
                <Axes area={a} x={X} y={Y} origin={[0, 0]} labels={["$w$", "$L$"]} />
                <Path points={curve(a, (w) => (w * w) / 2, X)} state="strong" />
                <Path points={pts.map(a.p)} tone="blue" />
                {pts.map((p, t) => <Dot key={t} at={a.p(p)} tone="blue" r={t === 0 ? 3.5 : 2.5} />)}
              </Canvas>
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

/** Gradient descent and SGD from one start on L = (w1² + 2 w2²)/2, the mean of six per-example bowls L_n centred at c_n. */
export function SGDSchema() {
  // L_n(w) = (w − c_n)ᵀ A (w − c_n)/2 with A = diag(1, 2); the c_n sum to zero, so the mean of the ∇L_n is ∇L
  const c: Pt[] = [[1.2, 0.7], [-1.0, 0.8], [0.7, -1.0], [-1.3, -0.4], [1.0, 0.3], [-0.6, -0.4]];
  const eta = 0.4, start: Pt = [-3.3, 1.4];
  let seed = 1;
  const pick = () => c[Math.floor(((seed = (1103515245 * seed + 12345) % 2 ** 31) / 2 ** 31) * c.length)];
  const run = (center: () => Pt, T: number): Pt[] => {
    const pts: Pt[] = [start];
    for (let t = 0; t < T; t++) {
      const [x, y] = pts[t], [cx, cy] = center();
      pts.push([x - eta * (x - cx), y - eta * 2 * (y - cy)]);
    }
    return pts;
  };
  const gd = run(() => [0, 0], 4), sgd = run(pick, 10);
  const a = plotArea({ x: [-4.2, 4.2], y: [-2.3, 2.3], w: 400, h: 219, at: [12, 12] });
  // stop an arrow 4 px short of the next iterate, so its head stays visible
  const short = ([x0, y0]: Pt, [x1, y1]: Pt): Pt => {
    const k = 1 - 4 / Math.hypot(x1 - x0, y1 - y0);
    return [x0 + k * (x1 - x0), y0 + k * (y1 - y0)];
  };
  return (
    <Diagram caption="Same start, same $\eta$. Each SGD step follows one random $\nabla L_n$, so its path zig-zags but still heads to $w^*$.">
      <Canvas>
        {[0.8, 1.6, 2.4, 3.2, 4].map((r) => <Path key={r} points={ellipse([0, 0], r, r / Math.SQRT2).map(a.p)} closed thin state="ghost" />)}
        <Path points={sgd.map(a.p)} tone="purple" dashed />
        {sgd.slice(1).map((p, t) => <Dot key={t} at={a.p(p)} tone="purple" r={2} />)}
        {gd.slice(1).map((p, t) => <Line key={t} head="end" from={a.p(gd[t])} to={short(a.p(gd[t]), a.p(p))} tone="blue" />)}
        <Dot at={a.p(start)} r={3.5} />
        <Dot at={a.p([0, 0])} state="strong" r={3.5} />
        <Text size="note" text="$w^{(0)}$" at={a.p(start)} anchor="se" offset={7} />
        <Text size="note" text="$w^*$" at={a.p([0, 0])} anchor="nw" offset={6} />
        <Text size="note" text="GD" at={a.p(gd[1])} anchor="n" offset={8} tone="blue" weight={500} />
        <Text size="note" text="SGD" at={a.p(sgd[2])} anchor="s" offset={8} tone="purple" weight={500} />
      </Canvas>
    </Diagram>
  );
}

/** Training loss per step of gradient descent and of SGD (one example per step) on the same linear regression data. */
export function SgdNoiseSchema() {
  let seed = 12345;
  const rnd = () => (seed = (1103515245 * seed + 12345) % 2 ** 31) / 2 ** 31;
  const N = 50, T = 60;
  const X = Array.from({ length: N }, () => [rnd(), rnd(), 1]);
  const y = X.map(([a, b]) => 3 * a - 2 * b + 1 + 0.4 * (rnd() - 0.5));
  const residual = (w: number[], i: number) => y[i] - X[i].reduce((s, x, j) => s + x * w[j], 0);
  const loss = (w: number[]) => y.reduce((s, _, i) => s + residual(w, i) ** 2, 0) / (2 * N);
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
  const all = Array.from({ length: N }, (_, i) => i);
  const gd = trace((w) => step(w, 0.9, all));
  const sgd = trace((w) => step(w, 0.5, [Math.floor(rnd() * N)]));
  // log scale, so the jitter near the minimum stays visible
  const Y: Pt = [-2.7, 0.5];
  const a = plotArea({ x: [0, T + 4], y: Y, w: 340, h: 160, at: [12, 22] });
  const p = (t: number, v: number) => a.p([t, Math.log10(v)]);
  return (
    <Diagram caption="Loss on a log scale. SGD is noisy and, with a constant $\eta$, keeps jittering above the minimum.">
      <Canvas>
        <Axes area={a} x={[0, T + 4]} y={Y} origin={[0, Y[0]]} labels={["step $t$", "$\\log L$"]} />
        <Path points={sgd.map((v, t) => p(t, v))} tone="purple" />
        <Path points={gd.map((v, t) => p(t, v))} tone="blue" thick />
        <Text size="note" text="SGD" at={p(30, Math.max(...sgd.slice(26, 34)))} anchor="s" offset={8} tone="purple" weight={500} />
        <Text size="note" text="gradient descent" at={p(48, gd[48])} anchor="n" offset={5} tone="blue" weight={500} />
      </Canvas>
    </Diagram>
  );
}

/** Fourteen steps on the stretched quadratic L = (0.3 w1² + 10 w2²)/2, without and with momentum. */
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
              <Canvas>
                <Axes area={a} x={[-4.8, 4.8]} y={[-1.6, 1.7]} labels={["$w_1$", "$w_2$"]} />
                {[1, 2, 3].map((k) => <Path key={k} points={ellipse([0, 0], 1.45 * k, 0.25 * k).map(a.p)} closed thin state="ghost" />)}
                <Path points={path.map(a.p)} tone="blue" />
                {path.map((p, t) => <Dot key={t} at={a.p(p)} tone="blue" r={2.5} />)}
              </Canvas>
              <Text text={title} weight={500} />
            </Col>
          );
        })}
      </Row>
    </Diagram>
  );
}

/** Example 7: the convex L(u) = u² and its linearization 2u − 1 at w = 1. */
export function LinearizationSchema() {
  const X: Pt = [-2.3, 2.7], Y: Pt = [-1.6, 4.4];
  const a = plotArea({ x: X, y: Y, w: 260, h: 170, at: [12, 22] });
  return (
    <Diagram caption="Example 7: $L(u) = u^2$ stays above its linearization $2u - 1$ at $w = 1$ and touches it only there.">
      <Canvas>
        <Path points={[a.p([1, 1]), a.p([1, 0])]} dashed state="ghost" />
        <Axes area={a} x={X} y={Y} labels={["$u$", ""]} />
        <Path points={curve(a, (u) => u * u, [-2, 2.05])} state="strong" />
        <Path points={[a.p([-0.3, -1.6]), a.p([2.4, 3.8])]} tone="blue" />
        <Dot at={a.p([1, 1])} tone="blue" r={3.5} />
        <Text size="note" text="$w$" at={a.p([1, 0])} anchor="n" offset={6} muted />
        <Text size="note" text="$L$" at={a.p([-2, 4])} anchor="e" offset={6} weight={500} />
        <Text size="note" text="linearization at $w$" at={a.p([2.4, 3.8])} anchor="w" offset={6} tone="blue" weight={500} />
      </Canvas>
    </Diagram>
  );
}

/** The absolute value |w| and three of its subgradients at the kink. */
export function SubgradientSchema() {
  const a = plotArea({ x: [-2.2, 2.4], y: [-0.9, 2.2], w: 260, h: 150, at: [12, 22] });
  const slopes = [-0.55, 0, 0.55];
  return (
    <Diagram caption="Any line through the kink with slope in $[-1, 1]$ stays below $|w|$.">
      <Canvas>
        <Axes area={a} x={[-2.2, 2.4]} y={[-0.9, 2.2]} labels={["$w$", "$|w|$"]} />
        {slopes.map((g) => (
          <Path key={g} points={[a.p([-1.6, -1.6 * g]), a.p([1.6, 1.6 * g])]} tone="blue" dashed />
        ))}
        <Path points={[a.p([-2.05, 2.05]), a.p([0, 0]), a.p([2.05, 2.05])]} state="strong" />
        <Dot at={a.p([0, 0])} tone="blue" r={3.5} />
        <Text size="note" text="slope $-1$" at={a.p([-1.7, 1.7])} anchor="ne" offset={6} muted />
        <Text size="note" text="slope $1$" at={a.p([1.7, 1.7])} anchor="nw" offset={6} muted />
        <Text size="note" text="$g \in [-1, 1]$" at={a.p([1.6, 1.6 * slopes[2]])} anchor="w" offset={6} tone="blue" />
      </Canvas>
    </Diagram>
  );
}

/** The learning rate over T = 100 steps for three schedules that start from, or warm up to, the same η0. */
export function LrScheduleSchema() {
  const T = 100, X: Pt = [0, T + 8], Y: Pt = [0, 1.3];
  const panels: [title: string, note: string, points: Pt[]][] = [
    ["$\\eta_0 / \\sqrt{t}$", "fast drop, slow tail", Array.from({ length: 97 }, (_, i): Pt => [1 + (99 * i) / 96, 1 / Math.sqrt(1 + (99 * i) / 96)])],
    ["linear decay", "straight to 0", [[0, 1], [T, 0]]],
    ["WSD", "warmup, stable, decay", [[0, 0], [8, 1], [78, 1], [T, 0]]],
  ];
  return (
    <Diagram caption="WSD warms up, holds $\eta_0$ for most of training, and decays only at the end.">
      <Row gap={28} wrap>
        {panels.map(([title, note, points]) => {
          const a = plotArea({ x: X, y: Y, w: 150, h: 104, at: [20, 18] });
          return (
            <Col key={title} gap={10}>
              <Canvas>
                <Axes area={a} x={X} y={Y} labels={["$t$", "$\\eta$"]} />
                <Path points={[a.p([0, 1]), a.p([T, 1])]} dashed state="ghost" />
                <Path points={points.map(a.p)} tone="blue" />
                <Text size="note" text="$\eta_0$" at={a.p([0, 1])} anchor="e" offset={6} muted />
              </Canvas>
              <Col gap={2}>
                <Text text={title} />
                <Text text={note} size="note" muted />
              </Col>
            </Col>
          );
        })}
      </Row>
    </Diagram>
  );
}

/** One projected gradient step: the gradient step leaves the convex set C, and the projection returns to it. */
export function ProjectionSchema() {
  const C: Pt[] = [[0.4, 0.3], [3.0, 0.2], [3.9, 1.3], [3.4, 2.5], [0.6, 2.5]];
  const center: Pt = [5.6, 3.6];
  // L = ((w1 − 5.6)²/2 + (w2 − 3.6)²)/2, one gradient step with η = 0.9 from w
  const w: Pt = [1.2, 1.2];
  const stepped: Pt = [w[0] - (0.9 * (w[0] - center[0])) / 2, w[1] - 0.9 * (w[1] - center[1])];
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
    <Diagram caption="The gradient step leaves $C$ at $w'$, and $P_C(w')$ returns to the nearest point of $C$.">
      <Canvas>
        {[0.4, 0.8, 1.2].map((r) => <Path key={r} points={ellipse(center, r * Math.SQRT2, r).map(a.p)} closed thin state="ghost" />)}
        <Poly points={C.map(a.p)} tone="blue" outline />
        <Line head="end" from={a.p(w)} to={short(a.p(w), a.p(stepped))} state="strong" />
        <Line head="end" from={a.p(stepped)} to={short(a.p(stepped), a.p(projected))} tone="blue" dashed />
        <Dot at={a.p(w)} />
        <Dot at={a.p(stepped)} />
        <Dot at={a.p(projected)} tone="blue" r={3.5} />
        <Text size="note" text="$C$" at={a.p([0.95, 2.15])} tone="blue" offset={4} />
        <Text size="note" text="$w^{(t)}$" at={a.p(w)} anchor="n" offset={7} />
        <Text size="note" text="$w'$" at={a.p(stepped)} anchor="w" offset={7} />
        <Text size="note" text="$P_C(w')$" at={a.p(projected)} anchor="sw" offset={8} tone="blue" />
      </Canvas>
    </Diagram>
  );
}


/** A convex hexagon and a dented, non-convex set, each with a segment between two of its points. */
export function ConvexSetsSchema() {
  // math coordinates around each panel's centre, y up; P puts them on the canvas
  const P = ([x, y]: Pt): Pt => [80 + x, 56 - y];
  const hexagon: Pt[] = Array.from({ length: 6 }, (_, i) => [52 * Math.cos((Math.PI * i) / 3), 52 * Math.sin((Math.PI * i) / 3)]);
  // an ellipse whose top is pushed down near the middle
  const dent = (x: number) => 36 * Math.max(0, 1 - (x / 42) ** 2) ** 2;
  const kidney: Pt[] = Array.from({ length: 96 }, (_, i) => {
    const phi = (2 * Math.PI * i) / 96, x = 70 * Math.cos(phi), y = 44 * Math.sin(phi);
    return [x, y > 0 ? y - dent(x) : y];
  });
  // where the segment u→v crosses the boundary, as fractions along it
  const crossings = (shape: Pt[], [ux, uy]: Pt, [vx, vy]: Pt) =>
    shape.flatMap(([ax, ay], i) => {
      const [bx, by] = shape[(i + 1) % shape.length];
      const d = (vx - ux) * (by - ay) - (vy - uy) * (bx - ax);
      const t = ((ax - ux) * (by - ay) - (ay - uy) * (bx - ax)) / d, s = ((ax - ux) * (vy - uy) - (ay - uy) * (vx - ux)) / d;
      return d !== 0 && t >= 0 && t <= 1 && s >= 0 && s <= 1 ? [t] : [];
    }).sort((a, b) => a - b);
  const panels: [title: string, shape: Pt[], u: Pt, v: Pt][] = [
    ["convex", hexagon, [-26, -16], [24, 20]],
    ["not convex", kidney, [-40, 18], [40, 18]],
  ];
  return (
    <Diagram caption="The segment from $u$ to $v$ stays inside the convex set and leaves the dented one.">
      <Row gap={48} align="end" wrap>
        {panels.map(([title, shape, u, v]) => {
          // the pieces between crossings alternate inside, outside, inside
          const ts = [0, ...crossings(shape, u, v), 1];
          const at = (t: number): Pt => P([u[0] + t * (v[0] - u[0]), u[1] + t * (v[1] - u[1])]);
          return (
            <Col key={title} gap={8}>
              <Canvas>
                <Poly points={shape.map(P)} tone="blue" outline />
                {ts.slice(1).map((t, k) => <Line key={k} from={at(ts[k])} to={at(t)} state="strong" dashed={k % 2 === 1} />)}
                <Dot at={P(u)} state="strong" />
                <Dot at={P(v)} state="strong" />
                <Text size="note" text="$u$" at={P(u)} anchor="e" offset={7} />
                <Text size="note" text="$v$" at={P(v)} anchor="w" offset={7} />
              </Canvas>
              <Text text={title} weight={500} />
            </Col>
          );
        })}
      </Row>
    </Diagram>
  );
}
