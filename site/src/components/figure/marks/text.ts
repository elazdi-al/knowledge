/** Small marks: text, tags and ellipsis dots. */
import { COMMON, mark, type Common, type Marker } from "../mark";
import { measure, measureStyle } from "../measure";
import type { Dir, TextSize, Weight } from "../model";
import { ACCENT, group, ink, line, rect, shownTone, styled, tint, V } from "../paint";
import { FONT, LINE_H, RADIUS, STROKE, TAG, TEXT, r2 } from "../theme";

export interface TextProps extends Common {
  text: string;
  size?: TextSize;
  muted?: boolean;
  mono?: boolean;
  weight?: Weight;
}
interface TextData {
  text: string;
  size: TextSize;
  muted: boolean;
  mono: boolean;
  weight: Weight;
}

const TEXT_PX = { title: FONT.title, label: FONT.label, note: FONT.note } as const;
const textPx = (d: TextData) => (d.mono ? TEXT_PX[d.size] - 0.5 : TEXT_PX[d.size]);

export const Text: Marker<TextProps> = mark<TextProps, TextData>({
  kind: "text",
  solid: true,
  props: { ...COMMON, text: true, size: ["title", "label", "note"], muted: true, mono: true, weight: true },
  data: (p) => {
    const size = p.size ?? "label";
    return { text: p.text ?? "", size, muted: p.muted === true, mono: p.mono === true, weight: p.weight ?? (size === "title" ? 600 : 400) };
  },
  size: ({ data: d }) => ({ w: measure(d.text, textPx(d), { mono: d.mono, weight: d.weight }), h: LINE_H[d.size] }),
  paint(it) {
    const r = it.rect;
    const d = it.data;
    const fill = it.state === "active" ? ink(ACCENT) : it.state === "ghost" ? V("faint") : it.tone ? ink(it.tone) : d.muted || it.state === "placeholder" ? V("muted") : V("ink");
    return [{ el: "text", x: r.x + r.w / 2, y: r.y + r.h / 2, text: d.text, size: textPx(d), weight: d.weight, mono: d.mono, fill, italic: it.state === "placeholder" }];
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
