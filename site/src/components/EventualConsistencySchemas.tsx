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

type ScheduleStep = {
  tx: 1 | 2;
  y: number;
  text: string;
  state?: BoxState;
};

function TwoColumnSchedule({
  x,
  y,
  w,
  h,
  steps,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  steps: ScheduleStep[];
}) {
  const colW = w / 2;
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
      <line
        x1={r2(x + colW)}
        y1={r2(y)}
        x2={r2(x + colW)}
        y2={r2(y + h)}
        stroke={COLOR.border}
        strokeWidth={STROKE.divider}
      />
      <Label x={x + colW / 2} y={y + 16} text="T_1" size={FONT.note} weight={700} />
      <Label x={x + colW + colW / 2} y={y + 16} text="T_2" size={FONT.note} weight={700} />
      <line
        x1={r2(x)}
        y1={r2(y + 30)}
        x2={r2(x + w)}
        y2={r2(y + 30)}
        stroke={COLOR.border}
        strokeWidth={STROKE.divider}
      />
      {steps.map((step, i) => {
        const sx = x + (step.tx === 1 ? 7 : colW + 7);
        return (
          <Box
            key={`${step.text}-${i}`}
            x={sx}
            y={y + step.y}
            w={colW - 14}
            h={24}
            label={step.text}
            state={step.state}
            tint={step.state !== "highlight"}
            fontSize={10.1}
            fontWeight={step.text === "COMMIT" ? 700 : 400}
          />
        );
      })}
    </g>
  );
}

export function PhantomReadSchema({
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
      caption={
        caption ??
        "Tuple locks protect existing rows; range or predicate locks protect the set a scan depends on."
      }
      className={className}
    >
      <DiagramSvg w={660} h={296} label={caption ?? "Phantom reads and range protection"}>
        <Frame x={12} y={14} w={312} h={258} title="Tuple locks only">
          <TwoColumnSchedule
            x={30}
            y={54}
            w={174}
            h={180}
            steps={[
              { tx: 1, y: 43, text: "count age=30" },
              { tx: 1, y: 73, text: "result 5" },
              { tx: 2, y: 101, text: "insert age=30", state: "new" },
              { tx: 2, y: 131, text: "COMMIT" },
              { tx: 1, y: 154, text: "result 6", state: "highlight" },
            ]}
          />
          <Box x={226} y={76} w={76} h={28} label="row 30" tint fontSize={FONT.note} />
          <Box x={226} y={116} w={76} h={28} label="row 30" tint fontSize={FONT.note} />
          <Box x={226} y={156} w={76} h={28} label="new 30" state="new" fontSize={FONT.note} />
          <Lines
            x={168}
            y={253}
            lines={["The second SELECT sees a row", "that T_1 never protected."]}
            fill={COLOR.caption}
          />
        </Frame>

        <Frame x={336} y={14} w={312} h={258} title="Range or predicate lock">
          <TwoColumnSchedule
            x={354}
            y={54}
            w={174}
            h={180}
            steps={[
              { tx: 1, y: 43, text: "lock age=30", state: "highlight" },
              { tx: 1, y: 73, text: "result 5" },
              { tx: 2, y: 101, text: "insert waits" },
              { tx: 1, y: 131, text: "result 5" },
              { tx: 1, y: 154, text: "COMMIT" },
            ]}
          />
          <Box x={550} y={76} w={76} h={28} label="row 30" state="highlight" fontSize={FONT.note} />
          <Box x={550} y={116} w={76} h={28} label="gap" state="highlight" fontSize={FONT.note} />
          <Box x={550} y={156} w={76} h={28} label="new 30" state="new" fontSize={FONT.note} />
          <Lines
            x={492}
            y={253}
            lines={["The insert conflicts with the", "protected predicate range."]}
            fill={COLOR.caption}
          />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}

function LeafRow({
  x,
  y,
  focusKey,
  focusGap,
  bracket,
}: {
  x: number;
  y: number;
  focusKey?: 10 | 12 | 14 | 16;
  focusGap?: "12-14" | "14-16";
  bracket?: { x1: number; x2: number; label: string };
}) {
  const keyXs = [0, 64, 128, 192];
  const keys = [10, 12, 14, 16] as const;
  return (
    <g>
      <rect
        x={r2(x - 10)}
        y={r2(y - 8)}
        width={r2(258)}
        height={r2(66)}
        rx={RADIUS.box}
        fill={COLOR.bg}
        stroke={COLOR.border}
        strokeWidth={STROKE.frame}
      />
      {focusGap && (
        <rect
          x={r2(x + (focusGap === "12-14" ? 104 : 168))}
          y={r2(y + 4)}
          width={r2(42)}
          height={r2(30)}
          rx={RADIUS.box}
          fill={COLOR.hiBg}
          opacity={0.14}
          stroke={COLOR.fg}
          strokeWidth={STROKE.bold}
        />
      )}
      {keys.map((key, i) => (
        <Box
          key={key}
          x={x + keyXs[i]}
          y={y + 6}
          w={38}
          h={26}
          label={String(key)}
          state={focusKey === key ? "highlight" : undefined}
          tint={focusKey !== key}
          fontSize={FONT.note}
          fontWeight={700}
        />
      ))}
      <Label x={x + 84} y={y + 45} text="gap" size={9.5} fill={COLOR.caption} />
      <Label x={x + 148} y={y + 45} text="gap" size={9.5} fill={COLOR.caption} />
      <Label x={x + 212} y={y + 45} text="gap" size={9.5} fill={COLOR.caption} />
      {bracket && (
        <Bracket
          x1={x + bracket.x1}
          x2={x + bracket.x2}
          y={y - 2}
          label={bracket.label}
          drop={8}
        />
      )}
    </g>
  );
}

export function KeyRangeLockingSchema({
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
      caption={
        caption ??
        "Key-range locking turns an index order into locks on both existing keys and the gaps where new matching keys could appear."
      }
      className={className}
    >
      <DiagramSvg w={660} h={326} label={caption ?? "Key, gap, and key-range locks"}>
        <Frame x={12} y={16} w={312} h={132} title="Key-value lock">
          <LeafRow x={44} y={68} focusKey={14} />
          <Label
            x={168}
            y={132}
            text="protects key 14, but not its neighboring gaps"
            size={FONT.note}
            fill={COLOR.caption}
          />
        </Frame>

        <Frame x={336} y={16} w={312} h={132} title="Gap lock">
          <LeafRow x={370} y={68} focusGap="14-16" bracket={{ x1: 168, x2: 230, label: "(14,16)" }} />
          <Label
            x={492}
            y={132}
            text="blocks inserts into the protected open interval"
            size={FONT.note}
            fill={COLOR.caption}
          />
        </Frame>

        <Frame x={12} y={176} w={312} h={132} title="Next-key lock">
          <LeafRow
            x={44}
            y={228}
            focusKey={14}
            focusGap="14-16"
            bracket={{ x1: 128, x2: 230, label: "[14,16)" }}
          />
          <Label
            x={168}
            y={292}
            text="locks key 14 plus the gap to the next key"
            size={FONT.note}
            fill={COLOR.caption}
          />
        </Frame>

        <Frame x={336} y={176} w={312} h={132} title="Prev-key lock">
          <LeafRow
            x={370}
            y={228}
            focusKey={14}
            focusGap="12-14"
            bracket={{ x1: 64, x2: 166, label: "(12,14]" }}
          />
          <Label
            x={492}
            y={292}
            text="locks the previous gap plus key 14"
            size={FONT.note}
            fill={COLOR.caption}
          />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}

function QuorumPanel({
  x,
  title,
  readCells,
  writeCells,
  verdict,
  verdictState,
}: {
  x: number;
  title: string;
  readCells: Array<string | { label: string; state?: BoxState; tint?: boolean }>;
  writeCells: Array<string | { label: string; state?: BoxState; tint?: boolean }>;
  verdict: string;
  verdictState?: BoxState;
}) {
  return (
    <Frame x={x} y={18} w={304} h={208} title={title}>
      <CellStrip
        x={x + 58}
        y={62}
        cellH={30}
        widths={[54, 54, 54, 54]}
        cells={["R1", "R2", "R3", "R4"]}
        tint
        fontSize={FONT.note}
      />
      <Label x={x + 34} y={113} text="W" size={FONT.note} weight={700} />
      <CellStrip
        x={x + 58}
        y={98}
        cellH={30}
        widths={[54, 54, 54, 54]}
        cells={writeCells}
        fontSize={FONT.note}
      />
      <Label x={x + 34} y={147} text="R" size={FONT.note} weight={700} />
      <CellStrip
        x={x + 58}
        y={132}
        cellH={30}
        widths={[54, 54, 54, 54]}
        cells={readCells}
        fontSize={FONT.note}
      />
      <Box
        x={x + 53}
        y={180}
        w={198}
        h={30}
        label={verdict}
        state={verdictState}
        tint={!verdictState}
        fontSize={FONT.note}
        fontWeight={700}
      />
    </Frame>
  );
}

export function QuorumOverlapSchema({
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
      caption={
        caption ??
        "When R + W > N, every read quorum intersects every completed write quorum."
      }
      className={className}
    >
      <DiagramSvg w={660} h={254} label={caption ?? "Read and write quorum overlap"}>
        <QuorumPanel
          x={16}
          title="N=4, W=2, R=1"
          writeCells={[
            { label: "ack", state: "highlight" },
            { label: "ack", state: "highlight" },
            "",
            "",
          ]}
          readCells={["", "", "", { label: "read", tint: true }]}
          verdict="no forced overlap"
          verdictState="highlight"
        />
        <QuorumPanel
          x={340}
          title="N=4, W=2, R=3"
          writeCells={[
            { label: "ack", state: "highlight" },
            { label: "ack", state: "highlight" },
            "",
            "",
          ]}
          readCells={["", { label: "both", state: "highlight" }, { label: "read", tint: true }, { label: "read", tint: true }]}
          verdict="overlap exists"
        />
        <Label x={330} y={242} text="R + W > N is the overlap test." size={FONT.note} fill={COLOR.caption} />
      </DiagramSvg>
    </DiagramFigure>
  );
}

function Replica({
  x,
  y,
  label,
  state,
}: {
  x: number;
  y: number;
  label: string;
  state?: BoxState;
}) {
  const fill = state === "highlight" ? COLOR.hiBg : state === "new" ? COLOR.bg : COLOR.node;
  const stroke = state === "highlight" ? COLOR.hiBg : COLOR.fg;
  const text = state === "highlight" ? COLOR.hiFg : COLOR.fg;
  return (
    <g>
      <ellipse
        cx={r2(x)}
        cy={r2(y)}
        rx={28}
        ry={8}
        fill={fill}
        stroke={stroke}
        strokeWidth={STROKE.frame}
        strokeDasharray={state === "new" ? STROKE.dash : undefined}
      />
      <rect
        x={r2(x - 28)}
        y={r2(y)}
        width={56}
        height={32}
        fill={fill}
        stroke={stroke}
        strokeWidth={STROKE.frame}
        strokeDasharray={state === "new" ? STROKE.dash : undefined}
      />
      <ellipse
        cx={r2(x)}
        cy={r2(y + 32)}
        rx={28}
        ry={8}
        fill={fill}
        stroke={stroke}
        strokeWidth={STROKE.frame}
        strokeDasharray={state === "new" ? STROKE.dash : undefined}
      />
      <Label x={x} y={y + 17} text={label} size={FONT.note} weight={700} fill={text} />
    </g>
  );
}

function ReplicaSet({
  x,
  y,
  labels,
}: {
  x: number;
  y: number;
  labels: Array<{ text: string; state?: BoxState }>;
}) {
  const pts = [
    { x: x + 26, y: y + 42 },
    { x: x + 76, y },
    { x: x + 126, y: y + 42 },
  ];
  return (
    <g>
      {pts.map((pt, i) => (
        <Replica key={i} x={pt.x} y={pt.y} label={labels[i].text} state={labels[i].state} />
      ))}
    </g>
  );
}

export function DynamoSiblingsSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("dynamo-siblings", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={
        caption ??
        "Dynamo-style systems preserve conflicting versions as siblings and ask the application to reconcile them."
      }
      className={className}
    >
      <DiagramSvg w={660} h={304} label={caption ?? "Dynamo siblings and reconciliation"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Frame x={12} y={16} w={204} h={252} title="1. Concurrent writes">
          <Box x={45} y={56} w={58} h={26} label="A writes" tint fontSize={FONT.note} />
          <Box x={125} y={56} w={58} h={26} label="B writes" tint fontSize={FONT.note} />
          <ReplicaSet
            x={36}
            y={138}
            labels={[
              { text: "x0=5" },
              { text: "xA=7", state: "highlight" },
              { text: "xB=9", state: "highlight" },
            ]}
          />
          <Arrow from={{ x: 74, y: 84 }} to={{ x: 112, y: 138 }} markerId={arrowId} />
          <Arrow from={{ x: 154, y: 84 }} to={{ x: 162, y: 180 }} markerId={arrowId} />
          <Label x={114} y={238} text="W=1 accepts both writes" size={FONT.note} fill={COLOR.caption} />
        </Frame>

        <Frame x={228} y={16} w={204} h={252} title="2. Read returns siblings">
          <Box x={300} y={56} w={64} h={26} label="C reads" tint fontSize={FONT.note} />
          <ReplicaSet
            x={252}
            y={138}
            labels={[
              { text: "x0=5" },
              { text: "xA=7", state: "highlight" },
              { text: "xB=9", state: "highlight" },
            ]}
          />
          <Arrow from={{ x: 332, y: 84 }} to={{ x: 328, y: 138 }} markerId={arrowId} />
          <Arrow from={{ x: 332, y: 84 }} to={{ x: 378, y: 180 }} markerId={arrowId} />
          <Box x={268} y={222} w={128} h={30} label="{xA, xB}" state="highlight" fontSize={FONT.note} />
        </Frame>

        <Frame x={444} y={16} w={204} h={252} title="3. Reconcile and spread">
          <Box x={515} y={56} w={70} h={26} label="merge xC" state="highlight" fontSize={FONT.note} />
          <ReplicaSet
            x={468}
            y={138}
            labels={[
              { text: "xC=11", state: "highlight" },
              { text: "xC=11", state: "highlight" },
              { text: "xC=11", state: "highlight" },
            ]}
          />
          <Arrow from={{ x: 550, y: 84 }} to={{ x: 544, y: 138 }} markerId={arrowId} />
          <Arrow from={{ x: 546, y: 178 }} to={{ x: 494, y: 182 }} markerId={arrowId} bend={18} />
          <Arrow from={{ x: 546, y: 178 }} to={{ x: 594, y: 182 }} markerId={arrowId} bend={-18} />
          <Lines
            x={546}
            y={234}
            lines={["background propagation", "converges later"]}
            fill={COLOR.caption}
          />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}

type TimelineEvent = {
  process: number;
  x: number;
  label: string;
  state?: BoxState;
};

function Timelines({
  x,
  y,
  w,
  processes,
  events,
}: {
  x: number;
  y: number;
  w: number;
  processes: string[];
  events: TimelineEvent[];
}) {
  const gap = 44;
  return (
    <g>
      {processes.map((p, i) => (
        <g key={p}>
          <Label x={x} y={y + i * gap} text={p} size={FONT.note} weight={700} anchor="start" />
          <line
            x1={r2(x + 24)}
            y1={r2(y + i * gap)}
            x2={r2(x + w)}
            y2={r2(y + i * gap)}
            stroke={COLOR.muted}
            strokeWidth={STROKE.line}
          />
        </g>
      ))}
      {events.map((event, i) => (
        <Box
          key={`${event.label}-${i}`}
          x={x + event.x}
          y={y + event.process * gap - 13}
          w={52}
          h={26}
          label={event.label}
          state={event.state}
          tint={event.state !== "highlight"}
          fontSize={FONT.note}
          fontWeight={700}
        />
      ))}
    </g>
  );
}

export function CausalConsistencySchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("causal-consistency", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={
        caption ??
        "Causal consistency preserves cause-before-effect order, while concurrent writes may be observed in different orders."
      }
      className={className}
    >
      <DiagramSvg w={660} h={300} label={caption ?? "Causal consistency examples"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Frame x={12} y={16} w={312} h={252} title="Dependent writes">
          <Timelines
            x={36}
            y={78}
            w={250}
            processes={["P1", "P2", "P3"]}
            events={[
              { process: 0, x: 40, label: "W(a)", state: "highlight" },
              { process: 1, x: 94, label: "R(a)" },
              { process: 1, x: 156, label: "W(b)", state: "highlight" },
              { process: 2, x: 136, label: "R(b)", state: "highlight" },
              { process: 2, x: 198, label: "R(a)" },
            ]}
          />
          <Arrow from={{ x: 128, y: 78 }} to={{ x: 156, y: 122 }} markerId={arrowId} />
          <Arrow from={{ x: 182, y: 122 }} to={{ x: 194, y: 122 }} markerId={arrowId} />
          <Box
            x={66}
            y={220}
            w={216}
            h={30}
            label="R(b) before R(a) violates order"
            state="highlight"
            fontSize={FONT.note}
            fontWeight={700}
          />
        </Frame>

        <Frame x={336} y={16} w={312} h={252} title="Concurrent writes">
          <Timelines
            x={360}
            y={78}
            w={250}
            processes={["P1", "P2", "P3", "P4"]}
            events={[
              { process: 0, x: 40, label: "W(a)", state: "highlight" },
              { process: 1, x: 152, label: "W(b)", state: "highlight" },
              { process: 2, x: 112, label: "R(b)" },
              { process: 2, x: 174, label: "R(a)" },
              { process: 3, x: 112, label: "R(a)" },
              { process: 3, x: 174, label: "R(b)" },
            ]}
          />
          <Box
            x={396}
            y={236}
            w={200}
            h={30}
            label="both read orders are allowed"
            tint
            fontSize={FONT.note}
            fontWeight={700}
          />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}
