/**
 * Per-note text highlights, persisted in IndexedDB.
 *
 * A highlight is anchored primarily by its exact quoted text plus a few
 * characters of surrounding context (the W3C text-quote approach); the stored
 * character offsets are only a fast path and a disambiguation hint. This lets
 * a highlight survive edits elsewhere in the note and re-attach after its
 * passage shifts; it is dropped only when the quoted text no longer exists.
 */

export interface StoredHighlight {
  id: string;
  slug: string;
  /** Exact text the mark covers (primary anchor). */
  text: string;
  /** Up to CONTEXT_LENGTH characters immediately before/after the quote. */
  prefix: string;
  suffix: string;
  /** Character offsets into the note root's textContent (hint + fast path). */
  start: number;
  end: number;
  createdAt: number;
}

const CONTEXT_LENGTH = 32;

// --- Anchoring ---------------------------------------------------------------

export function createHighlightRecord(
  slug: string,
  root: HTMLElement,
  range: Range,
): StoredHighlight | null {
  const text = range.toString();
  if (!text.trim()) return null;
  // Length of everything before the selection equals its character offset.
  const preceding = document.createRange();
  preceding.selectNodeContents(root);
  preceding.setEnd(range.startContainer, range.startOffset);
  const start = preceding.toString().length;
  const full = root.textContent ?? "";
  return {
    id: crypto.randomUUID(),
    slug,
    text,
    prefix: full.slice(Math.max(0, start - CONTEXT_LENGTH), start),
    suffix: full.slice(start + text.length, start + text.length + CONTEXT_LENGTH),
    start,
    end: start + text.length,
    createdAt: Date.now(),
  };
}

/**
 * Re-locate a stored highlight in the note's current text. Returns the record
 * unchanged when it still matches at its stored offset, an updated record when
 * the quote moved, or null when the quoted passage no longer exists.
 */
export function reanchor(
  root: HTMLElement,
  saved: StoredHighlight,
): StoredHighlight | null {
  const full = root.textContent ?? "";
  if (full.startsWith(saved.text, saved.start)) return saved;
  let best = -1;
  let bestScore = -1;
  for (
    let i = full.indexOf(saved.text);
    i !== -1;
    i = full.indexOf(saved.text, i + 1)
  ) {
    const score = contextScore(full, i, saved);
    if (
      score > bestScore ||
      (score === bestScore &&
        Math.abs(i - saved.start) < Math.abs(best - saved.start))
    ) {
      best = i;
      bestScore = score;
    }
  }
  if (best === -1) return null;
  return {
    ...saved,
    start: best,
    end: best + saved.text.length,
    prefix: full.slice(Math.max(0, best - CONTEXT_LENGTH), best),
    suffix: full.slice(
      best + saved.text.length,
      best + saved.text.length + CONTEXT_LENGTH,
    ),
  };
}

/** Contiguous characters of stored context matching around a candidate index. */
function contextScore(
  full: string,
  index: number,
  saved: StoredHighlight,
): number {
  let score = 0;
  for (let k = 1; k <= saved.prefix.length && k <= index; k++) {
    if (saved.prefix[saved.prefix.length - k] !== full[index - k]) break;
    score++;
  }
  const after = index + saved.text.length;
  for (let k = 0; k < saved.suffix.length && after + k < full.length; k++) {
    if (saved.suffix[k] !== full[after + k]) break;
    score++;
  }
  return score;
}

/** Map character offsets back to a DOM Range by walking the root's text nodes. */
export function offsetsToRange(
  root: Node,
  start: number,
  end: number,
): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let position = 0;
  let startSet = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const next = position + (node as Text).length;
    if (!startSet && start <= next) {
      range.setStart(node, start - position);
      startSet = true;
    }
    if (startSet && end <= next) {
      range.setEnd(node, end - position);
      return range;
    }
    position = next;
  }
  return null;
}

// --- IndexedDB ----------------------------------------------------------------

const DB_NAME = "knowledge";
const DB_VERSION = 1;
const STORE = "highlights";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("slug", "slug");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const request = operation(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getHighlights(slug: string): Promise<StoredHighlight[]> {
  return withStore("readonly", (store) => store.index("slug").getAll(slug));
}

export function putHighlight(record: StoredHighlight): Promise<IDBValidKey> {
  return withStore("readwrite", (store) => store.put(record));
}

export function deleteHighlight(id: string): Promise<undefined> {
  return withStore("readwrite", (store) => store.delete(id));
}
