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
