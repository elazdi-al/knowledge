"use client";

import { Toggle } from "@base-ui/react/toggle";
import { useEffect, useState } from "react";

// Runs synchronously in <head>, before paint, so the correct palette is
// applied without a flash on first render.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

// React warns about rendered <script> tags on the client, where they never run.
// The server emits a runnable script; the client renders an inert one in its place.
export function ThemeInitScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  );
}

export function ThemeToggle() {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    setPressed(document.documentElement.classList.contains("dark"));
  }, []);

  const handlePressedChange = (next: boolean) => {
    setPressed(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <Toggle
      pressed={pressed}
      onPressedChange={handlePressedChange}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="no-print fixed bottom-6 right-6 z-50 h-4 w-4 cursor-pointer rounded-full border-0 bg-[color:var(--color-text)] opacity-90 transition-opacity hover:opacity-100"
    />
  );
}
