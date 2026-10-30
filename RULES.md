# Note-Writing Rules

A note reads like a concise textbook: short definitions, a few examples that teach, and one clear line of logic. Every sentence is worth remembering. A sentence that repeats, narrates or pads is cut.

Check that a note renders with `cd site && bun run verify <path>`.

## The Target Tone

Every sentence has the simplest shape: subject, verb, object, in the present tense. Definitions too.

Good:

```mdx
**Port forwarding.** With port forwarding, the NAT sends every packet that arrives on a chosen public port to a fixed internal IP:port.

**Endpoint-independent mapping.** The NAT assigns one public port to each internal socket. Every peer sees this port.

**Endpoint-dependent mapping.** The NAT assigns one public port to each conversation. A new destination gets a new port.
```

Bad:

```mdx
Port forwarding fixes this for a server, once the server learns the NAT's public address to advertise.

**Endpoint-independent mapping.** One public port per internal socket, the same toward every peer.
```

The good version names the term, then says what it is or does in plain sentences. The first bad sentence never says what port forwarding is; it narrates around it. The second is a noun phrase with no verb, and its tail ("the same toward every peer") makes the reader recall the subject mid-sentence.

## Five Principles

1. **Define, then show.** One short definition per concept, then an example only if it teaches what the definition cannot.
2. **Say it once.** A fact appears in one place and one form: prose, table, list or figure, never two of them.
3. **One line of logic.** Each paragraph sets up the next. Introduce a concept when the note first needs it.
4. **Short and plain.** One idea per sentence: subject, verb, object, present tense, simple words.
5. **Memorable.** Prefer the phrasing a student can repeat in an exam ("the NAT assigns one public port to each conversation") over a precise but forgettable one.

## Source of Truth

- Notes live under the root `notes/` directory. The site reads `../notes` directly.
- Never copy notes into `site/src/content`. If a note is missing from the site, fix the loader.

## Structure

- H2 for sections. H3 only to split a long mechanism into one-idea parts. A heading names its content precisely ("Hole punching", never "More details").
- Before a mechanism with three or more interacting parts, name the parts first, then explain how they interact.
- Use `---` to separate the few major acts of a note, not every section.
- No meta text: never mention the lecture, the slides or what a section covers. No announcements ("we will see", "X takes four steps.") and no bridge sentences that state obvious structure.
- No recaps, summaries, recall questions, `<details>` disclosures or callout components. The only bold lead-ins besides definitions are `**Example N. Title.**`, `**Recipe: ...**` and `**Common mistake.**`.

## Definitions

- Format: `**Term (ABBR).** Full sentences.` Expand an acronym at first use.
- Write the definition as sentences with a verb: "X is a Y that ...", or what X does ("The NAT assigns ..."). Never a bare noun phrase.
- Build from the nearest known concept plus the condition that distinguishes this one: "A **DFA** is a finite automaton whose transition function gives exactly one next state."
- One or two short sentences. Mechanics go after the definition, as steps or a table.
- A definition must be substitutable for the term, not circular, neither too broad nor too narrow, and positive.
- Parallel concepts get parallel wording, so the one difference stands out.
- Give at most one typical instance ("such as a laptop or a server"). A definition is not a catalog.
- Add a non-example only when it fails exactly one condition, and name it: "(not a DFA: state $q_1$ has no transition on $b$)". State boundary cases (empty string, zero) when they matter.
- Reserve the bold block for named objects the reader reuses. A design principle is a plain sentence.
- Define each term once in the course. Later notes refer back and extend it, never redefine it.
- Add `**Common mistake.**` right after a concept only for a misconception students actually hold: state it, say why it fails, say what is true.

## Sentences

- At most 25 words per sentence and five sentences per paragraph.
- Put the known first and the new term last. Put conditions before claims: "If the queue is full, the router drops the packet."
- Keep subject and verb together, and put the action in the verb: "the router forwards the packet", not "forwarding is performed by the router".
- No appositives, trailing "which" clauses or mid-sentence asides that make the reader hold the subject. Split them into a second sentence.
- No narration. Never write around a concept ("X fixes this for Y, once ..."); define it, then state its use.
- One term per concept. Never vary synonyms; a new word signals a new concept.
- Write full sentences: keep articles and "because", "so". No telegraphic fragments.
- Follow "this" with a noun ("this state"). Name subjects explicitly.
- No em dashes, no hedges ("may or may not", "as if", "really", "basically"), no motivational framing, no casual tone.

## Line Breaks

The page is narrow (36rem), so a plain newline in the source does not break the line. Place every break yourself.

- Start every sentence on a new line. End the previous line with `\` (a hard break). A sentence never starts mid-line.
- If a sentence wraps, break it at its natural clause: after a comma, or before "then", "so", "because", "and", "with". Each part fits on one line.
- Prefer two balanced lines over a full line plus a one-word tail.
- Keep a bold term and its first sentence on one line: `**Term.** First sentence.\`
- A short lead-in before a display ("Therefore", "Then") sits on its own line.
- Never end a paragraph with `\`; it renders as a literal backslash.
- In a list item, indent each continuation line to the item's text.
- Check breaks on the rendered page at desktop width, not in the source.

## Examples and Intuition Helpers

- Few examples. Each one tests or distinguishes a concept; none restates the definition.
- Format: `**Example N. Title.**` on its own line, numbered in order, body in the next paragraph, roman text.
- A one-clause illustration goes inline at the end of its sentence: "(e.g. a laptop moving from WiFi to Ethernet)".
- Show multi-case examples as a table or code block, not as paragraphs.
- A worked procedure shows every step with its justification, and labels groups of steps ("Find the network prefix.").
- Two cases that differ in one way go side by side, followed by the principle.
- An intuition helper is one italic sentence on its own line, right after the definition it unlocks, with no prefix: *Read an arrow as "at most once".* At most one per concept.

## Lists

- Numbered lists for ordered steps. Bullets for unordered items.
- A sentence that introduces a list is its own paragraph, and only exists if it says something the list does not.
- Property bullets (`- **State set.** ...`) only for real formal components or invariants, never for reasons or restatements.

## Figures

- Use a figure only when it reduces effort; a small table often beats a diagram.
- Place it right after the sentence that refers to it. Label parts on the figure, with the prose's exact terms.
- The prose says what the figure cannot show (why it works, what to notice). Never narrate a figure.
- One meaning per color across a course, and never color alone: pair it with a label, shape or dash.
- Use `Automaton` for DFAs and NFAs; `Split` and `Pane` to set a figure beside its table when that helps scanning.

## Math

- Intuition first, then notation. Display central or long formulas on their own line; inline math must not wrap.
- Write display math as a block: `$$`, the formula, `$$`, each on its own line. A one-line `$$...$$` renders as small, left-aligned inline math.
- A formula that would sit alone on a line goes in a display block, so it is centered.
- A short formula inside a sentence stays inline. Never give each small step its own display.
- Write a chain of steps as one `aligned` block joined by `\implies`, not as separate displays with "then" between them.
- Join two related results in one display: `A \quad\text{so}\quad B`.
- In a list item, indent the display block to the item's text, or the list breaks.
- One meaning per symbol across a course. Define each symbol where it first appears; no free variables.
- Never start a sentence with a symbol. Write "implies", "for all" and "so" in prose.
- A sentence with each formula replaced by "blah" is still grammatical English.
- A theorem is one "if ... then" statement. A proof opens with its idea, justifies each step in place, and closes by saying why the steps prove the claim.
- In a DFA correctness proof, give every state a meaning, prove it, then derive the accepted language.
- When a proof technique recurs, state it once as `**Recipe: proving X.**` with numbered steps before the first proof that uses it.

## Reference Notes

CTF notes (`notes/ctf/`) are working references: one-line definitions, the formula, then a short code block.

## Frontmatter

- Every note has title, tags, created and updated.
- Frontmatter titles may keep the source name (`Data Intensive Systems: Lecture 1`).
- Tag theory notes with `Theory of computation`.
