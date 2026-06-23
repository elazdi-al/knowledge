import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  title?: string;
  caption?: string;
  className?: string;
  children: ReactNode;
}

export function Figure({ title, caption, className, children }: Props) {
  return (
    <figure className={cn("my-8 flex w-full flex-col items-center gap-3", className)}>
      {title && (
        <figcaption className="w-full text-sm font-semibold text-[var(--mm-fg)]">
          {title}
        </figcaption>
      )}
      <div className="flex w-full justify-center overflow-x-auto">{children}</div>
      {caption && (
        <figcaption className="max-w-3xl text-center text-sm text-[var(--mm-caption)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
