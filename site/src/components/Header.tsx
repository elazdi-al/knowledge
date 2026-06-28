import Link from "next/link";
import { SearchButton } from "@/components/CommandMenu";

export function Header() {
  return (
    <header className="no-print pt-16 md:pt-24 pb-12 md:pb-16 flex items-center justify-between">
      <Link
        href="/"
        className="text-[color:var(--color-text)] font-medium tracking-[-0.011em] hover:opacity-80 transition-opacity"
      >
        knowledge
      </Link>
      <SearchButton />
    </header>
  );
}
