import { HashDiagram } from "@/components/HashDiagram";

export const name = "HashDiagram";

export const examples = [
  // 1. static_hash_table.tex — hash node fanning to numbered primary pages plus
  //    an overflow page reached by a spill arrow.
  <HashDiagram
    key="static-hash-table"
    mode="static"
    source="h(k)"
    sourceNote="h(k) mod N"
    pages={[
      {
        id: "b0",
        title: "Bucket 0",
        subtitle: "primary page",
        rows: ["k_1, k_4", "k_7"],
      },
      {
        id: "b1",
        title: "Bucket 1",
        subtitle: "primary page",
        rows: ["k_2, k_5", "k_8"],
        state: "full",
      },
      {
        id: "bn",
        title: "Bucket N-1",
        subtitle: "primary page",
        rows: ["k_3, k_6", "k_9"],
      },
    ]}
    overflow={[
      {
        id: "ov",
        title: "Overflow",
        subtitle: "extra page",
        rows: ["k_{10}", "k_{11}"],
      },
    ]}
    fanout={[
      { to: "b0", label: "0" },
      { to: "b1", label: "1" },
      { to: "bn", label: "N-1" },
    ]}
    spills={[{ from: "b1", to: "ov", label: "overflow" }]}
    caption="Static hashing: a fixed set of primary buckets, plus overflow pages when a bucket fills up."
  />,

  // 2. hash_index_buckets.tex (L3) — same static shape, key/value rows.
  <HashDiagram
    key="hash-index-buckets"
    mode="static"
    source="h(age)"
    pages={[
      {
        id: "b00",
        title: "Bucket 00",
        rows: ["(22, r1)", "(44, r6)", "(44, r9)"],
      },
      {
        id: "b01",
        title: "Bucket 01",
        rows: ["(33, r2)", "(65, r7)", "(81, r8)"],
        state: "full",
      },
      {
        id: "b10",
        title: "Bucket 10",
        rows: ["(25, r3)", "(58, r4)", "(90, r5)"],
      },
    ]}
    overflow={[
      {
        id: "ov",
        title: "Overflow",
        rows: ["(97, r10)", "(113, r11)", "(129, r12)"],
      },
    ]}
    fanout={[
      { to: "b00", label: "00" },
      { to: "b01", label: "01" },
      { to: "b10", label: "10" },
    ]}
    spills={[{ from: "b01", to: "ov", label: "overflow" }]}
    caption="Hash index: an equality lookup computes one bucket; collisions create overflow pages."
  />,

  // 3. chained_hashing.tex — directory of pointer dots, each to one bucket;
  //    a bucket extends through an overflow page.
  <HashDiagram
    key="chained-hashing"
    mode="chained"
    directory={["", "", ""]}
    directoryTitle="Bucket pointers"
    pages={[
      { id: "b0", title: "Bucket 0", rows: ["B | val"] },
      { id: "b1", title: "Bucket 1", rows: ["A | val", "C | val"], state: "full" },
      { id: "b2", title: "Bucket 2", rows: [] },
    ]}
    overflow={[{ id: "ov", title: "Overflow", rows: ["D | val"] }]}
    links={[
      { from: 0, to: "b0" },
      { from: 1, to: "b1" },
      { from: 2, to: "b2" },
    ]}
    spills={[{ from: "b1", to: "ov" }]}
    caption="Chained hashing: each directory slot points to one bucket; collisions extend the bucket through overflow pages."
  />,

  // 4. extendible_hashing_directory.tex — binary-indexed directory, local-depth
  //    chips, and a shared target (11 → Bucket B).
  <HashDiagram
    key="extendible-directory"
    mode="directory"
    globalDepth="2"
    directory={["00", "01", "10", "11"]}
    pages={[
      { id: "A", title: "Bucket A", depth: "2", rows: ["4   12   32   16"] },
      { id: "B", title: "Bucket B", depth: "1", rows: ["1   5   7   13"] },
      { id: "C", title: "Bucket C", depth: "2", rows: ["10"] },
    ]}
    links={[
      { from: 0, to: "A" },
      { from: 1, to: "B" },
      { from: 2, to: "C" },
      { from: 3, to: "B" },
    ]}
    caption="Extendible hashing: several directory entries may point to the same bucket when the local depth is smaller than the global depth."
  />,

  // 5. extendible_hashing_insert21.tex — after inserting 21, bucket B splits
  //    into B and a new D; entry 11 now points to D.
  <HashDiagram
    key="extendible-insert21"
    mode="directory"
    globalDepth="2"
    directory={["00", "01", "10", "11"]}
    pages={[
      { id: "A", title: "Bucket A", depth: "2", rows: ["4   12   32   16"] },
      {
        id: "B",
        title: "Bucket B",
        depth: "2",
        rows: ["1   5   13   21"],
        state: "full",
        note: "21 just inserted",
      },
      { id: "C", title: "Bucket C", depth: "2", rows: ["10"] },
      {
        id: "D",
        title: "Bucket D (new)",
        depth: "2",
        rows: ["7"],
        state: "new",
      },
    ]}
    links={[
      { from: 0, to: "A" },
      { from: 1, to: "B" },
      { from: 2, to: "C" },
      { from: 3, to: "D" },
    ]}
    caption="After inserting 21: bucket B splits into B and D; entry 11 now points to D instead of B."
  />,

  // 6. linear_hashing_split.tex — numbered buckets, an overflow page, the next
  //    pointer into the split bucket, and a dashed split arc to the new image.
  <HashDiagram
    key="linear-hashing-split"
    mode="bucketColumn"
    bucketLabels={[
      { label: "0" },
      { label: "1" },
      { label: "2" },
      { label: "3" },
      { label: "4", isNew: true },
    ]}
    nextIndex={1}
    pages={[
      { id: "b0", title: "8", note: "already split (image: bucket 4)" },
      { id: "b1", title: "5, 9, 13", state: "full" },
      { id: "b2", title: "6" },
      { id: "b3", title: "7, 11" },
      { id: "b4", title: "20", state: "new", note: "new image bucket" },
    ]}
    overflow={[{ id: "ov", title: "17" }]}
    spills={[{ from: "b1", to: "ov", label: "overflow" }]}
    split={{ from: "b0", to: "b4", label: "split via h_1" }}
    caption="Linear hashing: next marks the bucket to split; the new bucket receives entries that hash differently under the next-level function."
  />,

  // 7. linear_probing_slots.tex — open-addressing slot row with displacement
  //    arcs, plus a second row showing a tombstone after a delete.
  <HashDiagram
    key="linear-probing-slots"
    mode="slotArray"
    slots={[
      { label: "B", kind: "used" },
      { kind: "free" },
      { label: "A", kind: "used", top: "home" },
      { label: "C", kind: "used" },
      { label: "D", kind: "used" },
      { label: "E", kind: "used" },
      { kind: "free" },
    ]}
    displacements={[
      { from: 2, to: 3, label: "C" },
      { from: 3, to: 4, label: "D" },
      { from: 2, to: 5, label: "E" },
    ]}
    secondRow={{
      leftLabel: "after deleting C:",
      slots: [
        { kind: "tomb" },
        { label: "D", kind: "used" },
      ],
      rightLabel: "tombstone keeps the probe chain intact",
    }}
    caption="Linear probing: collisions displace keys to the next free slot; deletions leave tombstones."
  />,
];
