import { SortPasses } from "@/components/SortPasses";

export const name = "SortPasses";

export const examples = [
  // Faithful reproduction of schemas/external_sort_passes.tex: Pass 0 has 8
  // small 1-page sorted runs, Pass 1 merges B-1 runs into 2 wider runs, the
  // final pass merges those into 1 fully-sorted file (the highlighted result).
  <SortPasses
    key="external-sort-passes"
    caption="External merge sort: each pass merges B-1 runs into fewer, wider runs until one fully-sorted file remains. Each pass costs 2N I/Os; the pass count is 1 plus the base-(B-1) logarithm of N/B, rounded up."
    passes={[
      {
        label: "Pass 0",
        note: "ceil(N/B) sorted runs of B pages each",
        runs: [
          { id: "r0" },
          { id: "r1" },
          { id: "r2" },
          { id: "r3" },
          { id: "r4" },
          { id: "r5" },
          { id: "r6" },
          { id: "r7" },
        ],
      },
      {
        label: "Pass 1",
        note: "each pass merges B-1 runs into fewer, larger runs",
        ellipsis: true,
        runs: [
          { id: "m0", from: ["r0", "r1", "r2", "r3"] },
          { id: "m1", from: ["r4", "r5", "r6", "r7"] },
        ],
      },
      {
        label: "Final",
        runs: [
          {
            id: "f",
            span: 8,
            label: "1 fully sorted file",
            state: "final",
            from: ["m0", "m1"],
          },
        ],
      },
    ]}
  />,

  // The width-doubling teaching point made explicit: a 2-way external sort
  // (merge two runs per pass), so the run count halves and run width doubles on
  // every pass from 8 single-page runs down to 1.
  <SortPasses
    key="two-way-doubling"
    title="2-way external sort"
    caption="2-way external sort: each merge pass merges two runs into one. Run width doubles and the run count halves every pass, giving 1 + ceil(log2 N) passes."
    passes={[
      {
        label: "Pass 0",
        annotation: "8 runs, 1 page",
        runs: [
          { id: "a0" },
          { id: "a1" },
          { id: "a2" },
          { id: "a3" },
          { id: "a4" },
          { id: "a5" },
          { id: "a6" },
          { id: "a7" },
        ],
      },
      {
        label: "Pass 1",
        annotation: "4 runs, 2 pages",
        runs: [
          { id: "b0", span: 2, from: ["a0", "a1"] },
          { id: "b1", span: 2, from: ["a2", "a3"] },
          { id: "b2", span: 2, from: ["a4", "a5"] },
          { id: "b3", span: 2, from: ["a6", "a7"] },
        ],
      },
      {
        label: "Pass 2",
        annotation: "2 runs, 4 pages",
        runs: [
          { id: "c0", span: 4, from: ["b0", "b1"] },
          { id: "c1", span: 4, from: ["b2", "b3"] },
        ],
      },
      {
        label: "Pass 3",
        annotation: "1 run, 8 pages",
        runs: [
          {
            id: "d0",
            span: 8,
            label: "fully sorted",
            state: "final",
            from: ["c0", "c1"],
          },
        ],
      },
    ]}
  />,

  // Larger fan-in: with B buffer pages a single merge pass combines B-1 runs at
  // once, so the tree is much shallower than the 2-way case.
  <SortPasses
    key="b-way-fan-in"
    caption="With B buffer pages a merge pass combines B-1 runs at once, so a wide fan-in collapses many small runs into one sorted file in far fewer passes."
    passes={[
      {
        label: "Pass 0",
        note: "many short sorted runs",
        ellipsis: true,
        runs: [
          { id: "p0" },
          { id: "p1" },
          { id: "p2" },
          { id: "p3" },
          { id: "p4" },
          { id: "p5" },
        ],
      },
      {
        label: "Final",
        annotation: "fan-in = B-1",
        runs: [
          {
            id: "merged",
            span: 6,
            label: "1 sorted file",
            state: "final",
            from: ["p0", "p1", "p2", "p3", "p4", "p5"],
          },
        ],
      },
    ]}
  />,
];
