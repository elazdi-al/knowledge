import { getAllNotes, groupByCourse } from "@/lib/notes";
import { NoteList } from "@/components/NoteList";

export default async function HomePage() {
  const courses = groupByCourse(await getAllNotes()).map((course) => ({
    slug: course.slug,
    name: course.name,
    notes: course.notes.map(({ note, label }) => ({
      slug: note.slug,
      label,
      description: note.frontmatter.description,
    })),
  }));

  return (
    <div className="home-pane">
      <NoteList courses={courses} />
    </div>
  );
}
