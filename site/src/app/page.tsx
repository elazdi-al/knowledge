import { getAllNotes, groupByCourse } from "@/lib/notes";
import { NoteList } from "@/components/NoteList";

export default async function HomePage() {
  const courses = groupByCourse(await getAllNotes()).map((course) => ({
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
