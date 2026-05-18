import { getAllNotes } from "@/lib/notes";
import { NoteList } from "@/components/NoteList";

export default async function HomePage() {
  const notes = await getAllNotes();

  return (
    <div className="-mb-3 mt-16 sm:mt-32">
      <span className="mb-5 block font-medium dark:text-white sm:mb-4">
        Writing
      </span>
      <NoteList notes={notes} />
    </div>
  );
}
