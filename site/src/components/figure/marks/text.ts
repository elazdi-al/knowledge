/** Small marks: text, tags and ellipsis dots. */
import { COMMON, mark, type Common, type Marker } from "../mark";
import { measure, measureStyle, wrapLines } from "../measure";
import type { Dir, Op, TextSize, Weight } from "../model";
import { ACCENT, group, ink, line, rect, shownTone, styled, tint, V } from "../paint";
import { FONT, LINE_H, RADIUS, STROKE, TAG, TEXT, r2 } from "../theme";

export interface TextProps extends Common {
  /** the text, or put it in the children; `\n` breaks a line */
  text?: string;
  children?: string | number | (string | number)[];
  size?: TextSize;
  muted?: boolean;
  mono?: boolean;
  weight?: Weight;
  /** wrap at spaces to fit this many px */
  maxWidth?: number;
  /** how lines sit against each other */
  align?: "start" | "center" | "end";
  /** degrees clockwise around its centre */
  rotate?: number;
}
interface TextData {
  lines: string[];
  size: TextSize;
  muted: boolean;
  mono: boolean;
  weight: Weight;
  align: "start" | "center" | "end";
  rotate?: number;
}

const TEXT_PX = { title: FONT.title, label: FONT.label, note: FONT.note } as const;
const textPx = (d: TextData) => (d.mono ? TEXT_PX[d.size] - 0.5 : TEXT_PX[d.size]);

const lineW = (d: Pick<TextData, "size" | "mono" | "weight">, line: string) => measure(line, textPx(d as TextData), { mono: d.mono, weight: d.weight });
const textBox = (d: TextData) => ({ w: Math.max(...d.lines.map((l) => lineW(d, l))), h: d.lines.length * LINE_H[d.size] });

export const Text: Marker<TextProps> = mark<TextProps, TextData>({
  kind: "text",
  solid: true,
  props: { ...COMMON, text: true, children: true, size: ["title", "label", "note"], muted: true, mono: true, weight: true, maxWidth: "number", align: ["start", "center", "end"], rotate: "number" },
  data: (p) => {
    const size = p.size ?? "label";
    const mono = p.mono === true;
    const weight = p.weight ?? (size === "title" ? 600 : 400);
    const text = p.text ?? [p.children ?? ""].flat().join("");
    return { lines: wrapLines(text, p.maxWidth, (l) => lineW({ size, mono, weight }, l)), size, muted: p.muted === true, mono, weight, align: p.align ?? "center", rotate: p.rotate };
  },
  size({ data: d }) {
    const { w, h } = textBox(d);
    if (!d.rotate) return { w, h };
    const a = (d.rotate * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    return { w: w * c + h * s, h: w * s + h * c };
  },
  paint(it) {
    const r = it.rect;
    const d = it.data;
    const fill = it.state === "active" ? ink(ACCENT) : it.state === "ghost" ? V("faint") : it.tone ? ink(it.tone) : d.muted || it.state === "placeholder" ? V("muted") : V("ink");
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const { w } = textBox(d);
    const x = d.align === "start" ? cx - w / 2 : d.align === "end" ? cx + w / 2 : cx;
    const anchor = d.align === "start" ? ("start" as const) : d.align === "end" ? ("end" as const) : undefined;
    const lines = d.lines.map((text, i): Op => ({ el: "text", x, y: cy + (i - (d.lines.length - 1) / 2) * LINE_H[d.size], text, size: textPx(d), weight: d.weight, mono: d.mono, fill, italic: it.state === "placeholder", anchor }));
    return d.rotate ? [{ el: "g", transform: `rotate(${d.rotate} ${r2(cx)} ${r2(cy)})`, kids: lines }] : lines;
  },
});

export interface TagProps extends Common {
  text: string;
}

export const Tag: Marker<TagProps> = mark<TagProps, { text: string }>({
  kind: "tag",
  solid: true,
  obstacle: true,
  props: { ...COMMON, text: true },
  data: (p) => ({ text: p.text ?? "" }),
  size: ({ data }) => ({ w: measureStyle(data.text, TEXT.tag) + 2 * TAG.padX, h: TAG.h }),
  paint(it) {
    const r = it.rect;
    const tone = shownTone(it.state, it.tone);
    const ghost = it.state === "ghost";
    return [
      group(
        rect(r, { fill: ghost ? "none" : tone ? tint(tone) : V("panel"), stroke: ghost ? V("faint") : tone ? line(tone) : "none", strokeWidth: STROKE.border }, RADIUS.tag),
        { el: "text", x: r.x + r.w / 2, y: r.y + r.h / 2, ...styled(it.data.text, TEXT.tag), fill: ghost ? V("faint") : tone ? ink(tone) : V("muted") },
      ),
    ];
  },
});

export interface DotsProps extends Common {
  dir?: Dir;
}

export const Dots: Marker<DotsProps> = mark<DotsProps, { dir: Dir }>({
  kind: "dots",
  solid: true,
  props: { ...COMMON, dir: ["row", "col"] },
  data: (p) => ({ dir: p.dir ?? "row" }),
  size: ({ data }) => (data.dir === "row" ? { w: 18, h: 6 } : { w: 6, h: 18 }),
  paint(it) {
    const r = it.rect;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, row = it.data.dir === "row";
    return [
      {
        el: "g",
        style: { fill: it.state === "ghost" ? V("faint") : V("muted") },
        kids: [-1, 0, 1].map((k) => ({ el: "circle", cx: r2(row ? cx + k * 6 : cx), cy: r2(row ? cy : cy + k * 6), r: 1.6 })),
      },
    ];
  },
});
