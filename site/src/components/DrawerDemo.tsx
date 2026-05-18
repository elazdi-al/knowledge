"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { toast } from "sonner";

/**
 * Small inline drawer demo, embedded in MDX notes. Click the button →
 * a Vaul drawer slides up from the bottom; closing it fires a Sonner
 * toast so both libraries are on display.
 */
export function DrawerDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Trigger
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[color:var(--color-text-strong)] text-[color:var(--color-bg)] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Open drawer
          <span aria-hidden="true">→</span>
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40" data-vaul-overlay />
          <Drawer.Content
            data-vaul-drawer
            className="fixed bottom-0 left-0 right-0 z-50 mt-24 rounded-t-2xl border-t border-x outline-none"
          >
            <Drawer.Title className="sr-only">Drawer demo</Drawer.Title>
            <Drawer.Description className="sr-only">
              An inline drawer demonstration
            </Drawer.Description>
            <div className="mx-auto h-1 w-10 rounded-full bg-[color:var(--color-border-strong)] mt-3 mb-5" />
            <div className="px-6 pb-8 max-w-md mx-auto text-center">
              <p className="text-[color:var(--color-text-strong)] font-medium mb-2">
                Drawer
              </p>
              <p className="text-sm text-[color:var(--color-muted)] mb-5">
                Drag this panel up or down, or tap outside to close. A
                toast will confirm.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  toast.success("Drawer closed", {
                    description: "Powered by vaul + sonner.",
                  });
                }}
                className="inline-flex items-center justify-center h-9 px-4 rounded-md border border-[color:var(--color-border)] text-sm hover:bg-[color:var(--color-hover)] transition-colors"
              >
                Close with toast
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
