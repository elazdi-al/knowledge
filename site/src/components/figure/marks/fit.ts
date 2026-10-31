import { Children, type ReactNode } from "react";
import { toScene } from "../compile";
import { layoutScene } from "../layout";
import { MAX_CONTENT_W } from "../theme";

export interface FitProps {
  /** widest the figure may be; default the content width */
  max?: number;
  /** the variants, widest first */
  children: ReactNode;
}

/** The first child that fits in `max` px, else the last. */
export function Fit({ max = MAX_CONTENT_W, children }: FitProps): ReactNode {
  const variants = Children.toArray(children);
  return variants.find((v) => layoutScene(toScene(v)).w <= max) ?? variants[variants.length - 1];
}
