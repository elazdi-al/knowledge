"use client";

export function ThemeToggle() {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="fixed bottom-6 right-6 z-50 h-6 w-6 rounded-full border-0 bg-black transition-opacity dark:bg-white"
    />
  );
}
