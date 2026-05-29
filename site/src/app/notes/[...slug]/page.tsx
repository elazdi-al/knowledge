import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllNotes, getNoteBySlug, formatDate } from "@/lib/notes";

interface Params {
  slug: string[];
}

export const dynamicParams = false;

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

/**
 * Two import contexts (.mdx and .md) because webpack/turbopack bind a
 * dynamic-import expression to a single static suffix. Both extensions
 * route through @mdx-js/loader, configured in next.config.ts.
 */
async function loadNote(slug: string, isMDX: boolean) {
  return isMDX
    ? await import(`@/content/${slug}.mdx`)
    : await import(`@/content/${slug}.md`);
}

export default async function NotePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const note = await getNoteBySlug(slug.join("/"));
  if (!note) notFound();

  const { default: Post } = await loadNote(note.slug, note.isMDX);
  const date = note.frontmatter.created;

  return (
    <article className="flex flex-col">
      <header className="mb-6">
        <h1 className="text-[color:var(--color-text)] text-[1.5rem] font-medium tracking-[-0.025em] leading-[1.2] mb-2">
          {note.frontmatter.title}
        </h1>
        {note.frontmatter.description && (
          <p className="text-[color:var(--color-muted)] italic leading-snug text-balance">
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

      <div className="prose">
        <Post />
      </div>
    </article>
  );
}
