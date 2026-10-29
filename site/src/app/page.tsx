import { getAllNotes, groupByCourse, WRITING } from "@/lib/notes";
import { isPrivate } from "@/lib/private-course";
import { NoteList } from "@/components/NoteList";

/** "Oct 2026". UTC, like the YAML dates, so a post never slips into the previous month. */
const month = (d?: Date) => d?.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export default async function HomePage() {
  // The private course reaches the client only through the Worker's gate.
  const notes = (await getAllNotes()).filter((n) => !isPrivate(n.slug));
  const courses = groupByCourse(notes).map((course) => ({
    slug: course.slug,
    name: course.name,
    notes: course.notes.map(({ note, label }) => ({
      slug: note.slug,
      label,
      date: course.slug === WRITING ? month(note.frontmatter.created) : undefined,
    })),
  }));

  return (
    <div className="home-pane mx-auto w-full max-w-measure">
      <NoteList courses={courses} />
    </div>
  );
}
