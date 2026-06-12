// Minimal Cloudflare runtime surface used by worker/index.ts, declared
// against the DOM lib the rest of the repo compiles with. Pulling in
// @cloudflare/workers-types would redeclare fetch/Response/etc. and clash
// with React's DOM globals, so the few Workers-only pieces live here.

/** https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ */
interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Workers expose the per-datacenter cache as `caches.default`. */
interface CacheStorage {
  readonly default: Cache;
}
