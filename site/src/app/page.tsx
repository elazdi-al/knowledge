import { getAllNotes, groupByCourse } from "@/lib/notes";
import { isPrivate } from "@/lib/private-course";
import { NoteList } from "@/components/NoteList";

export default async function HomePage() {
  // The private course reaches the client only through the Worker's gate.
  const notes = (await getAllNotes()).filter((n) => !isPrivate(n.slug));
  const courses = groupByCourse(notes).map((course) => ({
    slug: course.slug,
    name: course.name,
    notes: course.notes.map(({ note, label }) => ({ slug: note.slug, label })),
  }));

  return (
    <div className="home-pane mx-auto w-full max-w-measure">
      <NoteList courses={courses} />
    </div>
  );
}
