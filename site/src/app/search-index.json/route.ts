import { getAllNotes } from "@/lib/notes";
import { buildSearchIndex } from "@/lib/search-index";

// With `output: "export"` this runs once at build time and ships as a static
// /search-index.json on the Pages CDN; in dev it re-reads ../notes per request.
export const dynamic = "force-static";

export async function GET() {
  const notes = await getAllNotes();
  return Response.json(buildSearchIndex(notes));
}
