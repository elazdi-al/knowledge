/** A bracket that spans marks from outside, with a label; drawn after layout, so nothing has to reserve its room by hand. */
import { mark, type Marker } from "../mark";
import type { Box, Op, Rect, Side, Tone } from "../model";
import { SIDES, TONES } from "../model";
import { ink, line, V } from "../paint";
import { measure } from "../measure";
import { FONT, LINE_H, STROKE, r2 } from "../theme";

export interface BraceProps {
  from: string;
  to: string;
  side?: Side;
  label?: string;
  tone?: Tone;
}
type BraceData = Required<Pick<BraceProps, "from" | "to" | "side">> & Pick<BraceProps, "label" | "tone">;

const OFF = 6, DEPTH = 7;

export const Brace: Marker<BraceProps> = mark<BraceProps, BraceData>({
  kind: "brace",
  props: { from: true, to: true, side: SIDES, label: true, tone: TONES },
  data: (p) => ({ from: p.from, to: p.to, side: p.side ?? "bottom", label: p.label, tone: p.tone }),
  refs: (d) => [d.from, d.to],
  overlay(d, box) {
    const owner = (b: Box) => (b.parent && b.kind.endsWith("-part") ? box(b.parent).rect : b.rect);
    const a = box(d.from), b = box(d.to);
    const across = d.side === "top" || d.side === "bottom";
    const sign = d.side === "bottom" || d.side === "right" ? 1 : -1;
    const lo = across ? Math.min(a.rect.x, b.rect.x) : Math.min(a.rect.y, b.rect.y);
    const hi = across ? Math.max(a.rect.x + a.rect.w, b.rect.x + b.rect.w) : Math.max(a.rect.y + a.rect.h, b.rect.y + b.rect.h);
    const edgeOf = (r: Rect) => (d.side === "bottom" ? r.y + r.h : d.side === "top" ? r.y : d.side === "right" ? r.x + r.w : r.x);
    const pick = sign > 0 ? Math.max : Math.min;
    const base = pick(edgeOf(owner(a)), edgeOf(owner(b))) + sign * OFF;
    const at = (u: number, v: number) => (across ? `${r2(u)},${r2(base + sign * v)}` : `${r2(base + sign * v)},${r2(u)}`);
    const mid = (lo + hi) / 2;
    const path = `M${at(lo, 0)} Q${at(lo, DEPTH / 2)} ${at(lo + DEPTH, DEPTH / 2)} L${at(mid - DEPTH, DEPTH / 2)} Q${at(mid, DEPTH / 2)} ${at(mid, DEPTH)} Q${at(mid, DEPTH / 2)} ${at(mid + DEPTH, DEPTH / 2)} L${at(hi - DEPTH, DEPTH / 2)} Q${at(hi, DEPTH / 2)} ${at(hi, 0)}`;
    const ops: Op[] = [{ el: "path", d: path, style: { fill: "none", stroke: d.tone ? line(d.tone) : V("line"), strokeWidth: STROKE.edge, strokeLinecap: "round", strokeLinejoin: "round" } }];
    const w = d.label ? measure(d.label, FONT.note) : 0, h = d.label ? LINE_H.note : 0;
    const reach = base + sign * (DEPTH + 3);
    const label = across ? { x: mid, y: reach + (sign * h) / 2 } : { x: reach + (sign * w) / 2, y: mid };
    if (d.label) ops.push({ el: "text", ...label, text: d.label, size: FONT.note, fill: d.tone ? ink(d.tone) : V("muted") });
    const start = Math.min(base, reach + sign * (across ? h : w)), end = Math.max(base, reach + sign * (across ? h : w));
    const bounds = across
      ? { x: Math.min(lo, mid - w / 2), y: start, w: Math.max(hi, mid + w / 2) - Math.min(lo, mid - w / 2), h: end - start }
      : { x: start, y: Math.min(lo, mid - h / 2), w: end - start, h: Math.max(hi, mid + h / 2) - Math.min(lo, mid - h / 2) };
    return { ops, bounds };
  },
});
