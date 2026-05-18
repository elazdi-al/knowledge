import Link from "next/link";

export function Header() {
  return (
    <header className="pt-16 md:pt-24 pb-12 md:pb-16">
      <Link
        href="/"
        className="text-[color:var(--color-text)] font-medium tracking-[-0.011em] hover:opacity-80 transition-opacity"
      >
        knowledge
      </Link>
    </header>
  );
}
