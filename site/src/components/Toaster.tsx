"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="system"
      toastOptions={{
        style: {
          background: "var(--color-surface)",
          color: "var(--color-text)",
          border: "1px solid var(--color-border)",
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}
