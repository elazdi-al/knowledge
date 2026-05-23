import { getAllNotes } from "@/lib/notes";
import { NoteList } from "@/components/NoteList";

export default async function HomePage() {
  const notes = await getAllNotes();

  return (
    <div>
      <span className="-mx-3 mb-5 block px-3 font-medium sm:-mt-3 sm:mb-1 sm:py-3">
        writing
      </span>
      <NoteList notes={notes} />
    </div>
  );
}
