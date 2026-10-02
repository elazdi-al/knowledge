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
