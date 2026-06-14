import {
  Arrow,
  ArrowHead,
  CellStrip,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  SPACE,
  type BoxState,
  Box,
  DotsEllipsis,
  measureLabel,
  stableId,
  type Cell,
} from "@/components/diagram";

export type TapeCell =
  | string
  | number
  | null
  | {
      label?: string;
      state?: BoxState;
      tint?: boolean;
      color?: string;
    };

interface Props {
  cells: TapeCell[];
  head?: number;
  state?: string;
  title?: string;
  caption?: string;
  leftEllipsis?: boolean;
  rightEllipsis?: boolean;
  className?: string;
}

const CELL_W = 42;
const CELL_H = 34;
const STATE_H = 30;
const TAPE_Y = 74;
const STATE_Y = 15;

const toCell = (cell: TapeCell): Cell =>
  cell === null
    ? {}
    : typeof cell === "object"
      ? cell
      : { label: String(cell) };

export function TuringTape({
  cells,
  head = 0,
  state = "q",
  title,
  caption,
  leftEllipsis = false,
  rightEllipsis = false,
  className,
}: Props) {
  const shown = cells.length > 0 ? cells : [null];
  const headIndex = Math.min(Math.max(head, 0), shown.length - 1);
  const stateW = Math.max(54, measureLabel(state, FONT.node, 700) + 24);
  const ellipsisW = 24;
  let tapeX = SPACE.margin + (leftEllipsis ? ellipsisW : 0);
  const headCenterBase = tapeX + headIndex * CELL_W + CELL_W / 2;
  const stateLeftBase = headCenterBase - stateW / 2;

  if (stateLeftBase < SPACE.margin) {
    tapeX += SPACE.margin - stateLeftBase;
  }

  const headCenter = tapeX + headIndex * CELL_W + CELL_W / 2;
  const stateX = headCenter - stateW / 2;
  const tapeW = shown.length * CELL_W;
  const contentRight = Math.max(
    tapeX + tapeW + (rightEllipsis ? ellipsisW : 0),
    stateX + stateW,
  );
  const width = contentRight + SPACE.margin;
  const height = 124;
  const arrowId = stableId("tm-head", { shown, headIndex, state, caption });

  const renderedCells = shown.map((cell, index) => {
    const c = toCell(cell);
    if (index !== headIndex || c.state) return c;
    return { ...c, state: "highlight" as BoxState };
  });

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg w={width} h={height} label={caption ?? "Turing machine tape"}>
        <defs>
          <ArrowHead id={arrowId} />
        </defs>
        {leftEllipsis && (
          <DotsEllipsis x={tapeX - ellipsisW / 2} y={TAPE_Y + CELL_H / 2} />
        )}
        <Box
          x={stateX}
          y={STATE_Y}
          w={stateW}
          h={STATE_H}
          label={state}
          fontSize={FONT.node}
          fontWeight={700}
          tint
        />
        <Arrow
          from={{ x: headCenter, y: STATE_Y + STATE_H + 3 }}
          to={{ x: headCenter, y: TAPE_Y - 5 }}
          markerId={arrowId}
          color={COLOR.muted}
        />
        <CellStrip
          x={tapeX}
          y={TAPE_Y}
          cellW={CELL_W}
          cellH={CELL_H}
          cells={renderedCells}
          fontSize={FONT.node}
        />
        {rightEllipsis && (
          <DotsEllipsis
            x={tapeX + tapeW + ellipsisW / 2}
            y={TAPE_Y + CELL_H / 2}
          />
        )}
      </DiagramSvg>
    </DiagramFigure>
  );
}
