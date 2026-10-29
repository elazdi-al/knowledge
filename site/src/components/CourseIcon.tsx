import type { Tone } from "@/components/figure";

/** Duotone back layer: the glyph's own hue at low opacity under the full-strength strokes. */
const DUO = { fill: "currentColor", fillOpacity: 0.3 } as const;

/** The homepage tab that holds every archived course. */
export const ARCHIVE = "archive";

/**
 * Per course folder: a short tab label, so every tab fits on one line, a figure hue, and a Lucide-style duotone glyph.
 * A hue marks a course; collections (writing, the archive) have none, so their glyph takes the tab's text colour.
 * Archived courses leave the tab bar for the archive tab. Unknown courses keep their full name and get a neutral book.
 */
export const COURSES: Record<string, { label: string; tone?: Tone; archived?: boolean; glyph: React.ReactNode }> = {
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
    archived: true,
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
    archived: true,
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
  writing: {
    label: "writing",
    glyph: (
      <>
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" {...DUO} />
        <path d="M13 21h8" />
      </>
    ),
  },
  [ARCHIVE]: {
    label: "archive",
    glyph: (
      <>
        <rect x="2" y="3" width="20" height="5" rx="1" {...DUO} />
        <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
        <path d="M10 12h4" />
      </>
    ),
  },
};

/**
 * Per CTF category folder (notes/ctf/<category>/): Lucide-style duotone glyphs with no hue, so they take the
 * heading's grey. Other categories get the book.
 */
const CATEGORIES: Record<string, React.ReactNode> = {
  cryptography: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" {...DUO} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  pwn: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" {...DUO} />
      <path d="m7 11 2-2-2-2" />
      <path d="M11 13h4" />
    </>
  ),
  web: (
    <>
      <circle cx="12" cy="12" r="10" {...DUO} />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </>
  ),
  reversing: (
    <>
      <circle cx="11" cy="11" r="8" {...DUO} />
      <path d="m21 21-4.3-4.3" />
      <path d="m13 13.5 2-2.5-2-2.5" />
      <path d="M9 8.5 7 11l2 2.5" />
    </>
  ),
  forensics: (
    <>
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" {...DUO} />
      <path d="M22 12H2" />
      <path d="M6 16h.01" />
      <path d="M10 16h.01" />
    </>
  ),
  misc: (
    <path
      d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"
      {...DUO}
    />
  ),
};

const BOOK = (
  <>
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" {...DUO} />
    <path d="M12 7v14" />
  </>
);

function Glyph({ color, className, children }: { color?: string; className?: string; children: React.ReactNode }) {
  return (
    <svg
      className={className}
      style={color ? { color } : undefined}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function CourseIcon({ course, className }: { course: string; className?: string }) {
  const entry = COURSES[course];
  return (
    <Glyph color={entry?.tone && `var(--dg-${entry.tone}-solid)`} className={className}>
      {entry?.glyph ?? BOOK}
    </Glyph>
  );
}

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  return <Glyph className={className}>{CATEGORIES[category] ?? BOOK}</Glyph>;
}
