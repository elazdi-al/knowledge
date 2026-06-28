import type { ReactNode } from "react";
import {
  Arrow,
  ArrowHead,
  Box,
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
type Weight = 400 | 600 | 700;
type Pt = { x: number; y: number };

function ResponsiveDiagram({
  desktop,
  mobile,
}: {
  desktop: ReactNode;
  mobile: ReactNode;
}) {
  return (
    <>
      <div className="reduction-diagram__desktop">{desktop}</div>
      <div className="reduction-diagram__mobile">{mobile}</div>
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
  halo = false,
}: {
  x: number;
  y: number;
  lines: string[];
  size?: number;
  weight?: Weight;
  fill?: string;
  anchor?: Anchor;
  lineH?: number;
  halo?: boolean;
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
          halo={halo}
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
  title: string;
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
      <Label x={x + 14} y={y + 22} text={title} size={FONT.label} weight={700} anchor="start" />
      {children}
    </g>
  );
}

function State({
  x,
  y,
  label,
  accepting = false,
  target = false,
}: {
  x: number;
  y: number;
  label: string;
  accepting?: boolean;
  target?: boolean;
}) {
  const r = target ? 19 : 22;
  return (
    <g>
      <circle
        cx={r2(x)}
        cy={r2(y)}
        r={r}
        fill={target ? COLOR.bg : COLOR.node}
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
        strokeDasharray={target ? STROKE.dash : undefined}
      />
      {accepting && (
        <circle
          cx={r2(x)}
          cy={r2(y)}
          r={r - 5}
          fill="none"
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
      )}
      <Label x={x} y={y} text={label} size={FONT.label} weight={600} />
    </g>
  );
}

function Universe({
  x,
  y,
  w,
  h,
  title,
  top,
  bottom,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  top: string;
  bottom: string;
}) {
  return (
    <g>
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(w)}
        height={r2(h)}
        rx={RADIUS.box}
        fill={COLOR.bg}
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(w)}
        height={r2(h / 2)}
        rx={RADIUS.box}
        fill={COLOR.node}
      />
      <line
        x1={r2(x)}
        y1={r2(y + h / 2)}
        x2={r2(x + w)}
        y2={r2(y + h / 2)}
        stroke={COLOR.fg}
        strokeWidth={STROKE.divider}
      />
      <rect
        x={r2(x)}
        y={r2(y)}
        width={r2(w)}
        height={r2(h)}
        rx={RADIUS.box}
        fill="none"
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      {title && <Label x={x + w / 2} y={y + h + 20} text={title} size={FONT.title} weight={700} />}
      <Label x={x - 10} y={y + h / 4} text={top} size={FONT.title} weight={700} anchor="end" />
      <Label x={x - 10} y={y + (3 * h) / 4} text={bottom} size={FONT.title} weight={700} anchor="end" />
    </g>
  );
}

function DotLabel({
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
        r="15"
        fill={selected ? COLOR.hiBg : COLOR.bg}
        stroke={selected ? COLOR.hiBg : COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      <Label
        x={x}
        y={y}
        text={label}
        size={FONT.note}
        weight={600}
        fill={selected ? COLOR.hiFg : COLOR.fg}
      />
    </g>
  );
}

function Segment({
  a,
  b,
  dashed = false,
  width = STROKE.line,
}: {
  a: Pt;
  b: Pt;
  dashed?: boolean;
  width?: number;
}) {
  return (
    <line
      x1={r2(a.x)}
      y1={r2(a.y)}
      x2={r2(b.x)}
      y2={r2(b.y)}
      stroke={COLOR.muted}
      strokeWidth={width}
      strokeDasharray={dashed ? STROKE.dash : undefined}
      strokeLinecap="round"
    />
  );
}

function LiteralNode({
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
      {selected && (
        <rect
          x={r2(x - 29)}
          y={r2(y - 29)}
          width="58"
          height="58"
          rx={RADIUS.frame}
          fill="none"
          stroke={COLOR.fg}
          strokeWidth={STROKE.bold}
        />
      )}
      <circle
        cx={r2(x)}
        cy={r2(y)}
        r="21"
        fill={selected ? COLOR.node : COLOR.bg}
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      <Label x={x} y={y} text={label} size={FONT.title} weight={700} />
    </g>
  );
}

function ClauseFrame({
  x,
  y,
  w,
  h,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
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
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      <Label x={x + 12} y={y + 18} text={label} size={FONT.label} weight={700} anchor="start" />
    </g>
  );
}

function CliqueEdges({ points }: { points: Pt[] }) {
  const edges: Array<[Pt, Pt, number]> = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = j - i;
      const sameRow = Math.abs(points[i].y - points[j].y) < 1;
      const bend = sameRow && distance > 1 ? (distance % 2 === 0 ? -22 : 26) : 0;
      edges.push([points[i], points[j], bend]);
    }
  }

  return (
    <g>
      {edges.map(([a, b, bend], i) => (
        bend === 0 ? (
          <Segment key={i} a={a} b={b} />
        ) : (
          <Arrow key={i} from={a} to={b} bend={bend} color={COLOR.muted} />
        )
      ))}
    </g>
  );
}

export function NpCompletenessChainSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("np-chain", { title, caption });

  const box = (x: number, y: number, w: number, label: string, state: "normal" | "emphasis" | "new" = "normal") => (
    <Box x={x} y={y} w={w} h={38} label={label} state={state} fontWeight={700} fontSize={FONT.note} />
  );

  return (
    <DiagramFigure
      title={title}
      caption={
        caption ??
        "Each arrow means a polynomial-time reduction from the source problem to the target problem."
      }
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={380} label={caption ?? "NP-completeness reduction chain"}>
            <defs>
              <ArrowHead id={arrowId} />
            </defs>

            {box(270, 28, 120, "SAT", "emphasis")}
            {box(152, 112, 126, "INDSET", "emphasis")}
            {box(414, 112, 96, "3SAT")}
            {box(64, 202, 148, "VERTEX COVER")}
            {box(304, 202, 112, "CLIQUE")}
            {box(76, 292, 124, "SET COVER")}
            {box(286, 292, 132, "SUBSET-SUM", "new")}

            <Arrow from={{ x: 298, y: 66 }} to={{ x: 226, y: 112 }} markerId={arrowId} />
            <Arrow from={{ x: 362, y: 66 }} to={{ x: 454, y: 112 }} markerId={arrowId} />
            <Arrow from={{ x: 186, y: 150 }} to={{ x: 138, y: 202 }} markerId={arrowId} />
            <Arrow from={{ x: 246, y: 150 }} to={{ x: 332, y: 202 }} markerId={arrowId} />
            <Arrow from={{ x: 138, y: 240 }} to={{ x: 138, y: 292 }} markerId={arrowId} />
            <Arrow from={{ x: 200, y: 311 }} to={{ x: 286, y: 311 }} markerId={arrowId} dashed />

            <Lines
              x={330}
              y={356}
              lines={["known complete sources feed later complete targets by transitivity"]}
              fill={COLOR.caption}
            />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={522} label={caption ?? "NP-completeness reduction chain"}>
            <defs>
              <ArrowHead id={`${arrowId}-mobile`} />
            </defs>

            {box(105, 22, 100, "SAT", "emphasis")}
            {box(92, 102, 126, "INDSET", "emphasis")}
            {box(102, 182, 106, "CLIQUE")}
            {box(81, 262, 148, "VERTEX COVER")}
            {box(93, 342, 124, "SET COVER")}
            {box(89, 422, 132, "SUBSET-SUM", "new")}
            {box(221, 102, 78, "3SAT")}

            <Arrow from={{ x: 155, y: 60 }} to={{ x: 155, y: 102 }} markerId={`${arrowId}-mobile`} />
            <Arrow from={{ x: 190, y: 60 }} to={{ x: 248, y: 102 }} markerId={`${arrowId}-mobile`} />
            <Arrow from={{ x: 155, y: 140 }} to={{ x: 155, y: 182 }} markerId={`${arrowId}-mobile`} />
            <Arrow from={{ x: 155, y: 220 }} to={{ x: 155, y: 262 }} markerId={`${arrowId}-mobile`} />
            <Arrow from={{ x: 155, y: 300 }} to={{ x: 155, y: 342 }} markerId={`${arrowId}-mobile`} />
            <Arrow from={{ x: 155, y: 380 }} to={{ x: 155, y: 422 }} markerId={`${arrowId}-mobile`} dashed />

            <Lines
              x={155}
              y={494}
              lines={["arrows transfer NP-hardness", "when the target is in NP"]}
              fill={COLOR.caption}
              lineH={14}
            />
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function PolynomialReductionSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("poly-reduction", { title, caption });

  return (
    <DiagramFigure
      title={title}
      caption={
        caption ??
        "A polynomial-time reduction is a total efficient translator whose outputs preserve membership."
      }
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={408} label={caption ?? "Polynomial-time mapping reduction"}>
            <defs>
              <ArrowHead id={arrowId} />
            </defs>

            <Frame x={18} y={22} w={624} h={126} title="poly-time computability">
              <Box x={64} y={84} w={82} h={38} label="w" state="highlight" fontWeight={700} />
              <Box x={288} y={78} w={84} h={50} label="TM_f" tint fontWeight={700} />
              <Box x={514} y={84} w={82} h={38} label="f(w)" state="highlight" fontWeight={700} />
              <Arrow from={{ x: 146, y: 103 }} to={{ x: 288, y: 103 }} markerId={arrowId} />
              <Arrow from={{ x: 372, y: 103 }} to={{ x: 514, y: 103 }} markerId={arrowId} />
              <Lines x={220} y={132} lines={["halts on every input"]} fill={COLOR.caption} />
              <Lines x={444} y={132} lines={["writes only f(w)"]} fill={COLOR.caption} />
            </Frame>

            <Frame x={18} y={170} w={624} h={178} title="correctness">
              <Universe x={72} y={242} w={118} h={78} title="Sigma^*" top="A" bottom="not A" />
              <Universe x={470} y={242} w={118} h={78} title="Sigma^*" top="B" bottom="not B" />

              <DotLabel x={122} y={260} label="w_1" />
              <DotLabel x={143} y={286} label="w_2" />
              <DotLabel x={119} y={307} label="w_3" />
              <DotLabel x={522} y={260} label="v_2" />
              <DotLabel x={544} y={286} label="v_1" />
              <DotLabel x={526} y={307} label="v_4" />
              <DotLabel x={552} y={309} label="v_5" />

              <Arrow from={{ x: 137, y: 260 }} to={{ x: 507, y: 260 }} markerId={arrowId} label="f" bend={-34} />
              <Arrow from={{ x: 158, y: 286 }} to={{ x: 529, y: 286 }} markerId={arrowId} />
              <Arrow from={{ x: 134, y: 307 }} to={{ x: 511, y: 307 }} markerId={arrowId} bend={28} />
              <Lines
                x={330}
                y={336}
                lines={["w in A iff f(w) in B", "the map does not need to hit every string of B"]}
                fill={COLOR.caption}
                lineH={15}
                halo
              />
            </Frame>

            <Label x={330} y={380} text="notation: A <=_P B" size={FONT.title} weight={700} />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={730} label={caption ?? "Polynomial-time mapping reduction"}>
            <defs>
              <ArrowHead id={`${arrowId}-mobile`} />
            </defs>

            <Frame x={18} y={18} w={274} h={224} title="poly-time computability">
              <Box x={104} y={64} w={102} h={38} label="w" state="highlight" fontWeight={700} />
              <Box x={112} y={128} w={86} h={44} label="TM_f" tint fontWeight={700} />
              <Box x={104} y={194} w={102} h={38} label="f(w)" state="highlight" fontWeight={700} />
              <Arrow from={{ x: 155, y: 102 }} to={{ x: 155, y: 128 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 155, y: 172 }} to={{ x: 155, y: 194 }} markerId={`${arrowId}-mobile`} />
              <Lines x={238} y={138} lines={["halts", "always"]} fill={COLOR.caption} lineH={14} />
            </Frame>

            <Frame x={18} y={278} w={274} h={382} title="correctness">
              <Universe x={96} y={326} w={118} h={72} title="" top="A" bottom="not A" />
              <Universe x={96} y={506} w={118} h={72} title="" top="B" bottom="not B" />

              <DotLabel x={130} y={343} label="w_1" />
              <DotLabel x={166} y={369} label="w_2" />
              <DotLabel x={132} y={382} label="w_3" />
              <DotLabel x={132} y={524} label="v_2" />
              <DotLabel x={166} y={550} label="v_1" />
              <DotLabel x={132} y={564} label="v_4" />

              <Arrow from={{ x: 130, y: 358 }} to={{ x: 132, y: 509 }} markerId={`${arrowId}-mobile`} bend={30} label="f" />
              <Arrow from={{ x: 166, y: 384 }} to={{ x: 166, y: 535 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 132, y: 397 }} to={{ x: 132, y: 549 }} markerId={`${arrowId}-mobile`} bend={-28} />
              <Lines
                x={155}
                y={632}
                lines={["w in A iff f(w) in B", "notation: A <=_P B"]}
                fill={COLOR.caption}
                lineH={15}
              />
            </Frame>
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function ReductionTransitivitySchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("reduction-transitivity", { title, caption });

  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Compose the two translators; polynomial time remains polynomial."}
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={206} label={caption ?? "Transitivity of polynomial-time reductions"}>
            <defs>
              <ArrowHead id={arrowId} />
            </defs>

            <Frame x={18} y={24} w={624} h={122} title="composed reduction">
              <Box x={48} y={88} w={70} h={38} label="w" state="highlight" fontWeight={700} />
              <Box x={164} y={88} w={76} h={38} label="f_{AB}" tint fontWeight={700} />
              <Box x={286} y={88} w={88} h={38} label="f_{AB}(w)" state="highlight" fontWeight={700} />
              <Box x={420} y={88} w={76} h={38} label="f_{BC}" tint fontWeight={700} />
              <Box x={542} y={88} w={70} h={38} label="C inst." state="highlight" fontWeight={700} />

              <Arrow from={{ x: 118, y: 107 }} to={{ x: 164, y: 107 }} markerId={arrowId} />
              <Arrow from={{ x: 240, y: 107 }} to={{ x: 286, y: 107 }} markerId={arrowId} />
              <Arrow from={{ x: 374, y: 107 }} to={{ x: 420, y: 107 }} markerId={arrowId} />
              <Arrow from={{ x: 496, y: 107 }} to={{ x: 542, y: 107 }} markerId={arrowId} />

              <Lines x={202} y={136} lines={["O(n^p)"]} fill={COLOR.caption} />
              <Lines
                x={458}
                y={132}
                lines={["expanded input", "O(n^{pq})"]}
                fill={COLOR.caption}
                lineH={14}
              />
            </Frame>

            <Label x={330} y={178} text="A <=_P B and B <=_P C imply A <=_P C" size={FONT.title} weight={700} />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={470} label={caption ?? "Transitivity of polynomial-time reductions"}>
            <defs>
              <ArrowHead id={`${arrowId}-mobile`} />
            </defs>

            <Frame x={20} y={20} w={270} h={390} title="composed reduction">
              <Box x={104} y={66} w={102} h={38} label="w" state="highlight" fontWeight={700} />
              <Box x={112} y={132} w={86} h={38} label="f_{AB}" tint fontWeight={700} />
              <Box x={88} y={198} w={134} h={38} label="f_{AB}(w)" state="highlight" fontWeight={700} />
              <Box x={112} y={264} w={86} h={38} label="f_{BC}" tint fontWeight={700} />
              <Box x={104} y={330} w={102} h={38} label="C inst." state="highlight" fontWeight={700} />

              <Arrow from={{ x: 155, y: 104 }} to={{ x: 155, y: 132 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 155, y: 170 }} to={{ x: 155, y: 198 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 155, y: 236 }} to={{ x: 155, y: 264 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 155, y: 302 }} to={{ x: 155, y: 330 }} markerId={`${arrowId}-mobile`} />
              <Lines x={230} y={136} lines={["poly"]} fill={COLOR.caption} />
              <Lines x={230} y={268} lines={["poly"]} fill={COLOR.caption} />
            </Frame>

            <Lines
              x={155}
              y={444}
              lines={["A <=_P B and B <=_P C", "imply A <=_P C"]}
              fill={COLOR.caption}
              lineH={15}
            />
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function SatToIndsetReductionSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const desktop = {
    k1: [{ id: "k1n1", x: 104, y: 278, label: "¬x_1", selected: true }],
    k2: [
      { id: "k2p1", x: 558, y: 244, label: "x_1" },
      { id: "k2n2", x: 558, y: 312, label: "¬x_2", selected: true },
    ],
    k3: [
      { id: "k3p1", x: 232, y: 124, label: "x_1" },
      { id: "k3p2", x: 330, y: 124, label: "x_2" },
      { id: "k3n3", x: 428, y: 124, label: "¬x_3", selected: true },
    ],
    k4: [
      { id: "k4p1", x: 212, y: 432, label: "x_1" },
      { id: "k4p2", x: 300, y: 432, label: "x_2" },
      { id: "k4p3", x: 388, y: 432, label: "x_3" },
      { id: "k4n4", x: 476, y: 432, label: "¬x_4", selected: true },
    ],
  };
  const mobile = {
    k1: [{ id: "k1n1", x: 155, y: 84, label: "¬x_1", selected: true }],
    k2: [
      { id: "k2p1", x: 112, y: 206, label: "x_1" },
      { id: "k2n2", x: 198, y: 206, label: "¬x_2", selected: true },
    ],
    k3: [
      { id: "k3p1", x: 72, y: 334, label: "x_1" },
      { id: "k3p2", x: 155, y: 334, label: "x_2" },
      { id: "k3n3", x: 238, y: 334, label: "¬x_3", selected: true },
    ],
    k4: [
      { id: "k4p1", x: 50, y: 488, label: "x_1" },
      { id: "k4p2", x: 120, y: 488, label: "x_2" },
      { id: "k4p3", x: 190, y: 488, label: "x_3" },
      { id: "k4n4", x: 260, y: 488, label: "¬x_4", selected: true },
    ],
  };

  const desktopNodes = Object.fromEntries(
    Object.values(desktop)
      .flat()
      .map((node) => [node.id, node]),
  );
  const mobileNodes = Object.fromEntries(
    Object.values(mobile)
      .flat()
      .map((node) => [node.id, node]),
  );

  const conflicts: Array<[string, string, number]> = [
    ["k1n1", "k2p1", -34],
    ["k1n1", "k3p1", -56],
    ["k1n1", "k4p1", 32],
    ["k2n2", "k3p2", -36],
    ["k2n2", "k4p2", 42],
    ["k3n3", "k4p3", 46],
  ];

  const renderConflictEdges = (
    nodes: Record<string, Pt>,
    markerSuffix = "",
    mobileMode = false,
  ) => (
    <g>
      {conflicts.map(([from, to, bend], i) => (
        <Arrow
          key={`${from}-${to}-${markerSuffix}`}
          from={nodes[from]}
          to={nodes[to]}
          bend={mobileMode ? Math.sign(bend) * 26 : bend}
          dashed
          color={COLOR.muted}
          width={i === conflicts.length - 1 ? STROKE.bold : STROKE.line}
        />
      ))}
    </g>
  );

  return (
    <DiagramFigure
      title={title}
      caption={
        caption ??
        "SAT reduces to INDSET by turning clauses into cliques and contradictions into conflict edges."
      }
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={560} label={caption ?? "Reduction from SAT to independent set"}>
            <Frame x={16} y={18} w={628} h={478} title="example construction">
              <ClauseFrame x={164} y={66} w={328} h={116} label="K_3" />
              <ClauseFrame x={48} y={222} w={112} h={112} label="K_1" />
              <ClauseFrame x={502} y={194} w={112} h={166} label="K_2" />
              <ClauseFrame x={162} y={374} w={356} h={116} label="K_4" />

              <CliqueEdges points={desktop.k2} />
              <CliqueEdges points={desktop.k3} />
              <CliqueEdges points={desktop.k4} />
              {renderConflictEdges(desktopNodes)}

              {Object.values(desktop)
                .flat()
                .map((node) => (
                  <LiteralNode key={node.id} {...node} />
                ))}
            </Frame>

            <Lines
              x={330}
              y={522}
              lines={[
                "solid edges: clause cliques",
                "dashed edges: conflicting literals",
                "outlined nodes: chosen independent set",
              ]}
              fill={COLOR.caption}
              lineH={15}
            />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={668} label={caption ?? "Reduction from SAT to independent set"}>
            <Frame x={14} y={16} w={282} h={548} title="example construction">
              <ClauseFrame x={96} y={48} w={118} h={74} label="K_1" />
              <ClauseFrame x={52} y={168} w={206} h={82} label="K_2" />
              <ClauseFrame x={28} y={292} w={254} h={86} label="K_3" />
              <ClauseFrame x={18} y={444} w={274} h={88} label="K_4" />

              <CliqueEdges points={mobile.k2} />
              <CliqueEdges points={mobile.k3} />
              <CliqueEdges points={mobile.k4} />
              {renderConflictEdges(mobileNodes, "-mobile", true)}

              {Object.values(mobile)
                .flat()
                .map((node) => (
                  <LiteralNode key={node.id} {...node} />
                ))}
            </Frame>

            <Lines
              x={155}
              y={600}
              lines={[
                "solid: clause cliques",
                "dashed: conflicts",
                "outlined: chosen set",
              ]}
              fill={COLOR.caption}
              lineH={15}
            />
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function DfaToPathReductionSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("dfa-path-reduction", { title, caption });

  return (
    <DiagramFigure
      title={title}
      caption={
        caption ??
        "DFA nonemptiness becomes reachability: an accepting state is reachable iff the target is reachable."
      }
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg
            w={660}
            h={300}
            label={caption ?? "Reduction from DFA nonemptiness to path reachability"}
          >
            <defs>
              <ArrowHead id={arrowId} />
            </defs>

            <Frame x={16} y={34} w={286} h={192} title="DFA D">
              <State x={74} y={139} label="q_0" />
              <State x={164} y={99} label="q_1" />
              <State x={244} y={139} label="q_f" accepting />
              <Arrow from={{ x: 96, y: 129 }} to={{ x: 142, y: 109 }} markerId={arrowId} label="0" />
              <Arrow from={{ x: 184, y: 109 }} to={{ x: 222, y: 129 }} markerId={arrowId} label="1" />
              <Arrow
                from={{ x: 74, y: 161 }}
                to={{ x: 232, y: 161 }}
                markerId={arrowId}
                bend={26}
                label="1"
              />
              <Label x={159} y={202} text="accepting state reachable" size={FONT.note} fill={COLOR.caption} />
            </Frame>

            <Arrow from={{ x: 314, y: 130 }} to={{ x: 346, y: 130 }} markerId={arrowId} label="f" />

            <Frame x={358} y={34} w={286} h={192} title="Graph instance">
              <State x={416} y={139} label="q_0" />
              <State x={506} y={99} label="q_1" />
              <State x={586} y={139} label="q_f" />
              <State x={586} y={200} label="t" target />
              <Arrow from={{ x: 438, y: 129 }} to={{ x: 484, y: 109 }} markerId={arrowId} />
              <Arrow from={{ x: 526, y: 109 }} to={{ x: 564, y: 129 }} markerId={arrowId} />
              <Arrow from={{ x: 586, y: 161 }} to={{ x: 586, y: 180 }} markerId={arrowId} />
              <Label x={501} y={202} text="path from q_0 to t" size={FONT.note} fill={COLOR.caption} />
            </Frame>

            <Label
              x={330}
              y={264}
              text="<D> maps to <G,q_0,t>; transition labels are dropped"
              size={FONT.note}
              fill={COLOR.caption}
            />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg
            w={310}
            h={468}
            label={caption ?? "Reduction from DFA nonemptiness to path reachability"}
          >
            <defs>
              <ArrowHead id={`${arrowId}-mobile`} />
            </defs>

            <Frame x={20} y={20} w={270} h={170} title="DFA D">
              <State x={72} y={113} label="q_0" />
              <State x={154} y={78} label="q_1" />
              <State x={232} y={113} label="q_f" accepting />
              <Arrow from={{ x: 94, y: 104 }} to={{ x: 132, y: 87 }} markerId={`${arrowId}-mobile`} label="0" />
              <Arrow from={{ x: 174, y: 88 }} to={{ x: 210, y: 104 }} markerId={`${arrowId}-mobile`} label="1" />
              <Arrow
                from={{ x: 72, y: 135 }}
                to={{ x: 220, y: 135 }}
                markerId={`${arrowId}-mobile`}
                bend={24}
                label="1"
              />
              <Label x={155} y={174} text="accepting state reachable" size={FONT.note} fill={COLOR.caption} />
            </Frame>

            <Arrow from={{ x: 155, y: 204 }} to={{ x: 155, y: 242 }} markerId={`${arrowId}-mobile`} label="f" />

            <Frame x={20} y={256} w={270} h={182} title="Graph instance">
              <State x={72} y={344} label="q_0" />
              <State x={154} y={309} label="q_1" />
              <State x={232} y={344} label="q_f" />
              <State x={232} y={397} label="t" target />
              <Arrow from={{ x: 94, y: 334 }} to={{ x: 132, y: 318 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 174, y: 319 }} to={{ x: 210, y: 334 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 232, y: 366 }} to={{ x: 232, y: 378 }} markerId={`${arrowId}-mobile`} />
              <Label x={150} y={419} text="path from q_0 to t" size={FONT.note} fill={COLOR.caption} />
            </Frame>

            <Lines
              x={155}
              y={444}
              lines={["<D> maps to <G,q_0,t>", "labels are dropped"]}
              fill={COLOR.caption}
              lineH={14}
            />
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function ReductionPipelineSchema({
  title,
  caption,
  solver = "M_B",
  solverNote = "decider for B",
  result = "machine for A",
  className,
}: {
  title?: string;
  caption?: string;
  solver?: string;
  solverNote?: string;
  result?: string;
  className?: string;
}) {
  const arrowId = stableId("reduction-pipeline", { title, caption, solver, solverNote, result });

  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Use the reduction first, then run the machine for B."}
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={212} label={caption ?? "Reduction pipeline"}>
            <defs>
              <ArrowHead id={arrowId} />
            </defs>

            <Frame x={18} y={24} w={624} h={130} title={result}>
              <Box x={48} y={82} w={106} h={42} label="w" state="highlight" fontWeight={700} />
              <Box x={214} y={82} w={86} h={42} label="f" tint fontWeight={700} />
              <Box x={360} y={82} w={116} h={42} label="f(w)" state="highlight" fontWeight={700} />
              <Box x={536} y={82} w={80} h={42} label={solver} fontWeight={700} />

              <Arrow from={{ x: 154, y: 103 }} to={{ x: 214, y: 103 }} markerId={arrowId} />
              <Arrow from={{ x: 300, y: 103 }} to={{ x: 360, y: 103 }} markerId={arrowId} />
              <Arrow from={{ x: 476, y: 103 }} to={{ x: 536, y: 103 }} markerId={arrowId} />

              <Lines x={257} y={144} lines={["computable", "total"]} fill={COLOR.caption} />
              <Lines x={576} y={144} lines={[solverNote]} fill={COLOR.caption} />
            </Frame>

            <Label
              x={330}
              y={184}
              text="correctness condition: w in A iff f(w) in B"
              size={FONT.note}
              fill={COLOR.caption}
            />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={428} label={caption ?? "Reduction pipeline"}>
            <defs>
              <ArrowHead id={`${arrowId}-mobile`} />
            </defs>

            <Frame x={20} y={22} w={270} h={350} title={result}>
              <Box x={92} y={74} w={126} h={40} label="w" state="highlight" fontWeight={700} />
              <Box x={125} y={142} w={60} h={40} label="f" tint fontWeight={700} />
              <Box x={92} y={218} w={126} h={40} label="f(w)" state="highlight" fontWeight={700} />
              <Box x={112} y={294} w={86} h={40} label={solver} fontWeight={700} />

              <Arrow from={{ x: 155, y: 114 }} to={{ x: 155, y: 142 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 155, y: 182 }} to={{ x: 155, y: 218 }} markerId={`${arrowId}-mobile`} />
              <Arrow from={{ x: 155, y: 258 }} to={{ x: 155, y: 294 }} markerId={`${arrowId}-mobile`} />

              <Lines x={226} y={150} lines={["computable", "total"]} fill={COLOR.caption} lineH={14} />
              <Lines x={155} y={356} lines={[solverNote]} fill={COLOR.caption} lineH={14} />
            </Frame>

            <Lines
              x={155}
              y={398}
              lines={["correctness:", "w in A iff f(w) in B"]}
              fill={COLOR.caption}
              lineH={14}
            />
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}

export function RegTmReductionSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("regtm-reduction", { title, caption });

  return (
    <DiagramFigure
      title={title}
      caption={
        caption ??
        "The reduction builds M' so its language is either all strings or the known non-regular language B."
      }
      className={className}
    >
      <ResponsiveDiagram
        desktop={
          <DiagramSvg w={660} h={380} label={caption ?? "Reduction from A_TM to REG_TM"}>
            <defs>
              <ArrowHead id={arrowId} />
            </defs>

            <Box x={28} y={34} w={104} h={38} label="<M,w>" state="highlight" fontWeight={700} />
            <Box x={192} y={34} w={70} h={38} label="f" tint fontWeight={700} />
            <Box x={324} y={34} w={108} h={38} label="<M'>" state="highlight" fontWeight={700} />
            <Box x={522} y={34} w={110} h={38} label="R_REG" fontWeight={700} />
            <Arrow from={{ x: 132, y: 53 }} to={{ x: 192, y: 53 }} markerId={arrowId} />
            <Arrow from={{ x: 262, y: 53 }} to={{ x: 324, y: 53 }} markerId={arrowId} />
            <Arrow from={{ x: 432, y: 53 }} to={{ x: 522, y: 53 }} markerId={arrowId} />

            <Frame x={50} y={108} w={560} h={216} title="M' on input y">
              <Box x={88} y={172} w={126} h={42} label="y in B?" tint fontWeight={700} />
              <Box x={302} y={142} w={88} h={36} label="accept" state="highlight" fontWeight={700} />
              <Box x={286} y={240} w={136} h={42} label="run M on w" tint fontWeight={700} />
              <Box x={496} y={214} w={84} h={36} label="accept" state="highlight" fontWeight={700} />
              <Box x={496} y={266} w={84} h={36} label="no accept" state="new" fontWeight={700} />

              <Arrow from={{ x: 214, y: 193 }} to={{ x: 302, y: 160 }} markerId={arrowId} label="yes" />
              <Arrow from={{ x: 214, y: 193 }} to={{ x: 286, y: 261 }} markerId={arrowId} label="no" />
              <Arrow from={{ x: 422, y: 261 }} to={{ x: 496, y: 232 }} markerId={arrowId} label="accepts" />
              <Arrow from={{ x: 422, y: 261 }} to={{ x: 496, y: 284 }} markerId={arrowId} label="otherwise" />
            </Frame>

            <Lines
              x={330}
              y={350}
              lines={["if M accepts w: L(M') = Sigma^*", "otherwise: L(M') = B = {0^n1^n | n >= 0}"]}
              fill={COLOR.caption}
              lineH={15}
            />
          </DiagramSvg>
        }
        mobile={
          <DiagramSvg w={310} h={508} label={caption ?? "Reduction from A_TM to REG_TM"}>
            <defs>
              <ArrowHead id={`${arrowId}-mobile`} />
            </defs>

            <Box x={10} y={24} w={62} h={36} label="<M,w>" state="highlight" fontWeight={700} />
            <Box x={96} y={24} w={42} h={36} label="f" tint fontWeight={700} />
            <Box x={162} y={24} w={62} h={36} label="<M'>" state="highlight" fontWeight={700} />
            <Box x={248} y={24} w={52} h={36} label="R_REG" fontWeight={700} />
            <Arrow from={{ x: 72, y: 42 }} to={{ x: 96, y: 42 }} markerId={`${arrowId}-mobile`} />
            <Arrow from={{ x: 138, y: 42 }} to={{ x: 162, y: 42 }} markerId={`${arrowId}-mobile`} />
            <Arrow from={{ x: 224, y: 42 }} to={{ x: 248, y: 42 }} markerId={`${arrowId}-mobile`} />

            <Frame x={16} y={92} w={278} h={326} title="M' on input y">
              <Box x={42} y={150} w={110} h={40} label="y in B?" tint fontWeight={700} />
              <Box x={200} y={151} w={70} h={38} label="accept" state="highlight" fontWeight={700} />
              <Box x={90} y={244} w={130} h={42} label="run M on w" tint fontWeight={700} />
              <Box x={42} y={342} w={90} h={36} label="no accept" state="new" fontWeight={700} />
              <Box x={204} y={342} w={70} h={36} label="accept" state="highlight" fontWeight={700} />

              <Arrow from={{ x: 152, y: 170 }} to={{ x: 200, y: 170 }} markerId={`${arrowId}-mobile`} label="yes" />
              <Arrow from={{ x: 98, y: 190 }} to={{ x: 136, y: 244 }} markerId={`${arrowId}-mobile`} label="no" />
              <Arrow
                from={{ x: 136, y: 286 }}
                to={{ x: 87, y: 342 }}
                markerId={`${arrowId}-mobile`}
                label="otherwise"
                labelSize={10}
              />
              <Arrow
                from={{ x: 178, y: 286 }}
                to={{ x: 239, y: 342 }}
                markerId={`${arrowId}-mobile`}
                label="accepts"
                labelSize={10}
              />
            </Frame>

            <Lines
              x={155}
              y={452}
              lines={["if M accepts w: L(M') = Sigma^*", "otherwise:", "L(M') = B = {0^n1^n | n >= 0}"]}
              fill={COLOR.caption}
              lineH={15}
            />
          </DiagramSvg>
        }
      />
    </DiagramFigure>
  );
}
