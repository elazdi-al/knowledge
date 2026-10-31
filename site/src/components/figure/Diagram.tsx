/**
 * Server entry. Walks the children into a scene, lays it out, and renders a
 * static SVG. Zero client JS.
 */
import katex from "katex";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { toScene } from "./compile";
import { splitMath } from "./label";
import { layoutScene } from "./layout";
import { reportDiagnostics } from "./lint";
import { narrowTree } from "./marks/layout";
import { FrameSvg } from "./svg";

/** Caption HTML with its `$...$` set by KaTeX, like the prose math. */
const captionHtml = (caption: string) =>
  splitMath(caption)
    .map((part, i) => (i % 2 ? katex.renderToString(part) : part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\\\$/g, "$")))
    .join("");

/** What every figure component takes, so a note can override its defaults: `<Diagram caption="default" {...props}>`. */
export interface FigureProps {
  /** muted caption below the figure, with `$...$` TeX; also the accessible label */
  caption?: string;
  /** short heading above the figure */
  title?: string;
  className?: string;
}

export interface DiagramProps extends FigureProps {
  children?: ReactNode;
  /** Optional mobile composition when wrapping alone would obscure a relationship. */
  narrowChildren?: ReactNode;
}

export function Diagram({ caption, title, className, children, narrowChildren }: DiagramProps) {
  const uid = `dg${useId().replace(/\W/g, "")}`;
  const scene = toScene(children);
  const label = caption ?? title ?? "figure";
  const frame = layoutScene(scene, uid);
  reportDiagnostics(frame, label);
  // CSS swaps the mobile composition at 520px; wrapping remains the default.
  const narrowRoot = narrowChildren === undefined ? narrowTree(scene.root) : null;
  const narrowScene = narrowChildren !== undefined ? toScene(narrowChildren) : narrowRoot ? { ...scene, root: narrowRoot } : null;
  const narrow = narrowScene ? layoutScene(narrowScene, `${uid}n`) : null;
  if (narrow) reportDiagnostics(narrow, `${label} (narrow)`);
  return (
    <figure className={cn("diagram", className)}>
      {title && <p className="diagram__title">{title}</p>}
      <div className={cn("diagram__canvas", narrow && "diagram__canvas--wide")}>
        <FrameSvg frame={frame} label={label} labelledBy={caption && `${uid}-caption`} uid={uid} />
      </div>
      {narrow && (
        <div className="diagram__canvas diagram__canvas--narrow">
          <FrameSvg frame={narrow} label={label} labelledBy={caption && `${uid}-caption`} uid={`${uid}n`} />
        </div>
      )}
      {caption && <figcaption id={`${uid}-caption`} className="diagram__caption" dangerouslySetInnerHTML={{ __html: captionHtml(caption) }} />}
    </figure>
  );
}
