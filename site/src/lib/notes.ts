import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

/**
 * File-system note reader.
 *
 * Walks ../notes recursively and returns one entry per .md/.mdx file.
 * The path inside that directory becomes the slug, so
 * data-intensive-systems/l9.mdx → slug "data-intensive-systems/l9" →
 * URL /notes/data-intensive-systems/l9.
 *
 * gray-matter parses the YAML block here so the index page and per-note
 * metadata don't need to load the compiled MDX module.
 */

const NOTES_DIR = path.resolve(process.cwd(), "..", "notes");

const FrontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  created: z.coerce.date().optional(),
  updated: z.coerce.date().optional(),
  draft: z.boolean().default(false),
});

export interface Note {
  slug: string;
  slugSegments: string[];
  frontmatter: z.infer<typeof FrontmatterSchema>;
  body: string;
}

async function walk(dir: string): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))
    ) {
      files.push(full);
    }
  }
  return files;
}

function slugFromPath(filePath: string): string {
  const rel = path.relative(NOTES_DIR, filePath);
  const withoutExt = rel.replace(/\.(md|mdx)$/i, "");
  return withoutExt.split(path.sep).join("/");
}

// In production builds this cache lets the homepage, the search index,
// and every note share a single filesystem walk. In dev we read fresh so
// edits in ../notes are reflected on the next request.
let cache: Promise<Note[]> | null = null;
const useCache = process.env.NODE_ENV === "production";

export function getAllNotes(): Promise<Note[]> {
  if (useCache && cache) return cache;
  const p = load();
  if (useCache) cache = p;
  return p;
}

async function load(): Promise<Note[]> {
  const files = await walk(NOTES_DIR);
  const notes: Note[] = [];
  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);
    const fm = FrontmatterSchema.parse(parsed.data);
    if (fm.draft) continue;
    const slug = slugFromPath(filePath);
    notes.push({
      slug,
      slugSegments: slug.split("/"),
      frontmatter: fm,
      body: parsed.content,
    });
  }
  notes.sort((a, b) => a.slug.localeCompare(b.slug, "en", { numeric: true }));
  return notes;
}

export interface Course {
  slug: string;
  name: string;
  notes: { note: Note; label: string }[];
}

/**
 * Notes grouped by their top-level folder, in listing order. The course name
 * is the title prefix every note in the folder shares ("Theory of
 * Computation: Lecture 1"), and each note's label is the rest of its title.
 */
export function groupByCourse(notes: Note[]): Course[] {
  const bySlug = new Map<string, Note[]>();
  for (const note of notes) {
    const key = note.slugSegments.length > 1 ? note.slugSegments[0] : "";
    bySlug.set(key, [...(bySlug.get(key) ?? []), note]);
  }
  return [...bySlug].map(([slug, group]) => {
    const prefixes = new Set(group.map((n) => n.frontmatter.title.split(": ")[0]));
    const shared = prefixes.size === 1 && group.every((n) => n.frontmatter.title.includes(": "));
    const name = shared ? [...prefixes][0] : slug.replace(/-/g, " ");
    return {
      slug,
      name,
      notes: group.map((note) => ({
        note,
        label: shared ? note.frontmatter.title.slice(name.length + 2) : note.frontmatter.title,
      })),
    };
  });
}

export async function getNoteBySlug(slug: string): Promise<Note | undefined> {
  const all = await getAllNotes();
  return all.find((n) => n.slug === slug);
}

export function formatDate(d?: Date): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
