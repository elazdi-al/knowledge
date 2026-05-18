import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  kind?: "info" | "note" | "warn";
  title?: string;
  children: ReactNode;
}

export function Callout({ kind = "info", title, children }: Props) {
  const icon = kind === "warn" ? "!" : kind === "note" ? "·" : "→";
  return (
    <aside className={cn("callout", `callout--${kind}`)} role="note">
      <span className="callout__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        {title && <p className="callout__title">{title}</p>}
        <div className="text-[color:var(--color-text)]">{children}</div>
      </div>
    </aside>
  );
}
