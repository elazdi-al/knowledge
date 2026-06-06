import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SplitProps {
  children: ReactNode;
  /**
   * Desktop column track sizing, any valid `grid-template-columns` value.
   * Defaults to two equal columns.
   */
  cols?: string;
  /** Vertical alignment of the two panes. */
  align?: "start" | "center";
  className?: string;
}

/**
 * Splits the prose width into side-by-side panes on wider screens and stacks
 * them on narrow ones. Each side is a <Pane>, so its markdown keeps the same
 * vertical rhythm as the surrounding prose.
 *
 *   <Split>
 *     <Pane>left markdown…</Pane>
 *     <Pane>right markdown…</Pane>
 *   </Split>
 */
export function Split({ children, cols, align = "start", className }: SplitProps) {
  return (
    <div
      className={cn("split", className)}
      data-align={align}
      style={cols ? ({ "--split-cols": cols } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

interface PaneProps {
  children: ReactNode;
  className?: string;
}

/** One column of a <Split>. Wrap each side's content in its own Pane. */
export function Pane({ children, className }: PaneProps) {
  return <div className={cn("split__pane", className)}>{children}</div>;
}
