import Image from "next/image";
import { r2 } from "@/lib/r2";
import { cn } from "@/lib/cn";

interface Props {
  /** Object key in the R2 bucket (e.g. "notes/2026-05/sketch.png"). */
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
  className?: string;
  priority?: boolean;
}

/**
 * Render an image stored in R2. Falls back to a placeholder SVG when the
 * R2 public URL is not configured, so notes still render locally.
 *
 * Default dimensions are an "essay-friendly" 16:10 to avoid layout shift
 * before the author specifies real ones.
 */
export function R2Image({
  src,
  alt,
  width = 1280,
  height = 800,
  caption,
  className,
  priority,
}: Props) {
  const url = r2(src);
  return (
    <figure className={cn("my-6 flex flex-col gap-2", className)}>
      <Image
        src={url}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-sunken)] w-full h-auto"
      />
      {caption && (
        <figcaption className="text-xs text-[color:var(--color-muted)] text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
