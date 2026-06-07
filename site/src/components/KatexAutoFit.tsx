"use client";

import { useEffect } from "react";

/**
 * Scales any display-math block wider than its column down to fit, instead of
 * letting it overflow or scroll. KaTeX lays formulas out in `em`, so shrinking
 * the block's font-size shrinks the formula proportionally and the box height
 * collapses with it - a clean fit with no leftover whitespace and no transform
 * artefacts. Blocks that already fit are left at their natural size, and a
 * formula scales back up if the column later widens.
 *
 * Runs after hydration, on resize, and once web fonts settle (which can change
 * measured widths). With JS off, the CSS `overflow-x: auto` fallback applies.
 */
export function KatexAutoFit() {
  useEffect(() => {
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(".prose .katex-display"),
    );
    if (blocks.length === 0) return;

    const fit = () => {
      for (const block of blocks) {
        // Measure at the inherited size, then scale only if it overflows. The
        // block is the `overflow-x: auto` scroll container, so its scrollWidth
        // is the formula's true width and clientWidth is the column it must fit
        // - KaTeX's inner `.katex` is display:block, so its own box width is
        // just the column and would never read as overflowing.
        block.style.fontSize = "";
        const available = block.clientWidth;
        const content = block.scrollWidth;
        if (available > 0 && content - available > 1) {
          const base = parseFloat(getComputedStyle(block).fontSize);
          // 0.99 leaves a hair of slack so sub-pixel rounding can't re-overflow.
          block.style.fontSize = `${(base * available * 0.99) / content}px`;
        }
      }
    };

    fit();
    window.addEventListener("resize", fit);
    if (document.fonts) document.fonts.ready.then(fit).catch(() => {});

    return () => window.removeEventListener("resize", fit);
  }, []);

  return null;
}
