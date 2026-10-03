"use client";

import { Tabs } from "@base-ui/react/tabs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface CourseEntry {
  slug: string;
  name: string;
  notes: { slug: string; label: string; description?: string }[];
}

interface Props {
  courses: CourseEntry[];
}

/** One tab per course; the selected course lives in the URL hash so going back lands on it. */
export function NoteList({ courses }: Props) {
  const [course, setCourse] = useState(courses[0]?.slug);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromHash = decodeURIComponent(location.hash.slice(1));
    if (courses.some((c) => c.slug === fromHash)) setCourse(fromHash);
  }, [courses]);

  if (courses.length === 0) {
    return (
      <p className="text-gray-1100">
        No notes yet. Drop a Markdown file in <code>../notes/</code>.
      </p>
    );
  }

  return (
    <Tabs.Root
      value={course}
      onValueChange={(slug: string) => {
        setCourse(slug);
        history.replaceState(null, "", `#${slug}`);
        scroller.current?.scrollTo({ top: 0 });
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <Tabs.List className="-mx-3 mb-5 flex flex-wrap gap-x-5 px-3 sm:-mt-3 sm:mb-1 sm:py-3">
        {courses.map((c) => (
          <Tabs.Tab
            key={c.slug}
            value={c.slug}
            className="text-gray-1100 font-medium lowercase transition-colors duration-150 hover:text-[color:var(--color-text)] data-[active]:text-[color:var(--color-text)]"
          >
            {c.name}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <div ref={scroller} className="home-scroller">
        {courses.map((c) => (
          <Tabs.Panel key={c.slug} value={c.slug} className="flex flex-col gap-7 sm:gap-4">
            {c.notes.map((note) => (
              <Link
                key={note.slug}
                href={`/notes/${note.slug}`}
                className="-mx-3 flex flex-col rounded-md px-3 no-underline hover:bg-[color:var(--color-hover)] sm:py-3"
              >
                <span>{note.label}</span>
                {note.description && <span className="text-gray-1100">{note.description}</span>}
              </Link>
            ))}
          </Tabs.Panel>
        ))}
      </div>
    </Tabs.Root>
  );
}
