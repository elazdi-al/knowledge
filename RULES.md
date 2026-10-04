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
- Define the main object before the first full worked example that uses it.
- Keep a clear conductor line: each paragraph should make the next definition or diagram feel natural.
- Do not make examples into top-level sections. Examples should be compact blocks inside the relevant conceptual section, introduced with bold labels like `**Example 1. ...**`.
- Use few sections. Prefer fewer strong headings over many small headings.
- Skip administration, motivation fluff, and broad context unless it helps understand the technical content.
- Body prose should not mention the lecture, slides, course logistics, or what "this note covers".
- Frontmatter titles may keep the source sequence name, such as `Data Intensive Systems: Lecture 1`.
- Do not write announcement sentences like "the rest of this lecture", "we will reuse", "the examples below", or "this section covers". Start with the concept or the object being used.
- Remove bridge sentences that only state an obvious structure, such as "this has two aspects" when the next two definitions already show those aspects.
- Do not add study checklists, recap sections, summary sections, or final review lists.
- Do not use callout components in notes. If the content is important, write it as normal prose, a definition, or a compact list.

## Building Up Across a Course

- Lectures form one progression. Define a concept at its simplest the first time the course needs it; later notes deepen it and refer back instead of redefining it cold.
- When a later note must revisit a concept, extend or sharpen it (new components, finer distinctions), never restate the same definition.
- Keep substance that later notes build on, even while compressing. Cut narration and fluff, never stepping stones.
- Use numbered lists for genuinely ordered material: pipelines, layer stacks, algorithm steps, design stages. Use plain bullets only for unordered properties.

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
- Reserve the concept block for named objects the reader must recognize and use later. A description of how something is organized, or a design principle, is a plain sentence: write "The network is organized in a stack of protocol layers, ...", not `**Layered architecture.** The organization of a network as ...`.
- A definition is not a catalog. Give at most one or two examples, and only when they add something: "such as a laptop or a server", not a list of five devices whose common point is obvious.
- Keep definitions precise, short, and study-ready.
- Define a concept once. Later sections should refer back to it or map notation to it, not define it again.
- Do not split one concept into separate "formal" and "diagram" concepts. If both views describe the same object, introduce them together and say they are the same object in two forms.
- Avoid duplicate diagrams or duplicate examples unless they add new information.
- Do not repeat a definition if the previous sentence already states the same fact.
- Do not add property bullets that merely restate the definition. Let the definition sentence carry the core idea, and reserve bullets for distinct formal components or invariants.
- Do not add obvious examples. For instance, do not write an example that simply repeats the alphabet just stated above.
- State edge cases when they matter, such as $\epsilon$ being accepted when the start state is accepting.

## Style

- Use simple, clear English with an academic tone.
- Write clear, direct sentences. Every word must carry meaning; never add words to fill a sentence or make it sound fuller.
- Do not add a sentence that restates what the previous sentence or its examples already show.
- Name the subject explicitly: "Host and end system are synonyms.", not "The two words are synonyms."
- Prefer plain connectives and constructions: "rules and the messages", not "rules together with the messages"; "X is organized in ...", not "The organization of X as ...".
- Add useful verbosity only when it explains why a concept matters or how it connects to the next one.
- Remove useless verbosity, filler, and slide-narration language.
- Prefer direct technical statements over motivational framing.
- Avoid em dashes.
- Avoid overly casual phrasing, but allow a little interest and movement in the prose.
- Prefer exact sentences over vague summaries.

## Examples and Intuition Helpers

- Format examples in italics.
- Number block examples sequentially within a note: `**Example 1. Title.**` on its own line, italic body in the next paragraph.
- Use standalone italic lines as intuition helpers: one italicized sentence stating directly how to think about or read the concept, with no "Helper:" or "Intuition:" prefix. Place it immediately after the definition it unlocks. *Read an arrow as "at most once".*
- Write intuition helpers in direct present tense, without hedges such as "as if", "really" or "actually": *Peers talk through the layers below them: a message goes down the sender's stack, across the medium, and up the receiver's stack.*
- A short clarifying example may stay inline at the end of a concept block; an intuition helper or reading rule gets its own line, because the line break is the signal.
- Keep examples close to the concept they clarify.
- Use examples to test or distinguish concepts, not to restate what was already obvious.
- If an inline example makes a definition or property visually crowded, put the example on the next line as a short continuation paragraph.
- If an example spans multiple lines, put the bold example title on its own line and begin the description in the next paragraph.
- When showing accepted and rejected strings, include both sides if it improves study value.

## Line Breaks and Separators

- A line return carries meaning. A new paragraph signals a new thought: a concept block, an example, an intuition helper, a pivot to the next object. Never let text fall to a new line without such a reason.
- A one-clause illustration of a prose claim goes in parentheses at the end of its sentence: "Splitting the work this way buys flexibility and modularity (e.g. a laptop can move from WiFi to Ethernet without any change to its browser)."
- A sentence that introduces a list starts its own paragraph, right before the list; do not append it to the previous thought.
- Merge fragment paragraphs that continue the same thought. A conductor sentence may stand alone only when it pivots the note to a new object.
- Inline math must be short enough to read inside its sentence without wrapping. Display longer or central expressions on their own line with `$$ ... $$`; a displayed equation should fit on one rendered line.
- Use `---` separators to split the major areas of a note: groups of sections forming one act, such as foundations versus the core model, or mechanics versus design judgment. Use few; if every section gets one, none mean anything.

## Diagrams and Layout

- Use the `Automaton` component for DFA and NFA diagrams.
- Use `Split` and `Pane` to place diagrams beside transition tables, state meanings, or formal data when this improves compactness.
- Do not overuse layout components. Use them when they make scanning easier.
- For automata, show start states, accepting states, and transitions in the standard visual form.
- Prefer transition tables when they make the transition function easier to study.
- For operations or constructions, use a uniform rhythm: definition, construction idea, then a compact visual example.
- Use diagrams only when they reduce cognitive load. For trivial finite-language operations, a set equation or small table is often clearer than a graph.
- When an operation is introduced, include a visual example only if it adds information beyond the definition, equation, or table.

## Math and Formalism

- Introduce formal notation after the intuition is clear.
- Use displayed equations for central definitions.
- Keep notation consistent with the source material unless there is a good reason to rename it.
- When a diagram and a tuple describe the same object, say so explicitly.
- For formal proofs, use visible numbered step labels when the method matters: `**1. Claim.**`, `**2. Base case.**`, `**3. Inductive step.**`, `**4. Conclusion.**`.
- When a proof technique recurs, state the method itself as a short recipe before the first proof that uses it, so each later proof reads as an instance of a known method. Format it as a concept block named for the goal, `**Recipe: proving X.**`, followed by numbered steps; when the method is adversarial, say explicitly who chooses what.
- In DFA correctness proofs, prefer a state characterization that gives every state a meaning. Prove the characterization first, then derive the accepted language from the accepting states.

## Tags and Frontmatter

- Use frontmatter with title, description, tags, created, and updated.
- Tag theory notes with `Theory of computation`.
