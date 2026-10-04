import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyPageButton } from "@/components/CopyPageButton";
import { CourseIcon } from "@/components/CourseIcon";
import { Highlightable } from "@/components/Highlightable";
import { KatexAutoFit } from "@/components/KatexAutoFit";
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

  const content = await renderMDX(note.body);
  const date = note.frontmatter.created;
  const course = groupByCourse(await getAllNotes()).find((c) => c.slug && c.notes.some((n) => n.note.slug === note.slug));
  const heading = course?.notes.find((n) => n.note.slug === note.slug)?.label ?? note.frontmatter.title;

  // A clean Markdown reconstruction for the copy button: title as an H1, the
  // description, then the raw source. Compact and well-structured for an LLM.
  const pageMarkdown = [
    `# ${note.frontmatter.title}`,
    note.frontmatter.description,
    note.body.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <article className="flex min-w-0 flex-col">
      <header className="mb-6">
        {course && (
          <Link
            href={`/#${course.slug}`}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[color:var(--color-muted)] no-underline transition-colors duration-150 hover:text-[color:var(--color-text)]"
          >
            <CourseIcon course={course.slug} className="size-3.5" />
            {course.name}
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[color:var(--color-text)] text-[1.5rem] font-medium tracking-[-0.025em] leading-[1.2] mb-2">
            {heading}
          </h1>
          <CopyPageButton markdown={pageMarkdown} className="-mt-1" />
        </div>
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

      <Highlightable slug={note.slug} className="prose min-w-0">
        {content}
      </Highlightable>
      <KatexAutoFit />
    </article>
  );
}
