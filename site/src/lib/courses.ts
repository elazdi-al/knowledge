import type { Tone } from "@/components/figure";

/** The homepage tab that holds every archived course. */
export const ARCHIVE = "archive";

/**
 * Per course folder: a short tab label, so every tab fits on one line, and a figure hue.
 * A hue marks a course; collections (writing, the archive) have none.
 * Archived courses leave the tab bar for the archive tab. Unknown courses keep their full name.
 */
export const COURSES: Record<string, { label: string; tone?: Tone; archived?: boolean }> = {
  "advanced-networks": { label: "networks", tone: "blue" },
  "data-intensive-systems": { label: "data systems", tone: "green", archived: true },
  "theory-of-computation": { label: "computation", tone: "purple", archived: true },
  "machine-learning": { label: "ml", tone: "teal" },
  ctf: { label: "ctf", tone: "red" },
  writing: { label: "writing" },
  [ARCHIVE]: { label: "archive" },
};
