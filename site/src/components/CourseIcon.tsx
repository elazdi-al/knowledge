import type { Tone } from "@/components/figure";

/** Duotone back layer: the glyph's own hue at low opacity under the full-strength strokes. */
const DUO = { fill: "currentColor", fillOpacity: 0.3 } as const;

/**
 * Per course folder: a short tab label, so every tab fits on one line, a figure hue, and a Lucide-style duotone glyph.
 * Unknown courses keep their full name and get a neutral book.
 */
export const COURSES: Record<string, { label: string; tone: Tone; glyph: React.ReactNode }> = {
  "advanced-networks": {
    label: "networks",
    tone: "blue",
    glyph: (
      <>
        <rect x="16" y="16" width="6" height="6" rx="1" {...DUO} />
        <rect x="2" y="16" width="6" height="6" rx="1" {...DUO} />
        <rect x="9" y="2" width="6" height="6" rx="1" {...DUO} />
        <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
        <path d="M12 12V8" />
      </>
    ),
  },
  "data-intensive-systems": {
    label: "data systems",
    tone: "green",
    glyph: (
      <>
        <path d="M3 5a9 3 0 0 1 18 0v14a9 3 0 0 1-18 0z" stroke="none" {...DUO} />
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14a9 3 0 0 0 18 0V5" />
        <path d="M3 12a9 3 0 0 0 18 0" />
      </>
    ),
  },
  "theory-of-computation": {
    label: "computation",
    tone: "purple",
    glyph: (
      <>
        <rect x="14" y="14" width="4" height="6" rx="2" {...DUO} />
        <rect x="6" y="4" width="4" height="6" rx="2" {...DUO} />
        <path d="M6 20h4" />
        <path d="M14 10h4" />
        <path d="M6 14h2v6" />
        <path d="M14 4h2v6" />
      </>
    ),
  },
  "machine-learning": {
    label: "ml",
    tone: "teal",
    glyph: (
      <>
        <circle cx="19" cy="5" r="2" {...DUO} />
        <circle cx="5" cy="19" r="2" {...DUO} />
        <path d="M5 17A12 12 0 0 1 17 5" />
      </>
    ),
  },
  ctf: {
    label: "ctf",
    tone: "red",
    glyph: (
      <path
        d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"
        {...DUO}
      />
    ),
  },
};

const BOOK = (
  <>
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" {...DUO} />
    <path d="M12 7v14" />
  </>
);

export function CourseIcon({ course, className }: { course: string; className?: string }) {
  const entry = COURSES[course];
  return (
    <svg
      className={className}
      style={entry && { color: `var(--dg-${entry.tone}-solid)` }}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {entry?.glyph ?? BOOK}
    </svg>
  );
}
