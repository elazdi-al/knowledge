# Note-Writing Rules

These rules describe the preferred style for course notes in this workspace.

## Source of Truth

- All note files live under the root `notes/` directory.
- Do not create, edit, or keep copied notes under `site/src/content`.
- The site must read from `../notes` directly.
- If a note is missing from the site, fix the renderer or loader. Do not duplicate the note.

## Structure

- Write notes as a logical path, not as a list of disconnected definitions.
- Introduce each concept exactly when it becomes needed.
- Keep a clear conductor line: each paragraph should make the next definition or diagram feel natural.
- Do not make examples into top-level sections. Examples should be compact blocks inside the relevant conceptual section, introduced with bold labels like `**Example 1. ...**`.
- Use few sections. Prefer fewer strong headings over many small headings.
- Skip administration, motivation fluff, and broad context unless it helps understand the technical content.
- Do not add study checklists, recap sections, summary sections, or final review lists.

## Concept Blocks

- Important concepts should follow this pattern:
  `**Concept Name (abbreviation if useful).** Clear, simple, readable description.`
- Use short property bullets only when they name actual formal attributes, roles, invariants, or structural components of the concept:
  `- **Property.** Clean description. *Example if useful.*`
- Good property labels are names like `Alphabet`, `State set`, `Transition function`, `Start state`, `Accepting states`, `Acceptance condition`, `Invariant`, or `Construction`.
- Do not use property bullets for ordinary explanation, reasons, restatements, formulas, examples, or narrative steps.
- Labels like `Reason`, `Set definition`, `Why`, `Observation`, and `Consequence` usually belong in normal prose unless they name a precise formal claim being studied.
- Use this test: if the label is not an actual property or formal descriptor of the concept, write normal prose instead.
- Prefer prose when there are fewer than two real properties, or when bullets would interrupt the flow.
- Do not let property bullets replace normal paragraphs. They are for structure, not decoration.
- Put examples immediately after the concept they clarify.

## Definitions

- Define concepts in the form: `**Concept.** Clear definition.`
- Keep definitions precise, short, and study-ready.
- Define a concept once. Later sections should refer back to it or map notation to it, not define it again.
- Avoid duplicate diagrams or duplicate examples unless they add new information.
- Do not repeat a definition if the previous sentence already states the same fact.
- Do not add obvious examples. For instance, do not write an example that simply repeats the alphabet just stated above.
- State edge cases when they matter, such as $\epsilon$ being accepted when the start state is accepting.

## Style

- Use simple, clear English with an academic tone.
- Add useful verbosity only when it explains why a concept matters or how it connects to the next one.
- Remove useless verbosity, filler, and slide-narration language.
- Avoid em dashes.
- Avoid overly casual phrasing, but allow a little interest and movement in the prose.
- Prefer exact sentences over vague summaries.

## Examples

- Format examples in italics.
- Keep examples close to the concept they clarify.
- Use examples to test or distinguish concepts, not to restate what was already obvious.
- If an example spans multiple lines, put the bold example title on its own line and begin the description in the next paragraph.
- When showing accepted and rejected strings, include both sides if it improves study value.

## Diagrams and Layout

- Use the `Automaton` component for DFA and NFA diagrams.
- Use `Split` and `Pane` to place diagrams beside transition tables, state meanings, or formal data when this improves compactness.
- Do not overuse layout components. Use them when they make scanning easier.
- For automata, show start states, accepting states, and transitions in the standard visual form.
- Prefer transition tables when they make the transition function easier to study.
- For operations or constructions, use a uniform rhythm: definition, construction idea, then a compact visual example.
- When an operation is introduced, include a clear visual example unless it would repeat a visual already serving the same purpose.

## Math and Formalism

- Introduce formal notation after the intuition is clear.
- Use displayed equations for central definitions.
- Keep notation consistent with the lecture source unless there is a good reason to rename it.
- When a diagram and a tuple describe the same object, say so explicitly.

## Tags and Frontmatter

- Use frontmatter with title, description, tags, created, and updated.
- Tag theory notes with `Theory of computation`.
