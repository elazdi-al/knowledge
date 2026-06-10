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
} from "@/components/diagram";

/**
 * A RAID disk-array diagram in the textbook style: a row of tall rounded
 * "drive" frames, each with a bold disk title above it, a vertical stack of
 * labelled block cells inside, and trailing drawn dots beneath meaning "more".
 * A bracket spans the drives with the array's name (RAID 0 / 1 / 5).
 *
 * One component covers the three canonical layouts:
 *   - `striping`  (RAID 0): plain data cells, blocks striped across disks.
 *   - `mirroring` (RAID 1): identical cells on paired disks, joined by a
 *     double-headed mirror arrow per row.
 *   - `parity`    (RAID 5): a stripe grid where one cell per row is a parity
 *     cell that rotates diagonally from disk to disk.
 *
 * Cell type is encoded the house way — by label and stroke emphasis (parity
 * carries a bold outline on the container tint), never by saturated colour.
 * The header stacks additively (label, bracket bar, disk titles, drives) so
 * nothing can strike through anything. Rendered once on the server; all
 * colour and stroke comes from the diagram theme.
 */

export type RAIDMode = "striping" | "mirroring" | "parity";

export type RAIDCellKind = "data" | "parity" | "mirror";

export interface RAIDCell {
  /** Cell label, e.g. "Block 0" or "Parity 0-2". Numbers coerce to strings. */
  label: string | number;
  /** Cell type. `parity` is emphasised (bold outline + container tint).
   *  Defaults to "data". */
  kind?: RAIDCellKind;
}

export interface RAIDDisk {
  /** Bold title above the drive, e.g. "Disk 0". */
  title: string;
  /** Block cells, top to bottom. Strings/numbers are treated as data cells. */
  cells: Array<RAIDCell | string | number>;
}

interface Props {
  /** Layout variant. Drives the bracket label default and mirror arrows. */
  mode: RAIDMode;
  /** The disks, left to right. */
  disks: RAIDDisk[];
  /** Bracket label spanning all drives. Defaults from `mode`
   *  ("RAID 0" / "RAID 1" / "RAID 5"). Pass "" to omit the bracket. */
  label?: string;
  /** Trailing dots beneath each drive ("more blocks below"). Default true. */
  ellipsis?: boolean;
  /** @deprecated The svg renders at natural size now; this is ignored. */
  minViewBoxWidth?: number;
  /** Bold heading inside the card (e.g. "Before"). */
  title?: string;
  caption?: string;
  className?: string;
}

// --- geometry ---------------------------------------------------------------

const CELL_W = 96; // block cell width
const CELL_H = 30; // block cell height
const CELL_GAP = 8; // vertical gap between cells in a drive
const DRIVE_PAD_X = 14; // horizontal padding inside a drive frame
const DRIVE_PAD_Y = 16; // padding above/below the cell stack
const DISK_GAP = 34; // horizontal gap between drives
const TITLE_DROP = 9; // disk title baseline above the drive top
const TITLE_BAND = 24; // vertical room reserved for the disk titles
const BRACKET_DROP = 10; // bracket end-tick length
const BRACKET_GAP = 10; // gap between tick ends and the title band
const STEM = 12; // bracket centre stem height
const ELLIPSIS_DROP = 14; // dots centre below the drive bottom
const MARGIN = 16;

const normCell = (c: RAIDCell | string | number): RAIDCell =>
  typeof c === "string" || typeof c === "number"
    ? { label: String(c), kind: "data" }
    : { label: String(c.label), kind: c.kind ?? "data" };

const defaultLabel: Record<RAIDMode, string> = {
  striping: "RAID 0",
  mirroring: "RAID 1",
  parity: "RAID 5",
};

export function RAIDDiagram({
  mode,
  disks,
  label,
  ellipsis = true,
  title,
  caption,
  className,
}: Props) {
  const bracketLabel = label ?? defaultLabel[mode];
  const hasBracket = bracketLabel !== "";
  const driveW = CELL_W + 2 * DRIVE_PAD_X;
  const rows = Math.max(0, ...disks.map((d) => d.cells.length));
  const driveH = 2 * DRIVE_PAD_Y + rows * CELL_H + Math.max(0, rows - 1) * CELL_GAP;

  // Vertical bands, stacked additively from the top so nothing collides:
  // array label / bracket bar + ticks / clearance / disk titles / drives / dots.
  const labelBand = hasBracket ? FONT.title + STEM + 4 : 0;
  const barY = MARGIN + labelBand;
  const driveTop =
    barY + (hasBracket ? BRACKET_DROP + BRACKET_GAP : 0) + TITLE_BAND;
  const driveBottom = driveTop + driveH;
  const height = driveBottom + (ellipsis ? ELLIPSIS_DROP + 8 : 0) + MARGIN;

  const width =
    2 * MARGIN + disks.length * driveW + Math.max(0, disks.length - 1) * DISK_GAP;
  const driveX = (i: number) => MARGIN + i * (driveW + DISK_GAP);
  const cellY = (r: number) => driveTop + DRIVE_PAD_Y + r * (CELL_H + CELL_GAP);

  const arrowId = stableId("raid-arrow", { mode, disks, label, title });

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={width}
        h={height}
        label={caption ?? `${bracketLabel || "RAID"} disk array diagram`}
      >
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        {/* bracket: bar across the drive span, end ticks down, stem + label up */}
        {hasBracket && (
          <g>
            <path
              d={`M${r2(driveX(0))},${r2(barY + BRACKET_DROP)} L${r2(driveX(0))},${r2(barY)} L${r2(driveX(disks.length - 1) + driveW)},${r2(barY)} L${r2(driveX(disks.length - 1) + driveW)},${r2(barY + BRACKET_DROP)}`}
              fill="none"
              stroke={COLOR.muted}
              strokeWidth={STROKE.divider}
            />
            <line
              x1={r2(width / 2)}
              y1={r2(barY)}
              x2={r2(width / 2)}
              y2={r2(barY - STEM)}
              stroke={COLOR.muted}
              strokeWidth={STROKE.divider}
            />
            <Label
              x={width / 2}
              y={barY - STEM - 4}
              text={bracketLabel}
              size={FONT.title}
              weight={700}
              baseline="baseline"
            />
          </g>
        )}

        {/* drives */}
        {disks.map((disk, i) => {
          const x = driveX(i);
          const cx = x + driveW / 2;
          return (
            <g key={`drive-${i}`}>
              <Label
                x={cx}
                y={driveTop - TITLE_DROP}
                text={disk.title}
                size={FONT.title}
                weight={700}
                baseline="baseline"
              />
              <rect
                x={r2(x)}
                y={r2(driveTop)}
                width={r2(driveW)}
                height={r2(driveH)}
                rx={RADIUS.frame}
                fill={COLOR.bg}
                stroke={COLOR.fg}
                strokeWidth={STROKE.frame}
              />
              {disk.cells.map(normCell).map((cell, r) => {
                const isParity = cell.kind === "parity";
                return (
                  <Box
                    key={`cell-${i}-${r}`}
                    x={x + DRIVE_PAD_X}
                    y={cellY(r)}
                    w={CELL_W}
                    h={CELL_H}
                    label={cell.label as string}
                    state={isParity ? "emphasis" : "normal"}
                    tint={isParity}
                    fontWeight={isParity ? 600 : 400}
                  />
                );
              })}
              {ellipsis && (
                <DotsEllipsis x={cx} y={driveBottom + ELLIPSIS_DROP} />
              )}
            </g>
          );
        })}

        {/* mirror arrows (RAID 1): one double-headed arrow per cell row, kept
            inside the gap between drive frames */}
        {mode === "mirroring" &&
          disks.slice(0, -1).flatMap((_, i) => {
            const n = Math.min(disks[i].cells.length, disks[i + 1].cells.length);
            const xa = driveX(i) + driveW + 4;
            const xb = driveX(i + 1) - 4;
            return Array.from({ length: n }, (__, r) => {
              const y = cellY(r) + CELL_H / 2;
              return (
                <Arrow
                  key={`mirror-${i}-${r}`}
                  from={{ x: xa, y }}
                  to={{ x: xb, y }}
                  markerId={arrowId}
                  both
                />
              );
            });
          })}
      </DiagramSvg>
    </DiagramFigure>
  );
}
