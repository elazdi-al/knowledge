import { PRIVATE_COURSE } from "../src/lib/private-course";
import { createSearchEngine, normalizeQuery, QUERY_MAX, type SearchEngine } from "../src/lib/search-core";
import { gateNote, handleCtfApi } from "./ctf";
import { error } from "./http";

/**
 * The site's Cloudflare Worker. Static pages are served straight from the
 * CDN (out/ via the assets config); per wrangler.toml's run_worker_first,
 * this code only runs for these paths:
 *
 *   GET /api/search?q=…   ranked results, rate limited per IP, edge cached
 *   /search-index.json    the build artifact the engine is made from -
 *                         hidden from the public, read via the ASSETS
 *                         binding (which bypasses this worker)
 *   /api/ctf, /notes/ctf/*, /ctf-index.json
 *                         the password gate for the private CTF course
 *                         (worker/ctf.ts); its index is hidden the same way
 *
 * The engine is built once per isolate and memoized; the asset's ETag (a
 * content hash) versions the edge cache, so deploys invalidate naturally
 * and identical queries are answered without touching the engine at all.
 */

export interface Env {
  ASSETS: { fetch: typeof fetch };
  SEARCH_LIMIT?: RateLimit;
  /** Secret: `wrangler secret put CTF_PASSWORD`, or .dev.vars for `wrangler dev`. */
  CTF_PASSWORD?: string;
  CTF_UNLOCK_LIMIT?: RateLimit;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const JSON_TYPE = "application/json; charset=utf-8";
/** Browser cache: short, since the client URL carries no version. */
const CLIENT_CACHE = "public, max-age=60, stale-while-revalidate=300";
/** Edge cache: long, safe because the cache key includes the index ETag. */
const EDGE_CACHE = "public, max-age=3600";

let loaded: Promise<{ engine: SearchEngine; version: string }> | null = null;

function getEngine(env: Env, origin: string) {
  if (!loaded) {
    loaded = (async () => {
      const res = await env.ASSETS.fetch(new URL("/search-index.json", origin));
      if (!res.ok) throw new Error(`search index asset: ${res.status}`);
      const version = (res.headers.get("etag") ?? "0").replace(/\W/g, "");
      return { engine: createSearchEngine(await res.json()), version };
    })();
    // A transient asset failure must not wedge the isolate.
    loaded.catch(() => {
      loaded = null;
    });
  }
  return loaded;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Internal build artifacts; only the ASSETS binding reads them now.
    if (url.pathname === "/search-index.json" || url.pathname === "/ctf-index.json") {
      return error(404, "not_found");
    }

    if (url.pathname === "/api/ctf") return handleCtfApi(request, env, url.origin);
    if (url.pathname.startsWith(`/notes/${PRIVATE_COURSE}/`)) return gateNote(request, env);

    // Safety net - run_worker_first should route nothing else here.
    if (url.pathname !== "/api/search") return env.ASSETS.fetch(request);

    if (request.method !== "GET") {
      return error(405, "method_not_allowed", { allow: "GET" });
    }

    const raw = url.searchParams.get("q") ?? "";
    if (raw.length > QUERY_MAX) return error(400, "query_too_long");
    const q = normalizeQuery(raw);

    if (env.SEARCH_LIMIT) {
      const ip = request.headers.get("cf-connecting-ip") ?? "anonymous";
      const { success } = await env.SEARCH_LIMIT.limit({ key: ip });
      if (!success) return error(429, "rate_limited", { "retry-after": "10" });
    }

    const { engine, version } = await getEngine(env, url.origin);

    const cache = caches.default;
    const key = new Request(`${url.origin}/api/search?v=${version}&q=${encodeURIComponent(q)}`);

    const hit = await cache.match(key);
    if (hit) {
      const res = new Response(hit.body, hit);
      res.headers.set("cache-control", CLIENT_CACHE);
      res.headers.set("x-search-cache", "hit");
      return res;
    }

    const body = JSON.stringify(engine.search(q));
    ctx.waitUntil(
      cache.put(
        key,
        new Response(body, {
          headers: { "content-type": JSON_TYPE, "cache-control": EDGE_CACHE },
        }),
      ),
    );
    return new Response(body, {
      headers: {
        "content-type": JSON_TYPE,
        "cache-control": CLIENT_CACHE,
        "x-search-cache": "miss",
      },
    });
  },
};
