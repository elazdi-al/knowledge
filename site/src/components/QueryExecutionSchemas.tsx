import type { ReactNode } from "react";
import {
  Arrow,
  ArrowHead,
  Box,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  DotsEllipsis,
  FONT,
  Label,
  RADIUS,
  STROKE,
  r2,
  stableId,
  type BoxState,
} from "@/components/diagram";

type Anchor = "start" | "middle" | "end";
type Weight = 400 | 600 | 700;

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
        <Label
          x={x + 14}
          y={y + 22}
          text={title}
          size={FONT.label}
          weight={700}
          anchor="start"
        />
      )}
      {children}
    </g>
  );
}

function Cylinder({
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
  label: string[];
}) {
  const eh = 22;
  return (
    <g>
      <path
        d={`M${r2(x)},${r2(y + eh / 2)} L${r2(x)},${r2(y + h - eh / 2)} A${r2(
          w / 2,
        )},${r2(eh / 2)} 0 0 0 ${r2(x + w)},${r2(y + h - eh / 2)} L${r2(
          x + w,
        )},${r2(y + eh / 2)} A${r2(w / 2)},${r2(eh / 2)} 0 0 1 ${r2(x)},${r2(
          y + eh / 2,
        )} Z`}
        fill={COLOR.node}
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      <ellipse
        cx={r2(x + w / 2)}
        cy={r2(y + eh / 2)}
        rx={r2(w / 2)}
        ry={r2(eh / 2)}
        fill={COLOR.bg}
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      <ellipse
        cx={r2(x + w / 2)}
        cy={r2(y + h - eh / 2)}
        rx={r2(w / 2)}
        ry={r2(eh / 2)}
        fill="none"
        stroke={COLOR.fg}
        strokeWidth={STROKE.frame}
      />
      <Lines
        x={x + w / 2}
        y={y + h / 2 - ((label.length - 1) * 15) / 2}
        lines={label}
        size={FONT.label}
        weight={600}
        halo
      />
    </g>
  );
}

export function QueryProcessingFlow({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("query-flow", { title, caption });
  const cx = 330;
  const bw = 300;
  const bh = 36;
  const boxes = [
    { label: "Parse and rewrite query", y: 54, state: "normal" as BoxState },
    { label: "Select logical plan", y: 112, state: "normal" as BoxState },
    { label: "Select physical plan", y: 170, state: "normal" as BoxState },
    { label: "Query execution", y: 228, state: "highlight" as BoxState },
  ];
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Query compilation pipeline."}
      className={className}
    >
      <DiagramSvg w={560} h={345} label={caption ?? "Steps in query processing"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        <Label x={cx} y={24} text="SQL query" size={FONT.title} weight={700} />
        {boxes.map((b, i) => (
          <g key={b.label}>
            <Box
              x={cx - bw / 2}
              y={b.y}
              w={bw}
              h={bh}
              label={b.label}
              tint
              state={b.state}
              fontWeight={i === boxes.length - 1 ? 700 : 600}
            />
            <Arrow
              from={{ x: cx, y: i === 0 ? 32 : boxes[i - 1].y + bh }}
              to={{ x: cx, y: b.y }}
              markerId={arrowId}
            />
          </g>
        ))}
        <Arrow
          from={{ x: cx, y: boxes[boxes.length - 1].y + bh }}
          to={{ x: cx, y: 286 }}
          markerId={arrowId}
        />
        <Cylinder x={cx - 82} y={286} w={164} h={44} label={["Disk pages"]} />
      </DiagramSvg>
    </DiagramFigure>
  );
}

export function OptimizerArchitectureSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("optimizer-architecture", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Cost-based optimizer architecture."}
      className={className}
    >
      <DiagramSvg w={660} h={332} label={caption ?? "Cost-based optimizer architecture"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Box x={24} y={32} w={128} h={38} label="SQL query" tint fontWeight={700} />
        <Box x={218} y={32} w={128} h={38} label="Parser" />
        <Box x={412} y={32} w={128} h={38} label="Rewrite" state="new" />

        <Arrow from={{ x: 152, y: 51 }} to={{ x: 218, y: 51 }} markerId={arrowId} />
        <Arrow from={{ x: 346, y: 51 }} to={{ x: 412, y: 51 }} markerId={arrowId} />

        <Frame x={126} y={114} w={384} h={140} title="Cost-based optimizer">
          <Box x={166} y={170} w={136} h={38} label="Plan generator" tint fontWeight={700} />
          <Box x={334} y={170} w={136} h={38} label="Cost estimator" tint fontWeight={700} />
          <Arrow
            from={{ x: 302, y: 178 }}
            to={{ x: 334, y: 178 }}
            markerId={arrowId}
            label="plans"
            labelOffset={15}
          />
          <Arrow
            from={{ x: 334, y: 201 }}
            to={{ x: 302, y: 201 }}
            markerId={arrowId}
            label="costs"
            labelOffset={15}
          />
        </Frame>

        <Arrow from={{ x: 476, y: 70 }} to={{ x: 400, y: 114 }} markerId={arrowId} />

        <Frame x={540} y={114} w={96} h={140} title="Catalog">
          <Cylinder x={554} y={154} w={68} h={38} label={["Schema"]} />
          <Cylinder x={554} y={202} w={68} h={38} label={["Stats"]} />
        </Frame>
        <Arrow
          from={{ x: 540, y: 184 }}
          to={{ x: 470, y: 184 }}
          markerId={arrowId}
          label="metadata"
          labelOffset={14}
        />

        <Box x={252} y={284} w={136} h={36} label="Physical plan" state="highlight" fontWeight={700} />
        <Arrow from={{ x: 318, y: 254 }} to={{ x: 318, y: 284 }} markerId={arrowId} />
      </DiagramSvg>
    </DiagramFigure>
  );
}

export function HashProjectionSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("hash-proj", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Hash projection partitions by h_1."}
      className={className}
    >
      <DiagramSvg w={660} h={264} label={caption ?? "Hash-based projection partitioning"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        <Cylinder x={24} y={82} w={104} h={148} label={["Original", "relation"]} />
        <Frame x={166} y={42} w={318} h={206} title="B main-memory buffers">
          <Label x={205} y={132} text="Input" weight={700} anchor="start" />
          <Box x={206} y={148} w={70} h={26} />
          <Label x={332} y={145} text="h_1" size={FONT.node} weight={700} />
          <Label x={332} y={166} text="hash" size={FONT.note} />
          <Label x={424} y={78} text="Output" weight={700} />
          <Box x={390} y={94} w={68} h={24} label="1" />
          <Box x={390} y={138} w={68} h={24} label="2" />
          <DotsEllipsis x={424} y={181} orient="v" />
          <Box x={390} y={204} w={68} h={24} label="B-1" />
          <Arrow from={{ x: 276, y: 161 }} to={{ x: 310, y: 154 }} markerId={arrowId} />
          <Arrow from={{ x: 348, y: 146 }} to={{ x: 390, y: 106 }} markerId={arrowId} />
          <Arrow from={{ x: 348, y: 154 }} to={{ x: 390, y: 150 }} markerId={arrowId} />
          <Arrow from={{ x: 348, y: 162 }} to={{ x: 390, y: 216 }} markerId={arrowId} />
        </Frame>
        <Label x={588} y={58} text="Partitions" weight={700} />
        <Cylinder x={536} y={78} w={104} h={158} label={[]} />
        <Box x={558} y={110} w={58} h={22} label="1" />
        <Box x={558} y={154} w={58} h={22} label="2" />
        <DotsEllipsis x={587} y={180} orient="v" />
        <Box x={558} y={190} w={58} h={22} label="B-1" />
        <Arrow from={{ x: 128, y: 156 }} to={{ x: 206, y: 161 }} markerId={arrowId} />
        <Arrow from={{ x: 458, y: 106 }} to={{ x: 558, y: 121 }} markerId={arrowId} />
        <Arrow from={{ x: 458, y: 150 }} to={{ x: 558, y: 165 }} markerId={arrowId} />
        <Arrow from={{ x: 458, y: 216 }} to={{ x: 558, y: 201 }} markerId={arrowId} />
      </DiagramSvg>
    </DiagramFigure>
  );
}

export function GraceProbeSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("grace-probe", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Grace hash join, probe phase."}
      className={className}
    >
      <DiagramSvg w={660} h={264} label={caption ?? "Grace hash join probe phase"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        <Label x={76} y={58} text="Partitions" weight={700} />
        <Cylinder x={24} y={78} w={104} h={170} label={[]} />
        <Box x={47} y={112} w={58} h={22} label="R_i" />
        <Box x={47} y={150} w={58} h={22} label="S_i" />
        <DotsEllipsis x={76} y={200} orient="v" />
        <Frame x={166} y={42} w={318} h={206} title="B main-memory buffers">
          <Box x={194} y={84} w={262} h={30} label="hash table on R_i  (h_2)" tint />
          <Label
            x={325}
            y={128}
            text="at most B-2 pages"
            size={FONT.note}
            fill={COLOR.caption}
          />
          <Box x={194} y={176} w={104} h={26} label="S_i input" />
          <Box x={352} y={176} w={104} h={26} label="output" />
          <Arrow
            from={{ x: 246, y: 176 }}
            to={{ x: 246, y: 114 }}
            markerId={arrowId}
            label="probe"
          />
          <Arrow
            from={{ x: 404, y: 114 }}
            to={{ x: 404, y: 176 }}
            markerId={arrowId}
            label="match"
          />
        </Frame>
        <Arrow from={{ x: 105, y: 123 }} to={{ x: 194, y: 99 }} markerId={arrowId} label="load" />
        <Arrow from={{ x: 105, y: 161 }} to={{ x: 194, y: 186 }} markerId={arrowId} label="stream" />
        <Arrow from={{ x: 456, y: 189 }} to={{ x: 536, y: 168 }} markerId={arrowId} />
        <Label x={588} y={58} text="Join result" weight={700} />
        <Cylinder x={536} y={78} w={104} h={170} label={["⟨r, s⟩", "pairs"]} />
      </DiagramSvg>
    </DiagramFigure>
  );
}

const HISTOGRAM_VALUES = [2, 3, 3, 1, 2, 1, 3, 8, 4, 2, 0, 1, 2, 4, 8];

function BarChart({
  x,
  y,
  w,
  h,
  title,
  values,
  max = 10,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  values: number[];
  max?: number;
}) {
  const axisY = y + h;
  const gap = 2.5;
  const barW = (w - gap * (values.length - 1)) / values.length;
  return (
    <g>
      {title && (
        <Label x={x} y={y - 17} text={title} anchor="start" size={FONT.label} weight={700} />
      )}
      {[0, 5, 10].map((tick) => {
        const ty = y + h - (tick / max) * h;
        return (
          <g key={tick}>
            <line
              x1={r2(x)}
              y1={r2(ty)}
              x2={r2(x + w)}
              y2={r2(ty)}
              stroke={COLOR.border}
              strokeWidth={STROKE.divider}
            />
            {(tick === 0 || tick === 10) && (
              <Label x={x - 9} y={ty} text={String(tick)} size={FONT.note} fill={COLOR.caption} />
            )}
          </g>
        );
      })}
      <line
        x1={r2(x)}
        y1={r2(y)}
        x2={r2(x)}
        y2={r2(axisY)}
        stroke={COLOR.muted}
        strokeWidth={STROKE.frame}
      />
      <line
        x1={r2(x)}
        y1={r2(axisY)}
        x2={r2(x + w)}
        y2={r2(axisY)}
        stroke={COLOR.muted}
        strokeWidth={STROKE.frame}
      />
      {values.map((v, i) => {
        const bh = (v / max) * h;
        const bx = x + i * (barW + gap);
        return (
          <rect
            key={i}
            x={r2(bx)}
            y={r2(axisY - bh)}
            width={r2(barW)}
            height={r2(bh)}
            rx={1.5}
            fill={COLOR.node}
            stroke={COLOR.muted}
            strokeWidth={STROKE.divider}
          />
        );
      })}
      {[0, 7, 14].map((tick) => {
        const tx = x + tick * (barW + gap) + barW / 2;
        return (
          <Label
            key={tick}
            x={tx}
            y={axisY + 16}
            text={String(tick)}
            size={FONT.note}
            fill={COLOR.caption}
          />
        );
      })}
    </g>
  );
}

function BucketSpan({
  x,
  y,
  w,
  from,
  to,
  totalValues = 15,
  label,
}: {
  x: number;
  y: number;
  w: number;
  from: number;
  to: number;
  totalValues?: number;
  label: string;
}) {
  const step = w / totalValues;
  const x1 = x + from * step + 1;
  const x2 = x + (to + 1) * step - 1;
  const mid = (x1 + x2) / 2;
  return (
    <g>
      <path
        d={`M${r2(x1)},${r2(y)} L${r2(x2)},${r2(y)}`}
        stroke={COLOR.muted}
        strokeWidth={STROKE.divider}
      />
      <line
        x1={r2(x1)}
        y1={r2(y - 4)}
        x2={r2(x1)}
        y2={r2(y + 4)}
        stroke={COLOR.muted}
        strokeWidth={STROKE.divider}
      />
      <line
        x1={r2(x2)}
        y1={r2(y - 4)}
        x2={r2(x2)}
        y2={r2(y + 4)}
        stroke={COLOR.muted}
        strokeWidth={STROKE.divider}
      />
      <Label x={mid} y={y + 15} text={label} size={FONT.note} fill={COLOR.caption} />
    </g>
  );
}

export function HistogramBucketSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const widthBuckets = [
    { from: 0, to: 2, label: "B1" },
    { from: 3, to: 5, label: "B2" },
    { from: 6, to: 8, label: "B3" },
    { from: 9, to: 11, label: "B4" },
    { from: 12, to: 14, label: "B5" },
  ];
  const depthBuckets = [
    { from: 0, to: 3, label: "B1" },
    { from: 4, to: 7, label: "B2" },
    { from: 8, to: 9, label: "B3" },
    { from: 10, to: 13, label: "B4" },
    { from: 14, to: 14, label: "B5" },
  ];
  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg w={660} h={224} label={caption ?? "Equi-width and equi-depth histograms"}>
        <Label x={54} y={30} text="Equi-width" anchor="start" size={FONT.label} weight={700} />
        <Label x={54} y={49} text="equal value ranges" anchor="start" size={FONT.note} fill={COLOR.caption} />
        <BarChart x={54} y={78} w={240} h={76} values={HISTOGRAM_VALUES} />
        {widthBuckets.map((b, i) => (
          <BucketSpan key={i} x={54} y={186} w={240} from={b.from} to={b.to} label={b.label} />
        ))}

        <Label x={374} y={30} text="Equi-depth" anchor="start" size={FONT.label} weight={700} />
        <Label x={374} y={49} text="similar tuple counts" anchor="start" size={FONT.note} fill={COLOR.caption} />
        <BarChart x={374} y={78} w={240} h={76} values={HISTOGRAM_VALUES} />
        {depthBuckets.map((b, i) => (
          <BucketSpan key={i} x={374} y={186} w={240} from={b.from} to={b.to} label={b.label} />
        ))}
      </DiagramSvg>
    </DiagramFigure>
  );
}

function JoinMiniNode({
  x,
  y,
  state,
}: {
  x: number;
  y: number;
  state?: BoxState;
}) {
  return (
    <Box
      x={x - 22}
      y={y - 12}
      w={44}
      h={24}
      label="join"
      tint
      state={state}
      fontSize={FONT.note}
      fontWeight={600}
    />
  );
}

function RelationMiniNode({
  x,
  y,
  label,
}: {
  x: number;
  y: number;
  label: string;
}) {
  return <Box x={x - 16} y={y - 12} w={32} h={24} label={label} fontWeight={700} />;
}

function TreeEdge({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  return (
    <line
      x1={r2(from.x)}
      y1={r2(from.y)}
      x2={r2(to.x)}
      y2={r2(to.y)}
      stroke={COLOR.muted}
      strokeWidth={STROKE.line}
    />
  );
}

function LeftDeepMiniTree({ x }: { x: number }) {
  const j1 = { x: x + 62, y: 132 };
  const j2 = { x: x + 104, y: 96 };
  const j3 = { x: x + 146, y: 60 };
  const a = { x: x + 34, y: 168 };
  const b = { x: x + 90, y: 168 };
  const c = { x: x + 136, y: 168 };
  const d = { x: x + 178, y: 168 };
  return (
    <g>
      <TreeEdge from={j3} to={j2} />
      <TreeEdge from={j3} to={d} />
      <TreeEdge from={j2} to={j1} />
      <TreeEdge from={j2} to={c} />
      <TreeEdge from={j1} to={a} />
      <TreeEdge from={j1} to={b} />
      <JoinMiniNode {...j3} state="highlight" />
      <JoinMiniNode {...j2} />
      <JoinMiniNode {...j1} />
      <RelationMiniNode {...a} label="A" />
      <RelationMiniNode {...b} label="B" />
      <RelationMiniNode {...c} label="C" />
      <RelationMiniNode {...d} label="D" />
    </g>
  );
}

function RightDeepMiniTree({ x }: { x: number }) {
  const j1 = { x: x + 138, y: 132 };
  const j2 = { x: x + 98, y: 96 };
  const j3 = { x: x + 58, y: 60 };
  const a = { x: x + 24, y: 168 };
  const b = { x: x + 70, y: 168 };
  const c = { x: x + 126, y: 168 };
  const d = { x: x + 178, y: 168 };
  return (
    <g>
      <TreeEdge from={j3} to={a} />
      <TreeEdge from={j3} to={j2} />
      <TreeEdge from={j2} to={b} />
      <TreeEdge from={j2} to={j1} />
      <TreeEdge from={j1} to={c} />
      <TreeEdge from={j1} to={d} />
      <JoinMiniNode {...j3} state="new" />
      <JoinMiniNode {...j2} state="new" />
      <JoinMiniNode {...j1} state="new" />
      <RelationMiniNode {...a} label="A" />
      <RelationMiniNode {...b} label="B" />
      <RelationMiniNode {...c} label="C" />
      <RelationMiniNode {...d} label="D" />
    </g>
  );
}

function BushyMiniTree({ x }: { x: number }) {
  const j1 = { x: x + 62, y: 132 };
  const j2 = { x: x + 146, y: 132 };
  const j3 = { x: x + 104, y: 70 };
  const a = { x: x + 34, y: 168 };
  const b = { x: x + 90, y: 168 };
  const c = { x: x + 118, y: 168 };
  const d = { x: x + 174, y: 168 };
  return (
    <g>
      <TreeEdge from={j3} to={j1} />
      <TreeEdge from={j3} to={j2} />
      <TreeEdge from={j1} to={a} />
      <TreeEdge from={j1} to={b} />
      <TreeEdge from={j2} to={c} />
      <TreeEdge from={j2} to={d} />
      <JoinMiniNode {...j3} state="new" />
      <JoinMiniNode {...j1} state="new" />
      <JoinMiniNode {...j2} state="new" />
      <RelationMiniNode {...a} label="A" />
      <RelationMiniNode {...b} label="B" />
      <RelationMiniNode {...c} label="C" />
      <RelationMiniNode {...d} label="D" />
    </g>
  );
}

export function LeftDeepPlanSchema({
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
      caption={caption ?? "System R keeps left-deep join trees and prunes right-deep and bushy trees."}
      className={className}
    >
      <DiagramSvg w={660} h={246} label={caption ?? "Left-deep join tree restriction"}>
        <Frame x={14} y={18} w={202} h={208} title="Left-deep">
          <LeftDeepMiniTree x={14} />
          <Label x={115} y={210} text="kept" size={FONT.note} weight={700} />
        </Frame>
        <Frame x={229} y={18} w={202} h={208} title="Right-deep">
          <RightDeepMiniTree x={229} />
          <Label x={330} y={210} text="pruned" size={FONT.note} fill={COLOR.caption} />
        </Frame>
        <Frame x={444} y={18} w={202} h={208} title="Bushy">
          <BushyMiniTree x={444} />
          <Label x={545} y={210} text="pruned" size={FONT.note} fill={COLOR.caption} />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}

function PlanNode({
  x,
  y,
  w,
  label,
  sub,
  state,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  sub?: string;
  state?: BoxState;
}) {
  return (
    <g>
      <Box x={x} y={y} w={w} h={38} label={label} tint state={state} fontWeight={700} />
      {sub && <Label x={x + w / 2} y={y + 53} text={sub} size={FONT.note} fill={COLOR.caption} />}
    </g>
  );
}

export function ExecutionModelSchema({
  mode,
  title,
  caption,
  className,
}: {
  mode: "iterator" | "materialized";
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("exec-model", { mode, title, caption });
  const cap =
    mode === "iterator"
      ? "Iterator model: one tuple at a time."
      : "Materialization model: full outputs.";
  const project = { x: 252, y: 24, w: 116 };
  const join = { x: 248, y: 102, w: 124 };
  const r = { x: 116, y: 180, w: 82 };
  const select = { x: 402, y: 180, w: 126 };
  const s = { x: 424, y: 258, w: 82 };
  return (
    <DiagramFigure title={title} caption={caption ?? cap} className={className}>
      <DiagramSvg w={620} h={318} label={caption ?? cap}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        <PlanNode x={project.x} y={project.y} w={project.w} label="Project" sub="R.id, S.cdate" />
        <PlanNode x={join.x} y={join.y} w={join.w} label="Hash join" sub="R.id = S.id" />
        <PlanNode x={r.x} y={r.y} w={r.w} label="Scan R" />
        <PlanNode x={select.x} y={select.y} w={select.w} label="Select S" sub="value > 100" />
        <PlanNode x={s.x} y={s.y} w={s.w} label="Scan S" />

        {[
          [{ x: r.x + r.w / 2, y: r.y }, { x: join.x + 22, y: join.y + 38 }],
          [{ x: select.x + select.w / 2, y: select.y }, { x: join.x + join.w - 22, y: join.y + 38 }],
          [{ x: s.x + s.w / 2, y: s.y }, { x: select.x + select.w / 2, y: select.y + 38 }],
          [{ x: join.x + join.w / 2, y: join.y }, { x: project.x + project.w / 2, y: project.y + 38 }],
        ].map(([from, to], i) => (
          <Arrow
            key={`edge-${i}`}
            from={from as { x: number; y: number }}
            to={to as { x: number; y: number }}
            markerId={arrowId}
          />
        ))}

        <Arrow
          from={{ x: 72, y: 43 }}
          to={{ x: project.x, y: 43 }}
          markerId={arrowId}
          dashed
          label={mode === "iterator" ? "Next()" : "Output()"}
        />
        <Label x={34} y={43} text="client" anchor="start" fill={COLOR.caption} />
      </DiagramSvg>
    </DiagramFigure>
  );
}
