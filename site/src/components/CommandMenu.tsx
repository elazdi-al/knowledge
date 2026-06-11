"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import type { PreviewLine, SearchIndex, SearchItem, SearchNote } from "@/lib/search-index";

/* ---------------------------------- store ---------------------------------- */

// Module-level open state so the header trigger and the menu (mounted in the
// layout) share it without context or a state library.
let isOpen = false;
const listeners = new Set<() => void>();

function setOpen(next: boolean) {
  isOpen = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// The index is one static file; fetch it once and share the promise.
let indexPromise: Promise<SearchIndex> | null = null;

function loadIndex(): Promise<SearchIndex> {
  indexPromise ??= fetch("/search-index.json").then((r) => {
    if (!r.ok) {
      indexPromise = null;
      throw new Error(`search index: ${r.status}`);
    }
    return r.json() as Promise<SearchIndex>;
  });
  return indexPromise;
}

const COMMAND_MENU_KEY = "k";
const COMMAND_MENU_CODE = "KeyK";
const COMMAND_MENU_LEGACY_KEY_CODE = 75;
const shortcutListenerOptions = { capture: true };

function isAppleKeyboardPlatform() {
  return (
    /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
    (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function isCommandMenuShortcut(e: KeyboardEvent) {
  if (e.defaultPrevented || e.repeat || e.isComposing) return false;

  const primaryModifier = isAppleKeyboardPlatform() ? e.metaKey : e.ctrlKey;
  const secondaryModifier = isAppleKeyboardPlatform() ? e.ctrlKey : e.metaKey;

  if (!primaryModifier || secondaryModifier || e.altKey || e.shiftKey) return false;

  if (e.key.toLowerCase() === COMMAND_MENU_KEY) return true;
  if (e.code === COMMAND_MENU_CODE) return true;

  return e.key === "Unidentified" && e.keyCode === COMMAND_MENU_LEGACY_KEY_CODE;
}

/* --------------------------------- trigger --------------------------------- */

export function SearchButton() {
  const [shortcut, setShortcut] = useState("⌘K");

  useEffect(() => {
    if (!isAppleKeyboardPlatform()) setShortcut("Ctrl K");
  }, []);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Search"
      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[color:var(--color-faint)] transition-[color,background-color,scale] duration-150 ease-out hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text)] active:scale-[0.97]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5"
      >
        <circle cx="11" cy="11" r="7.5" />
        <path d="m20.5 20.5-4.2-4.2" />
      </svg>
      <span className="text-[0.6875rem] leading-none">{shortcut}</span>
    </button>
  );
}

/* --------------------------------- scoring --------------------------------- */

interface Row {
  value: string;
  name: string;
  label?: string;
  href: string;
  active: Active;
  // Precomputed lowercase search fields.
  nameLower: string;
  nameWords: string[];
  meta: string;
  haystack: string;
}

function plainText(lines: PreviewLine[]): string {
  return lines
    .map((l) => l.t)
    .join(" ")
    .replace(/[*`]/g, "");
}

// Deterministic tiers instead of fuzzy scatter-matching: exact name, then
// name prefix, then phrase-in-name, then per-word prefixes, then metadata,
// then the definition text itself. Predictable beats clever here.
function scoreRow(row: Row, search: string): number {
  const q = search.trim().toLowerCase();
  if (!q) return 1;
  if (row.nameLower === q) return 1;
  if (row.nameLower.startsWith(q)) return 0.9;
  if (row.nameLower.includes(q)) return 0.8;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.every((t) => row.nameWords.some((w) => w.startsWith(t)))) return 0.7;
  if (tokens.every((t) => row.meta.includes(t))) return 0.55;
  if (row.haystack.includes(q)) return 0.45;
  if (tokens.every((t) => row.haystack.includes(t))) return 0.3;
  return 0;
}

/* ----------------------------------- menu ---------------------------------- */

type Active =
  | { type: "note"; note: SearchNote }
  | { type: "item"; item: SearchItem; note: SearchNote };

export function CommandMenu() {
  const open = useSyncExternalStore(subscribe, () => isOpen, () => false);
  const router = useRouter();
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [extended, setExtended] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  // Warm the index after first paint so the first open is instant.
  useEffect(() => {
    const load = () => void loadIndex().then(setIndex).catch(() => {});
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(load);
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(load, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      setExtended(localStorage.getItem("search-extended") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    // Capture-phase keeps the app shortcut ahead of local handlers; the
    // matcher exits on defaultPrevented so duplicate listeners stay harmless.
    const onKey = (e: KeyboardEvent) => {
      if (!isCommandMenuShortcut(e)) return;
      e.preventDefault();
      setOpen(!isOpen);
    };
    window.addEventListener("keydown", onKey, shortcutListenerOptions);
    return () => window.removeEventListener("keydown", onKey, shortcutListenerOptions);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    window.clearTimeout(resetTimer.current);
    if (next) {
      void loadIndex().then(setIndex).catch(() => {});
    } else {
      // Clear after the exit transition so the list doesn't jump mid-fade.
      resetTimer.current = window.setTimeout(() => {
        setQuery("");
        setSelected("");
      }, 120);
    }
  }, []);

  const toggleExtended = useCallback(() => {
    setExtended((prev) => {
      try {
        localStorage.setItem("search-extended", prev ? "0" : "1");
      } catch {}
      return !prev;
    });
  }, []);

  const navigate = useCallback(
    (row: Row) => {
      handleOpenChange(false);
      const [path, hash] = row.href.split("#");
      if (window.location.pathname === path) {
        // Same page: jump directly; router.push would re-append the hash.
        if (hash) {
          document.getElementById(hash)?.scrollIntoView();
          history.replaceState(null, "", row.href);
        } else {
          window.scrollTo(0, 0);
        }
      } else {
        router.push(row.href);
      }
      if (row.active.type === "item" && row.active.item.kind === "concept") {
        flashConcept(path, row.active.item.name);
      }
    },
    [handleOpenChange, router],
  );

  const { noteRows, itemRows, lookup } = useMemo(() => {
    const noteRows: Row[] = [];
    const itemRows: Row[] = [];
    const lookup = new Map<string, Row>();
    if (!index) return { noteRows, itemRows, lookup };

    const claim = (base: string) => {
      let v = base;
      for (let n = 2; lookup.has(v); n++) v = `${base} ${n}`;
      return v;
    };
    const add = (
      rows: Row[],
      row: Omit<Row, "nameLower" | "nameWords" | "meta" | "haystack">,
      metaExtra: string,
      body: string,
    ) => {
      const nameLower = row.name.toLowerCase();
      const meta = `${nameLower} ${metaExtra.toLowerCase()}`;
      const full: Row = {
        ...row,
        nameLower,
        nameWords: nameLower.split(/[^a-z0-9+]+/).filter(Boolean),
        meta,
        haystack: `${meta} ${body.toLowerCase()}`,
      };
      rows.push(full);
      lookup.set(full.value, full);
    };

    index.notes.forEach((note) => {
      add(
        noteRows,
        {
          value: claim(note.title.toLowerCase()),
          name: note.title,
          href: `/notes/${note.slug}`,
          active: { type: "note", note },
        },
        note.label,
        `${note.description ?? ""} ${plainText(note.preview)}`,
      );
    });
    index.items.forEach((item) => {
      const note = index.notes[item.note];
      add(
        itemRows,
        {
          value: claim(`${item.name} ${note.label}`.toLowerCase()),
          name: item.name,
          label: note.label,
          href: `/notes/${note.slug}${item.anchor ? `#${item.anchor}` : ""}`,
          active: { type: "item", item, note },
        },
        `${item.section ?? ""} ${note.label}`,
        plainText(item.preview),
      );
    });
    return { noteRows, itemRows, lookup };
  }, [index]);

  const filter = useCallback(
    (value: string, search: string) => {
      const row = lookup.get(value);
      return row ? scoreRow(row, search) : 0;
    },
    [lookup],
  );

  const active = lookup.get(selected);
  const searching = query.trim().length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="cmdk-backdrop" />
        <Dialog.Popup
          aria-label="Search"
          className={cn("cmdk-popup", extended && "cmdk--extended")}
        >
          <Command
            label="Search notes and concepts"
            loop
            filter={filter}
            value={selected}
            onValueChange={setSelected}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                toggleExtended();
              }
            }}
          >
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search notes and concepts…"
              className="cmdk-input"
            />
            <div className="cmdk-body">
              <Command.List className="cmdk-list">
                <Command.Empty className="cmdk-empty">No results.</Command.Empty>
                <Command.Group heading="notes">
                  {noteRows.map((row) => (
                    <RowItem key={row.value} row={row} onNavigate={navigate} />
                  ))}
                </Command.Group>
                {searching && (
                  <Command.Group heading="concepts">
                    {itemRows.map((row) => (
                      <RowItem key={row.value} row={row} onNavigate={navigate} />
                    ))}
                  </Command.Group>
                )}
              </Command.List>
              <aside className="cmdk-preview" aria-hidden={!extended}>
                <div className="cmdk-preview-inner">
                  {active && <PreviewPane active={active.active} />}
                </div>
              </aside>
            </div>
            <div className="cmdk-footer">
              <button
                type="button"
                className="cmdk-footer-toggle"
                onClick={toggleExtended}
              >
                <kbd className="cmdk-kbd">⇥</kbd> preview
              </button>
              <span className="cmdk-footer-hint">
                <kbd className="cmdk-kbd">↵</kbd> open
              </span>
            </div>
          </Command>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RowItem({ row, onNavigate }: { row: Row; onNavigate: (row: Row) => void }) {
  return (
    <Command.Item value={row.value} onSelect={() => onNavigate(row)} className="cmdk-item">
      <span className="cmdk-item-name">{row.name}</span>
      {row.label && <span className="cmdk-item-label">{row.label}</span>}
    </Command.Item>
  );
}

/* ---------------------------------- flash ---------------------------------- */

// After a concept jump, find the concept's bold lead on the destination page,
// center it, and let the .concept-flash animation settle it back to rest.
function flashConcept(pathname: string, name: string) {
  const target = name.toLowerCase();
  const deadline = performance.now() + 3000;
  const tick = () => {
    if (window.location.pathname === pathname) {
      const leads = document.querySelectorAll<HTMLElement>(".prose strong");
      for (const el of leads) {
        const text = (el.textContent ?? "").trim().replace(/[.:]$/, "").toLowerCase();
        if (text === target) {
          el.scrollIntoView({ block: "center" });
          el.classList.add("concept-flash");
          el.addEventListener(
            "animationend",
            () => el.classList.remove("concept-flash"),
            { once: true },
          );
          return;
        }
      }
    }
    if (performance.now() < deadline) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* --------------------------------- preview --------------------------------- */

// Renders a preview line with the page's own inline typography: bold leads,
// muted italics, code chips. `mark` wraps the first occurrence of the concept
// name (it lives inside the bold lead) in a soft highlight.
interface MarkState {
  term: string;
  done: boolean;
}

function renderText(text: string, mark?: MarkState): ReactNode {
  if (!mark || mark.done) return text;
  const i = text.toLowerCase().indexOf(mark.term.toLowerCase());
  if (i < 0) return text;
  mark.done = true;
  return (
    <>
      {text.slice(0, i)}
      <mark className="cmdk-mark">{text.slice(i, i + mark.term.length)}</mark>
      {text.slice(i + mark.term.length)}
    </>
  );
}

function renderInline(text: string, mark?: MarkState): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{renderText(part.slice(2, -2), mark)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{renderText(part.slice(1, -1), mark)}</em>;
    }
    return <Fragment key={i}>{renderText(part, mark)}</Fragment>;
  });
}

function PreviewBody({
  lines,
  focus,
  term,
}: {
  lines: PreviewLine[];
  focus?: number;
  term?: string;
}) {
  return lines.map((line, i) => {
    const mark = term !== undefined && i === focus ? { term, done: false } : undefined;
    const content = renderInline(line.t, mark);
    if (line.k === "li") {
      return (
        <div key={i} className="cmdk-preview-li">
          {content}
        </div>
      );
    }
    if (line.k === "math") {
      return (
        <div key={i} className="cmdk-preview-math">
          {content}
        </div>
      );
    }
    return (
      <p key={i} className="cmdk-preview-p">
        {content}
      </p>
    );
  });
}

function PreviewPane({ active }: { active: Active }) {
  if (active.type === "note") {
    const { note } = active;
    return (
      <>
        <div className="cmdk-preview-eyebrow">
          <span>{note.label}</span>
        </div>
        <div className="cmdk-preview-title">{note.title}</div>
        {note.description && <p className="cmdk-preview-desc">{note.description}</p>}
        <PreviewBody lines={note.preview} />
      </>
    );
  }

  const { item, note } = active;
  return (
    <>
      <div className="cmdk-preview-eyebrow">
        <span>{note.label}</span>
        {item.section && item.section !== item.name && <span>{item.section}</span>}
      </div>
      <div className="cmdk-preview-title">{item.name}</div>
      <PreviewBody
        lines={item.preview}
        focus={item.focus}
        term={item.kind === "concept" ? item.name : undefined}
      />
    </>
  );
}
