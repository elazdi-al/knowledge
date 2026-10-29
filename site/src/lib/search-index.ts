import { WRITING, type Note } from "./notes";

/**
 * Build-time search index.
 *
 * The site is a static export, so the index is a build artifact: the route
 * handler at /search-index.json calls buildSearchIndex() once at build time
 * and the result lands in out/. Browsers never download it - the Cloudflare
 * Worker (worker/index.ts) hides the file behind a 404 and reads it through
 * its ASSETS binding to answer /api/search with ranked, render-ready hits
 * (the engine lives in lib/search-core.ts).
 *
 * Two kinds of documents come out of a note's raw MDX source:
 *   - concepts: paragraphs in the RULES.md shape `**Name.** Definition…`
 *   - sections: h2/h3 headings, skipped when a concept already covers them
 *
 * Each carries the anchor of its section (rehype-slug semantics, verified
 * against the exported HTML) and a short plain-text preview for the
 * extended pane. JSX components, code fences, and tables are dropped;
 * inline TeX is flattened to readable text.
 */

/** One preview line. Inline markdown (`**`, `*`, backticks) is preserved so
    the client can render it with the page's own typography. */
export interface PreviewLine {
  t: string;
  k?: "li" | "math";
}

export interface SearchNote {
  slug: string;
  title: string;
  /** Compact source label, e.g. "DIS L6". */
  label: string;
  /** First lines of the note. */
  preview: PreviewLine[];
}

export interface SearchItem {
  name: string;
  /** Index into SearchIndex.notes. */
  note: number;
  anchor: string;
  section?: string;
  kind: "concept" | "section";
  /** An in-context excerpt: a line of surrounding prose either side of the
      definition, so the preview reads like the page itself. */
  preview: PreviewLine[];
  /** Index into preview of the line the entry is about. */
  focus: number;
}

export interface SearchIndex {
  notes: SearchNote[];
  items: SearchItem[];
}

/* ------------------------------- text cleanup ------------------------------ */

const TEX_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\\(?:text|textit|textbf|mathrm|mathit|mathbf|operatorname)\{([^}]*)\}/g, "$1"],
  [/\\bmod/g, " mod "],
  [/\\(?:dots|ldots|cdots)/g, "…"],
  [/\\times/g, "×"],
  [/\\cdot/g, "·"],
  [/\\neq/g, " ≠ "],
  [/\\leq?(?![a-zA-Z])/g, " ≤ "],
  [/\\geq?(?![a-zA-Z])/g, " ≥ "],
  [/\\notin/g, " ∉ "],
  [/\\in(?![a-zA-Z])/g, " ∈ "],
  [/\\subseteq/g, " ⊆ "],
  [/\\subset/g, " ⊂ "],
  [/\\cup/g, " ∪ "],
  [/\\cap/g, " ∩ "],
  [/\\(?:emptyset|varnothing)/g, "∅"],
  [/\\(?:varepsilon|epsilon)/g, "ε"],
  [/\\delta/g, "δ"],
  [/\\sigma/g, "σ"],
  [/\\pi/g, "π"],
  [/\\alpha/g, "α"],
  [/\\beta/g, "β"],
  [/\\gamma/g, "γ"],
  [/\\lambda/g, "λ"],
  [/\\omega/g, "ω"],
  [/\\Sigma/g, "Σ"],
  [/\\Gamma/g, "Γ"],
  [/\\Rightarrow/g, " ⇒ "],
  [/\\(?:to|rightarrow)(?![a-zA-Z])/g, " → "],
  [/\\mapsto/g, " ↦ "],
  [/\\mid/g, " | "],
  [/\\langle/g, "⟨"],
  [/\\rangle/g, "⟩"],
  [/\\infty/g, "∞"],
  [/\\sqrt/g, "√"],
  [/\\(?:quad|qquad|[,;:!])/g, " "],
  [/\\(?:left|right)(?![a-zA-Z])/g, ""],
];

function cleanTex(tex: string): string {
  // Literal \{ \} survive; grouping braces are stripped after the commands.
  let s = tex.replace(/\\\{/g, "⟬").replace(/\\\}/g, "⟭");
  for (const [re, sub] of TEX_REPLACEMENTS) s = s.replace(re, sub);
  return s
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, "")
    .replace(/⟬/g, "{")
    .replace(/⟭/g, "}")
    .replace(/\s+/g, " ")
    .trim();
}

/** Flatten math and links but keep emphasis/code markers for the renderer. */
function keepInline(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t: string) => cleanTex(t))
    .replace(/\$([^$\n]+?)\$/g, (_, t: string) => cleanTex(t))
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fully plain text: keepInline with the emphasis/code markers stripped too. */
function cleanInline(text: string): string {
  return keepInline(text)
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

/** rehype-slug (github-slugger) semantics for the plain ASCII headings here. */
function slugify(text: string, counts: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, "")
    .replace(/ /g, "-");
  const n = counts.get(base) ?? 0;
  counts.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

/* --------------------------------- labels --------------------------------- */

function courseInitials(dir: string): string {
  return dir
    .split("-")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function fileLabel(file: string): string {
  const m = file.match(/^([a-z]+)-?(\d+)$/i);
  if (!m) return file.toUpperCase();
  return m[1].length > 1 ? `${m[1].toUpperCase()} ${m[2]}` : `${m[1].toUpperCase()}${m[2]}`;
}

function noteLabel(slugSegments: string[]): string {
  const file = slugSegments[slugSegments.length - 1];
  if (slugSegments.length < 2) return fileLabel(file);
  // Posts have names, not numbers: "boneh-durfee", not "W BONEH-DURFEE".
  if (slugSegments[0] === WRITING) return file;
  return `${courseInitials(slugSegments[0])} ${fileLabel(file)}`;
}

/* ------------------------------ block parsing ------------------------------ */

interface Block {
  kind: "p" | "list" | "math";
  /** Raw source text; lists keep one line per item. */
  text: string;
  section: number;
}

interface Section {
  text: string;
  anchor: string;
}

function parseBlocks(body: string): { blocks: Block[]; sections: Section[] } {
  const blocks: Block[] = [];
  const sections: Section[] = [];
  const slugCounts = new Map<string, number>();

  let inCode = false;
  let inComponent = false;
  let inMath = false;
  let mathLines: string[] = [];
  let paraLines: string[] = [];

  const flush = () => {
    if (paraLines.length === 0) return;
    const first = paraLines[0].trimStart();
    const kind: Block["kind"] = /^(?:[-*]\s|\d+\.\s)/.test(first) ? "list" : "p";
    blocks.push({
      kind,
      text: paraLines.join("\n"),
      section: sections.length - 1,
    });
    paraLines = [];
  };

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (inCode) {
      if (trimmed.startsWith("```")) inCode = false;
      continue;
    }
    if (trimmed.startsWith("```")) {
      flush();
      inCode = true;
      continue;
    }

    if (inComponent) {
      if (trimmed.endsWith("/>")) inComponent = false;
      continue;
    }
    if (/^<[A-Z][\w.]*/.test(trimmed)) {
      flush();
      // Self-closing on this line, or a container tag (children are markdown
      // and stay); otherwise a multi-line props block to skip until `/>`.
      if (!trimmed.endsWith("/>") && !trimmed.endsWith(">")) inComponent = true;
      continue;
    }
    if (/^<\/[A-Z][\w.]*>/.test(trimmed)) {
      flush();
      continue;
    }

    if (inMath) {
      if (trimmed === "$$" || trimmed.endsWith("$$")) {
        if (trimmed !== "$$") mathLines.push(trimmed.slice(0, -2));
        blocks.push({
          kind: "math",
          text: mathLines.join(" "),
          section: sections.length - 1,
        });
        mathLines = [];
        inMath = false;
      } else {
        mathLines.push(trimmed);
      }
      continue;
    }
    if (trimmed.startsWith("$$")) {
      flush();
      const rest = trimmed.slice(2);
      if (rest.endsWith("$$") && rest.length > 2) {
        blocks.push({
          kind: "math",
          text: rest.slice(0, -2),
          section: sections.length - 1,
        });
      } else {
        inMath = true;
        if (rest) mathLines.push(rest);
      }
      continue;
    }

    const heading = trimmed.match(/^#{2,4}\s+(.+)$/);
    if (heading) {
      flush();
      const text = cleanInline(heading[1]);
      sections.push({ text, anchor: slugify(text, slugCounts) });
      continue;
    }

    // Tables, rules, and import/export lines never reach the index.
    if (trimmed.startsWith("|") || /^(?:---+|\*\*\*+)$/.test(trimmed)) {
      flush();
      continue;
    }
    if (/^(?:import|export)\s/.test(trimmed)) continue;

    if (trimmed === "") {
      flush();
      continue;
    }

    paraLines.push(trimmed.replace(/^>\s?/, ""));
  }
  flush();

  return { blocks, sections };
}

/* ------------------------------ preview budget ----------------------------- */

const NOTE_PREVIEW = { entries: 6, chars: 650 };
const SECTION_PREVIEW = { entries: 5, chars: 520 };
const CONCEPT_PREVIEW = { entries: 7, chars: 680 };

/** Last `max` characters of a line, cut at a word boundary. */
function tailOf(s: string, max: number): string {
  if (s.length <= max) return s;
  return `…${s.slice(s.length - max).replace(/^\S+\s/, "")}`;
}

function blockToLines(block: Block): PreviewLine[] {
  if (block.kind === "math") {
    const t = cleanTex(block.text);
    return t ? [{ t, k: "math" }] : [];
  }
  if (block.kind === "list") {
    return block.text
      .split("\n")
      .map((l) => keepInline(l.replace(/^(?:[-*]|\d+\.)\s+/, "")))
      .filter(Boolean)
      .map((t) => ({ t, k: "li" as const }));
  }
  const t = keepInline(block.text);
  return t ? [{ t }] : [];
}

function collectPreview(
  blocks: Block[],
  start: number,
  budget: { entries: number; chars: number },
  withinSection?: number,
): PreviewLine[] {
  const out: PreviewLine[] = [];
  let chars = 0;
  for (let i = start; i < blocks.length; i++) {
    if (withinSection !== undefined && blocks[i].section !== withinSection) break;
    for (const line of blockToLines(blocks[i])) {
      out.push(line);
      chars += line.t.length;
      if (out.length >= budget.entries || chars >= budget.chars) return out;
    }
  }
  return out;
}

/* --------------------------------- builder -------------------------------- */

const CONCEPT_LEAD = /^\*\*(.+?)\*\*/;
const NOT_A_CONCEPT = /^(?:example|exercise)\b/i;

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/s$/, "");
}

export function buildSearchIndex(notes: Note[]): SearchIndex {
  const outNotes: SearchNote[] = [];
  const outItems: SearchItem[] = [];

  notes.forEach((note, noteIdx) => {
    const { blocks, sections } = parseBlocks(note.body);

    outNotes.push({
      slug: note.slug,
      title: note.frontmatter.title,
      label: noteLabel(note.slugSegments),
      preview: collectPreview(blocks, 0, NOTE_PREVIEW),
    });

    const conceptNames = new Set<string>();

    const conceptName = (boldLead: string): string | null => {
      const name = cleanInline(boldLead).replace(/[.:]\s*$/, "");
      if (!name || name.length > 60 || NOT_A_CONCEPT.test(name)) return null;
      const norm = normalizeName(name);
      if (conceptNames.has(norm)) return null;
      conceptNames.add(norm);
      return name;
    };

    blocks.forEach((block, i) => {
      if (block.kind !== "p") return;
      const lead = block.text.match(CONCEPT_LEAD);
      if (!lead) return;
      const name = conceptName(lead[1]);
      if (!name) return;

      const section = block.section >= 0 ? sections[block.section] : undefined;
      // An excerpt in context: the tail of the preceding prose, then the
      // definition itself, then whatever follows it, up to the budget.
      const preview: PreviewLine[] = [];
      if (i > 0 && blocks[i - 1].section === block.section) {
        const before = blockToLines(blocks[i - 1]);
        const last = before[before.length - 1];
        // Plain text for the clipped context line so truncation can't cut
        // through an emphasis marker pair.
        if (last) preview.push({ t: tailOf(cleanInline(last.t), 180), k: last.k });
      }
      const focus = preview.length;
      preview.push(...blockToLines(block));
      let chars = preview.reduce((n, l) => n + l.t.length, 0);
      const full = () =>
        preview.length >= CONCEPT_PREVIEW.entries || chars >= CONCEPT_PREVIEW.chars;
      for (let j = i + 1; j < blocks.length && !full(); j++) {
        if (blocks[j].section !== block.section) break;
        for (const line of blockToLines(blocks[j])) {
          preview.push(line);
          chars += line.t.length;
          if (full()) break;
        }
      }

      outItems.push({
        name,
        note: noteIdx,
        anchor: section?.anchor ?? "",
        section: section?.text,
        kind: "concept",
        preview,
        focus,
      });
    });

    // Property bullets (`- **Global depth.** …`) are concepts people search
    // for too. A second pass so full paragraph definitions claim names first.
    blocks.forEach((block, i) => {
      if (block.kind !== "list") return;
      const lines = blockToLines(block);
      block.text.split("\n").forEach((raw) => {
        const lead = raw.trim().match(/^(?:[-*]|\d+\.)\s+\*\*(.+?)\*\*/);
        if (!lead) return;
        const name = conceptName(lead[1]);
        if (!name) return;

        const section = block.section >= 0 ? sections[block.section] : undefined;
        const preview: PreviewLine[] = [];
        if (i > 0 && blocks[i - 1].section === block.section && blocks[i - 1].kind === "p") {
          const before = blockToLines(blocks[i - 1]);
          const last = before[before.length - 1];
          if (last) preview.push({ t: tailOf(cleanInline(last.t), 180) });
        }
        let focus = preview.length;
        let from = 0;
        const at = lines.findIndex((l) =>
          cleanInline(l.t).toLowerCase().startsWith(name.toLowerCase()),
        );
        if (at >= 0) {
          // Keep the bullet itself in the budget window.
          from = Math.max(0, at - (CONCEPT_PREVIEW.entries - 2));
          focus = preview.length + (at - from);
        }
        let chars = 0;
        for (const line of lines.slice(from)) {
          preview.push(line);
          chars += line.t.length;
          if (preview.length >= CONCEPT_PREVIEW.entries || chars >= CONCEPT_PREVIEW.chars) break;
        }

        outItems.push({
          name,
          note: noteIdx,
          anchor: section?.anchor ?? "",
          section: section?.text,
          kind: "concept",
          preview,
          focus,
        });
      });
    });

    sections.forEach((section, sectionIdx) => {
      if (conceptNames.has(normalizeName(section.text))) return;
      const first = blocks.findIndex((b) => b.section === sectionIdx);
      outItems.push({
        name: section.text,
        note: noteIdx,
        anchor: section.anchor,
        kind: "section",
        preview: first >= 0 ? collectPreview(blocks, first, SECTION_PREVIEW, sectionIdx) : [],
        focus: 0,
      });
    });
  });

  return { notes: outNotes, items: outItems };
}
