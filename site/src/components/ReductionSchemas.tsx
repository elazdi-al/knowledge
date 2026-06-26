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
}: {
  x: number;
  y: number;
  lines: string[];
  size?: number;
  weight?: Weight;
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
          <DiagramSvg w={660} h={230} label={caption ?? "Reduction pipeline"}>
            <defs>
              <ArrowHead id={arrowId} />
            </defs>

            <Frame x={20} y={30} w={620} h={136} title={result}>
              <Box x={52} y={86} w={98} h={40} label="w" state="highlight" fontWeight={700} />
              <Box x={216} y={86} w={84} h={40} label="f" tint fontWeight={700} />
              <Box x={360} y={86} w={112} h={40} label="f(w)" state="highlight" fontWeight={700} />
              <Box x={540} y={86} w={74} h={40} label={solver} fontWeight={700} />

              <Arrow from={{ x: 150, y: 106 }} to={{ x: 216, y: 106 }} markerId={arrowId} />
              <Arrow from={{ x: 300, y: 106 }} to={{ x: 360, y: 106 }} markerId={arrowId} />
              <Arrow from={{ x: 472, y: 106 }} to={{ x: 540, y: 106 }} markerId={arrowId} />

              <Lines x={258} y={150} lines={["computable", "total"]} fill={COLOR.caption} />
              <Lines x={577} y={150} lines={[solverNote]} fill={COLOR.caption} />
            </Frame>

            <Label
              x={330}
              y={200}
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
