import type { ReactNode } from "react";
import {
  Box,
  COLOR,
  DiagramFigure,
  DiagramSvg,
  FONT,
  Label,
  SPACE,
  STROKE,
  measureLabel,
  r2,
} from "@/components/diagram";

/**
 * An ER *relationship-instance* illustration in the textbook style: three
 * grouped sets drawn as ellipse boundaries, each holding concrete value
 * tuples, with dot anchors and polyline connectors threading entity to
 * relationship to entity, so each relationship tuple is shown as a physical
 * link between participating entity instances.
 *
 * This is deliberately *not* an ER schema diagram - there are no entity
 * rectangles or relationship diamonds (that is <ERDiagram>). Here every box is
 * a stored value tuple and every line is one row of the relationship instance.
 *
 * The author supplies three sets (left entity, middle relationship, right
 * entity) and the links between their member ids; the layout is derived. Items
 * stack vertically inside each group, value boxes are sized from real font
 * metrics so text never overflows, the group ellipse is sized to enclose its
 * items, anchor dots sit on the inner edge of the two entity groups and on the
 * relationship items, and each link is drawn as a two-segment polyline
 * left dot to middle dot to right dot. Rendered once on the server (no client
 * JS); all colour, stroke and type comes from the shared diagram theme, so it
 * re-themes on the light/dark switch with the rest of the family.
 */

/** A value tuple inside a set. `value` is the displayed text (e.g. an ssn,
 *  a did, or a date string). */
export interface ERValue {
  /** Stable id referenced by links. */
  id: string;
  /** Displayed tuple text. */
  value: string;
}

/** Visual style of a set's value items. */
export type ERItemStyle =
  /** Value box with a hairline border (Employees ssn, Departments did). */
  | "box"
  /** Bold bare text with no box (Works_In date tuples). */
  | "bare";

export interface ERSet {
  /** Bold heading rendered beneath the group. */
  label: string;
  /** Member value tuples, top to bottom. */
  items: ERValue[];
  /** How each item is drawn. Default "box". */
  itemStyle?: ERItemStyle;
  /** Which inner edge the anchor dots sit on, relative to the group:
   *  "right" (dots on the right of the boxes - a left entity set),
   *  "left" (dots on the left - a right entity set),
   *  "center" (dots centred under the text - the middle relationship set). */
  anchor?: "left" | "right" | "center";
}

/** One relationship-instance row: a member of the middle set linked to a
 *  member of each entity set. */
export interface ERLink {
  /** id of an item in the left set. */
  left: string;
  /** id of an item in the middle (relationship) set. */
  mid: string;
  /** id of an item in the right set. */
  right: string;
}

interface Props {
  /** Left entity set (e.g. Employees). */
  left: ERSet;
  /** Middle relationship set (e.g. Works_In). */
  mid: ERSet;
  /** Right entity set (e.g. Departments). */
  right: ERSet;
  /** Relationship-instance rows threading left to mid to right. */
  links: ERLink[];
  /** Bold heading inside the card (e.g. "Before"). */
  title?: string;
  caption?: string;
  className?: string;
}

// --- geometry -------------------------------------------------------------

const BOX_H = 26; // value-box height
const BOX_MIN_W = 34; // minimum value-box width
const ITEM_GAP = 12; // vertical gap between items in a set
const DOT_R = 3.2; // anchor dot radius
const DOT_GAP = 18; // gap from a box edge to its anchor dot
const COL_GAP = 96; // horizontal run between adjacent groups' dots
const ELLIPSE_PAD_X = 22; // horizontal padding of the group ellipse around content
const ELLIPSE_PAD_Y = 26; // vertical padding of the group ellipse around content
const LABEL_GAP = 14; // gap from the ellipse bottom to the set label

/** Values and set names are literal identifiers: keep "_" as a drawn low line
 *  instead of letting it trigger the Label subscript syntax. */
const literal = (s: string) => s.replace(/_/g, "_{_}");

/** Value-box width from real font metrics, so text never overflows. */
const boxWidth = (text: string) =>
  Math.max(BOX_MIN_W, measureLabel(literal(text), FONT.label) + 2 * SPACE.textPadX);

/** Bare tuple text width (the middle set's date tuples, set bold). */
const bareWidth = (text: string) => measureLabel(literal(text), FONT.label, 600);

const setLabelW = (s: ERSet) => measureLabel(literal(s.label), FONT.title, 700);

interface LaidItem extends ERValue {
  /** centre y of the item row */
  cy: number;
  /** anchor dot position */
  dotX: number;
  dotY: number;
}

interface LaidSet {
  label: string;
  itemStyle: ERItemStyle;
  anchor: "left" | "right" | "center";
  items: LaidItem[];
  /** group ellipse */
  ecx: number;
  ecy: number;
  erx: number;
  ery: number;
  /** label centre */
  labelX: number;
  labelY: number;
  /** widest item (used for column packing) */
  itemW: number;
}

export function ERInstanceMapping({
  left,
  mid,
  right,
  links,
  title,
  caption,
  className,
}: Props) {
  // Each set's intrinsic content height (items stacked with ITEM_GAP).
  const setContentH = (s: ERSet) =>
    s.items.length * BOX_H + (s.items.length - 1) * ITEM_GAP;

  const contentH = Math.max(setContentH(left), setContentH(mid), setContentH(right));

  // Vertical band: every set is centred on the same mid-line so the three
  // ellipses share a centre, exactly like the TikZ source.
  const bandCY = SPACE.margin + ELLIPSE_PAD_Y + contentH / 2;

  // Lay a set's items as a centred vertical stack and place its anchor dots.
  function layItems(s: ERSet): { items: LaidItem[]; itemW: number } {
    const n = s.items.length;
    const h = n * BOX_H + (n - 1) * ITEM_GAP;
    const top = bandCY - h / 2;
    const itemW = Math.max(
      BOX_MIN_W,
      ...s.items.map((it) =>
        (s.itemStyle ?? "box") === "bare" ? bareWidth(it.value) : boxWidth(it.value),
      ),
    );
    const items: LaidItem[] = s.items.map((it, i) => {
      const cy = top + i * (BOX_H + ITEM_GAP) + BOX_H / 2;
      return { ...it, cy, dotX: 0, dotY: cy };
    });
    return { items, itemW };
  }

  const L = layItems(left);
  const M = layItems(mid);
  const Rg = layItems(right);

  // Horizontal placement. Left group hugs the left margin (widened if its
  // label outgrows the ellipse); we then advance to the middle and right
  // groups. Dots sit on the inner edge of each entity group and centred on
  // the relationship items.
  //
  //  [ left boxes ][dotGap][L dots] --colGap-- [M dots/text] --colGap-- [R dots][dotGap][ right boxes ]

  // Left set: boxes on the left, dots on their right.
  const leftEcxRel = (L.itemW + DOT_GAP) / 2; // ellipse centre, right of the box edge
  const leftBoxLeft =
    SPACE.margin +
    ELLIPSE_PAD_X +
    Math.max(0, setLabelW(left) / 2 - leftEcxRel - ELLIPSE_PAD_X);
  const leftDotX = leftBoxLeft + L.itemW + DOT_GAP;
  for (const it of L.items) it.dotX = leftDotX;

  // Middle set: dots/text centred; anchor under text.
  const midDotX = leftDotX + COL_GAP;
  for (const it of M.items) it.dotX = midDotX;

  // Right set: dots on the left, boxes to their right.
  const rightDotX = midDotX + COL_GAP;
  const rightBoxLeft = rightDotX + DOT_GAP;
  const rightBoxRight = rightBoxLeft + Rg.itemW;
  for (const it of Rg.items) it.dotX = rightDotX;

  // Build the laid-out sets with their enclosing ellipses + labels.
  function makeSet(
    s: ERSet,
    laid: { items: LaidItem[]; itemW: number },
    extents: { left: number; right: number },
  ): LaidSet {
    const ecx = (extents.left + extents.right) / 2;
    const erx = (extents.right - extents.left) / 2 + ELLIPSE_PAD_X;
    const ery = contentH / 2 + ELLIPSE_PAD_Y;
    return {
      label: s.label,
      itemStyle: s.itemStyle ?? "box",
      anchor: s.anchor ?? "center",
      items: laid.items,
      ecx,
      ecy: bandCY,
      erx,
      ery,
      labelX: ecx,
      labelY: bandCY + ery + LABEL_GAP + FONT.title / 2,
      itemW: laid.itemW,
    };
  }

  // Extents enclose the visible content (boxes/text AND the dots) of each set.
  const leftSet = makeSet(left, L, { left: leftBoxLeft, right: leftDotX });
  const midSet = makeSet(mid, M, {
    left: midDotX - M.itemW / 2,
    right: midDotX + M.itemW / 2,
  });
  const rightSet = makeSet(right, Rg, {
    left: rightDotX,
    right: rightBoxRight,
  });

  const sets = [leftSet, midSet, rightSet];

  const idDot = (set: LaidSet, id: string) =>
    set.items.find((it) => it.id === id);

  // --- width / height -------------------------------------------------------
  const width =
    Math.max(
      rightSet.ecx + rightSet.erx,
      ...sets.map((s) => s.labelX + setLabelW(s) / 2),
    ) + SPACE.margin;
  const height = Math.max(...sets.map((s) => s.labelY)) + FONT.title / 2 + SPACE.margin;

  // --- connectors: left dot -> mid dot -> right dot --------------------------
  const linkEls = links.map((lk, i) => {
    const a = idDot(leftSet, lk.left);
    const b = idDot(midSet, lk.mid);
    const c = idDot(rightSet, lk.right);
    if (!a || !b || !c) return null;
    return (
      <polyline
        key={`lk${i}`}
        points={`${r2(a.dotX)},${r2(a.dotY)} ${r2(b.dotX)},${r2(b.dotY)} ${r2(c.dotX)},${r2(c.dotY)}`}
        fill="none"
        stroke={COLOR.muted}
        strokeWidth={STROKE.line}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  });

  // --- group ellipses + labels ---------------------------------------------
  const groupEls = sets.map((s, i) => (
    <g key={`grp${i}`}>
      <ellipse
        cx={r2(s.ecx)}
        cy={r2(s.ecy)}
        rx={r2(s.erx)}
        ry={r2(s.ery)}
        fill="none"
        stroke={COLOR.muted}
        strokeWidth={STROKE.frame}
      />
      <Label
        x={s.labelX}
        y={s.labelY}
        text={literal(s.label)}
        size={FONT.title}
        weight={700}
      />
    </g>
  ));

  // --- items: value boxes / bare text + anchor dots -------------------------
  function itemEls(s: LaidSet, side: "left" | "right" | "center") {
    return s.items.map((it) => {
      const els: ReactNode[] = [];
      if (s.itemStyle === "bare") {
        // Bare relationship tuple: bold text sitting just above its dot.
        els.push(
          <Label
            key={`${it.id}-t`}
            x={it.dotX}
            y={it.cy - BOX_H / 2 + 2}
            text={literal(it.value)}
            size={FONT.label}
            weight={600}
          />,
        );
      } else {
        const w = s.itemW;
        // Box hugs the outer edge; dot sits on the inner edge.
        const bx =
          side === "right"
            ? it.dotX - DOT_GAP - w // left entity: box left of its dot
            : it.dotX + DOT_GAP; // right entity: box right of its dot
        els.push(
          <Box
            key={`${it.id}-b`}
            x={bx}
            y={it.cy - BOX_H / 2}
            w={w}
            h={BOX_H}
            label={literal(it.value)}
          />,
        );
      }
      // Anchor dot.
      els.push(
        <circle
          key={`${it.id}-d`}
          cx={r2(it.dotX)}
          cy={r2(it.dotY)}
          r={DOT_R}
          fill={COLOR.fg}
        />,
      );
      return <g key={it.id}>{els}</g>;
    });
  }

  return (
    <DiagramFigure title={title} caption={caption} className={className}>
      <DiagramSvg
        w={width}
        h={height}
        label={caption ?? "ER relationship-instance diagram"}
      >
        {linkEls}
        {groupEls}
        {itemEls(leftSet, "right")}
        {itemEls(midSet, "center")}
        {itemEls(rightSet, "left")}
      </DiagramSvg>
    </DiagramFigure>
  );
}
