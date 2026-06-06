"use client";

import { Toggle } from "@base-ui/react/toggle";
import { useEffect, useState } from "react";

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
      className="fixed bottom-6 right-6 z-50 h-4 w-4 cursor-pointer rounded-full border-0 bg-[color:var(--color-text)] opacity-90 transition-opacity hover:opacity-100"
    />
  );
}
