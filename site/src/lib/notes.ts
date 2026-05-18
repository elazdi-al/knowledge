import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

/**
 * File-system note reader.
 *
 * Walks ../notes recursively and returns one entry per .md/.mdx file.
 * The path inside notes/ becomes the slug, so notes/concepts/foo.md →
 * slug "concepts/foo" → URL /notes/concepts/foo.
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

export type NoteFrontmatter = z.infer<typeof FrontmatterSchema>;

export interface Note {
  slug: string;
  slugSegments: string[];
  filePath: string;
  relativePath: string;
  isMDX: boolean;
  frontmatter: NoteFrontmatter;
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

// In production builds this cache lets the homepage, tag pages, and
// every note share a single filesystem walk. In dev we read fresh so
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
      filePath,
      relativePath: path.relative(NOTES_DIR, filePath),
      isMDX: filePath.endsWith(".mdx"),
      frontmatter: fm,
      body: parsed.content,
    });
  }
  notes.sort((a, b) => sortKey(b) - sortKey(a));
  return notes;
}

function sortKey(n: Note): number {
  return (
    n.frontmatter.updated?.getTime() ??
    n.frontmatter.created?.getTime() ??
    0
  );
}

export async function getNoteBySlug(slug: string): Promise<Note | undefined> {
  const all = await getAllNotes();
  return all.find((n) => n.slug === slug);
}

export async function getAllTags(): Promise<Map<string, Note[]>> {
  const notes = await getAllNotes();
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    for (const t of n.frontmatter.tags) {
      const arr = map.get(t) ?? [];
      arr.push(n);
      map.set(t, arr);
    }
  }
  return map;
}

export function formatDate(d?: Date): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
