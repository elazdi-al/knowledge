/**
 * `FrameSvg`: pure SVG for one laid-out frame. No hooks, no state.
 *
 * Fills follow nesting: a top-level node is a soft panel on the canvas, a
 * group is a panel, and what sits inside a panel is a light surface (and the
 * other way round one level deeper), so nested figures read by contrast alone.
 */
import type { CSSProperties, ReactNode } from "react";
import { cellSize, chipW, nodeTitleStyle, nodeTitleW, tableColumnWidths } from "./layout";
import { measureStyle } from "./measure";
import type { Frame, Item, Rect, State, TableCell, Tone } from "./model";
import { routeItems, type Pt, type RoutedEdge } from "./route";
import { Label, styled } from "./text";
import { CELL, FONT, GROUP, NODE, RADIUS, STROKE, TABLE, TEXT, r2 } from "./theme";

const V = (name: string) => `var(--dg-${name})`;
const tint = (t: Tone) => V(`${t}-tint`);
const line = (t: Tone) => V(`${t}-line`);
const solid = (t: Tone) => V(`${t}-solid`);
const ink = (t: Tone) => V(`${t}-ink`);
/** The accent ("this one") is the blue tone. */
const ACCENT: Tone = "blue";

interface Look {
  fill: string;
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  text: string;
  sub: string;
  italic: boolean;
}

type Ground = "panel" | "surface";

/** How an item in `state` (and optional `tone`) is painted, given its own fill and neutral border. */
function lookOf(state: State, uid: string, fill: string, tone?: Tone, edge = V("panel-edge")): Look {
  const base: Look = { fill, stroke: edge, strokeWidth: STROKE.border, dashed: false, text: V("ink"), sub: V("muted"), italic: false };
  const toned = (t: Tone): Look => ({ ...base, fill: tint(t), stroke: line(t), text: ink(t), sub: ink(t) });
  switch (state) {
    case "active":
      return toned(ACCENT);
    case "strong":
      return { ...(tone ? toned(tone) : base), stroke: tone ? solid(tone) : V("text"), strokeWidth: STROKE.strong };
    case "placeholder":
      return { ...base, fill: "none", stroke: V("rule"), dashed: true, text: V("muted"), italic: true };
    case "free":
      return { ...base, fill: `url(#${uid}-hatch)`, stroke: V("rule"), dashed: true, text: V("muted") };
    case "ghost":
      return { ...base, fill: "none", stroke: V("faint"), text: V("faint"), sub: V("faint") };
    default:
      return tone ? toned(tone) : base;
  }
}

const shapeStyle = (l: Look): CSSProperties => ({
  fill: l.fill,
  stroke: l.stroke,
  strokeWidth: l.strokeWidth,
  strokeDasharray: l.dashed ? STROKE.dash : undefined,
});

const R = (r: Rect) => ({ x: r2(r.x), y: r2(r.y), width: r2(r.w), height: r2(r.h) });

/** Small chip centred on a node's or group's top edge. */
function Badge({ text, tone, cx, y }: { text: string; tone?: Tone; cx: number; y: number }) {
  const s = NODE.badge;
  const w = Math.max(s, measureStyle(text, TEXT.badge) + 10);
  return (
    <g>
      <rect
        x={r2(cx - w / 2)}
        y={r2(y - s / 2)}
        width={r2(w)}
        height={s}
        rx={s / 2}
        style={{ fill: tone ? tint(tone) : V("surface"), stroke: tone ? line(tone) : V("rule"), strokeWidth: STROKE.border }}
      />
      <Label x={cx} y={y} {...styled(text, TEXT.badge)} fill={tone ? ink(tone) : V("text")} />
    </g>
  );
}

const diamondPoints = (r: Rect, inset = 0) => {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, hw0 = r.w / 2, hh0 = r.h / 2;
  // offsetting a rhombus keeps its angles: shrink each half-axis by inset * diagonal / other half-axis
  const d = Math.hypot(hw0, hh0);
  const hw = hw0 - (inset * d) / hh0, hh = hh0 - (inset * d) / hw0;
  return [
    [cx, cy - hh],
    [cx + hw, cy],
    [cx, cy + hh],
    [cx - hw, cy],
  ]
    .map(([x, y]) => `${r2(x)},${r2(y)}`)
    .join(" ");
};
const trianglePoints = (r: Rect) => `${r2(r.x)},${r2(r.y)} ${r2(r.x + r.w)},${r2(r.y)} ${r2(r.x + r.w / 2)},${r2(r.y + r.h)}`;

function cylinderPath(r: Rect): string {
  const ry = NODE.cap / 2, rx = r.w / 2;
  const top = r.y + ry, bottom = r.y + r.h - ry;
  return [
    `M${r2(r.x)},${r2(top)}`,
    `A${r2(rx)},${ry} 0 0 1 ${r2(r.x + r.w)},${r2(top)}`,
    `L${r2(r.x + r.w)},${r2(bottom)}`,
    `A${r2(rx)},${ry} 0 0 1 ${r2(r.x)},${r2(bottom)}`,
    "Z",
  ].join(" ");
}

// --- per-kind drawing -------------------------------------------------------

type NodeItem = Extract<Item, { kind: "node" }>;

function nodeNode(it: NodeItem, ground: Ground, uid: string): ReactNode {
  const r = it.rect;
  // a grey node on a light ground needs a firmer outline than a light node on a grey panel
  const l = ground === "panel" ? lookOf(it.state, uid, V("surface"), it.tone) : lookOf(it.state, uid, V("panel"), it.tone, V("rule"));
  const st = shapeStyle(l);
  const inner = { ...st, fill: "none" };
  const d = NODE.doubleInset;
  let shape: ReactNode;
  switch (it.shape) {
    case "circle": {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rad = Math.min(r.w, r.h) / 2;
      shape = (
        <>
          <circle cx={r2(cx)} cy={r2(cy)} r={r2(rad)} style={st} />
          {it.double && <circle cx={r2(cx)} cy={r2(cy)} r={r2(rad - d)} style={inner} />}
        </>
      );
      break;
    }
    case "cylinder":
      shape = (
        <>
          <path d={cylinderPath(r)} style={st} />
          <ellipse cx={r2(r.x + r.w / 2)} cy={r2(r.y + NODE.cap / 2)} rx={r2(r.w / 2)} ry={NODE.cap / 2} style={inner} />
        </>
      );
      break;
    case "diamond":
      shape = (
        <>
          <polygon points={diamondPoints(r)} style={st} />
          {it.double && <polygon points={diamondPoints(r, d)} style={inner} />}
        </>
      );
      break;
    case "triangle":
      shape = <polygon points={trianglePoints(r)} style={{ ...st, strokeLinejoin: "round" }} />;
      break;
    default: {
      const rx = it.shape === "pill" ? r.h / 2 : RADIUS.node;
      shape = (
        <>
          <rect {...R(r)} rx={r2(rx)} style={st} />
          {it.double && <rect {...R({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d })} rx={r2(Math.max(0, rx - d))} style={inner} />}
        </>
      );
    }
  }

  const cy = r.y + r.h / 2 + (it.shape === "cylinder" ? NODE.cap / 2 : 0);
  const x = it.align === "start" ? r.x + NODE.padX : r.x + r.w / 2;
  const anchor = it.align === "start" ? "start" : "middle";
  const title = nodeTitleStyle(it);
  const titleY = it.shape === "triangle" ? r.y + 0.4 * r.h : it.sub ? cy - 7.5 : cy;
  const titleW = nodeTitleW(it);
  const ux = anchor === "start" ? x : x - titleW / 2;
  return (
    <g key={it.id}>
      {shape}
      {it.title && <Label x={x} y={titleY} text={it.title} size={title.size} weight={title.weight} mono={title.mono} italic={l.italic} fill={l.text} anchor={anchor} />}
      {it.title && it.underline && (
        <line
          x1={r2(ux)}
          x2={r2(ux + titleW)}
          y1={r2(titleY + title.size / 2 + 2)}
          y2={r2(titleY + title.size / 2 + 2)}
          style={{ stroke: l.text, strokeWidth: STROKE.border, strokeDasharray: it.underline === "dashed" ? "3 2" : undefined }}
        />
      )}
      {it.sub && <Label x={x} y={cy + 8.5} text={it.sub} size={FONT.note} fill={l.sub} italic={l.italic} anchor={anchor} />}
      {it.badge && <Badge text={it.badge} tone={it.tone} cx={r.x + r.w / 2} y={r.y} />}
    </g>
  );
}

function groupNode(it: Extract<Item, { kind: "group" }>, ground: Ground | undefined, uid: string): ReactNode {
  const r = it.rect;
  const own = it.dashed ? "none" : V(ground === "panel" ? "surface" : "panel");
  const l = lookOf(it.state, uid, own, it.tone);
  const fill = it.state === "default" || it.state === "strong" ? own : l.fill;
  const titleFill = it.state === "ghost" ? V("faint") : it.state === "active" ? ink(ACCENT) : it.tone ? ink(it.tone) : V("text");
  return (
    <g key={it.id}>
      <rect {...R(r)} rx={RADIUS.group} style={{ ...shapeStyle(l), fill, strokeDasharray: it.dashed || l.dashed ? STROKE.dash : undefined }} />
      {it.title && <Label x={r.x + r.w / 2} y={r.y + it.pad + GROUP.titleBand / 2 - 3} {...styled(it.title, TEXT.groupTitle)} fill={titleFill} italic={l.italic} />}
      {it.badge && <Badge text={it.badge} tone={it.tone} cx={r.x + r.w / 2} y={r.y} />}
    </g>
  );
}

/** Fill behind a cell or row: its state's fill, else its tone's tint, else nothing. */
function cellFill(c: { state: State; tone?: Tone }, uid: string): string {
  if (c.state === "default") return c.tone ? tint(c.tone) : "none";
  return lookOf(c.state, uid, "none", c.tone).fill;
}

/** Paint order for per-cell and per-row outlines: a shared divider is owned by the state painted last. */
const OUTLINE_ORDER: Record<State, number> = { default: 0, ghost: 1, placeholder: 2, free: 3, active: 4, strong: 5 };
const byOutline = (a: Item, b: Item) => OUTLINE_ORDER[a.state] - OUTLINE_ORDER[b.state];

const corner = (r: number, x: number, y: number) => (r > 0 ? `A${r2(r)},${r2(r)} 0 0 1 ${r2(x)},${r2(y)}` : `L${r2(x)},${r2(y)}`);
/** Rect path with one radius per corner (top-left, top-right, bottom-right, bottom-left). */
function cornerPath(r: Rect, [tl, tr, br, bl]: number[]): string {
  const x1 = r.x + r.w, y1 = r.y + r.h;
  return [
    `M${r2(r.x + tl)},${r2(r.y)}`,
    `L${r2(x1 - tr)},${r2(r.y)}`,
    corner(tr, x1, r.y + tr),
    `L${r2(x1)},${r2(y1 - br)}`,
    corner(br, x1 - br, y1),
    `L${r2(r.x + bl)},${r2(y1)}`,
    corner(bl, r.x, y1 - bl),
    `L${r2(r.x)},${r2(r.y + tl)}`,
    corner(tl, r.x + tl, r.y),
    "Z",
  ].join(" ");
}

/** A stated cell's or row's outline, painted over the strip frame and dividers; rounded where it shares the frame's corners. */
function stateOutline(c: Item, frame: Rect, rx: number, uid: string): ReactNode {
  if (c.state === "default") return null;
  const r = c.rect;
  const eq = (a: number, b: number) => Math.abs(a - b) < 0.5;
  const left = eq(r.x, frame.x), right = eq(r.x + r.w, frame.x + frame.w);
  const top = eq(r.y, frame.y), bottom = eq(r.y + r.h, frame.y + frame.h);
  const radii = [left && top ? rx : 0, right && top ? rx : 0, right && bottom ? rx : 0, left && bottom ? rx : 0];
  return <path d={cornerPath(r, radii)} style={{ ...shapeStyle(lookOf(c.state, uid, "none", c.tone)), fill: "none" }} />;
}

/** Strip look: data structures are light surfaces with a rule border wherever they sit. */
function stripLook(state: State, uid: string): Look {
  const l = lookOf(state, uid, V("surface"));
  return state === "default" ? { ...l, stroke: V("rule") } : l;
}

function cellsNode(it: Extract<Item, { kind: "cells" }>, kids: Item[], uid: string): ReactNode {
  const r = it.rect;
  const l = stripLook(it.state, uid);
  const { s, h: cellH } = cellSize(it);
  const grid = it.cols ?? 0;
  const frame: Rect = grid || it.dir === "col" ? { x: r.x, y: r.y, w: r.w - (!grid && it.index ? CELL.index : 0), h: r.h } : { x: r.x, y: r.y, w: r.w, h: cellH };
  const ell = (side: "start" | "end") => (!grid && (it.ellipsis === side || it.ellipsis === "both") ? CELL.ellipsis : 0);
  const inner: Rect =
    it.dir === "row"
      ? { x: frame.x + ell("start"), y: frame.y, w: frame.w - ell("start") - ell("end"), h: frame.h }
      : { x: frame.x, y: frame.y + ell("start"), w: frame.w, h: frame.h - ell("start") - ell("end") };
  const rx = Math.min(RADIUS.cell, s / 4);
  const divider = { stroke: l.stroke, strokeWidth: STROKE.divider };
  const cells = kids.filter((c): c is Extract<Item, { kind: "cell" }> => c.kind === "cell");
  const dividers = grid
    ? [
        ...Array.from({ length: grid - 1 }, (_, c) => {
          const x = r2(inner.x + (c + 1) * s);
          return <line key={`c${c}`} x1={x} y1={r2(inner.y)} x2={x} y2={r2(inner.y + inner.h)} style={divider} />;
        }),
        ...Array.from({ length: Math.ceil(cells.length / grid) - 1 }, (_, i) => {
          const y = r2(inner.y + (i + 1) * cellH);
          return <line key={`r${i}`} x1={r2(inner.x)} y1={y} x2={r2(inner.x + inner.w)} y2={y} style={divider} />;
        }),
      ]
    : cells.map((c) => {
        const cr = c.rect;
        if (Math.abs(it.dir === "row" ? cr.x - inner.x : cr.y - inner.y) < 0.5) return null;
        return it.dir === "row" ? (
          <line key={c.id} x1={r2(cr.x)} y1={r2(inner.y)} x2={r2(cr.x)} y2={r2(inner.y + inner.h)} style={divider} />
        ) : (
          <line key={c.id} x1={r2(inner.x)} y1={r2(cr.y)} x2={r2(inner.x + inner.w)} y2={r2(cr.y)} style={divider} />
        );
      });
  const clip = `${uid}-${it.id.replace(/[^a-z0-9_-]/gi, "_")}`;
  const dots = (cx: number, cy: number) => (
    <g style={{ fill: V("muted") }}>
      {[-1, 0, 1].map((k) => (
        <circle key={k} cx={r2(it.dir === "row" ? cx + k * 5 : cx)} cy={r2(it.dir === "row" ? cy : cy + k * 5)} r={1.5} />
      ))}
    </g>
  );
  return (
    <g key={it.id}>
      <clipPath id={clip}>
        <rect {...R(inner)} rx={rx} />
      </clipPath>
      <rect {...R(inner)} rx={rx} style={{ ...shapeStyle(l), stroke: "none" }} />
      <g clipPath={`url(#${clip})`}>
        {cells.map((c) => (
          <rect key={c.id} {...R(c.rect)} style={{ fill: cellFill(c, uid) }} />
        ))}
      </g>
      {dividers}
      <rect {...R(inner)} rx={rx} style={{ ...shapeStyle(l), fill: "none" }} />
      {ell("start") > 0 && dots(it.dir === "row" ? frame.x + CELL.ellipsis / 2 : frame.x + frame.w / 2, it.dir === "row" ? frame.y + frame.h / 2 : frame.y + CELL.ellipsis / 2)}
      {ell("end") > 0 && dots(it.dir === "row" ? frame.x + frame.w - CELL.ellipsis / 2 : frame.x + frame.w / 2, it.dir === "row" ? frame.y + frame.h / 2 : frame.y + frame.h - CELL.ellipsis / 2)}
      {[...cells].sort(byOutline).map((c) => (
        <g key={c.id}>
          {stateOutline(c, inner, rx, uid)}
          {cellContent(c, it, uid)}
        </g>
      ))}
    </g>
  );
}

function cellContent(c: Extract<Item, { kind: "cell" }>, parent: Extract<Item, { kind: "cells" }>, uid: string): ReactNode {
  const r = c.rect;
  const l = lookOf(c.state, uid, "none", c.tone);
  const { s } = cellSize(parent);
  const cy = r.y + s / 2;
  return (
    <>
      {c.label && (
        <Label
          x={r.x + r.w / 2}
          y={c.sub ? cy - 5 : cy}
          text={c.label}
          size={c.mono ? FONT.mono : FONT.label}
          weight={c.state === "strong" ? 600 : undefined}
          mono={c.mono}
          fill={l.text}
          italic={l.italic}
        />
      )}
      {c.sub && <Label x={r.x + r.w / 2} y={cy + 8} text={c.sub} size={FONT.note - 1} fill={l.sub} />}
      {c.index !== undefined &&
        (parent.dir === "row" ? (
          <Label x={r.x + r.w / 2} y={r.y + r.h + CELL.index / 2 + 1} text={String(c.index)} size={FONT.note - 1.5} fill={V("muted")} mono />
        ) : (
          <Label x={r.x + r.w + CELL.index / 2 + 2} y={cy} text={String(c.index)} size={FONT.note - 1.5} fill={V("muted")} mono />
        ))}
    </>
  );
}

function tableCellNode(cell: TableCell, x: number, cy: number, mono: boolean, color: string, italic: boolean): ReactNode {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === "object") {
    const isMono = cell.mono ?? mono;
    if (cell.tone) {
      const w = chipW(cell.text, isMono);
      const h = 18;
      return (
        <g>
          <rect
            x={r2(x)}
            y={r2(cy - h / 2)}
            width={r2(w)}
            height={h}
            rx={4}
            style={{ fill: cell.solid ? solid(cell.tone) : tint(cell.tone), stroke: cell.solid ? "none" : line(cell.tone), strokeWidth: STROKE.border }}
          />
          <Label x={x + w / 2} y={cy} {...styled(cell.text, { ...TEXT.chip, mono: isMono })} fill={cell.solid ? V("surface") : ink(cell.tone)} />
        </g>
      );
    }
    return <Label x={x} y={cy} text={cell.text} size={isMono ? FONT.mono : FONT.label} mono={isMono} fill={color} anchor="start" italic={italic} />;
  }
  return <Label x={x} y={cy} text={String(cell)} size={mono ? FONT.mono : FONT.label} mono={mono} fill={color} anchor="start" italic={italic} />;
}

function tableNode(it: Extract<Item, { kind: "table" }>, kids: Item[], uid: string): ReactNode {
  const r = it.rect;
  const empty = it.rows.length === 0 && !it.columns;
  const l = empty ? lookOf("placeholder", uid, "none") : stripLook(it.state, uid);
  if (empty) {
    return (
      <g key={it.id}>
        <rect {...R(r)} rx={RADIUS.cell} style={shapeStyle(l)} />
        {it.empty && <Label x={r.x + r.w / 2} y={r.y + r.h / 2} text={it.empty} size={FONT.label} fill={l.text} italic />}
      </g>
    );
  }
  const widths = tableColumnWidths(it.columns, it.rows, it.mono);
  const colX: number[] = [];
  let acc = r.x;
  widths.forEach((w, i) => {
    colX[i] = acc;
    acc += w;
  });
  const headerH = it.columns ? TABLE.rowH : 0;
  const rows = kids.filter((k): k is Extract<Item, { kind: "trow" }> => k.kind === "trow");
  const clip = `${uid}-${it.id.replace(/[^a-z0-9_-]/gi, "_")}`;
  const rule = { stroke: l.stroke, strokeWidth: STROKE.divider };
  return (
    <g key={it.id}>
      <clipPath id={clip}>
        <rect {...R(r)} rx={RADIUS.cell} />
      </clipPath>
      <rect {...R(r)} rx={RADIUS.cell} style={{ ...shapeStyle(l), stroke: "none" }} />
      <g clipPath={`url(#${clip})`}>
        {it.columns && <rect x={r2(r.x)} y={r2(r.y)} width={r2(r.w)} height={headerH} style={{ fill: V("panel") }} />}
        {rows.map((row) => {
          const fill = cellFill(row, uid);
          return fill === "none" ? null : <rect key={row.id} {...R(row.rect)} style={{ fill }} />;
        })}
      </g>
      {it.columns && it.columns.map((c, i) => <Label key={i} x={colX[i] + TABLE.padX} y={r.y + headerH / 2} {...styled(c, TEXT.tableHeader)} fill={V("muted")} anchor="start" />)}
      {rows.map((row, i) => (i === 0 && !it.columns ? null : <line key={row.id} x1={r2(r.x)} y1={r2(row.rect.y)} x2={r2(r.x + r.w)} y2={r2(row.rect.y)} style={rule} />))}
      {it.columns && colX.slice(1).map((x, i) => <line key={i} x1={r2(x)} y1={r2(r.y)} x2={r2(x)} y2={r2(r.y + r.h)} style={rule} />)}
      <rect {...R(r)} rx={RADIUS.cell} style={{ ...shapeStyle(l), fill: "none" }} />
      {[...rows].sort(byOutline).map((row) => {
        const rl = lookOf(row.state, uid, "none", row.tone);
        return (
          <g key={row.id}>
            {stateOutline(row, r, RADIUS.cell, uid)}
            {row.cells.map((cell, ci) => (
              <g key={ci}>{tableCellNode(cell, colX[ci] + TABLE.padX, row.rect.y + row.rect.h / 2, row.mono, rl.text, rl.italic)}</g>
            ))}
          </g>
        );
      })}
    </g>
  );
}

function textNode(it: Extract<Item, { kind: "text" }>): ReactNode {
  const r = it.rect;
  const px = { title: FONT.title, label: FONT.label, note: FONT.note }[it.size];
  const weight = it.weight ?? (it.size === "title" ? 600 : 400);
  const fill =
    it.state === "active" ? ink(ACCENT) : it.state === "ghost" ? V("faint") : it.tone ? ink(it.tone) : it.muted || it.state === "placeholder" ? V("muted") : V("ink");
  return (
    <Label key={it.id} x={r.x + r.w / 2} y={r.y + r.h / 2} text={it.text} size={it.mono ? px - 0.5 : px} weight={weight} mono={it.mono} fill={fill} italic={it.state === "placeholder"} />
  );
}

function tagNode(it: Extract<Item, { kind: "tag" }>): ReactNode {
  const r = it.rect;
  const tone = it.state === "active" ? ACCENT : it.tone;
  const ghost = it.state === "ghost";
  return (
    <g key={it.id}>
      <rect {...R(r)} rx={RADIUS.tag} style={{ fill: ghost ? "none" : tone ? tint(tone) : V("panel"), stroke: ghost ? V("faint") : tone ? line(tone) : "none", strokeWidth: STROKE.border }} />
      <Label x={r.x + r.w / 2} y={r.y + r.h / 2} {...styled(it.text, TEXT.tag)} fill={ghost ? V("faint") : tone ? ink(tone) : V("muted")} />
    </g>
  );
}

function dotsNode(it: Extract<Item, { kind: "dots" }>): ReactNode {
  const r = it.rect;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  return (
    <g key={it.id} style={{ fill: it.state === "ghost" ? V("faint") : V("muted") }}>
      {[-1, 0, 1].map((k) => (
        <circle key={k} cx={r2(it.dir === "row" ? cx + k * 6 : cx)} cy={r2(it.dir === "row" ? cy : cy + k * 6)} r={1.6} />
      ))}
    </g>
  );
}

// --- edges --------------------------------------------------------------------

function chevron(p: Pt, angle: number, s: number): string {
  const a = 0.62;
  const l = { x: p.x - s * Math.cos(angle - a), y: p.y - s * Math.sin(angle - a) };
  const rr = { x: p.x - s * Math.cos(angle + a), y: p.y - s * Math.sin(angle + a) };
  return `M${r2(l.x)},${r2(l.y)} L${r2(p.x)},${r2(p.y)} L${r2(rr.x)},${r2(rr.y)}`;
}

function edgeNode(e: RoutedEdge): ReactNode {
  const { spec } = e;
  const tone = spec.state === "active" ? ACCENT : spec.tone;
  const colour = spec.state === "ghost" ? V("faint") : tone ? solid(tone) : V("line");
  const width = spec.thick ? STROKE.thick : STROKE.edge;
  const head = STROKE.head * Math.sqrt(width / STROKE.edge);
  const stroke: CSSProperties = { stroke: colour, strokeWidth: width, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <g key={spec.id}>
      <path d={e.d} style={{ ...stroke, strokeDasharray: spec.dashed ? STROKE.dash : undefined }} />
      {spec.head !== "none" && <path d={chevron(e.pts[e.pts.length - 1], e.endAngle, head)} style={stroke} />}
      {spec.head === "both" && <path d={chevron(e.pts[0], e.startAngle, head)} style={stroke} />}
      {spec.label && e.label && (
        <Label x={e.label.x} y={e.label.y} {...styled(spec.label, TEXT.edgeLabel)} fill={spec.state === "ghost" ? V("faint") : tone ? ink(tone) : V("text")} halo />
      )}
    </g>
  );
}

export interface FrameSvgProps {
  frame: Frame;
  /** accessible description */
  label: string;
  /** unique id prefix for patterns and clips */
  uid: string;
}

export function FrameSvg({ frame, label, uid }: FrameSvgProps) {
  const byId = new Map(frame.items.map((it) => [it.id, it]));
  const byParent = new Map<string, Item[]>();
  for (const it of frame.items) {
    if (!it.parent) continue;
    byParent.set(it.parent, [...(byParent.get(it.parent) ?? []), it]);
  }
  /** The fill of the nearest painted group around an item, if any. */
  const ground = (it: Item): Ground | undefined => {
    for (let p = it.parent && byId.get(it.parent); p; p = p.parent ? byId.get(p.parent) : undefined) {
      if (p.kind === "group" && !p.dashed) return ground(p) === "panel" ? "surface" : "panel";
    }
    return undefined;
  };

  const draw = (it: Item): ReactNode => {
    switch (it.kind) {
      case "node":
        return nodeNode(it, ground(it) ?? "surface", uid);
      case "group":
        return groupNode(it, ground(it), uid);
      case "cells":
        return cellsNode(it, byParent.get(it.id) ?? [], uid);
      case "table":
        return tableNode(it, byParent.get(it.id) ?? [], uid);
      case "text":
        return textNode(it);
      case "tag":
        return tagNode(it);
      case "dots":
        return dotsNode(it);
      default:
        return null;
    }
  };

  return (
    <svg
      width={r2(frame.w)}
      viewBox={`0 0 ${r2(frame.w)} ${r2(frame.h)}`}
      role="img"
      aria-label={label}
      fontFamily="var(--font-sans, ui-sans-serif, system-ui, sans-serif)"
      style={{ maxWidth: "100%", height: "auto", display: "block", color: V("ink") }}
    >
      <defs>
        <pattern id={`${uid}-hatch`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: V("hatch"), strokeWidth: 2.5 }} />
        </pattern>
      </defs>
      {frame.items.map(draw)}
      {routeItems(frame.items, frame.edges).map(edgeNode)}
    </svg>
  );
}

