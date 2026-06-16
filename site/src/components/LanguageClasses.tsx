import {
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  Label,
  RADIUS,
  SPACE,
  STROKE,
  r2,
} from "@/components/diagram";

interface Props {
  title?: string;
  caption?: string;
  className?: string;
}

export function LanguageClasses({ title, caption, className }: Props) {
  const w = 640;
  const h = 250;
  const cx = 286;
  const cy = 128;

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg w={w} h={h} label={caption ?? "Language class containment"}>
        <rect
          x={SPACE.margin}
          y={SPACE.margin}
          width={w - 2 * SPACE.margin}
          height={h - 2 * SPACE.margin}
          rx={RADIUS.frame}
          fill="none"
          stroke={COLOR.border}
          strokeWidth={STROKE.frame}
          strokeDasharray={STROKE.dash}
        />
        <Label
          x={SPACE.margin + 15}
          y={SPACE.margin + 18}
          text="All languages"
          size={FONT.note}
          fill={COLOR.caption}
          anchor="start"
        />
        <ellipse
          cx={cx}
          cy={cy}
          rx="232"
          ry="92"
          fill={COLOR.node}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        <ellipse
          cx={cx - 54}
          cy={cy}
          rx="152"
          ry="64"
          fill={COLOR.bg}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        <ellipse
          cx={cx - 112}
          cy={cy}
          rx="68"
          ry="40"
          fill={COLOR.node}
          stroke={COLOR.fg}
          strokeWidth={STROKE.frame}
        />
        <Label x={cx - 112} y={cy} text="Regular" size={FONT.label} />
        <Label x={cx + 27} y={cy} text="Decidable" size={FONT.label} />
        <Label x={cx + 165} y={cy} text="Recognizable" size={FONT.label} />
        <Label
          x={572}
          y={cy - 8}
          text="Not"
          size={FONT.note}
          fill={COLOR.caption}
        />
        <Label
          x={572}
          y={cy + 9}
          text="recognizable"
          size={FONT.note}
          fill={COLOR.caption}
        />
        <path
          d={`M${r2(546)},${r2(cy + 24)} Q${r2(572)},${r2(cy + 35)} ${r2(598)},${r2(cy + 24)}`}
          fill="none"
          stroke={COLOR.muted}
          strokeWidth={STROKE.line}
          strokeDasharray={STROKE.dash}
        />
      </DiagramSvg>
    </DiagramFigure>
  );
}
