import { getAllNotes } from "@/lib/notes";
import { buildSearchIndex } from "@/lib/search-index";

// With `output: "export"` this runs once at build time and lands in out/.
// It is an internal artifact now: the Worker (worker/index.ts) hides the
// public path and reads it through its ASSETS binding to power /api/search.
// In dev it re-reads ../notes per request and feeds the local fallback
// engine in lib/use-search.ts.
export const dynamic = "force-static";

export async function GET() {
  const notes = await getAllNotes();
  return Response.json(buildSearchIndex(notes));
}
