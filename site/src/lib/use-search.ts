"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeQuery, type SearchResponse } from "./search-core";

/**
 * Client side of /api/search (worker/index.ts). Nothing is downloaded up
 * front: the menu's resting state is just the empty query, fetched when the
 * menu opens (or pre-warmed from the trigger's hover). Keystrokes are
 * debounced, answers are LRU-cached for the session, and results stay on
 * screen while the next ones load.
 */

const DEBOUNCE_MS = 120;
const CACHE_MAX = 64;

const cache = new Map<string, SearchResponse>();
const inflight = new Map<string, Promise<SearchResponse>>();

class RateLimitError extends Error {
  constructor(readonly retryAfter: number) {
    super("rate limited");
  }
}

function remember(q: string, r: SearchResponse) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(q, r);
}

// In `next dev` there is no Worker, but /search-index.json is a live route;
// run the same engine locally so search behaves identically. The dynamic
// import keeps the engine out of production bundles.
let devEngine: Promise<{ search(q: string): SearchResponse }> | null = null;

async function request(q: string): Promise<SearchResponse> {
  if (process.env.NODE_ENV === "development") {
    if (!devEngine) {
      devEngine = Promise.all([
        import("./search-core"),
        fetch("/search-index.json").then((r) => r.json()),
      ]).then(([core, index]) => core.createSearchEngine(index));
      devEngine.catch(() => {
        devEngine = null;
      });
    }
    return (await devEngine).search(q);
  }
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (res.status === 429) {
    throw new RateLimitError(Number(res.headers.get("retry-after")) || 5);
  }
  if (!res.ok) throw new Error(`search: ${res.status}`);
  return res.json();
}

// Responses are small, so in-flight requests are never aborted - letting
// them land fills the cache (backspacing through a query costs nothing).
// Staleness is handled by the generation check in the hook instead.
function load(q: string): Promise<SearchResponse> {
  let p = inflight.get(q);
  if (!p) {
    p = request(q)
      .then((r) => {
        remember(q, r);
        return r;
      })
      .finally(() => inflight.delete(q));
    inflight.set(q, p);
  }
  return p;
}

/** Fire-and-forget warm of the menu's resting state (trigger hover/focus). */
export function warmSearch() {
  if (!cache.has("")) void load("").catch(() => {});
}

export type SearchStatus = "loading" | "ready" | "rate_limited" | "unavailable";

export interface SearchState {
  results: SearchResponse | null;
  status: SearchStatus;
}

export function useSearch(query: string, active: boolean): SearchState {
  const [state, setState] = useState<SearchState>({ results: null, status: "loading" });
  const generation = useRef(0);

  useEffect(() => {
    if (!active) return;
    const q = normalizeQuery(query);
    const gen = ++generation.current;

    const cached = cache.get(q);
    if (cached) {
      // Refresh LRU recency.
      cache.delete(q);
      cache.set(q, cached);
      setState({ results: cached, status: "ready" });
      return;
    }

    // Keep the previous results visible while the next ones load.
    setState((s) => ({ ...s, status: "loading" }));

    let retry: number | undefined;
    const run = () => {
      load(q).then(
        (r) => {
          if (generation.current === gen) setState({ results: r, status: "ready" });
        },
        (e: unknown) => {
          if (generation.current !== gen) return;
          if (e instanceof RateLimitError) {
            setState((s) => ({ ...s, status: "rate_limited" }));
            retry = window.setTimeout(run, e.retryAfter * 1000);
          } else {
            setState((s) => ({ ...s, status: "unavailable" }));
          }
        },
      );
    };

    // The empty query is the menu opening - no debounce there.
    const t = window.setTimeout(run, q ? DEBOUNCE_MS : 0);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(retry);
    };
  }, [query, active]);

  return state;
}
