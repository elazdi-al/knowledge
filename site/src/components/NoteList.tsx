"use client";

import { Tabs } from "@base-ui/react/tabs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CourseIcon } from "@/components/CourseIcon";

export interface CourseEntry {
  slug: string;
  name: string;
  notes: { slug: string; label: string }[];
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
      <Tabs.List className="course-tabs -mx-2 mb-5 sm:-mt-2 sm:mb-2">
        {courses.map((c) => (
          <Tabs.Tab key={c.slug} value={c.slug} className="course-tab">
            <CourseIcon course={c.slug} className="size-3.5 shrink-0" />
            {c.name}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="course-tabs__indicator" renderBeforeHydration />
      </Tabs.List>
      <div ref={scroller} className="home-scroller">
        <div className="grid">
          {courses.map((c) => (
            <Tabs.Panel key={c.slug} value={c.slug} className="course-panel flex flex-col">
              {c.notes.map((note) => (
                <Link
                  key={note.slug}
                  href={`/notes/${note.slug}`}
                  className="-mx-3 flex h-10 items-center rounded-md px-3 no-underline hover:bg-[color:var(--color-hover)]"
                >
                  {note.label}
                </Link>
              ))}
            </Tabs.Panel>
          ))}
        </div>
      </div>
    </Tabs.Root>
  );
}
