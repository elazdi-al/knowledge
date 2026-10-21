import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyPageButton } from "@/components/CopyPageButton";
import { Highlightable } from "@/components/Highlightable";
import { KatexAutoFit } from "@/components/KatexAutoFit";
import { NoteToc } from "@/components/NoteToc";
import { renderMDX } from "@/lib/mdx";
import { getAllNotes, getNoteBySlug, formatDate, groupByCourse } from "@/lib/notes";

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
    // `absolute` bypasses the "%s · knowledge" template so note tabs show just
    // the note title.
    title: { absolute: note.frontmatter.title },
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

  const content = await renderMDX(note.body);
  const date = note.frontmatter.created;
  const course = groupByCourse(await getAllNotes()).find((c) => c.slug && c.notes.some((n) => n.note.slug === note.slug));
  const heading = course?.notes.find((n) => n.note.slug === note.slug)?.label ?? note.frontmatter.title;

  // A clean Markdown reconstruction for the copy button: title as an H1, then
  // the raw source. Compact and well-structured for an LLM.
  const pageMarkdown = `# ${note.frontmatter.title}\n\n${note.body.trim()}`;

  return (
    <article className="flex min-w-0 flex-col">
      <NoteToc courseSlug={course?.slug} />
      <header className="mx-auto mb-6 flex w-full max-w-measure items-center justify-between gap-4">
        <div className="flex flex-col gap-1 text-[1.0625rem]/[1.5] tracking-[-0.0064em]">
          <h1 className="font-medium text-balance text-[color:var(--color-text)]">{heading}</h1>
          {date && (
            <time dateTime={date.toISOString()} className="font-[460] text-gray-1200/40">
              {formatDate(date)}
            </time>
          )}
        </div>
        <CopyPageButton markdown={pageMarkdown} />
      </header>

      <Highlightable slug={note.slug} className="prose min-w-0">
        {content}
      </Highlightable>
      <KatexAutoFit />
    </article>
  );
}
