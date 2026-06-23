import type { ReactNode } from "react";
import {
  Arrow,
  ArrowHead,
  Box,
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

export function TransactionLogSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("tx-log", { title, caption });
  const records = [
    { label: "T_1: W(A)", state: "highlight" as BoxState },
    { label: "T_2: W(C)", state: "normal" as BoxState },
    { label: "T_1: W(B)", state: "highlight" as BoxState },
    { label: "T_2: W(D)", state: "normal" as BoxState },
    { label: "T_1: COMMIT", state: "highlight" as BoxState },
    { label: "T_2: COMMIT", state: "normal" as BoxState },
  ];
  const x0 = 26;
  const y = 88;
  const w = 96;
  const h = 36;
  const gap = 9;
  const xs = records.map((_, i) => x0 + i * (w + gap));

  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "A log is append-only; prev-pointers link each transaction's records."}
      className={className}
    >
      <DiagramSvg w={660} h={312} label={caption ?? "Transaction log organization"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Label x={330} y={26} text="Append-only log" size={FONT.title} weight={700} />
        <Label
          x={330}
          y={45}
          text="prev-pointers chain records from the same transaction"
          size={FONT.note}
          fill={COLOR.caption}
        />

        {records.map((record, i) => (
          <g key={record.label}>
            <Box
              x={xs[i]}
              y={y}
              w={w}
              h={h}
              label={record.label}
              state={record.state}
              tint={record.state !== "highlight"}
              fontSize={FONT.note}
              fontWeight={700}
            />
            <Label
              x={xs[i] + w / 2}
              y={y + h + 18}
              text={`#${i}`}
              size={FONT.note}
              fill={COLOR.caption}
            />
          </g>
        ))}

        <Arrow
          from={{ x: xs[2] + w / 2, y: y }}
          to={{ x: xs[0] + w / 2, y: y }}
          markerId={arrowId}
          bend={36}
        />
        <Arrow
          from={{ x: xs[4] + w / 2, y: y }}
          to={{ x: xs[2] + w / 2, y: y }}
          markerId={arrowId}
          bend={36}
        />
        <Arrow
          from={{ x: xs[3] + w / 2, y: y + 4 }}
          to={{ x: xs[1] + w / 2, y: y + 4 }}
          markerId={arrowId}
          bend={54}
          dashed
        />
        <Arrow
          from={{ x: xs[5] + w / 2, y: y + 4 }}
          to={{ x: xs[3] + w / 2, y: y + 4 }}
          markerId={arrowId}
          bend={54}
          dashed
        />
        <Label x={330} y={174} text="One update log record" size={FONT.title} weight={700} />
        <CellStrip
          x={52}
          y={200}
          cellH={30}
          widths={[58, 78, 70, 70, 156, 156]}
          cells={[
            { label: "TxID", state: "highlight" },
            { label: "Page ID", state: "highlight" },
            { label: "Offset", state: "highlight" },
            { label: "Length", state: "highlight" },
            { label: "Before-image", state: "highlight" },
            { label: "After-image", state: "highlight" },
          ]}
          fontSize={FONT.note}
        />
        <CellStrip
          x={52}
          y={230}
          cellH={30}
          widths={[58, 78, 70, 70, 156, 156]}
          cells={["T_1", "P42", "128", "8", "$10", "$12"]}
          fontSize={FONT.note}
        />
        <Label
          x={330}
          y={284}
          text="before-image enables UNDO; after-image enables REDO"
          size={FONT.note}
          fill={COLOR.caption}
        />
      </DiagramSvg>
    </DiagramFigure>
  );
}

export function WalRulesSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("wal-rules", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Write-ahead logging requires log-before-page and log-before-commit."}
      className={className}
    >
      <DiagramSvg w={660} h={286} label={caption ?? "Write-ahead logging rules"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Frame x={14} y={22} w={308} h={242} title="Rule 1: log before page">
          <Label x={44} y={64} text="memory" anchor="start" size={FONT.note} fill={COLOR.caption} />
          <Box x={42} y={78} w={98} h={42} label={["Page P42", "dirty"].join(" ")} tint />
          <Box x={190} y={78} w={100} h={42} label="log record" />

          <Label x={44} y={158} text="disk" anchor="start" size={FONT.note} fill={COLOR.caption} />
          <Box x={42} y={176} w={98} h={42} label={["Page P42", "stale"].join(" ")} />
          <Box x={190} y={176} w={100} h={42} label="log record" state="highlight" />

          <Arrow
            from={{ x: 240, y: 120 }}
            to={{ x: 240, y: 176 }}
            markerId={arrowId}
            label="1"
            labelOffset={16}
          />
          <Arrow
            from={{ x: 91, y: 120 }}
            to={{ x: 91, y: 176 }}
            markerId={arrowId}
            dashed
            label="2"
            labelOffset={16}
          />
          <Label
            x={168}
            y={244}
            text="a dirty page may reach disk only after its log record"
            size={FONT.note}
            fill={COLOR.caption}
          />
        </Frame>

        <Frame x={338} y={22} w={308} h={242} title="Rule 2: commit boundary">
          <Label x={366} y={66} text="log buffer" anchor="start" size={FONT.note} fill={COLOR.caption} />
          <CellStrip
            x={366}
            y={82}
            cellH={34}
            widths={[58, 58, 58, 82]}
            cells={[
              { label: "W(A)", tint: true },
              { label: "W(B)", tint: true },
              { label: "W(C)", tint: true },
              { label: "COMMIT", state: "highlight" },
            ]}
            fontSize={FONT.note}
          />
          <Arrow
            from={{ x: 495, y: 122 }}
            to={{ x: 495, y: 170 }}
            markerId={arrowId}
            label="forced flush"
            labelOffset={48}
          />
          <Box x={386} y={170} w={218} h={38} label="all log records persisted" />
          <Arrow from={{ x: 495, y: 208 }} to={{ x: 495, y: 238 }} markerId={arrowId} />
          <Box x={416} y={238} w={158} h={24} label="return success" state="highlight" fontSize={FONT.note} />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}

type ScheduleStep = {
  tx: 1 | 2;
  y: number;
  text: string;
  state?: BoxState;
};

function SchedulePanel({
  x,
  y,
  title,
  result,
  resultState,
  steps,
}: {
  x: number;
  y: number;
  title: string;
  result: string;
  resultState?: BoxState;
  steps: ScheduleStep[];
}) {
  const w = 200;
  const h = 232;
  const colW = (w - 24) / 2;
  const leftX = x + 12;
  const rightX = leftX + colW;
  return (
    <g>
      <Frame x={x} y={y} w={w} h={h} title={title}>
        <Label x={leftX + colW / 2} y={y + 48} text="T_1" weight={700} />
        <Label x={rightX + colW / 2} y={y + 48} text="T_2" weight={700} />
        <line
          x1={r2(rightX)}
          y1={r2(y + 60)}
          x2={r2(rightX)}
          y2={r2(y + h - 48)}
          stroke={COLOR.border}
          strokeWidth={STROKE.divider}
        />
        {steps.map((step, i) => {
          const sx = step.tx === 1 ? leftX : rightX;
          return (
            <Box
              key={`${step.text}-${i}`}
              x={sx + 7}
              y={y + step.y}
              w={colW - 14}
              h={22}
              label={step.text}
              state={step.state}
              tint={step.state !== "highlight"}
              fontSize={10.4}
              fontWeight={step.text === "COMMIT" ? 700 : 400}
            />
          );
        })}
        <Box
          x={x + 28}
          y={y + h - 36}
          w={w - 56}
          h={24}
          label={result}
          state={resultState}
          fontSize={FONT.note}
          fontWeight={700}
        />
      </Frame>
    </g>
  );
}

export function ScheduleEquivalenceSchema({
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
      caption={caption ?? "A valid interleaving has the same effect as some serial schedule."}
      className={className}
    >
      <DiagramSvg w={660} h={288} label={caption ?? "Serial and interleaved transaction schedules"}>
        <SchedulePanel
          x={14}
          y={24}
          title="Serial"
          result="A=954, B=1166"
          steps={[
            { tx: 1, y: 66, text: "A=A-100" },
            { tx: 1, y: 94, text: "B=B+100" },
            { tx: 1, y: 122, text: "COMMIT" },
            { tx: 2, y: 150, text: "A=A*1.06" },
            { tx: 2, y: 178, text: "B=B*1.06" },
          ]}
        />
        <SchedulePanel
          x={230}
          y={24}
          title="Equivalent interleaving"
          result="A=954, B=1166"
          steps={[
            { tx: 1, y: 66, text: "A=A-100" },
            { tx: 2, y: 92, text: "A=A*1.06" },
            { tx: 1, y: 118, text: "B=B+100" },
            { tx: 1, y: 144, text: "COMMIT" },
            { tx: 2, y: 170, text: "B=B*1.06" },
          ]}
        />
        <SchedulePanel
          x={446}
          y={24}
          title="Bad interleaving"
          result="A=954, B=1160"
          resultState="highlight"
          steps={[
            { tx: 1, y: 66, text: "A=A-100" },
            { tx: 2, y: 92, text: "A=A*1.06" },
            { tx: 2, y: 118, text: "B=B*1.06" },
            { tx: 2, y: 144, text: "COMMIT" },
            { tx: 1, y: 170, text: "B=B+100" },
          ]}
        />
      </DiagramSvg>
    </DiagramFigure>
  );
}

export function RecoveryPhasesSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("recovery-phases", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Crash recovery scans, replays committed work, and undoes in-flight work."}
      className={className}
    >
      <DiagramSvg w={660} h={226} label={caption ?? "Recovery phases"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Frame x={18} y={24} w={186} h={142} title="1. Analysis">
          <Lines
            x={42}
            y={68}
            anchor="start"
            lines={["scan log forward", "find committed txns", "find in-flight txns"]}
            fill={COLOR.caption}
          />
        </Frame>
        <Frame x={237} y={24} w={186} h={142} title="2. Redo">
          <Lines
            x={261}
            y={68}
            anchor="start"
            lines={["replay committed", "restore after-images", "make effects durable"]}
            fill={COLOR.caption}
          />
        </Frame>
        <Frame x={456} y={24} w={186} h={142} title="3. Undo">
          <Lines
            x={480}
            y={68}
            anchor="start"
            lines={["walk log backward", "restore before-images", "remove in-flight effects"]}
            fill={COLOR.caption}
          />
        </Frame>

        <Arrow from={{ x: 204, y: 95 }} to={{ x: 237, y: 95 }} markerId={arrowId} />
        <Arrow from={{ x: 423, y: 95 }} to={{ x: 456, y: 95 }} markerId={arrowId} />
        <Box
          x={88}
          y={184}
          w={484}
          h={26}
          label="Recovery may crash too, so each phase must be safe to repeat."
          tint
          fontSize={FONT.note}
        />
      </DiagramSvg>
    </DiagramFigure>
  );
}
