import Link from "next/link";
import type { Note } from "@/lib/notes";

interface Props {
  notes: Note[];
}

export function NoteList({ notes }: Props) {
  if (notes.length === 0) {
    return (
      <p className="text-gray-1100">
        No notes yet. Drop a Markdown file in <code>../notes/</code>.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-7 sm:gap-4">
      {notes.map((note) => (
        <Link
          key={note.slug}
          href={`/notes/${note.slug}`}
          className="-mx-3 flex flex-col rounded-md px-3 no-underline hover:bg-[color:var(--color-hover)] sm:py-3"
        >
          <span>{note.frontmatter.title}</span>
          {note.frontmatter.description && (
            <span className="text-gray-1100">
              {note.frontmatter.description}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
