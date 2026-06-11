"use client";

import { Popover } from "@base-ui/react/popover";
import {
  highlight,
  type HighlightOptions,
  type MarkHandle,
} from "@highlighters/core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  createHighlightRecord,
  deleteHighlight,
  getHighlights,
  offsetsToRange,
  putHighlight,
  reanchor,
  type StoredHighlight,
} from "@/lib/highlights";

interface HighlightableProps {
  slug: string;
  className?: string;
  children: ReactNode;
}

interface ActiveMark {
  record: StoredHighlight;
  range: Range;
  handle: MarkHandle;
}

function rangeContainsPoint(range: Range, x: number, y: number): boolean {
  for (const rect of range.getClientRects()) {
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return true;
    }
  }
  return false;
}

/**
 * Mark options per theme. The library's `multiply` default reads well on white
 * but goes muddy over a dark page, so dark mode switches to `screen` blend so
 * the same yellow ink lifts off the background and stays bright. `animate` is
 * off for restored/retheming marks so only fresh strokes draw on.
 */
function markOptions(isDark: boolean, animate: boolean): HighlightOptions {
  return {
    // Same 48° yellow, but vivid and `screen`-blended so it lifts off the dark
    // page as bright ink instead of the muddy wash `multiply` gives there. A
    // fuller, more even ink flow fills the band between glyphs so it reads as a
    // mark rather than just recoloured text.
    ...(isDark
      ? {
          color: "#ffe14d",
          blendMode: "screen",
          opacity: 0.9,
          ink: { flow: 0.7, dryout: 0, flowFade: 0.1, streakiness: 0 },
        }
      : {}),
    ...(animate ? {} : { animation: { draw: false } }),
  };
}

/**
 * Wraps a note's prose and lets the reader highlight it: select text to get a
 * popover, click to lay down an ink mark, right-click a mark to erase it.
 * Marks persist per note in IndexedDB and re-anchor when the note changes.
 */
export function Highlightable({ slug, className, children }: HighlightableProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef(new Map<string, ActiveMark>());
  const pendingRef = useRef<Range | null>(null);
  const isDarkRef = useRef(false);
  const [open, setOpen] = useState(false);
  // Bumped per selection so the positioner re-measures the virtual anchor.
  const [selectionKey, setSelectionKey] = useState(0);
  // The popover anchors to the live selection's bounding box, not an element.
  const [anchor] = useState(() => ({
    getBoundingClientRect: () =>
      pendingRef.current?.getBoundingClientRect() ?? new DOMRect(),
    get contextElement() {
      return rootRef.current ?? undefined;
    },
  }));

  // Track the theme and re-tint live marks when it toggles. Declared before the
  // restore effect so isDarkRef is correct before the first mark paints.
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => {
      const dark = html.classList.contains("dark");
      if (dark === isDarkRef.current) return;
      isDarkRef.current = dark;
      for (const mark of marksRef.current.values()) {
        mark.handle.update(markOptions(dark, false));
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Restore persisted highlights, re-anchoring around content edits.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const marks = marksRef.current;
    let cancelled = false;

    void (async () => {
      let stored: StoredHighlight[];
      try {
        stored = await getHighlights(slug);
      } catch {
        return; // IndexedDB unavailable: highlighting still works, unpersisted.
      }
      if (cancelled) return;
      for (const saved of stored.sort((a, b) => a.createdAt - b.createdAt)) {
        const record = reanchor(root, saved);
        if (!record) {
          // The quoted passage no longer exists in this note: drop it.
          deleteHighlight(saved.id).catch(() => {});
          continue;
        }
        const range = offsetsToRange(root, record.start, record.end);
        if (!range) continue;
        if (record !== saved) putHighlight(record).catch(() => {});
        const handle = highlight(range, markOptions(isDarkRef.current, false));
        marks.set(record.id, { record, range, handle });
      }
    })();

    return () => {
      cancelled = true;
      for (const mark of marks.values()) mark.handle.remove();
      marks.clear();
    };
  }, [slug]);

  // Selection -> popover; right-click on a mark -> erase.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let pointerDown = false;
    let debounce = 0;

    const evaluate = () => {
      const selection = document.getSelection();
      const range =
        selection && !selection.isCollapsed && selection.rangeCount > 0
          ? selection.getRangeAt(0)
          : null;
      const valid =
        range !== null &&
        root.contains(range.startContainer) &&
        root.contains(range.endContainer) &&
        range.toString().trim() !== "";
      if (valid) {
        // Keep the previous range while closed so the exit transition has an
        // anchor to hold onto.
        pendingRef.current = range.cloneRange();
        setSelectionKey((key) => key + 1);
      }
      setOpen(valid);
    };

    const onPointerDown = () => {
      pointerDown = true;
    };
    const onPointerUp = () => {
      pointerDown = false;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(evaluate, 0);
    };
    const onSelectionChange = () => {
      if (pointerDown) return; // settle only after the drag releases
      window.clearTimeout(debounce);
      debounce = window.setTimeout(evaluate, 150);
    };
    const onContextMenu = (event: MouseEvent) => {
      // Newest mark wins where highlights overlap.
      for (const mark of [...marksRef.current.values()].reverse()) {
        if (rangeContainsPoint(mark.range, event.clientX, event.clientY)) {
          event.preventDefault();
          mark.handle.remove();
          marksRef.current.delete(mark.record.id);
          deleteHighlight(mark.record.id).catch(() => {});
          return;
        }
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("selectionchange", onSelectionChange);
    root.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.clearTimeout(debounce);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      root.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  const apply = () => {
    const root = rootRef.current;
    const range = pendingRef.current;
    if (!root || !range) return;
    const record = createHighlightRecord(slug, root, range);
    if (record) {
      const handle = highlight(range, markOptions(isDarkRef.current, true));
      marksRef.current.set(record.id, { record, range, handle });
      putHighlight(record).catch(() => {});
    }
    document.getSelection()?.removeAllRanges();
    setOpen(false);
  };

  return (
    <>
      <div ref={rootRef} className={className}>
        {children}
      </div>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Portal>
          <Popover.Positioner
            key={selectionKey}
            anchor={anchor}
            side="top"
            sideOffset={6}
          >
            <Popover.Popup initialFocus={false} className="highlight-popover">
              <button
                type="button"
                className="highlight-popover-button"
                aria-label="Highlight"
                // Keep the text selection alive through the press.
                onMouseDown={(event) => event.preventDefault()}
                onClick={apply}
              >
                <HighlighterIcon />
              </button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}

/** A highlighter pen whose chisel nib is filled with the mark's yellow ink. */
function HighlighterIcon() {
  return (
    <svg
      className="highlight-popover-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* The pressed nib: yellow fill, outlined on its visible edges only. */}
      <path className="highlight-popover-nib" d="m9 11-6 6v3h9l3-3" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </svg>
  );
}
