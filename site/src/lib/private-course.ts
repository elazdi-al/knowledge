/**
 * The one password-protected course. Its notes build into out/ like any
 * other, but the home payload and the search index leave them out; the
 * Worker (worker/ctf.ts) serves their pages and the index below only to a
 * session.
 */
export const PRIVATE_COURSE = "ctf";

export const isPrivate = (slug: string) => slug.split("/")[0] === PRIVATE_COURSE;

/** Body of /ctf-index.json, which /api/ctf hands to a session. */
export interface PrivateIndex {
  notes: { slug: string; label: string }[];
}
