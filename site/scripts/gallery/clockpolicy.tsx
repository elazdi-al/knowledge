import { ClockPolicy } from "@/components/ClockPolicy";

export const name = "ClockPolicy";

/**
 * EPFL "Data Intensive Systems" L4 — the Clock (second-chance) replacement
 * policy. Buffer frames sit conceptually on a circle with a moving clock hand;
 * each access sets a page's reference bit to 1. When a victim is needed the
 * hand advances: ref = 1 means "clear the bit and keep scanning" (a second
 * chance), ref = 0 (and pin count 0) means "evict this frame". Reproduces
 * schemas/clock_second_chance.tex: page 1 (ref 0) at the top is the current
 * candidate the hand points at, going clockwise to page 2 (ref 1), page 3
 * (ref 0) and page 4 (ref 1).
 */
export const examples = [
  <ClockPolicy
    key="clock-second-chance"
    title="Clock / second-chance policy"
    caption="Frames on a circle with a clock hand. ref = 1 gives the page a second chance (clear the bit, advance); ref = 0 with pin count 0 is evicted."
    frames={[
      { id: "p1", label: "page 1", ref: 0, victim: true },
      { id: "p2", label: "page 2", ref: 1 },
      { id: "p3", label: "page 3", ref: 0 },
      { id: "p4", label: "page 4", ref: 1 },
    ]}
    hand="p1"
    handLabel="clock hand"
    notes={[
      { head: "If ref = 1", body: "clear the bit and keep scanning." },
      { head: "If ref = 0 and pin count = 0", body: "evict this frame." },
    ]}
  />,
];
