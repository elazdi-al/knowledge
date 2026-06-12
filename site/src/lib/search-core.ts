import type { PreviewLine, SearchIndex, SearchItem, SearchNote } from "./search-index";

/**
 * The search engine itself, shared by everything that ranks:
 *
 *   - worker/index.ts builds it once per isolate from the static
 *     /search-index.json asset and serves /api/search at the edge
 *   - use-search.ts builds the same engine in `next dev`, where no
 *     Worker is running, so dev search behaves identically
 *
 * It is pure and isomorphic - no fs, no fetch - taking the build-time
 * SearchIndex and answering queries with render-ready hits.
 */

export type { PreviewLine, SearchNote };

/** A note result; exactly the index record, which is already render-ready. */
export type NoteHit = SearchNote;

/** A concept/section result with its note denormalized in. */
export interface ItemHit {
  name: string;
  kind: SearchItem["kind"];
  anchor: string;
  section?: string;
  noteSlug: string;
  noteLabel: string;
  preview: PreviewLine[];
  focus: number;
}

export interface SearchResponse {
  notes: NoteHit[];
  items: ItemHit[];
}

export interface SearchEngine {
  search(query: string): SearchResponse;
}

/** Longest raw query the API accepts; anything longer is a 400. */
export const QUERY_MAX = 100;

const NOTE_LIMIT = 8;
const ITEM_LIMIT = 24;

/** Accent-folded lowercase; the one normalization both sides share. */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeQuery(raw: string): string {
  return fold(raw).replace(/\s+/g, " ").trim();
}

function plainText(lines: PreviewLine[]): string {
  return lines
    .map((l) => l.t)
    .join(" ")
    .replace(/[*`]/g, "");
}

interface Row<Hit> {
  hit: Hit;
  nameLower: string;
  nameWords: string[];
  /** Name plus labels (course, section) - the fields people qualify by. */
  meta: string;
  /** Meta plus the preview text itself. */
  haystack: string;
  /** Index position; equal scores keep curriculum order. */
  order: number;
  /** Concepts outrank sections at equal score. */
  tier: number;
}

function makeRow<Hit>(
  hit: Hit,
  name: string,
  metaExtra: string,
  body: string,
  order: number,
  tier: number,
): Row<Hit> {
  const nameLower = fold(name);
  const meta = `${nameLower} ${fold(metaExtra)}`;
  return {
    hit,
    nameLower,
    // `+` survives the split so "b+ tree" prefix-matches "B+ tree".
    nameWords: nameLower.split(/[^a-z0-9+]+/).filter(Boolean),
    meta,
    haystack: `${meta} ${fold(body)}`,
    order,
    tier,
  };
}

// Deterministic tiers instead of fuzzy scatter-matching: exact name, then
// name prefix, then phrase-in-name, then per-word prefixes, then metadata,
// then the definition text itself. Predictable beats clever here.
function score<Hit>(row: Row<Hit>, q: string, tokens: string[]): number {
  if (row.nameLower === q) return 1;
  if (row.nameLower.startsWith(q)) return 0.9;
  if (row.nameLower.includes(q)) return 0.8;
  if (tokens.every((t) => row.nameWords.some((w) => w.startsWith(t)))) return 0.7;
  if (tokens.every((t) => row.meta.includes(t))) return 0.55;
  if (row.haystack.includes(q)) return 0.45;
  if (tokens.every((t) => row.haystack.includes(t))) return 0.3;
  return 0;
}

function rank<Hit>(rows: Row<Hit>[], q: string, limit: number, shortNamesFirst: boolean): Hit[] {
  const tokens = q.split(" ");
  const scored: Array<{ s: number; row: Row<Hit> }> = [];
  for (const row of rows) {
    const s = score(row, q, tokens);
    if (s > 0) scored.push({ s, row });
  }
  scored.sort(
    (a, b) =>
      b.s - a.s ||
      a.row.tier - b.row.tier ||
      (shortNamesFirst ? a.row.nameLower.length - b.row.nameLower.length : 0) ||
      a.row.order - b.row.order,
  );
  return scored.slice(0, limit).map((e) => e.row.hit);
}

export function createSearchEngine(index: SearchIndex): SearchEngine {
  const noteRows = index.notes.map((note, i) =>
    makeRow<NoteHit>(
      note,
      note.title,
      note.label,
      `${note.description ?? ""} ${plainText(note.preview)}`,
      i,
      0,
    ),
  );

  const itemRows = index.items.map((item, i) => {
    const note = index.notes[item.note];
    const hit: ItemHit = {
      name: item.name,
      kind: item.kind,
      anchor: item.anchor,
      section: item.section,
      noteSlug: note.slug,
      noteLabel: note.label,
      preview: item.preview,
      focus: item.focus,
    };
    return makeRow(
      hit,
      item.name,
      `${item.section ?? ""} ${note.label}`,
      plainText(item.preview),
      i,
      item.kind === "concept" ? 0 : 1,
    );
  });

  return {
    search(query: string): SearchResponse {
      const q = normalizeQuery(query);
      // Empty query is the menu's resting state: the full note list, in
      // curriculum order.
      if (!q) return { notes: noteRows.map((r) => r.hit), items: [] };
      return {
        notes: rank(noteRows, q, NOTE_LIMIT, false),
        items: rank(itemRows, q, ITEM_LIMIT, true),
      };
    },
  };
}
