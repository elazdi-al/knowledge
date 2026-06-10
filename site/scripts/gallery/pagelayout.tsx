import { PageLayout } from "@/components/PageLayout";

export const name = "PageLayout";

export const examples = [
  // page_rid.tex - page + slot grid with an RID annotation.
  <PageLayout
    key="page-rid"
    mode="slot-grid"
    header="Page 42"
    headerNote="header"
    columns={4}
    cells={[
      { label: "slot 0" },
      { label: "slot 1" },
      { label: "slot 2" },
      { label: "slot 3", state: "hit" },
      { label: "slot 4" },
      { label: "slot 5" },
      { label: "slot 6" },
      { label: "slot 7" },
    ]}
    annotation="RID = (42, 3)"
    caption="A record identifier names the page, then the slot inside it. Keeping this identifier stable is a main goal of page design."
  />,

  // fixed_packed_page.tex — contiguous fixed records with a deletion gap and a shift arrow.
  <PageLayout
    key="packed"
    mode="byte-strip"
    title="Packed page"
    header="Contiguous records"
    cells={[
      { label: "R0" },
      { label: "R1" },
      { label: "delete", state: "gap" },
      { label: "R3" },
      { label: "R4" },
    ]}
    shiftLabel="later records shift left"
    caption="Records are stored next to each other, so space usage is good. Deleting one record shifts later records and changes their RIDs."
  />,

  // fixed_bitmap_page.tex — a fixed slot grid with a header bitmap and dashed empty slots.
  <PageLayout
    key="bitmap"
    mode="slot-grid"
    title="Bitmap page"
    header="Bitmap"
    headerRight="1 1 0 1 0"
    columns={5}
    cells={[
      { label: "S0" },
      { label: "S1" },
      { label: "S2", state: "empty" },
      { label: "S3" },
      { label: "S4", state: "empty" },
    ]}
    footnote="slot positions stay fixed, so RIDs stay stable"
    caption="A bitmap records which fixed slots are in use; deleting a record clears its bit. Empty slots can be reused and record positions stay stable."
  />,

  // variable_record_layout.tex — byte strip: directory, fixed, payload, with a byte ruler.
  <PageLayout
    key="variable"
    mode="byte-strip"
    cells={[
      { label: "(21,5)", group: "Directory" },
      { label: "(26,10)" },
      { label: "(36,9)" },
      { label: "65000", group: "Fixed" },
      { label: "0000", state: "meta" },
      { label: "10101", span: 1, group: "Payload" },
      { label: "Srinivasan", span: 1.6 },
      { label: "Comp. Sci.", span: 1.4 },
    ]}
    offsets={[0, 4, 8, 12, 20, 21, 26, 36, 45]}
    rulerLabel="bytes"
    caption="A variable-length record: fixed values at the front, one (offset, length) entry per variable field, the payload at the end, plus a small null bitmap."
  />,

  // slotted_page.tex — header + slot directory growing from the front, records from the back.
  <PageLayout
    key="slotted"
    mode="slotted"
    leftTitle="Header + slot directory"
    rightTitle="Packed records"
    headerRows={["# entries = 3", "free ptr"]}
    slots={[
      { label: "slot 0  (off, len)", recWeight: 0.85, recLabel: "record 0" },
      { label: "slot 1  (off, len)", recWeight: 1.25, recLabel: "record 1" },
      { label: "slot 2  (off, len)", recWeight: 0.65, recLabel: "record 2" },
    ]}
    freeLabel="Free space"
    caption="A slotted page: the header and slot directory grow from the front, records grow from the back, and a free-space pointer marks the boundary. Slots stay stable when records move during compaction."
  />,

  // row_vs_column_layout.tex — row store (highlight a row) vs column store (highlight a column).
  <PageLayout
    key="row-col"
    mode="row-column"
    columns={["Col A", "Col B", "Col C"]}
    rows={[
      ["a0", "b0", "c0"],
      ["a1", "b1", "c1"],
      ["a2", "b2", "c2"],
      ["a3", "b3", "c3"],
    ]}
    rowLabels={["row #0", "row #1", "row #2", "row #3"]}
    leftTitle="Row store (NSM)"
    rightTitle="Column store (DSM)"
    leftTag="page"
    rightTag="block"
    highlightRow={1}
    highlightColumn={1}
    leftNote="complete tuples stay together"
    rightNote="same-attribute values stay together"
    caption="Row store keeps a complete tuple together (one ringed row); column store keeps same-attribute values together (one ringed column)."
  />,

  // pax_layout.tex — PAX page: two row groups, each split into per-attribute partitions.
  <PageLayout
    key="pax"
    mode="pax"
    header="PAX page"
    headerNote="page header"
    columns={["A", "B", "C"]}
    groups={[
      {
        label: "row group 0",
        cells: [
          ["a0", "a1", "a2"],
          ["b0", "b1", "b2"],
          ["c0", "c1", "c2"],
        ],
      },
      {
        label: "row group 1",
        cells: [
          ["a3", "a4", "a5"],
          ["b3", "b4", "b5"],
          ["c3", "c4", "c5"],
        ],
      },
    ]}
    footnote="same offset across partitions reconstructs a tuple"
    caption="PAX splits each row group into per-attribute partitions inside one page, so a tuple is reconstructed by reading the same offset across partitions."
  />,

  // orc_file_layout.tex — stacked stripes with a zoomed detail panel and directory->payload links.
  <PageLayout
    key="orc"
    mode="orc"
    leftTitle="File of row groups / stripes"
    rightTitle="Inside one stripe"
    stripes={[
      {
        label: "stripe 1",
        bands: [
          { label: "Index data", kind: "meta" },
          { label: "Row data", kind: "data" },
          { label: "Stripe footer", kind: "footer" },
        ],
      },
      {
        label: "stripe 2",
        bands: [
          { label: "Index data", kind: "meta" },
          { label: "Row data", kind: "data" },
          { label: "Stripe footer", kind: "footer" },
        ],
      },
      {
        label: "stripe n",
        bands: [
          { label: "Index data", kind: "meta" },
          { label: "Row data", kind: "data" },
          { label: "Stripe footer", kind: "footer" },
        ],
      },
    ]}
    ellipsis
    fileFooter="File footer"
    detail={[
      { label: "Col 1 index", kind: "index" },
      { label: "Col 2 index", kind: "index" },
      { label: "Col 3 index", kind: "index" },
      { label: "Col 1 data", kind: "data" },
      { label: "Col 2 data", kind: "data" },
      { label: "Col 3 data", kind: "data" },
    ]}
    footnote="metadata and column streams are stored separately"
    caption="An ORC file is a sequence of stripes; inside one stripe, per-column index and data streams are stored separately."
  />,

  // heap_page_directory.tex — directory entries with free-space summary and per-page fill bars.
  <PageLayout
    key="heap-dir"
    mode="heap-dir"
    dirTitle="Directory"
    pages={[
      { title: "Page 42", entry: "P42 | 20% free", free: 0.2, usedLabel: "data", freeLabel: "free" },
      { title: "Page 43", entry: "P43 |  0% free", free: 0, usedLabel: "full" },
      { title: "Page 44", entry: "P44 | 55% free", free: 0.55, usedLabel: "data", freeLabel: "free" },
    ]}
    ellipsis
    footnote="directory entry = page id + free-space summary"
    caption="A heap-file directory: each entry is a page id plus a free-space summary, pointing to a page with its used and free regions."
  />,

  // sorted_file_overflow.tex — two ordered pages and an overflow block wired into the chain.
  <PageLayout
    key="overflow"
    mode="overflow"
    topNote="records remain ordered by the search key"
    pages={[
      { title: "Page 0", records: [10, 20, 30] },
      { title: "Page 1", records: [40, 50, 60] },
    ]}
    overflow={{ title: "Overflow block", record: 35, afterPage: 0 }}
    footnote="if the target page is full, insert into overflow and update the chain"
    caption="Records stay ordered by the search key. When the target page is full, the new record goes to an overflow block and the chain is updated."
  />,

  // bplustree_node_layout.tex — internal node (pointer|key|...) and a linked leaf node.
  <PageLayout
    key="node-strip"
    mode="node-strip"
    nodes={[
      {
        title: "Internal node",
        cells: ["P_1", "K_1", "P_2", "K_2", "P_3", "K_{q-1}", "P_q"],
      },
      {
        title: "Leaf node",
        cells: ["K_1", "ptr", "K_2", "ptr", "...", "next"],
        nextLink: true,
      },
    ]}
    footnote="internal nodes route the search; leaves store entries and are linked for range scans"
    caption="B+-tree node anatomy: internal nodes alternate pointers and keys to route a search; leaves store entries and are linked for range scans."
  />,
];
