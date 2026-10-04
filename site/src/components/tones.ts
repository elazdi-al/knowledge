import type { Tone } from "@/components/figure";

/**
 * What each category hue means in the course figures, one entry per concept, so a concept keeps its hue in every
 * figure. Blue is the `active` focus, so it is a category only in lectures with no focus (ER in L1, the query
 * pipeline in L7 and L9). A hue may mean different things in different lectures, never two things in one lecture, and a
 * figure uses at most three. No orange: the palette has none.
 */
export const TONE = {
  /** ER relationship sets, in the schema and in an instance */
  relationship: "blue",
  /** ER specialisation (ISA) */
  isa: "purple",
  /** bookkeeping that describes or points at the data: page headers, slot and file directories, index entries, footers, pointers */
  meta: "green",
  /** overflow pages and blocks, chained on when a page is full */
  overflow: "teal",
  /** buffer pages in the hot working set */
  hot: "teal",
  /** RAID parity blocks */
  parity: "purple",
  /** what enters and leaves the query compiler: the SQL query and the physical plan */
  query: "blue",
  /** relational-algebra operators the optimizer pushes down */
  selection: "green",
  projection: "purple",
  /** hash join inputs: the one built into the table and the one streamed past it */
  build: "purple",
  probe: "green",
  /** replicas in a write quorum and in a read quorum */
  write: "teal",
  read: "green",
  /** how a machine halts */
  accept: "green",
  reject: "red",
  /** the mapping f of a reduction */
  reduction: "purple",
} as const satisfies Record<string, Tone>;

/** Transaction identity hues, shared by every concurrency figure. */
export const TX_TONE = { 1: "purple", 2: "teal", 3: "green" } as const satisfies Record<number, Tone>;
