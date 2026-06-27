import type { ReactNode } from "react";
import {
  Arrow,
  ArrowHead,
  Box,
  Bracket,
  CellStrip,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  Label,
  RADIUS,
  STROKE,
  r2,
  stableId,
} from "@/components/diagram";

type Anchor = "start" | "middle" | "end";

function ResponsiveDiagram({
  desktop,
  mobile,
}: {
  desktop: ReactNode;
  mobile: ReactNode;
}) {
  return (
    <>
      <div className="complexity-diagram__desktop">{desktop}</div>
      <div className="complexity-diagram__mobile">{mobile}</div>
    </>
  );
}

function Lines({
  x,
  y,
  lines,
  size = FONT.note,
  weight = 400,
  fill = COLOR.fg,
  anchor = "middle",
  lineH = 15,
}: {
  x: number;
  y: number;
  lines: string[];
  size?: number;
  weight?: 400 | 600 | 700;
  fill?: string;
  anchor?: Anchor;
  lineH?: number;
}) {
  return (
    <g>
      {lines.map((line, i) => (
        <Label
          key={`${line}-${i}`}
          x={x}
          y={y + i * lineH}
          text={line}
          size={size}
          weight={weight}
          fill={fill}
          anchor={anchor}
        />
      ))}
    </g>
  );
}

function Frame({
  x,
  y,
  w,
  h,
  title,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  children: ReactNode;
}) {
  return (
    <g>
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(w)}
        height={r2(h)}
        rx={RADIUS.frame}
        fill={COLOR.node}
        stroke={COLOR.border}
        strokeWidth={STROKE.frame}
      />
      {title && (
        <Label x={x + 14} y={y + 22} text={title} size={FONT.label} weight={700} anchor="start" />
      )}
      {children}
    </g>
  );
}

function PlotLine({
  points,
  color = COLOR.fg,
  dashed = false,
  width = STROKE.bold,
  className,
}: {
  points: Array<[number, number]>;
  color?: string;
  dashed?: boolean;
  width?: number;
  className?: string;
}) {
  if (points.length < 2) return null;

  const d = points
    .map((point, i) => {
      if (i === 0) return `M${r2(point[0])},${r2(point[1])}`;

      const p0 = points[i - 2] ?? points[i - 1];
      const p1 = points[i - 1];
      const p2 = point;
      const p3 = points[i + 1] ?? p2;
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      return [
        `C${r2(cp1x)},${r2(cp1y)}`,
        `${r2(cp2x)},${r2(cp2y)}`,
        `${r2(p2[0])},${r2(p2[1])}`,
      ].join(" ");
    })
    .join(" ");

  return (
    <path
      className={className}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dashed ? STROKE.dash : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function GrowthCurve({
  points,
  label,
  labelX,
  labelY,
  className,
  dashed = false,
}: {
  points: Array<[number, number]>;
  label: string;
  labelX: number;
  labelY: number;
  className: string;
  dashed?: boolean;
}) {
  return (
    <g className={`growth-rate-chart__series ${className}`}>
      <PlotLine points={points} color="transparent" width={16} className="growth-rate-chart__curve-hit" />
      <PlotLine
        points={points}
        color="currentColor"
        dashed={dashed}
        width={2.6}
        className="growth-rate-chart__curve"
      />
      <Label
        x={labelX}
        y={labelY}
        text={label}
        size={FONT.note}
        weight={700}
        fill="currentColor"
        anchor="start"
        halo
      />
    </g>
  );
}

function PlotPoint({
  x,
  y,
  color = COLOR.fg,
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <g>
      <circle cx={r2(x)} cy={r2(y)} r="4.8" fill={COLOR.bg} stroke={color} strokeWidth={STROKE.line} />
      <circle cx={r2(x)} cy={r2(y)} r="2.1" fill={color} />
    </g>
  );
}

function ChartGrid({
  x,
  y,
  w,
  h,
  rows = 4,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rows?: number;
}) {
  return (
    <g>
      <rect x={r2(x)} y={r2(y)} width={r2(w)} height={r2(h)} rx={RADIUS.box} fill={COLOR.bg} opacity="0.55" />
      {Array.from({ length: rows + 1 }, (_, i) => {
        const gy = y + (h / rows) * i;
        return (
          <line
            key={gy}
            x1={r2(x)}
            y1={r2(gy)}
            x2={r2(x + w)}
            y2={r2(gy)}
            stroke={i === rows ? COLOR.muted : COLOR.border}
            strokeWidth={i === rows ? STROKE.line : STROKE.divider}
            opacity={i === rows ? 0.72 : 0.8}
          />
        );
      })}
    </g>
  );
}

function GraphNode({
  x,
  y,
  label,
  selected = false,
}: {
  x: number;
  y: number;
  label: string;
  selected?: boolean;
}) {
  return (
    <g>
      <circle
        cx={r2(x)}
        cy={r2(y)}
        r="16"
        fill={selected ? COLOR.hiBg : COLOR.bg}
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      <Label x={x} y={y} text={label} size={FONT.title} weight={600} fill={selected ? COLOR.hiFg : COLOR.fg} />
    </g>
  );
}

function UndirectedEdge({
  a,
  b,
}: {
  a: { x: number; y: number };
  b: { x: number; y: number };
}) {
  return (
    <line
      x1={r2(a.x)}
      y1={r2(a.y)}
      x2={r2(b.x)}
      y2={r2(b.y)}
      stroke={COLOR.muted}
      strokeWidth={STROKE.line}
    />
  );
}

function SmallGraph({
  nodes,
  edges,
  selected = [],
}: {
  nodes: Record<string, { x: number; y: number }>;
  edges: Array<[string, string]>;
  selected?: string[];
}) {
  return (
    <g>
      {edges.map(([u, v]) => (
        <UndirectedEdge key={`${u}-${v}`} a={nodes[u]} b={nodes[v]} />
      ))}
      {Object.entries(nodes).map(([label, p]) => (
        <GraphNode key={label} x={p.x} y={p.y} label={label} selected={selected.includes(label)} />
      ))}
    </g>
  );
}

export function RunningTimeSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("running-time", { title, caption });

  return (
    <DiagramFigure
      title={title}
      caption={
        caption ??
        "Running time groups inputs by length and keeps the slowest computation in each group."
      }
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={330} label={caption ?? "Worst-case running time by input length"}>
            <defs>
              <ArrowHead id={arrowId} />
            </defs>

            <Frame x={28} y={30} w={264} h={244} title="Step counts of one decider">
              <CellStrip
                x={66}
                y={78}
                cellW={86}
                cellH={32}
                widths={[32, 32, 32, 32, 32, 32]}
                orient="v"
                tint
                cells={["length 0", "length 1", "length 2", "length 3", "length 4", "length 5"]}
                fontSize={FONT.note}
              />
              <Lines x={46} y={94} lines={["2", "4", "3", "7", "15", "14"]} fill={COLOR.caption} lineH={32} />
              <Bracket x1={164} x2={232} y={84} label="t(0)=2" drop={8} />
              <Bracket x1={164} x2={232} y={116} label="t(1)=4" drop={8} />
              <Bracket x1={164} x2={232} y={148} label="t(2)=3" drop={8} />
              <Bracket x1={164} x2={232} y={180} label="t(3)=7" drop={8} />
              <Bracket x1={164} x2={232} y={212} label="t(4)=15" drop={8} />
              <Bracket x1={164} x2={232} y={244} label="t(5)=14" drop={8} />
            </Frame>

            <Arrow from={{ x: 304, y: 152 }} to={{ x: 352, y: 152 }} markerId={arrowId} />

            <Frame x={366} y={30} w={266} h={244} title="Running-time function">
              <ChartGrid x={408} y={76} w={186} h={148} rows={4} />
              <PlotLine
                points={[
                  [410, 204],
                  [446, 190],
                  [482, 195],
                  [518, 154],
                  [554, 92],
                  [590, 98],
                ]}
              />
              <PlotPoint x={590} y={98} />
              <Lines x={501} y={252} lines={["t(n)", "worst case at length n"]} fill={COLOR.caption} lineH={14} />
            </Frame>
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={540} label={caption ?? "Worst-case running time by input length"}>
            <defs>
              <ArrowHead id={`${arrowId}-mobile`} />
            </defs>

            <Frame x={20} y={20} w={270} h={232} title="Step counts">
              <CellStrip
                x={66}
                y={68}
                cellW={82}
                cellH={28}
                widths={[28, 28, 28, 28, 28, 28]}
                orient="v"
                tint
                cells={["length 0", "length 1", "length 2", "length 3", "length 4", "length 5"]}
                fontSize={FONT.note}
              />
              <Lines x={45} y={82} lines={["2", "4", "3", "7", "15", "14"]} fill={COLOR.caption} lineH={28} />
              <Lines
                x={214}
                y={82}
                lines={["t(0)=2", "t(1)=4", "t(2)=3", "t(3)=7", "t(4)=15", "t(5)=14"]}
                size={FONT.note}
                lineH={28}
              />
            </Frame>

            <Arrow from={{ x: 155, y: 266 }} to={{ x: 155, y: 306 }} markerId={`${arrowId}-mobile`} />

            <Frame x={20} y={322} w={270} h={174} title="Function t(n)">
              <ChartGrid x={62} y={362} w={186} h={96} rows={4} />
              <PlotLine
                points={[
                  [64, 446],
                  [100, 435],
                  [136, 439],
                  [172, 410],
                  [208, 372],
                  [244, 378],
                ]}
              />
              <PlotPoint x={244} y={378} />
              <Label x={155} y={482} text="one value per input length" size={FONT.note} fill={COLOR.caption} />
            </Frame>
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function GrowthRateSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const values = Array.from({ length: 8 }, (_, i) => i + 1);
  const cap = 260;
  const desktopPlot = { x: 44, y: 34, w: 544, h: 176 };
  const mobilePlot = { x: 30, y: 32, w: 208, h: 164 };
  const scaleX = (n: number, plot: typeof desktopPlot) =>
    plot.x + ((n - 1) / (values.length - 1)) * plot.w;
  const scaleY = (v: number, plot: typeof desktopPlot) =>
    plot.y + plot.h - (Math.min(v, cap) / cap) * plot.h;
  const points = (plot: typeof desktopPlot, fn: (n: number) => number) =>
    values.map((n) => [scaleX(n, plot), scaleY(fn(n), plot)] as [number, number]);

  const linear = points(desktopPlot, (n) => 18 * n);
  const quadratic = points(desktopPlot, (n) => 3 * n * n);
  const exponential = points(desktopPlot, (n) => 2 ** n);
  const mobileLinear = points(mobilePlot, (n) => 18 * n);
  const mobileQuadratic = points(mobilePlot, (n) => 3 * n * n);
  const mobileExponential = points(mobilePlot, (n) => 2 ** n);

  return (
    <DiagramFigure
      title={title ?? "Growth-rate comparison"}
      caption={caption ?? "Asymptotic notation compares eventual growth, not the first few inputs."}
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg
            w={660}
            h={266}
            label={caption ?? "Growth rates of common time bounds"}
            style={{ width: "100%" }}
          >
            <Frame x={16} y={14} w={628} h={232}>
              <g className="growth-rate-chart">
                <ChartGrid x={desktopPlot.x} y={desktopPlot.y} w={desktopPlot.w} h={desktopPlot.h} rows={4} />
                <GrowthCurve
                  points={linear}
                  label="18n"
                  labelX={600}
                  labelY={113}
                  className="growth-rate-chart__series--linear"
                  dashed
                />
                <GrowthCurve
                  points={quadratic}
                  label="3n^2"
                  labelX={600}
                  labelY={82}
                  className="growth-rate-chart__series--quadratic"
                />
                <GrowthCurve
                  points={exponential}
                  label="2^n"
                  labelX={600}
                  labelY={40}
                  className="growth-rate-chart__series--exponential"
                />
                <Label x={596} y={226} text="n" size={FONT.note} fill={COLOR.caption} />
                <Label x={56} y={50} text="time" size={FONT.note} fill={COLOR.caption} anchor="start" />
              </g>
            </Frame>
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg
            w={310}
            h={244}
            label={caption ?? "Growth rates of common time bounds"}
            style={{ width: "100%" }}
          >
            <Frame x={10} y={12} w={290} h={218}>
              <g className="growth-rate-chart">
                <ChartGrid x={mobilePlot.x} y={mobilePlot.y} w={mobilePlot.w} h={mobilePlot.h} rows={4} />
                <GrowthCurve
                  points={mobileLinear}
                  label="18n"
                  labelX={248}
                  labelY={106}
                  className="growth-rate-chart__series--linear"
                  dashed
                />
                <GrowthCurve
                  points={mobileQuadratic}
                  label="3n^2"
                  labelX={248}
                  labelY={75}
                  className="growth-rate-chart__series--quadratic"
                />
                <GrowthCurve
                  points={mobileExponential}
                  label="2^n"
                  labelX={248}
                  labelY={38}
                  className="growth-rate-chart__series--exponential"
                />
                <Label x={246} y={212} text="n" size={FONT.note} fill={COLOR.caption} />
                <Label x={40} y={48} text="time" size={FONT.note} fill={COLOR.caption} anchor="start" />
              </g>
            </Frame>
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function VerifierSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("verifier", { title, caption });

  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "A verifier checks a proposed certificate; it does not have to find one."}
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={246} label={caption ?? "Verifier checks an instance and certificate"}>
            <defs>
              <ArrowHead id={arrowId} />
            </defs>

            <Frame x={26} y={32} w={608} h={142} title="Verification view of a language">
              <Box x={74} y={86} w={82} h={42} label="x" state="highlight" fontWeight={700} />
              <Box x={220} y={86} w={82} h={42} label="C" tint fontWeight={700} />
              <Box x={360} y={76} w={120} h={62} label="verifier V" fontWeight={700} />
              <Box x={534} y={86} w={66} h={42} label="accept?" state="highlight" fontWeight={700} />
              <Arrow from={{ x: 156, y: 107 }} to={{ x: 220, y: 107 }} markerId={arrowId} label="paired" />
              <Arrow from={{ x: 302, y: 107 }} to={{ x: 360, y: 107 }} markerId={arrowId} />
              <Arrow from={{ x: 480, y: 107 }} to={{ x: 534, y: 107 }} markerId={arrowId} />
            </Frame>

            <Lines
              x={330}
              y={214}
              lines={["x in L iff some short C makes V accept", "x not in L iff every C is rejected"]}
              fill={COLOR.caption}
              lineH={15}
            />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={428} label={caption ?? "Verifier checks an instance and certificate"}>
            <defs>
              <ArrowHead id={`${arrowId}-mobile`} />
            </defs>

            <Frame x={20} y={20} w={270} h={318} title="Verification">
              <Box x={94} y={72} w={122} h={40} label="x" state="highlight" fontWeight={700} />
              <Box x={94} y={144} w={122} h={40} label="C" tint fontWeight={700} />
              <Box x={84} y={222} w={142} h={46} label="verifier V" fontWeight={700} />
              <Arrow from={{ x: 155, y: 112 }} to={{ x: 155, y: 144 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 155, y: 184 }} to={{ x: 155, y: 222 }} markerId={`${arrowId}-mobile`} />
              <Label x={155} y={306} text="accepts iff C proves x is yes" size={FONT.note} fill={COLOR.caption} />
            </Frame>

            <Lines
              x={155}
              y={372}
              lines={["yes: some short C accepts", "no: every C rejects"]}
              fill={COLOR.caption}
              lineH={15}
            />
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function GraphCertificateSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const giLeftNodes = {
    c: { x: 104, y: 96 },
    b: { x: 244, y: 96 },
    d: { x: 56, y: 174 },
    a: { x: 292, y: 174 },
    e: { x: 104, y: 252 },
    f: { x: 244, y: 252 },
  };
  const giRightNodes = {
    "1": { x: 400, y: 96 },
    "3": { x: 492, y: 96 },
    "5": { x: 584, y: 96 },
    "2": { x: 400, y: 252 },
    "4": { x: 492, y: 252 },
    "6": { x: 584, y: 252 },
  };
  const indNodes = {
    "1": { x: 224, y: 394 },
    "3": { x: 330, y: 394 },
    "5": { x: 436, y: 394 },
    "2": { x: 224, y: 506 },
    "4": { x: 330, y: 506 },
    "6": { x: 436, y: 506 },
  };
  const mobileLeftNodes = {
    c: { x: 96, y: 96 },
    b: { x: 214, y: 96 },
    d: { x: 52, y: 158 },
    a: { x: 258, y: 158 },
    e: { x: 96, y: 220 },
    f: { x: 214, y: 220 },
  };
  const mobileRightNodes = {
    "1": { x: 72, y: 290 },
    "3": { x: 155, y: 290 },
    "5": { x: 238, y: 290 },
    "2": { x: 72, y: 374 },
    "4": { x: 155, y: 374 },
    "6": { x: 238, y: 374 },
  };
  const mobileIndNodes = {
    "1": { x: 72, y: 512 },
    "3": { x: 155, y: 512 },
    "5": { x: 238, y: 512 },
    "2": { x: 72, y: 626 },
    "4": { x: 155, y: 626 },
    "6": { x: 238, y: 626 },
  };
  const leftEdges: Array<[keyof typeof giLeftNodes, keyof typeof giLeftNodes]> = [
    ["c", "b"],
    ["d", "a"],
    ["e", "f"],
    ["d", "c"],
    ["d", "e"],
    ["b", "a"],
    ["a", "f"],
    ["c", "f"],
    ["e", "b"],
  ];
  const rightEdges: Array<[keyof typeof giRightNodes, keyof typeof giRightNodes]> = [
    ["1", "2"],
    ["3", "4"],
    ["5", "6"],
    ["1", "4"],
    ["1", "6"],
    ["2", "3"],
    ["2", "5"],
    ["3", "6"],
    ["4", "5"],
  ];

  return (
    <DiagramFigure
      title={title}
      caption={
        caption ??
        "Certificates can be concrete structures: a vertex bijection for GI, or a vertex subset for INDSET."
      }
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={610} label={caption ?? "Graph certificates for GI and independent set"}>
            <Frame x={22} y={26} w={616} h={292} title="GI certificate">
              <SmallGraph nodes={giLeftNodes} edges={leftEdges} />
              <SmallGraph nodes={giRightNodes} edges={rightEdges} />
              <Lines
                x={330}
                y={128}
                lines={["bijection C", "a->1", "b->2", "c->3", "d->4", "e->5", "f->6"]}
                fill={COLOR.caption}
                lineH={15}
              />
            </Frame>

            <Frame x={110} y={348} w={440} h={184} title="INDSET certificate">
              <SmallGraph nodes={indNodes} edges={rightEdges} selected={["1", "3", "5"]} />
              <Lines x={330} y={556} lines={["S={1,3,5}", "no selected edge exists"]} fill={COLOR.caption} lineH={14} />
            </Frame>

            <Lines
              x={330}
              y={586}
              lines={["GI checks all adjacencies under the bijection.", "INDSET checks all pairs inside the chosen subset."]}
              fill={COLOR.caption}
              lineH={15}
            />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={790} label={caption ?? "Graph certificates for GI and independent set"}>
            <Frame x={16} y={18} w={278} h={402} title="GI certificate">
              <SmallGraph nodes={mobileLeftNodes} edges={leftEdges} />
              <SmallGraph nodes={mobileRightNodes} edges={rightEdges} />
              <Lines
                x={155}
                y={398}
                lines={["C: a->1, b->2, c->3", "d->4, e->5, f->6"]}
                fill={COLOR.caption}
                lineH={14}
              />
            </Frame>

            <Frame x={16} y={448} w={278} h={266} title="INDSET certificate">
              <SmallGraph nodes={mobileIndNodes} edges={rightEdges} selected={["1", "3", "5"]} />
              <Lines x={155} y={686} lines={["S={1,3,5}", "no selected edge exists"]} fill={COLOR.caption} lineH={14} />
            </Frame>

            <Lines x={155} y={752} lines={["verification checks pairs", "rather than finding the set"]} fill={COLOR.caption} lineH={15} />
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function PnpContainmentSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "P is contained in NP. Whether the containment is strict is the P versus NP problem."}
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={312} label={caption ?? "Possible relationships between P and NP"}>
            <Frame x={28} y={28} w={278} h={214} title="possible: P=NP">
              <ellipse cx="167" cy="140" rx="96" ry="72" fill={COLOR.bg} stroke={COLOR.fg} strokeWidth={STROKE.frame} />
              <Label x={167} y={80} text="P=NP" size={FONT.title} weight={700} />
              <Box x={104} y={114} w={58} h={34} label="SAT" tint />
              <Box x={178} y={154} w={86} h={34} label="INDSET" tint />
              <Box x={96} y={172} w={44} h={34} label="GI" tint />
            </Frame>

            <Frame x={354} y={28} w={278} h={214} title="possible: P proper subset NP">
              <ellipse cx="493" cy="140" rx="98" ry="76" fill={COLOR.node} stroke={COLOR.fg} strokeWidth={STROKE.frame} />
              <ellipse cx="493" cy="158" rx="56" ry="45" fill={COLOR.bg} stroke={COLOR.fg} strokeWidth={STROKE.frame} />
              <Label x={493} y={72} text="NP" size={FONT.title} weight={700} />
              <Label x={493} y={130} text="P" size={FONT.title} weight={700} />
              <Box x={412} y={96} w={56} h={32} label="SAT" tint />
              <Box x={522} y={116} w={86} h={32} label="INDSET" tint />
              <Box x={470} y={158} w={46} h={32} label="GI?" state="new" />
            </Frame>

            <Lines
              x={330}
              y={280}
              lines={["SAT and INDSET are NP-complete: putting either in P would force P=NP."]}
              fill={COLOR.caption}
            />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={552} label={caption ?? "Possible relationships between P and NP"}>
            <Frame x={18} y={18} w={274} h={210} title="possible: P=NP">
              <ellipse cx="155" cy="130" rx="88" ry="68" fill={COLOR.bg} stroke={COLOR.fg} strokeWidth={STROKE.frame} />
              <Label x={155} y={74} text="P=NP" size={FONT.title} weight={700} />
              <Box x={94} y={108} w={58} h={34} label="SAT" tint />
              <Box x={164} y={144} w={86} h={34} label="INDSET" tint />
              <Box x={86} y={158} w={44} h={34} label="GI" tint />
            </Frame>

            <Frame x={18} y={260} w={274} h={220} title="possible: P proper subset NP">
              <ellipse cx="155" cy="364" rx="90" ry="72" fill={COLOR.node} stroke={COLOR.fg} strokeWidth={STROKE.frame} />
              <ellipse cx="155" cy="384" rx="52" ry="42" fill={COLOR.bg} stroke={COLOR.fg} strokeWidth={STROKE.frame} />
              <Label x={155} y={302} text="NP" size={FONT.title} weight={700} />
              <Label x={155} y={360} text="P" size={FONT.title} weight={700} />
              <Box x={80} y={328} w={56} h={32} label="SAT" tint />
              <Box x={174} y={338} w={86} h={32} label="INDSET" tint />
              <Box x={132} y={382} w={46} h={32} label="GI?" state="new" />
            </Frame>

            <Lines
              x={155}
              y={516}
              lines={["SAT or INDSET in P", "would force P=NP"]}
              fill={COLOR.caption}
              lineH={15}
            />
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}
