import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-12 flex flex-col gap-3">
      <p className="section-label">404</p>
      <h1 className="text-[1.5rem] font-medium tracking-[-0.025em] text-[color:var(--color-text)]">
        Not found
      </h1>
      <p className="text-[color:var(--color-muted)]">
        That page isn&apos;t here.{" "}
        <Link
          href="/"
          className="underline decoration-[1.5px] decoration-[color:var(--color-gray-700)] underline-offset-[0.2em] hover:decoration-[color:var(--color-text)]"
        >
          Back to notes
        </Link>
        .
      </p>
    </section>
  );
}
