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
import { normalizeQuery, QUERY_MAX, type ItemHit, type NoteHit, type PreviewLine } from "@/lib/search-core";
import { useSearch, warmSearch, type SearchStatus } from "@/lib/use-search";

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
      onPointerEnter={warmSearch}
      onFocus={warmSearch}
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

/* ----------------------------------- menu ---------------------------------- */

type Active = { type: "note"; note: NoteHit } | { type: "item"; item: ItemHit };

// Results arrive ranked from /api/search; rows only carry what rendering and
// navigation need. cmdk runs with shouldFilter=false and keeps server order.
interface Row {
  value: string;
  name: string;
  label?: string;
  href: string;
  active: Active;
}

function emptyMessage(status: SearchStatus): string {
  switch (status) {
    case "loading":
      return "Searching…";
    case "rate_limited":
      return "Too many searches — retrying…";
    case "unavailable":
      return "Search is unavailable.";
    default:
      return "No results.";
  }
}

export function CommandMenu() {
  const open = useSyncExternalStore(subscribe, () => isOpen, () => false);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [extended, setExtended] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  const { results, status } = useSearch(query, open);
  const q = normalizeQuery(query);
  const searching = q.length > 0;

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
    if (!next) {
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
          document.getElementById(hash)?.scrollIntoView({ behavior: "instant" });
          history.replaceState(null, "", row.href);
        } else {
          window.scrollTo({ top: 0, behavior: "instant" });
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
    if (!results) return { noteRows, itemRows, lookup };

    const claim = (base: string) => {
      let v = base;
      for (let n = 2; lookup.has(v); n++) v = `${base} ${n}`;
      return v;
    };
    const add = (rows: Row[], row: Omit<Row, "value">, base: string) => {
      const full: Row = { ...row, value: claim(base) };
      rows.push(full);
      lookup.set(full.value, full);
    };

    results.notes.forEach((note) => {
      add(
        noteRows,
        { name: note.title, href: `/notes/${note.slug}`, active: { type: "note", note } },
        note.title.toLowerCase(),
      );
    });
    results.items.forEach((item) => {
      add(
        itemRows,
        {
          name: item.name,
          label: item.noteLabel,
          href: `/notes/${item.noteSlug}${item.anchor ? `#${item.anchor}` : ""}`,
          active: { type: "item", item },
        },
        `${item.name} ${item.noteLabel}`.toLowerCase(),
      );
    });
    return { noteRows, itemRows, lookup };
  }, [results]);

  const active = lookup.get(selected);

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
            shouldFilter={false}
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
              maxLength={QUERY_MAX}
              placeholder="Search notes and concepts…"
              className="cmdk-input"
            />
            <div className="cmdk-body">
              <Command.List className="cmdk-list">
                <Command.Empty className="cmdk-empty">{emptyMessage(status)}</Command.Empty>
                {noteRows.length > 0 && (
                  <Command.Group heading="notes">
                    {noteRows.map((row) => (
                      <RowItem key={row.value} row={row} query={q} onNavigate={navigate} />
                    ))}
                  </Command.Group>
                )}
                {searching && itemRows.length > 0 && (
                  <Command.Group heading="concepts">
                    {itemRows.map((row) => (
                      <RowItem key={row.value} row={row} query={q} onNavigate={navigate} />
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

// The soft highlight from the preview pane, reused on the first occurrence
// of the query inside a result name.
function MarkedName({ name, query }: { name: string; query: string }) {
  const i = query ? name.toLowerCase().indexOf(query) : -1;
  if (i < 0) return name;
  return (
    <>
      {name.slice(0, i)}
      <mark className="cmdk-mark">{name.slice(i, i + query.length)}</mark>
      {name.slice(i + query.length)}
    </>
  );
}

function RowItem({
  row,
  query,
  onNavigate,
}: {
  row: Row;
  query: string;
  onNavigate: (row: Row) => void;
}) {
  return (
    <Command.Item value={row.value} onSelect={() => onNavigate(row)} className="cmdk-item">
      <span className="cmdk-item-name">
        <MarkedName name={row.name} query={query} />
      </span>
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
          el.scrollIntoView({ block: "center", behavior: "instant" });
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
        <PreviewBody lines={note.preview} />
      </>
    );
  }

  const { item } = active;
  return (
    <>
      <div className="cmdk-preview-eyebrow">
        <span>{item.noteLabel}</span>
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
