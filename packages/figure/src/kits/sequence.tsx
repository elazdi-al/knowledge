import type { ReactNode } from "react";
import { Edge } from "../marks/edge";
import { Canvas } from "../marks/layout";
import { Node } from "../marks/node";
import { Poly, Space } from "../marks/shapes";
import { Text } from "../marks/text";
import { measure } from "../measure";
import type { Tone } from "../model";
import { labelPillW } from "../route";
import { FONT, NODE } from "../theme";

/** Lane header width: the widest name, so every header box matches. */
export const headWidth = (names: string[]) => Math.max(...names.map((n) => measure(n, FONT.title, { weight: 500 }))) + 2 * NODE.padX;

// --- message sequence charts -------------------------------------------------------------------------------------

export interface Message {
  /** sender's lane index */
  from: number;
  /** receiver's lane index; a fraction such as 0.5 stops between lanes, for a message lost on the way */
  to: number;
  label?: string;
  /** muted text in the right margin, on the message's row */
  note?: string;
  /** dashed, e.g. a broadcast */
  dashed?: boolean;
  /** discarded where it ends: red, with a cross in place of the chevron */
  drop?: boolean;
  /** handled by every lane it crosses, as by a relay: a chevron at each */
  relayed?: boolean;
}

/**
 * A message sequence chart: lanes across the top, time running down, one message per row; `slant` makes every message take a row to arrive.
 * `pitch` is the least lane spacing and `inset` the first lane's x, so stacked charts given the same ones line up; `headless` drops the lane name boxes, for lanes the figure already names.
 */
export function SequenceChart({ id = "seq", lanes, messages, slant = false, pitch: minPitch = 150, inset, headless = false, dropTone = "red" }: { dropTone?: Tone; id?: string; lanes: string[]; messages: Message[]; slant?: boolean; pitch?: number; inset?: number; headless?: boolean }) {
  const headW = headWidth(lanes);
  // a label needs clear line on both sides, also on a message that stops short of the next lane
  const pitch = Math.max(headW + 24, minPitch, ...messages.map((m) => (m.label ? (labelPillW(m.label) + 40) / Math.min(1, Math.abs(m.to - m.from)) : 0)));
  const x = (lane: number) => (inset ?? headW / 2) + lane * pitch;
  const ROW = 36;
  const dep = (i: number) => (headless ? 0 : NODE.h) + 26 + i * ROW;
  const bottom = dep(messages.length - 1) + (slant ? ROW : 0) + 18;
  const noteX = x(lanes.length - 1) + 24;
  const crossR = 4;

  const items: ReactNode[] = [];
  const edges: ReactNode[] = [];
  lanes.forEach((name, l) => {
    items.push(
      headless ? <Space key={`${id}.l${l}`} id={`${id}.l${l}`} at={[x(l), 0]} /> : <Node key={`h${l}`} id={`${id}.l${l}`} title={name} at={[x(l) - headW / 2, 0]} anchor="nw" w={headW} />,
      <Space key={`${id}.end${l}`} id={`${id}.end${l}`} at={[x(l), bottom]} />,
    );
    edges.push(<Edge key={`life${l}`} from={`${id}.l${l}`} to={`${id}.end${l}`} route="straight" head="none" state="ghost" />);
  });
  messages.forEach((m, i) => {
    const dir = Math.sign(m.to - m.from);
    const stops = [m.from];
    for (let l = m.from + dir; dir > 0 ? l < m.to : l > m.to; l += dir) stops.push(l);
    stops.push(m.to);
    // a slanted message drops one row per whole lane distance, so a message lost halfway is lost halfway in time too
    const span = Math.max(1, Math.ceil(Math.abs(m.to - m.from)));
    const y = (lane: number) => dep(i) + (slant ? (ROW * Math.abs(lane - m.from)) / span : 0);
    const mid = dep(i) + (slant ? ROW / 2 : 0);
    const n = stops.length - 1;
    const labelAt = Math.floor((n - 1) / 2);
    const tone = m.drop ? dropTone : undefined;
    stops.forEach((l, k) => items.push(<Space key={`${id}.m${i}.${k}`} id={`${id}.m${i}.${k}`} at={[x(l), y(l)]} />));
    for (let k = 0; k < n; k++)
      edges.push(
        <Edge
          key={`m${i}.${k}`}
          from={`${id}.m${i}.${k}`}
          to={`${id}.m${i}.${k + 1}`}
          route="straight"
          head={(k === n - 1 && !m.drop) || (k < n - 1 && m.relayed) ? "end" : "none"}
          dashed={m.dashed}
          tone={tone}
          label={k === labelAt ? m.label : undefined}
        />,
      );
    if (m.drop) {
      const ex = x(m.to), ey = y(m.to);
      [[-1, -1, 1, 1], [-1, 1, 1, -1]].forEach(([ax, ay, bx, by], c) => {
        items.push(<Space key={`${id}.x${i}.${c}a`} id={`${id}.x${i}.${c}a`} at={[ex + ax * crossR, ey + ay * crossR]} />, <Space key={`${id}.x${i}.${c}b`} id={`${id}.x${i}.${c}b`} at={[ex + bx * crossR, ey + by * crossR]} />);
        edges.push(<Edge key={`x${i}.${c}`} from={`${id}.x${i}.${c}a`} to={`${id}.x${i}.${c}b`} route="straight" head="none" tone={tone} />);
      });
    }
    if (m.note) items.push(<Text key={`t${i}`} text={m.note} size="note" muted at={[noteX, mid - 8]} anchor="nw" />);
  });
  return (
    <>
      <Canvas>{items}</Canvas>
      {edges}
    </>
  );
}

// --- time-space diagrams -----------------------------------------------------------------------------------------

export interface Send {
  from: number;
  to: number;
  /** time the first bit leaves */
  at: number;
  /** transmission time L/R: the last bit leaves at `at + tx` */
  tx: number;
  label?: string;
  /** default: the link hue */
  tone?: Tone;
}

export interface Span {
  from: number;
  to: number;
  label: string;
  /** margin it sits in: left of the first axis (default) or right of the last */
  side?: "left" | "right";
}

/**
 * A time-space diagram: one time axis per node, time running down; each send is a tinted band whose top edge is its first bit and bottom edge its last, arriving `prop` later; spans measure intervals in the margins, end to end between ticks.
 * `end` fixes the time at the bottom, so panels drawn with the same `end` compare by height; `pitch` narrows the axes for side-by-side panels.
 */
export function TimeSpace({ id = "ts", lanes, prop, sends, spans = [], end: fixedEnd, pitch, linkTone = "blue" }: { linkTone?: Tone; id?: string; lanes: string[]; prop: number; sends: Send[]; spans?: Span[]; end?: number; pitch?: number }) {
  const headW = headWidth(lanes);
  const PITCH = pitch ?? Math.max(headW + 40, 168), HEIGHT = 230;
  const end = fixedEnd ?? Math.max(...sends.map((s) => s.at + s.tx + prop), ...spans.map((s) => s.to));
  const pill = (side: "left" | "right") => Math.max(0, ...spans.filter((s) => (s.side ?? "left") === side).map((s) => labelPillW(s.label)));
  const x0 = Math.max(headW / 2, pill("left") + 12);
  const x = (lane: number) => x0 + lane * PITCH;
  const last = lanes.length - 1;
  const y = (t: number) => NODE.h + 18 + (t * HEIGHT) / end;
  const bottom = y(end) + 26;
  const dimX = { left: x0 - 8 - pill("left") / 2, right: x(last) + 8 + pill("right") / 2 };

  const items: ReactNode[] = [];
  const bands: ReactNode[] = [];
  const guides: ReactNode[] = [];
  const edges: ReactNode[] = [];
  lanes.forEach((name, l) => {
    items.push(<Node key={`h${l}`} id={`${id}.l${l}`} title={name} at={[x(l) - headW / 2, 0]} anchor="nw" w={headW} />);
    edges.push(<Edge key={`axis${l}`} from={`${id}.l${l}`} to={[x(l), bottom]} route="straight" />);
  });
  /** Every corner of every band, as [lane, time]. */
  const events = sends.flatMap((s) => [[s.from, s.at], [s.from, s.at + s.tx], [s.to, s.at + prop], [s.to, s.at + s.tx + prop]]);
  sends.forEach((s, i) => {
    const tone = s.tone ?? linkTone;
    const corners: [number, number][] = [
      [x(s.from), y(s.at)],
      [x(s.to), y(s.at + prop)],
      [x(s.to), y(s.at + s.tx + prop)],
      [x(s.from), y(s.at + s.tx)],
    ];
    bands.push(<Poly key={`band${i}`} id={`${id}.s${i}`} points={corners} tone={tone} outline />);
    if (s.label) {
      const w = measure(s.label, FONT.note);
      items.push(<Text key={`sl${i}`} text={s.label} size="note" tone={tone} at={[(x(s.from) + x(s.to)) / 2 - w / 2, y(s.at + (s.tx + prop) / 2) - 8]} anchor="nw" />);
    }
  });
  const ticks = new Set<string>();
  spans.forEach((sp, i) => {
    const side = sp.side ?? "left";
    const dx = dimX[side];
    [sp.from, sp.to].forEach((t, e) => {
      // spans laid end to end share one tick, so no two marks stack at a boundary
      const tick = `${side}:${t}`;
      if (!ticks.has(tick)) {
        ticks.add(tick);
        edges.push(<Edge key={`k${i}${e}`} from={[dx - 5, y(t)]} to={[dx + 5, y(t)]} route="straight" head="none" />);
      }
      // a guide runs from the span to the nearest axis where something happens at that time, so it never crosses a band
      const lanesAt = events.filter(([, et]) => Math.abs(et - t) < 1e-9).map(([l]) => l);
      const lane = !lanesAt.length ? (side === "left" ? 0 : last) : side === "left" ? Math.min(...lanesAt) : Math.max(...lanesAt);
      guides.push(<Edge key={`g${i}${e}`} from={[dx, y(t)]} to={[x(lane), y(t)]} route="straight" head="none" dashed state="ghost" />);
    });
    edges.push(<Edge key={`d${i}`} from={[dx, y(sp.from)]} to={[dx, y(sp.to)]} route="straight" head="none" label={sp.label} />);
  });
  return (
    <Canvas>
      {bands}
      {items}
      {/* edge labels take no layout room: keep the right margin's pills inside this block */}
      {pill("right") > 0 && <Space at={[dimX.right + pill("right") / 2, 0]} />}
      {guides}
      {edges}
    </Canvas>
  );
}
