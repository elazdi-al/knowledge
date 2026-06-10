import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  /** Optional bold heading inside the card, above the canvas (e.g. "Before"). */
  title?: string;
  /** Sans, muted caption rendered below the card. */
  caption?: string;
  className?: string;
  children: ReactNode;
}

/**
 * The shared card + caption shell for every bespoke diagram component, so the
 * whole family (Automaton, Mermaid, and the database diagrams) reads as one
 * thing: a `var(--mm-bg)` card with a hairline frame, the SVG centred inside,
 * and a small muted caption below. New components render their SVG as the
 * child and let this own the chrome, the optional before/after title, and the
 * `.split__pane` tightening.
 */
export function DiagramFigure({ title, caption, className, children }: Props) {
  return (
    <figure className={cn("diagram", className)}>
      <div className="diagram__card">
        {title && <p className="diagram__title">{title}</p>}
        <div className="diagram__canvas">{children}</div>
      </div>
      {caption && <figcaption className="diagram__caption">{caption}</figcaption>}
    </figure>
  );
}
