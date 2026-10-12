/**
 * Server entry. Walks the children into a scene, lays it out, and renders a
 * static SVG. Zero client JS.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { layoutScene } from "./layout";
import { isContainer, type Block } from "./model";
import { toScene } from "./primitives";
import { FrameSvg } from "./render";

export interface DiagramProps {
  /** muted caption below the figure; also the accessible label */
  caption?: string;
  /** short heading above the figure */
  title?: string;
  className?: string;
  children?: ReactNode;
  /** Optional mobile composition when wrapping alone would obscure a relationship. */
  narrowChildren?: ReactNode;
}

function stableId(seed: unknown): string {
  const s = JSON.stringify(seed) ?? "";
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `dg${(h >>> 0).toString(36)}`;
}

const hasWrap = (b: Block): boolean => isContainer(b) && ((b.kind === "row" && b.wrap === true) || b.children.some(hasWrap));
/** The narrow tree: every wrapping row becomes a centred column. */
function narrowed(b: Block): Block {
  if (!isContainer(b)) return b;
  const children = b.children.map(narrowed);
  return b.kind === "row" && b.wrap ? { ...b, kind: "col", align: "center", children } : { ...b, children };
}

export function Diagram({ caption, title, className, children, narrowChildren }: DiagramProps) {
  const scene = toScene(children);
  const label = caption ?? title ?? "figure";
  const frame = layoutScene(scene, { caption: label });
  const uid = stableId(frame);
  // CSS swaps the mobile composition at 520px; wrapping remains the default.
  const narrowScene = narrowChildren !== undefined ? toScene(narrowChildren) : hasWrap(scene.root) ? { ...scene, root: narrowed(scene.root) } : null;
  const narrow = narrowScene ? layoutScene(narrowScene, { caption: `${label} (narrow)` }) : null;
  return (
    <figure className={cn("diagram", className)}>
      {title && <p className="diagram__title">{title}</p>}
      <div className={cn("diagram__canvas", narrow && "diagram__canvas--wide")}>
        <FrameSvg frame={frame} label={label} uid={uid} />
      </div>
      {narrow && (
        <div className="diagram__canvas diagram__canvas--narrow">
          <FrameSvg frame={narrow} label={label} uid={`${uid}n`} />
        </div>
      )}
      {caption && <figcaption className="diagram__caption">{caption}</figcaption>}
    </figure>
  );
}
