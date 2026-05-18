import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllNotes, getNoteBySlug, formatDate } from "@/lib/notes";
import { renderNote } from "@/lib/mdx";

interface Params {
  slug: string[];
}

export async function generateStaticParams() {
  const notes = await getAllNotes();
  return notes.map((n) => ({ slug: n.slugSegments }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = await getNoteBySlug(slug.join("/"));
  if (!note) return {};
  return {
    title: note.frontmatter.title,
    description: note.frontmatter.description,
  };
}

export default async function NotePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const note = await getNoteBySlug(slug.join("/"));
  if (!note) notFound();

  const content = await renderNote(note);
  const date = note.frontmatter.created;

  return (
    <article className="flex flex-col">
      <header className="mb-6">
        <h1 className="text-[color:var(--color-text)] text-[1.5rem] font-medium tracking-[-0.025em] leading-[1.2] mb-2">
          {note.frontmatter.title}
        </h1>
        {note.frontmatter.description && (
          <p className="text-[color:var(--color-muted)] italic font-[var(--font-serif)] text-[1.1rem] leading-snug text-balance">
            {note.frontmatter.description}
          </p>
        )}
        {date && (
          <time
            dateTime={date.toISOString()}
            className="block mt-4 text-xs text-[color:var(--color-faint)] tabular-nums"
          >
            {formatDate(date)}
          </time>
        )}
      </header>

      <div className="prose">{content}</div>
    </article>
  );
}
