import { getAllNotes, groupByCourse } from "@/lib/notes";
import { isPrivate, type PrivateIndex } from "@/lib/private-course";

// Built once into out/ like /search-index.json and hidden the same way: the
// Worker (worker/ctf.ts) reads it through its ASSETS binding and hands it
// only to a session. In dev the home page reads this route directly.
export const dynamic = "force-static";

export async function GET() {
  const notes = (await getAllNotes()).filter((n) => isPrivate(n.slug));
  return Response.json({
    notes: groupByCourse(notes).flatMap((c) => c.notes.map(({ note, label }) => ({ slug: note.slug, label }))),
  } satisfies PrivateIndex);
}
