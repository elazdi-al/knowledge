# Diagram audit findings (gallery + live pages, 2026-06-09)

Working notes for the cleanup pass. Delete when done.

## Systemic
- S1. `.diagram__canvas svg{width:100%}` inflates small-viewBox SVGs (RAID 0/1, ER figures,
  Packed page, Clustered/Unclustered scan: giant text) and shrinks wide ones in Split panes
  (BufferQueue flooding 6-7px, composite B+-trees 3.9px on l3). Fix: cap rendered width at the
  SVG's natural viewBox width (max-width on svg), and redesign the too-wide figures.
- S2. Literal subscripts rendered: IndexMap node anatomy "K_{q-1}", "P_q"; Automaton edge labels
  "N_1","N_2" (toc l2 concat sketch). Add shared subscript-parsing (text -> tspan) or fix inputs.

## PageLayout
- P1. RID figure: arrow from "RID = ⟨42,3⟩" to slot 3 passes through slot 7. Reroute or drop arrow.
- P2. Bitmap figure: bits "1 1 0 1 0" crammed top-right; align each bit over its slot.
- P3. ORC stripes: in-SVG caption overlaps "File footer" box.
- P4. PAX: rotated "row group" labels cramped/clipped at right edge.
- P5. Packed page: in-SVG title oversized (mostly S1).

## IndexMap
- I1. Multilevel: "sparse index on the index file" overlaps outer-index box + escapes svg left.
- I2. Node anatomy subscripts (S2).
- I3. Dense index: entry pitch != table row pitch -> spaghetti arrows; align pitches.
- I4. Page-table fig: dashed fetch lines come from pages 1/2/3 into frame 4; expected page 4 -> frame 4
  ("fetch on miss"). Check note props (l3) and fix.
- I5. Access-paths fig: dead space below diagram (viewBox too tall).
- I6. Clustered/Unclustered scan figs: giant fonts (S1), heavy arrows, awkward arrowheads.

## ERDiagram
- E1. Self-relationship roles "supervisor"/"subordinate" superimposed; role edges overlap. Offset.
- E2. Deep ISA: "Doctorate" overflows box; "Non-Overl." collides with Registers diamonds; cramped.
- E3. Verify key-constraint arrowheads (Manages one-to-many may render like one-to-one Drives).
- E4. Giant fonts (S1).

## HashDiagram
- H1. Arrow labels (0/1/N−1, 00/01/10) sit on dashed lines; "N−1" collides with "h(k) mod N".
- H2. Chained fig: Bucket 2 clipped at svg bottom.
- H3. Extendible post-split: "← new" next to bucket B ambiguous (new bucket is D).
- H4. Linear hashing: "next" points at bucket 0 labeled "already split" — fix semantics (next -> bucket 1).
- H5. Linear probing: stacked home->slot annotations collide; tombstone glyph is a tiny "+", use †.

## RAIDDiagram
- R1. Bracket connector line strikes through "Disk N" labels (all variants).
- R2. RAID 0/1 giant text (S1).
- R3. RAID 1 mirror arrows look doubled/segmented crossing the bracket stem.

## QueryTree
- Q1. Sibling boxes touch (teaches | π_course_id,title). Add sibling gap.

## BPlusTree
- B1. Edge labels ("< 20", "≥ 10") struck through by edges. Halo or offset.
- B2. Tiny fonts in wide/order-4 examples, esp. inside Split panes on l3 (3.9px). Min font / width cap.
- B3. "copy up 5" label collides with edges (minor).

## BufferQueue
- U1. Sequential flooding: 3 panels + side text box too wide -> 6-7px text. Stack panels, move text to caption.
- U2. 2Q: "second hit"/"promotes" two-line label self-overlap; "new page"/"evict" cramped at edges.

## SortPasses
- T1. Row annotations crossed by arrows (minor).
- T2. Figure captions in notes use pseudo-TeX "log_{B−1}" plain text — reword.

## ClockPolicy
- C1. "clock hand" label crossed by arc; ref-bit badge styles inconsistent (page1 dark, others light).

## Mermaid (toc l1)
- M1. Concatenation figure bulky/off-center; replace with compact math/prose.

## Automaton
- A1. Product-machine vertical arc "0" labels cramped/odd glyph look — verify rendering, add label halo.
- A2. Edge-label subscripts (S2).

## Notes/prose (separate pass)
- toc l1: δ used for both symbol and string steps; consider clean extended-δ presentation. Mermaid M1.
  Verify example strings (even-M counts) in MDX.
- l4: caption/in-svg text duplication on flooding fig.
- l3: bitmap bits tiny (6.5px); B+ composite figures in Split tiny.
- Dark-mode spot check after fixes.
