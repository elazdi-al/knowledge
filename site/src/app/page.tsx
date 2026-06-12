import { getAllNotes } from "@/lib/notes";
import { NoteList } from "@/components/NoteList";

export default async function HomePage() {
  const notes = await getAllNotes();

  return (
    <div className="home-pane">
      <span className="-mx-3 mb-5 block px-3 font-medium sm:-mt-3 sm:mb-1 sm:py-3">
        writing
      </span>
      <div className="home-scroller">
        <NoteList notes={notes} />
      </div>
    </div>
  );
}
