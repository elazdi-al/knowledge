import type { AnyBlock, MarkDef, PropTable, State, Tone } from "./model";
import { STATES, TONES } from "./model";

/** Props every mark takes. */
export interface Common {
  id?: string;
  state?: State;
  tone?: Tone;
  /** position inside a `Free` parent */
  x?: number;
  y?: number;
}

export const COMMON: PropTable<Common> = { id: true, state: STATES, tone: TONES, x: "number", y: "number" };

/** A JSX marker: renders nothing, and carries the definition the compiler reads. */
export type Marker<P> = ((props: P) => null) & { def: MarkDef<P, unknown> };

/** Define a mark. The result is used in JSX like any built-in. */
export function mark<P, D>(def: MarkDef<P, D>): Marker<P> {
  return Object.assign((_props: P) => null, { def: def as unknown as MarkDef<P, unknown> });
}

const ORIGIN = { x: 0, y: 0, w: 0, h: 0 };

/** Ids of the parts a block derives at layout, which edges may address. */
export const partIds = (b: AnyBlock): string[] => (b.def.parts ? b.def.parts(b, ORIGIN).map((p) => p.id) : []);

/** The block's id, its parts, and with `deep` everything under it. */
export function idsUnder(b: AnyBlock, out = new Set<string>(), deep = true): Set<string> {
  out.add(b.id);
  for (const part of partIds(b)) out.add(part);
  if (deep) for (const c of b.children) idsUnder(c, out);
  return out;
}
