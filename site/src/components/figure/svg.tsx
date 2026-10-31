/** `FrameSvg`: a frame's ops as SVG. */
import { createElement, type ReactNode } from "react";
import type { Frame, Op } from "./model";
import { Label } from "./text";
import { r2 } from "./theme";

const V = (name: string) => `var(--dg-${name})`;

function opNode(op: Op, key: number): ReactNode {
  if (op.el === "text") {
    const { el: _el, ...text } = op;
    return <Label key={key} {...text} />;
  }
  if (op.el === "g" || op.el === "clipPath") {
    const { el, kids, ...attrs } = op;
    return createElement(el, { key, ...attrs }, kids.map(opNode));
  }
  const { el, ...attrs } = op;
  return createElement(el, { key, ...attrs });
}

export interface FrameSvgProps {
  frame: Frame;
  /** accessible description */
  label: string;
  /** id of an element that describes the figure instead of `label` */
  labelledBy?: string;
  /** unique id prefix for patterns and clips */
  uid: string;
}

export function FrameSvg({ frame, label, labelledBy, uid }: FrameSvgProps) {
  return (
    <svg
      width={r2(frame.w)}
      viewBox={`0 0 ${r2(frame.w)} ${r2(frame.h)}`}
      role="img"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      fontFamily="var(--font-sans, ui-sans-serif, system-ui, sans-serif)"
      style={{ maxWidth: "100%", height: "auto", display: "block", color: V("ink") }}
    >
      <defs>
        <pattern id={`${uid}-hatch`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: V("hatch"), strokeWidth: 2.5 }} />
        </pattern>
      </defs>
      {frame.ops.map(opNode)}
    </svg>
  );
}
