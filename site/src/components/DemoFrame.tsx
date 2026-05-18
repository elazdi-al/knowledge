import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  caption?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Container used to wrap interactive component demos placed directly in
 * MDX prose. Sits in the body width, slight inset bleed, soft border.
 */
export function DemoFrame({ caption, className, children }: Props) {
  return (
    <div className={cn("demo-frame", className)}>
      <div className="w-full flex items-center justify-center min-h-[160px]">
        {children}
      </div>
      {caption && <p className="demo-frame__caption">{caption}</p>}
    </div>
  );
}
