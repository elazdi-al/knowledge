/**
 * R2 URL helper.
 *
 * Images are stored in a public R2 bucket. Authors reference them by their
 * key inside the bucket (e.g. "notes/2026-05/sketch.png") and this module
 * turns that into a full URL.
 *
 * If NEXT_PUBLIC_R2_PUBLIC_URL is unset the helper returns a placeholder
 * data URL, so local development works without any cloud config.
 */

const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'>
      <rect width='800' height='450' fill='oklch(94% 0.012 80)'/>
      <text x='50%' y='50%' fill='oklch(56% 0.012 80)' font-family='ui-sans-serif,system-ui'
            font-size='18' text-anchor='middle' dominant-baseline='middle'>
        set NEXT_PUBLIC_R2_PUBLIC_URL
      </text>
    </svg>`,
  );

export function r2(key: string): string {
  if (!R2_BASE) return PLACEHOLDER;
  const cleaned = key.replace(/^\/+/, "");
  return `${R2_BASE}/${cleaned}`;
}

export function isR2Configured(): boolean {
  return R2_BASE.length > 0;
}
