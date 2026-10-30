"use client";

import { Input } from "@base-ui/react/input";
import { Tabs } from "@base-ui/react/tabs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon, CourseIcon } from "@/components/CourseIcon";
import { ARCHIVE, COURSES } from "@/lib/courses";
import { PRIVATE_COURSE, type PrivateIndex } from "@/lib/private-course";

export interface CourseEntry {
  slug: string;
  name: string;
  notes: { slug: string; label: string; date?: string }[];
}

interface Props {
  courses: CourseEntry[];
}

const GATE_ERRORS = {
  wrong: "Wrong password",
  limited: "Too many tries, wait a minute",
  unavailable: "Unavailable right now",
};

/** The private course's tab, driven by the Worker's gate (worker/ctf.ts). */
type Gate =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "locked"; error?: keyof typeof GATE_ERRORS }
  | { kind: "unlocking" }
  | { kind: "open"; notes: PrivateIndex["notes"] };

// `next dev` has no Worker, but /ctf-index.json is a live route there, so the
// tab just opens (the same fallback as lib/use-search.ts).
const GATE_URL = process.env.NODE_ENV === "development" ? "/ctf-index.json" : "/api/ctf";

/** Without a password this asks whether the session cookie is valid. */
async function requestGate(password?: string): Promise<Gate> {
  try {
    const res = await fetch(
      GATE_URL,
      password === undefined
        ? undefined
        : {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ password }),
          },
    );
    if (res.ok) return { kind: "open", notes: ((await res.json()) as PrivateIndex).notes };
    if (res.status === 401) return { kind: "locked", error: password === undefined ? undefined : "wrong" };
    return { kind: "locked", error: res.status === 429 ? "limited" : "unavailable" };
  } catch {
    return { kind: "locked", error: "unavailable" };
  }
}

const ROW = "-mx-3 h-10 rounded-md px-3";

function NoteRow({ slug, label, date }: CourseEntry["notes"][number]) {
  return (
    <Link
      href={`/notes/${slug}`}
      className={`${ROW} flex items-center justify-between gap-4 no-underline hover:bg-[color:var(--color-hover)]`}
    >
      <span className="truncate">{label}</span>
      {date && <span className="shrink-0 text-gray-1100 tabular-nums">{date}</span>}
    </Link>
  );
}

/** A small heading over its notes: an archived course, or a CTF category. */
function Group({ heading, notes }: { heading: React.ReactNode; notes: CourseEntry["notes"] }) {
  return (
    <section className="flex flex-col">
      <h2 className="flex h-8 items-center gap-1.5 text-sm font-medium lowercase text-gray-1100">{heading}</h2>
      {notes.map((note) => (
        <NoteRow key={note.slug} {...note} />
      ))}
    </section>
  );
}

function PrivateNotes({
  gate,
  onUnlock,
  onType,
}: {
  gate: Gate;
  onUnlock: (password: string) => void;
  onType: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  // Disabling the input while unlocking drops its focus, so every return to
  // `locked` (including the first) puts it back.
  useEffect(() => {
    if (gate.kind !== "locked") return;
    input.current?.focus();
    if (gate.error === "wrong") input.current?.select();
  }, [gate]);

  if (gate.kind === "open") {
    if (gate.notes.length === 0) return <p className="flex h-10 items-center text-gray-1100">No notes yet.</p>;
    // One group per category folder: ctf/cryptography/rsa sits under "cryptography".
    const categories = Map.groupBy(gate.notes, (note) => note.slug.split("/").at(-2)!);
    return [...categories].map(([category, notes]) => (
      <Group
        key={category}
        heading={
          <>
            <CategoryIcon category={category} className="size-3.5 shrink-0" />
            {category.replace(/-/g, " ")}
          </>
        }
        notes={notes}
      />
    ));
  }
  if (gate.kind !== "locked" && gate.kind !== "unlocking") return null;

  return (
    <form
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        const password = input.current?.value;
        if (password) onUnlock(password);
      }}
    >
      <Input
        ref={input}
        type="password"
        name="password"
        autoComplete="current-password"
        aria-label="CTF password"
        placeholder="password"
        disabled={gate.kind === "unlocking"}
        onValueChange={onType}
        className={`${ROW} bg-transparent outline-none placeholder:text-[color:var(--color-faint)] hover:bg-[color:var(--color-hover)] focus:bg-[color:var(--color-hover)]`}
      />
      {gate.kind === "locked" && gate.error && (
        <p role="alert" className="mt-1 text-sm text-gray-1100">
          {GATE_ERRORS[gate.error]}
        </p>
      )}
    </form>
  );
}

/** An archived course's old hash, or a note's back link to one, opens the archive. */
const tabOf = (slug: string) => (COURSES[slug]?.archived ? ARCHIVE : slug);

/**
 * One tab per course, then the private course, then one archive tab that stacks every archived course. The selected
 * tab lives in the URL hash so going back lands on it.
 */
export function NoteList({ courses }: Props) {
  const current = courses.filter((c) => !COURSES[c.slug]?.archived);
  const archived = courses.filter((c) => COURSES[c.slug]?.archived);
  const tabs = [...current, { slug: PRIVATE_COURSE, name: PRIVATE_COURSE }];
  if (archived.length > 0) tabs.push({ slug: ARCHIVE, name: ARCHIVE });

  const [course, setCourse] = useState(tabs[0].slug);
  // Lifted out of the panel: Base UI unmounts inactive panels.
  const [gate, setGate] = useState<Gate>({ kind: "idle" });
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromHash = tabOf(decodeURIComponent(location.hash.slice(1)));
    if (tabs.some((t) => t.slug === fromHash)) setCourse(fromHash);
    // `tabs` derives from `courses`.
  }, [courses]);

  // Visitors who never open the private tab never reach the Worker.
  useEffect(() => {
    if (course !== PRIVATE_COURSE || gate.kind !== "idle") return;
    setGate({ kind: "checking" });
    void requestGate().then(setGate);
  }, [course, gate.kind]);

  if (courses.length === 0) {
    return (
      <p className="text-gray-1100">
        No notes yet. Drop a Markdown file in <code>../notes/</code>.
      </p>
    );
  }

  return (
    <Tabs.Root
      value={course}
      onValueChange={(slug: string) => {
        setCourse(slug);
        history.replaceState(null, "", `#${slug}`);
        scroller.current?.scrollTo({ top: 0 });
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <Tabs.List className="course-tabs -mx-2 mb-5 sm:-mt-2 sm:mb-2">
        {tabs.map((c) => (
          <Tabs.Tab key={c.slug} value={c.slug} className="course-tab">
            <CourseIcon course={c.slug} className="size-3.5 shrink-0" />
            <span>{COURSES[c.slug]?.label ?? c.name}</span>
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="course-tabs__indicator" renderBeforeHydration />
      </Tabs.List>
      <div ref={scroller} className="home-scroller">
        <div className="grid grid-cols-1">
          {current.map((c) => (
            <Tabs.Panel key={c.slug} value={c.slug} className="course-panel flex flex-col">
              {c.notes.map((note) => (
                <NoteRow key={note.slug} {...note} />
              ))}
            </Tabs.Panel>
          ))}
          {archived.length > 0 && (
            <Tabs.Panel value={ARCHIVE} className="course-panel flex flex-col gap-6">
              {archived.map((c) => (
                <Group
                  key={c.slug}
                  heading={
                    <>
                      <CourseIcon course={c.slug} className="size-3.5 shrink-0" />
                      {COURSES[c.slug].label}
                    </>
                  }
                  notes={c.notes}
                />
              ))}
            </Tabs.Panel>
          )}
          <Tabs.Panel value={PRIVATE_COURSE} className="course-panel flex flex-col gap-6">
            <PrivateNotes
              gate={gate}
              onUnlock={(password) => {
                setGate({ kind: "unlocking" });
                void requestGate(password).then(setGate);
              }}
              onType={() => setGate((g) => (g.kind === "locked" && g.error ? { kind: "locked" } : g))}
            />
          </Tabs.Panel>
        </div>
      </div>
    </Tabs.Root>
  );
}
