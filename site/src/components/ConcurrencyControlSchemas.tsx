import type { ReactNode } from "react";
import {
  Arrow,
  ArrowHead,
  Box,
  CellStrip,
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

function TxNode({
  x,
  y,
  label,
  emphasis = false,
}: {
  x: number;
  y: number;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <g>
      <circle
        cx={r2(x)}
        cy={r2(y)}
        r={22}
        fill={emphasis ? COLOR.node : COLOR.bg}
        stroke={COLOR.fg}
        strokeWidth={emphasis ? STROKE.bold : STROKE.frame}
      />
      <Label x={x} y={y} text={label} size={FONT.title} weight={700} />
    </g>
  );
}

type ScheduleEvent = {
  tx: 1 | 2 | 3;
  y: number;
  text: string;
  weight?: Weight;
};

function MiniSchedule({
  x,
  y,
  w,
  h,
  txs,
  events,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  txs: Array<1 | 2 | 3>;
  events: ScheduleEvent[];
}) {
  const colW = w / txs.length;
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
      {txs.slice(1).map((_, i) => (
        <line
          key={i}
          x1={r2(x + colW * (i + 1))}
          y1={r2(y)}
          x2={r2(x + colW * (i + 1))}
          y2={r2(y + h)}
          stroke={COLOR.border}
          strokeWidth={STROKE.divider}
        />
      ))}
      {txs.map((tx, i) => (
        <Label
          key={tx}
          x={x + colW * i + colW / 2}
          y={y + 17}
          text={`T_${tx}`}
          size={FONT.note}
          weight={700}
        />
      ))}
      <line
        x1={r2(x)}
        y1={r2(y + 30)}
        x2={r2(x + w)}
        y2={r2(y + 30)}
        stroke={COLOR.border}
        strokeWidth={STROKE.divider}
      />
      {events.map((event, i) => {
        const col = txs.indexOf(event.tx);
        return (
          <Label
            key={`${event.text}-${i}`}
            x={x + colW * col + colW / 2}
            y={y + event.y}
            text={event.text}
            size={9.7}
            weight={event.weight}
          />
        );
      })}
    </g>
  );
}

export function ConflictSerializabilitySchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("conflict-serial", { title, caption });

  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "A precedence graph turns conflict-order constraints into a cycle test."}
      className={className}
    >
      <DiagramSvg w={660} h={334} label={caption ?? "Conflict serializability examples"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Frame x={14} y={18} w={306} h={292} title="Acyclic graph">
          <MiniSchedule
            x={34}
            y={58}
            w={118}
            h={166}
            txs={[1, 2]}
            events={[
              { tx: 1, y: 48, text: "R_1(A)" },
              { tx: 1, y: 66, text: "W_1(A)" },
              { tx: 2, y: 86, text: "R_2(A)" },
              { tx: 2, y: 104, text: "W_2(A)" },
              { tx: 1, y: 126, text: "R_1(B)" },
              { tx: 1, y: 144, text: "W_1(B)" },
              { tx: 2, y: 156, text: "R_2(B)" },
            ]}
          />
          <TxNode x={203} y={118} label="T_1" />
          <TxNode x={272} y={118} label="T_2" />
          <Arrow from={{ x: 225, y: 118 }} to={{ x: 250, y: 118 }} markerId={arrowId} label="A, B" />
          <Box
            x={44}
            y={246}
            w={230}
            h={26}
            label="acyclic: serial order T_1, T_2"
            tint
            fontSize={FONT.note}
            fontWeight={700}
          />
        </Frame>

        <Frame x={340} y={18} w={306} h={292} title="Cyclic graph">
          <MiniSchedule
            x={360}
            y={58}
            w={118}
            h={166}
            txs={[1, 2]}
            events={[
              { tx: 1, y: 48, text: "R_1(A)" },
              { tx: 1, y: 66, text: "W_1(A)" },
              { tx: 2, y: 86, text: "R_2(A)" },
              { tx: 2, y: 104, text: "W_2(A)" },
              { tx: 2, y: 126, text: "R_2(B)" },
              { tx: 2, y: 144, text: "W_2(B)" },
              { tx: 1, y: 156, text: "R_1(B)" },
            ]}
          />
          <TxNode x={530} y={118} label="T_1" emphasis />
          <TxNode x={600} y={118} label="T_2" emphasis />
          <Arrow
            from={{ x: 552, y: 110 }}
            to={{ x: 578, y: 110 }}
            markerId={arrowId}
            bend={-16}
            label="A"
          />
          <Arrow
            from={{ x: 578, y: 128 }}
            to={{ x: 552, y: 128 }}
            markerId={arrowId}
            bend={-16}
            label="B"
          />
          <Box
            x={370}
            y={246}
            w={230}
            h={26}
            label="cycle: no equivalent serial order"
            state="highlight"
            fontSize={FONT.note}
            fontWeight={700}
          />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}

function AxisPlot({
  x,
  y,
  w,
  h,
  kind,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "plain" | "strict";
}) {
  const plotX = x + 52;
  const plotY = y + 28;
  const plotW = w - 78;
  const plotH = 92;
  const baseY = plotY + plotH;
  const topY = plotY + 12;
  const right = plotX + plotW;
  const peakX = kind === "plain" ? plotX + plotW * 0.52 : plotX + plotW * 0.36;
  const releaseX = kind === "strict" ? right - 44 : right;
  const path =
    kind === "plain"
      ? `M${r2(plotX)},${r2(baseY)} L${r2(peakX)},${r2(topY)} L${r2(right)},${r2(baseY)}`
      : `M${r2(plotX)},${r2(baseY)} L${r2(peakX)},${r2(topY)} L${r2(releaseX)},${r2(topY)} L${r2(releaseX)},${r2(baseY)}`;
  const phaseY = baseY + 20;
  const firstPhaseW = peakX - plotX;
  const secondPhaseW = right - peakX;
  return (
    <g>
      {[0.33, 0.66].map((p) => (
        <line
          key={p}
          x1={r2(plotX)}
          y1={r2(baseY - plotH * p)}
          x2={r2(right)}
          y2={r2(baseY - plotH * p)}
          stroke={COLOR.border}
          strokeWidth={STROKE.divider}
        />
      ))}
      <line x1={r2(plotX)} y1={r2(baseY)} x2={r2(right)} y2={r2(baseY)} stroke={COLOR.muted} />
      <line x1={r2(plotX)} y1={r2(baseY)} x2={r2(plotX)} y2={r2(plotY)} stroke={COLOR.muted} />
      <Label x={plotX - 13} y={plotY + 40} text="locks" size={FONT.note} fill={COLOR.caption} anchor="end" />
      <Label x={plotX + plotW / 2} y={baseY + 11} text="time" size={FONT.note} fill={COLOR.caption} />
      <path
        d={path}
        fill="none"
        stroke={COLOR.fg}
        strokeWidth={STROKE.bold}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {kind === "plain" ? (
        <>
          <line
            x1={r2(peakX)}
            y1={r2(topY - 4)}
            x2={r2(peakX)}
            y2={r2(baseY + 2)}
            stroke={COLOR.muted}
            strokeDasharray={STROKE.dash}
          />
          <Label x={peakX} y={topY - 13} text="lock point" size={FONT.note} fill={COLOR.caption} />
          <Box x={plotX} y={phaseY} w={firstPhaseW - 5} h={25} label="growing" tint fontSize={FONT.note} fontWeight={700} />
          <Box x={peakX + 5} y={phaseY} w={secondPhaseW - 5} h={25} label="shrinking" tint fontSize={FONT.note} fontWeight={700} />
          <Label x={x + w / 2} y={phaseY + 45} text="after release: no new locks" size={FONT.note} fill={COLOR.caption} />
        </>
      ) : (
        <>
          <line
            x1={r2(releaseX)}
            y1={r2(topY - 4)}
            x2={r2(releaseX)}
            y2={r2(baseY + 2)}
            stroke={COLOR.muted}
            strokeDasharray={STROKE.dash}
          />
          <Label x={releaseX - 3} y={topY - 13} text="commit / abort" size={FONT.note} fill={COLOR.caption} anchor="end" />
          <Box x={plotX} y={phaseY} w={firstPhaseW - 5} h={25} label="acquire" tint fontSize={FONT.note} fontWeight={700} />
          <Box x={peakX + 5} y={phaseY} w={releaseX - peakX - 10} h={25} label="hold locks" tint fontSize={FONT.note} fontWeight={700} />
          <Label x={releaseX + 8} y={phaseY + 13} text="release" size={FONT.note} weight={700} anchor="start" />
          <Label x={x + w / 2} y={phaseY + 45} text="release only at transaction end" size={FONT.note} fill={COLOR.caption} />
        </>
      )}
    </g>
  );
}

export function LockPhaseSchema({
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
      caption={caption ?? "2PL forbids new locks after release; strict 2PL delays release until the transaction ends."}
      className={className}
    >
      <DiagramSvg w={660} h={276} label={caption ?? "Two-phase and strict two-phase locking"}>
        <Frame x={16} y={20} w={300} h={228} title="Basic 2PL">
          <AxisPlot x={28} y={52} w={268} h={166} kind="plain" />
        </Frame>

        <Frame x={344} y={20} w={300} h={228} title="Strict 2PL">
          <AxisPlot x={356} y={52} w={268} h={166} kind="strict" />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}

export function WaitForGraphSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("wait-for", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "A deadlock appears as a cycle in the wait-for graph."}
      className={className}
    >
      <DiagramSvg w={660} h={298} label={caption ?? "Deadlock wait-for graph"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Frame x={16} y={20} w={350} h={242} title="Blocked lock requests">
          <MiniSchedule
            x={42}
            y={62}
            w={298}
            h={150}
            txs={[1, 2, 3]}
            events={[
              { tx: 1, y: 48, text: "S(A)", weight: 700 },
              { tx: 2, y: 64, text: "X(B)", weight: 700 },
              { tx: 3, y: 80, text: "S(C)", weight: 700 },
              { tx: 1, y: 104, text: "S(B) waits" },
              { tx: 2, y: 122, text: "X(C) waits" },
              { tx: 3, y: 140, text: "X(A) waits" },
            ]}
          />
          <Lines
            x={190}
            y={236}
            lines={["T_1 waits for T_2, T_2 waits for T_3,", "and T_3 waits for T_1."]}
            fill={COLOR.caption}
          />
        </Frame>

        <Frame x={396} y={20} w={248} h={242} title="Wait-for graph">
          <TxNode x={458} y={106} label="T_1" emphasis />
          <TxNode x={582} y={106} label="T_2" emphasis />
          <TxNode x={520} y={190} label="T_3" emphasis />
          <Arrow from={{ x: 480, y: 100 }} to={{ x: 560, y: 100 }} markerId={arrowId} bend={-20} />
          <Arrow from={{ x: 574, y: 128 }} to={{ x: 536, y: 172 }} markerId={arrowId} bend={-12} />
          <Arrow from={{ x: 504, y: 172 }} to={{ x: 466, y: 128 }} markerId={arrowId} bend={-12} />
          <Box
            x={438}
            y={222}
            w={164}
            h={25}
            label="cycle means deadlock"
            state="highlight"
            fontSize={FONT.note}
            fontWeight={700}
          />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}

export function DeadlockPreventionSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("deadlock-prevention", { title, caption });

  function SchemePanel({
    x,
    title,
    rule,
    direction,
    waitsLeftToRight,
  }: {
    x: number;
    title: string;
    rule: string;
    direction: string;
    waitsLeftToRight: boolean;
  }) {
    const oldX = x + 58;
    const youngX = x + 192;
    const arrowY = 96;
    return (
      <Frame x={x} y={24} w={276} h={150} title={title}>
        <Label x={x + 138} y={58} text={rule} size={FONT.note} fill={COLOR.caption} />

        <Box x={oldX - 36} y={84} w={72} h={34} label="T_{old}" state="emphasis" fontWeight={700} />
        <Box x={youngX - 42} y={84} w={84} h={34} label="T_{young}" tint fontWeight={700} />
        <Arrow
          from={{ x: waitsLeftToRight ? oldX + 36 : youngX - 42, y: arrowY }}
          to={{ x: waitsLeftToRight ? youngX - 42 : oldX + 36, y: arrowY }}
          markerId={arrowId}
          label="waits"
          labelOffset={16}
        />
        <Label x={x + 138} y={140} text={direction} size={10.4} fill={COLOR.caption} />
      </Frame>
    );
  }

  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Timestamp schemes force waiting in one priority direction, so cycles cannot form."}
      className={className}
    >
      <DiagramSvg w={600} h={200} label={caption ?? "Wait-die and wound-wait wait directions"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <SchemePanel
          x={18}
          title="Wait-die"
          rule="old waits for young"
          direction="wait edges go from older to younger"
          waitsLeftToRight
        />

        <SchemePanel
          x={316}
          title="Wound-wait"
          rule="young waits for old"
          direction="wait edges go from younger to older"
          waitsLeftToRight={false}
        />
      </DiagramSvg>
    </DiagramFigure>
  );
}

export function LockGranularitySchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("lock-granularity", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "A lock hierarchy lets the DBMS choose the object size protected by each lock."}
      className={className}
    >
      <DiagramSvg w={600} h={330} label={caption ?? "Database lock granularity hierarchy"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Box x={238} y={24} w={124} h={30} label="Database" tint fontWeight={700} />
        <Box x={118} y={84} w={104} h={30} label="Table R" tint fontWeight={700} />
        <Box x={378} y={84} w={104} h={30} label="Table S" tint fontWeight={700} />
        <Arrow from={{ x: 276, y: 54 }} to={{ x: 170, y: 84 }} markerId={arrowId} />
        <Arrow from={{ x: 324, y: 54 }} to={{ x: 430, y: 84 }} markerId={arrowId} />

        <Box x={34} y={146} w={82} h={28} label="Page 1" />
        <Box x={142} y={146} w={82} h={28} label="Page 2" />
        <DotsEllipsis x={248} y={160} />
        <Box x={284} y={146} w={82} h={28} label="Page n" />
        <Arrow from={{ x: 146, y: 114 }} to={{ x: 75, y: 146 }} markerId={arrowId} />
        <Arrow from={{ x: 166, y: 114 }} to={{ x: 183, y: 146 }} markerId={arrowId} />
        <Arrow from={{ x: 186, y: 114 }} to={{ x: 325, y: 146 }} markerId={arrowId} />

        <Box x={78} y={208} w={86} h={28} label="Tuple 1" />
        <Box x={190} y={208} w={86} h={28} label="Tuple 2" />
        <DotsEllipsis x={304} y={222} />
        <Box x={340} y={208} w={86} h={28} label="Tuple n" />
        <Arrow from={{ x: 169, y: 174 }} to={{ x: 121, y: 208 }} markerId={arrowId} />
        <Arrow from={{ x: 183, y: 174 }} to={{ x: 233, y: 208 }} markerId={arrowId} />
        <Arrow from={{ x: 197, y: 174 }} to={{ x: 383, y: 208 }} markerId={arrowId} />

        <Box x={132} y={270} w={76} h={28} label="Attr 1" />
        <DotsEllipsis x={238} y={284} />
        <Box x={274} y={270} w={76} h={28} label="Attr n" />
        <Arrow from={{ x: 218, y: 236 }} to={{ x: 170, y: 270 }} markerId={arrowId} />
        <Arrow from={{ x: 248, y: 236 }} to={{ x: 312, y: 270 }} markerId={arrowId} />
      </DiagramSvg>
    </DiagramFigure>
  );
}

export function MultiGranularityLockingSchema({
  title,
  caption,
  className,
}: {
  title?: string;
  caption?: string;
  className?: string;
}) {
  const arrowId = stableId("multi-granularity", { title, caption });
  return (
    <DiagramFigure
      title={title}
      caption={caption ?? "Intention locks on ancestors advertise lower-level explicit locks."}
      className={className}
    >
      <DiagramSvg w={660} h={302} label={caption ?? "Multi-granularity locking example"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        <Frame x={18} y={24} w={392} h={238} title="Two-level hierarchy">
          <Box x={154} y={86} w={120} h={34} label="Table R" state="emphasis" fontWeight={700} />
          <Box x={54} y={188} w={94} h={30} label="Tuple A" />
          <Box x={186} y={188} w={94} h={30} label="Tuple B" />
          <DotsEllipsis x={310} y={203} />
          <Arrow from={{ x: 188, y: 120 }} to={{ x: 101, y: 188 }} markerId={arrowId} />
          <Arrow from={{ x: 214, y: 120 }} to={{ x: 233, y: 188 }} markerId={arrowId} />

          <Box x={72} y={58} w={54} h={26} label="T_1" tint fontWeight={700} />
          <Box x={52} y={140} w={70} h={28} label="S(A)" state="highlight" fontWeight={700} />
          <Box x={140} y={136} w={58} h={28} label="IS(R)" tint fontWeight={700} />
          <Arrow from={{ x: 99, y: 84 }} to={{ x: 171, y: 136 }} markerId={arrowId} />
          <Arrow from={{ x: 88, y: 168 }} to={{ x: 98, y: 188 }} markerId={arrowId} />

          <Box x={306} y={58} w={54} h={26} label="T_2" tint fontWeight={700} />
          <Box x={282} y={140} w={70} h={28} label="X(B)" state="highlight" fontWeight={700} />
          <Box x={232} y={136} w={58} h={28} label="IX(R)" tint fontWeight={700} />
          <Arrow from={{ x: 333, y: 84 }} to={{ x: 261, y: 136 }} markerId={arrowId} />
          <Arrow from={{ x: 317, y: 168 }} to={{ x: 240, y: 188 }} markerId={arrowId} />
        </Frame>

        <Frame x={438} y={24} w={204} h={238} title="Compatibility">
          <CellStrip
            x={474}
            y={68}
            cellH={26}
            widths={[44, 44, 44]}
            cells={["", "IS", "IX"]}
            tint
            fontSize={FONT.note}
          />
          <CellStrip
            x={474}
            y={94}
            cellH={26}
            widths={[44, 44, 44]}
            cells={["IS", "yes", "yes"]}
            fontSize={FONT.note}
          />
          <CellStrip
            x={474}
            y={120}
            cellH={26}
            widths={[44, 44, 44]}
            cells={["IX", "yes", "yes"]}
            fontSize={FONT.note}
          />
          <Lines
            x={540}
            y={178}
            lines={["IS and IX can coexist", "on Table R, because the", "real conflict is checked", "at the tuple level."]}
            fill={COLOR.caption}
          />
        </Frame>
      </DiagramSvg>
    </DiagramFigure>
  );
}
