"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Section {
  id: string;
  title: string;
}

/**
 * The note's side rail: a back link to the index (landing on the note's
 * course tab), then the h2 outline with the section being read lit up. The
 * outline is read from the rendered headings so its ids always match
 * rehype-slug's.
 */
export function NoteToc({ courseSlug }: { courseSlug?: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const headings = [...document.querySelectorAll<HTMLElement>(".prose h2[id]")];
    setSections(headings.map((h) => ({ id: h.id, title: h.textContent ?? "" })));
    // The current section is the last one whose heading has crossed a third of
    // the way down the viewport; at the very bottom it is the last section,
    // which may be too short to ever reach that line.
    const update = () => {
      const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 1;
      const current = atEnd ? headings.at(-1) : headings.findLast((h) => h.getBoundingClientRect().top <= innerHeight / 3);
      setActive(current?.id);
    };
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);

  return (
    <aside className="toc no-print">
      <Link href={courseSlug ? `/#${courseSlug}` : "/"} className="toc__back">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M5.5 4L1.5 8M1.5 8L5.5 12M1.5 8H10C11.3807 8 12.5 6.88071 12.5 5.5V5.5C12.5 4.11929 11.3807 3 10 3H8.5"
            stroke="currentColor"
          />
        </svg>
        Index
      </Link>
      {sections.length > 0 && (
        <nav className="toc__nav" aria-label="On this page">
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} data-active={s.id === active ? "" : undefined}>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
}
