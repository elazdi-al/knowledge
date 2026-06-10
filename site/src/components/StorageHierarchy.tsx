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
  SPACE,
  STROKE,
  measureLabel,
  r2,
  stableId,
} from "@/components/diagram";

/**
 * The database storage hierarchy as a chain of nested containers: a row of
 * labelled stage boxes (Database → File → Page → Record), each holding a small
 * stack — or, for the record stage, a horizontal row — of inner element boxes,
 * joined left to right by flow arrows. A container-of-containers plus a flow
 * chain, modelled directly on the L3 `storage_hierarchy` TikZ figure.
 *
 * The author supplies the stages and their items; the layout is derived. Stage
 * heights are sized to the tallest stage so the row sits on one baseline,
 * items are centred within each stage, boxes are sized from real font metrics
 * so labels never overflow. Rendered once on the server (no client JS); all
 * colour and stroke comes from the diagram theme, so it re-themes on the
 * light/dark switch with the rest of the family.
 */

export interface StorageItem {
  /** Box label, e.g. "File A", "Page 0", "id". */
  label: string;
  /** Visual state. `emphasis` = heavier outline, `new` = dashed outline,
   *  `highlight` = inverted box (ink fill, light text). */
  state?: "normal" | "emphasis" | "new" | "highlight";
}

export interface StorageStage {
  /** Bold heading centred above the stage box. */
  title: string;
  /** Inner element boxes, top to bottom (or left to right when layout="row"). */
  items: Array<StorageItem | string>;
  /** "stack" (default) lays items in a vertical column; "row" lays them
   *  horizontally, as the Record stage does with its fields. */
  layout?: "stack" | "row";
  /** Small muted note centred beneath the items, e.g. "Fields". */
  note?: string;
}

interface Props {
  /** The stage chain, left to right. Consecutive stages are joined by arrows. */
  stages: StorageStage[];
  /** Bold heading inside the card (e.g. a figure label). */
  title?: string;
  caption?: string;
  className?: string;
}

// --- geometry ---------------------------------------------------------------

const TITLE_GAP = 14; // baseline of a stage title above the stage top
const ITEM_H = 26; // height of one inner element box
const ITEM_GAP_Y = 9; // vertical gap between stacked items
const ITEM_GAP_X = 8; // horizontal gap between row items
const ITEM_MIN_W = 78; // minimum inner-box width in a stack
const ROW_ITEM_MIN_W = 40; // minimum inner-box width in a row
const NOTE_GAP = 12; // gap between the last item and the note baseline
const ARROW_GAP = 24; // horizontal run of a flow arrow between stages
const TOP_PAD = TITLE_GAP + 8; // headroom for the stage titles

const asItem = (it: StorageItem | string): StorageItem =>
  typeof it === "string" ? { label: it } : it;

const itemW = (label: string) =>
  measureLabel(label, FONT.label) + 2 * SPACE.textPadX;

interface LaidStage {
  title: string;
  items: StorageItem[];
  layout: "stack" | "row";
  note?: string;
  innerW: number; // width of the item area
  bodyH: number; // height of the item area
  w: number; // full stage box width
  x: number; // stage box left
}

export function StorageHierarchy({ stages, title, caption, className }: Props) {
  // measure each stage's item area with real font metrics
  const measured: LaidStage[] = stages.map((s) => {
    const items = s.items.map(asItem);
    const layout = s.layout ?? "stack";
    let innerW: number;
    let bodyH: number;
    if (layout === "row") {
      const widths = items.map((it) => Math.max(ROW_ITEM_MIN_W, itemW(it.label)));
      innerW =
        widths.reduce((a, b) => a + b, 0) +
        ITEM_GAP_X * Math.max(0, items.length - 1);
      bodyH = ITEM_H;
    } else {
      innerW = Math.max(ITEM_MIN_W, ...items.map((it) => itemW(it.label)));
      bodyH = items.length * ITEM_H + ITEM_GAP_Y * Math.max(0, items.length - 1);
    }
    // title can be wider than the items; widen the box to fit it
    innerW = Math.max(innerW, measureLabel(s.title, FONT.title, 700) + 6);
    const noteH = s.note ? NOTE_GAP + FONT.note : 0;
    return {
      title: s.title,
      items,
      layout,
      note: s.note,
      innerW,
      bodyH: bodyH + noteH,
      w: innerW + 2 * SPACE.padX,
      x: 0,
    };
  });

  // every stage shares the tallest body so the row sits on one baseline
  const stageH = Math.max(...measured.map((s) => s.bodyH)) + 2 * SPACE.padY;
  const stageTop = SPACE.margin + TOP_PAD;

  // pack stages left to right with a flow-arrow run between each
  let cursor = SPACE.margin;
  for (const s of measured) {
    s.x = cursor;
    cursor = s.x + s.w + ARROW_GAP;
  }

  const width = cursor - ARROW_GAP + SPACE.margin;
  const height = stageTop + stageH + SPACE.margin;

  const arrowId = stableId("sh-arrow", { stages, title });

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={width}
        h={height}
        label={caption ?? "Storage hierarchy diagram"}
      >
        <defs>
          <ArrowHead id={arrowId} />
        </defs>

        {/* flow arrows between consecutive stages */}
        {measured.slice(0, -1).map((s, i) => {
          const y = stageTop + stageH / 2;
          return (
            <Arrow
              key={`a${i}`}
              from={{ x: s.x + s.w + 2, y }}
              to={{ x: measured[i + 1].x - 4, y }}
              markerId={arrowId}
            />
          );
        })}

        {/* stage boxes with their inner items */}
        {measured.map((s, si) => {
          const itemAreaTop = stageTop + SPACE.padY;
          const itemAreaLeft = s.x + SPACE.padX;
          const widths = s.items.map((it) =>
            Math.max(ROW_ITEM_MIN_W, itemW(it.label)),
          );

          let lastItemBottom = itemAreaTop;
          const itemEls = s.items.map((it, ii) => {
            let bx: number;
            let by: number;
            let bw: number;
            if (s.layout === "row") {
              const offset = widths
                .slice(0, ii)
                .reduce((a, w) => a + w + ITEM_GAP_X, 0);
              bx = itemAreaLeft + offset;
              bw = widths[ii];
              // centre the single row vertically within the (taller) shared body
              by = stageTop + stageH / 2 - ITEM_H / 2;
            } else {
              bx = itemAreaLeft;
              bw = s.innerW;
              by = itemAreaTop + ii * (ITEM_H + ITEM_GAP_Y);
            }
            lastItemBottom = Math.max(lastItemBottom, by + ITEM_H);
            return (
              <Box
                key={`i${ii}`}
                x={bx}
                y={by}
                w={bw}
                h={ITEM_H}
                label={it.label}
                state={it.state}
              />
            );
          });

          return (
            <g key={`s${si}`}>
              {/* stage container */}
              <rect
                x={r2(s.x)}
                y={r2(stageTop)}
                width={r2(s.w)}
                height={r2(stageH)}
                rx={RADIUS.frame}
                fill={COLOR.node}
                stroke={COLOR.fg}
                strokeWidth={STROKE.frame}
              />
              {/* bold stage title above the box */}
              <Label
                x={s.x + s.w / 2}
                y={stageTop - TITLE_GAP}
                text={s.title}
                size={FONT.title}
                weight={700}
                baseline="baseline"
              />
              {itemEls}
              {s.note && (
                <Label
                  x={s.x + s.w / 2}
                  y={lastItemBottom + NOTE_GAP + FONT.note / 2}
                  text={s.note}
                  size={FONT.note}
                  fill={COLOR.caption}
                />
              )}
            </g>
          );
        })}
      </DiagramSvg>
    </DiagramFigure>
  );
}
