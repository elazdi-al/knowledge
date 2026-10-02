"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip } from "@/components/Tooltip";
import { cn } from "@/lib/cn";

interface CopyPageButtonProps {
  /** The raw Markdown/MDX source to place on the clipboard. */
  markdown: string;
  className?: string;
}

/**
 * A round icon button that copies the page's Markdown source - clean to paste
 * into an LLM. A size-9 pill that reads from the palette tokens so it tracks
 * light/dark. The glyph morphs copy → check on success, then settles back.
 */
export function CopyPageButton({ markdown, className }: CopyPageButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  return (
    <Tooltip
      label={copied ? "Copied" : "Copy as Markdown"}
      delay={0}
      className="tooltip-popup--instant"
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy page as Markdown"
        className={cn(
          "no-print group flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-300 transition-[scale,background-color] duration-200 ease-out hover:bg-gray-400 active:scale-[0.97] will-change-transform",
          className,
        )}
      >
        <span className="relative grid size-4.5 place-items-center text-gray-1000 transition-colors duration-200 ease-out group-hover:text-gray-1200">
          <CopyIcon
            className={cn(
              "col-start-1 row-start-1 size-4.5 transition duration-200 ease-out",
              copied
                ? "scale-75 opacity-0 blur-[2px]"
                : "scale-100 opacity-100 blur-0",
            )}
          />
          <CheckIcon
            className={cn(
              "col-start-1 row-start-1 size-4.5 transition duration-200 ease-out",
              copied
                ? "scale-100 opacity-100 blur-0"
                : "scale-75 opacity-0 blur-[2px]",
            )}
          />
        </span>
      </button>
    </Tooltip>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="8" width="13" height="13" rx="2.5" />
      <path d="M16 4.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
