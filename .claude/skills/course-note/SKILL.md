---
name: course-note
description: Write a course or learning note in notes/ from its source slides. ChatGPT drafts the definitions and examples in batches of 1-3 slides, and a subagent draws the figures. Use when the user asks for a note on a course, a lecture, or a topic to learn.
argument-hint: <course> <lecture number or source pdf>
---

# Course note

ChatGPT writes the content because the user prefers how it explains. You find the source, create the note, feed ChatGPT the slides, check what it returns covers them, paste it, and get the figures drawn. Do not rewrite ChatGPT's prose.

`S` below is `.claude/skills/course-note/scripts/chatgpt.sh`, run from the repo root.

## 1. Read the source

- Slides live in `sources/<course>/`. Use the `*_annotated.pdf` version when one exists, because it holds the lecturer's handwritten derivations. Read any source or earlier note the user names as well.
- Read the PDF with the Read tool, 20 pages per call at most. List each slide's concepts.
- Plan batches of 1 to 3 slides that break at concept boundaries. One definition or derivation never spans two batches. Skip title, outline and admin slides.

## 2. Create the note

Create `notes/<course>/<slug>.mdx`, with the slug following its siblings (`l3.mdx`). Write only the frontmatter: the title with the prefix the sibling notes use, and `created:` set to today. The README's "Notes" section has the schema.

If the note exists, keep it and start at the first slide it does not cover. Skip slides whose terms an earlier note of the course already defines. Figures that `site/src/mdx-components.tsx` registers but no note uses are leftovers of an earlier version; reuse them where they fit.

## 3. Draft with ChatGPT

1. `S start`. It copies the ChatGPT cookies from Arc, opens headless ChatGPT, and starts a new chat. The first run raises a Keychain prompt for "Arc Safe Storage"; tell the user to click Always Allow. If it reports not logged in, ask the user to log in to chatgpt.com in Arc.
2. Render a batch: `pdftoppm -f <first> -l <last> -r 110 -png <pdf> /tmp/course-note/<slug>/b<n>`.
3. Write the prompt to a file. The first batch gets:

   ```
   Define these extremely clearly and cleanly in our format.
   Output MDX. A concept is `**Term.** One or two plain sentences that say what it is.` An example is `**Example N. Title.**` followed by its worked body. Inline math in `$...$`, display math in `$$` blocks on their own lines. No intro, recap or offer.
   ```

   When the note already has content, add a sentence naming its notation and the terms it defines, so ChatGPT reuses them. Later batches get `Same format, next slides. Continue example numbering from <N>.`
4. `S send <prompt-file> <pngs...>` with a 600000 ms Bash timeout. It prints the reply's markdown. If it exits with "Still generating", run `S reply` later.
5. Compare the reply with the slides, handwritten notes included. If it misses or gets wrong a concept, formula, condition or example, ask for it in the same chat ("Slide 7 also defines X. Add it in the same format.") and use the new reply. To save a round trip, put the request at the top of the next batch's prompt: "First, additions to X: ... Put them first, then a line containing only `===`."
6. Append the reply to the note as it is. Only remove a wrapping code fence, chatter ("Here is...", "Want me to..."), a term already defined earlier in the course, an example that repeats an earlier one, em dashes, and anything that breaks rendering. Keep one symbol per meaning across replies.
7. Record each figure the note needs: one ChatGPT proposed, or a slide figure that carries meaning the text cannot. Write down a `<Concept>Schema` name, the sentence it follows, and what it shows (parts, axes, labels, what each hue means).

Repeat 2 to 7 for every batch in one conversation, so the format stays consistent. Then `S stop`, and run `S url` before it if the user wants the chat link.

## 4. Figures

When the text is complete, spawn one background agent for all the figures, since they share `site/src/mdx-components.tsx`. Its brief holds:

- Every figure record from step 3.
- Draw each with `packages/figure/` (its README says which tool fits), in the course's existing `site/src/components/*Schemas.tsx` file, or a new `<Topic>Schemas.tsx` if none fits.
- Read two existing figures of the same course first, and match their clarity and look. The course hue is in `site/src/lib/courses.ts`.
- Register each component in `site/src/mdx-components.tsx`, in the import and in the components list, and insert its tag in the note after its sentence.
- Check each with `bun run figure:preview` and look at the PNG. From `site/`, run `bun run check:figures` and `bun run check:golden --update`.

## 5. Verify

Inside a section, put `---` between distinct idea groups (e.g. momentum | Adam | SignSGD | Muon). None right before an H2, none in a single-idea section.

From `site/`, run `bun run verify ../notes/<course>/<slug>.mdx` and `bun run check:math`. Number the examples in order across the note. Commit only when the user asks.
