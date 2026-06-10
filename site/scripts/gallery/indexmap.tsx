import { IndexMap } from "@/components/IndexMap";

export const name = "IndexMap";

/**
 * One <IndexMap> per L3/L4/L5 index figure. These double as the living usage
 * docs: each example reproduces a source TikZ figure through the component's
 * declarative API.
 */
export const examples = [
  // 1. indexing_access_paths.tex --- two index columns -> one shared table,
  //    arrows from each entry into specific data rows. ("one physical order,
  //    multiple efficient access paths")
  <IndexMap
    key="access-paths"
    mode="rows"
    columns={[
      {
        title: "Index on ID",
        entries: [
          { id: "id22222", label: "22222" },
          { id: "id33456", label: "33456" },
          { id: "id83821", label: "83821" },
        ],
      },
      {
        title: "Index on Salary",
        entries: [
          { id: "sal90000", label: "90000" },
          { id: "sal92000", label: "92000" },
          { id: "sal95000", label: "95000" },
        ],
      },
    ]}
    table={{
      headers: ["ID", "name", "dept name", "salary"],
      rows: [
        { id: "r10101", cells: ["10101", "Srinivasan", "Comp. Sci.", "65000"] },
        { id: "r12121", cells: ["12121", "Wu", "Finance", "90000"] },
        { id: "r22222", cells: ["22222", "Einstein", "Physics", "95000"] },
        { id: "r33456", cells: ["33456", "Gold", "Physics", "87000"] },
        { id: "r83821", cells: ["83821", "Brandt", "Comp. Sci.", "92000"] },
        { id: "r98345", cells: ["98345", "Kim", "Elec. Eng.", "80000"] },
      ],
    }}
    links={[
      { from: "id22222", to: "r22222" },
      { from: "id33456", to: "r33456" },
      { from: "id83821", to: "r83821" },
      { from: "sal90000", to: "r12121" },
      { from: "sal92000", to: "r83821" },
      { from: "sal95000", to: "r22222" },
    ]}
    caption="One physical order, multiple efficient access paths: each index gives the same relation a different ordered entry point into the data file."
  />,

  // 2. clustered_vs_unclustered.tex --- two mapping panels: parallel arrows
  //    (clustered) vs crossing arrows (unclustered).
  <IndexMap
    key="clustered-vs-unclustered"
    mode="mapping"
    panelLayout="row"
    panels={[
      {
        title: "Clustered",
        topRow: [
          { id: "c10", label: 10 },
          { id: "c20", label: 20 },
          { id: "c30", label: 30 },
        ],
        bottomRow: [
          { id: "cd1", label: 10 },
          { id: "cd2", label: 12 },
          { id: "cd3", label: 20 },
          { id: "cd4", label: 22 },
          { id: "cd5", label: 30 },
          { id: "cd6", label: 32 },
        ],
        links: [
          { from: "c10", to: "cd1", variant: "solid" },
          { from: "c10", to: "cd2", variant: "solid" },
          { from: "c20", to: "cd3", variant: "solid" },
          { from: "c20", to: "cd4", variant: "solid" },
          { from: "c30", to: "cd5", variant: "solid" },
          { from: "c30", to: "cd6", variant: "solid" },
        ],
        bottomNote: "nearby index entries lead to nearby data",
      },
      {
        title: "Unclustered",
        topRow: [
          { id: "u10", label: 10 },
          { id: "u20", label: 20 },
          { id: "u30", label: 30 },
        ],
        bottomRow: [
          { id: "ud1", label: 22 },
          { id: "ud2", label: 10 },
          { id: "ud3", label: 30 },
          { id: "ud4", label: 20 },
          { id: "ud5", label: 12 },
          { id: "ud6", label: 32 },
        ],
        links: [
          { from: "u10", to: "ud2", variant: "solid" },
          { from: "u10", to: "ud5", variant: "solid" },
          { from: "u20", to: "ud1", variant: "solid" },
          { from: "u20", to: "ud4", variant: "solid" },
          { from: "u30", to: "ud3", variant: "solid" },
          { from: "u30", to: "ud6", variant: "solid" },
        ],
        bottomNote: "matching records are scattered across the file",
      },
    ]}
    caption="Clustered vs. unclustered: parallel mapping arrows keep matching records on nearby pages, crossing arrows scatter them across the file."
  />,

  // 3. clustered_index_example.tex --- a sorted entry row (laid out as a
  //    column here) anchored to a row of two-record pages.
  <IndexMap
    key="clustered-example"
    mode="pages"
    columns={[
      {
        title: "Index on ID",
        kind: "entry",
        entries: [
          { id: "e10101", label: "10101" },
          { id: "e12121", label: "12121" },
          { id: "e15151", label: "15151" },
          { id: "e22222", label: "22222" },
          { id: "e83821", label: "83821" },
          { id: "e98345", label: "98345" },
        ],
      },
    ]}
    pages={[
      { id: "p0", title: "Page 0", rows: [["10101", "Srinivasan"], ["12121", "Wu"]] },
      { id: "p1", title: "Page 1", rows: [["15151", "Mozart"], ["22222", "Einstein"]] },
      { id: "p2", title: "Page 5", rows: [["83821", "Brandt"], ["98345", "Kim"]] },
    ]}
    links={[
      { from: "e10101", to: "p0" },
      { from: "e12121", to: "p0" },
      { from: "e15151", to: "p1" },
      { from: "e22222", to: "p1" },
      { from: "e83821", to: "p2" },
      { from: "e98345", to: "p2" },
    ]}
    caption="Clustered index on ID: nearby index entries point to nearby data pages, so a range scan touches only a few sequential pages."
  />,

  // 4. dense_index_key.tex --- dense index on a key: one entry per record,
  //    one arrow per row.
  <IndexMap
    key="dense-key"
    mode="rows"
    columns={[
      {
        title: "Dense index",
        entries: [
          "10101", "12121", "15151", "22222", "32343", "33456",
          "45565", "58583", "76543", "76766", "83821", "98345",
        ].map((v) => ({ id: `e${v}`, label: v })),
      },
    ]}
    table={{
      headers: ["ID", "name", "dept name", "salary"],
      rows: [
        { id: "r10101", cells: ["10101", "Srinivasan", "Comp. Sci.", "65000"] },
        { id: "r12121", cells: ["12121", "Wu", "Finance", "90000"] },
        { id: "r15151", cells: ["15151", "Mozart", "Music", "40000"] },
        { id: "r22222", cells: ["22222", "Einstein", "Physics", "95000"] },
        { id: "r32343", cells: ["32343", "El Said", "History", "60000"] },
        { id: "r33456", cells: ["33456", "Gold", "Physics", "87000"] },
        { id: "r45565", cells: ["45565", "Katz", "Comp. Sci.", "75000"] },
        { id: "r58583", cells: ["58583", "Califieri", "History", "62000"] },
        { id: "r76543", cells: ["76543", "Singh", "Finance", "80000"] },
        { id: "r76766", cells: ["76766", "Crick", "Biology", "72000"] },
        { id: "r83821", cells: ["83821", "Brandt", "Comp. Sci.", "92000"] },
        { id: "r98345", cells: ["98345", "Kim", "Elec. Eng.", "80000"] },
      ],
    }}
    links={[
      "10101", "12121", "15151", "22222", "32343", "33456",
      "45565", "58583", "76543", "76766", "83821", "98345",
    ].map((v) => ({ from: `e${v}`, to: `r${v}` }))}
    caption="Dense index on a key: exactly one index entry per record, each pointing directly at its row."
  />,

  // 5. dense_index_nonkey.tex --- one entry per distinct value, group-leader
  //    arrows into the first row of each group; heavier group rules in the table.
  <IndexMap
    key="dense-nonkey"
    mode="rows"
    columns={[
      {
        title: "Dense index on dept name",
        entries: [
          { id: "dBiology", label: "Biology" },
          { id: "dComp", label: "Comp. Sci." },
          { id: "dElec", label: "Elec. Eng." },
          { id: "dFinance", label: "Finance" },
          { id: "dHistory", label: "History" },
          { id: "dMusic", label: "Music" },
          { id: "dPhysics", label: "Physics" },
        ],
      },
    ]}
    table={{
      headers: ["ID", "name", "dept name", "salary"],
      rows: [
        { id: "g-biology", cells: ["76766", "Crick", "Biology", "72000"], groupStart: true },
        { id: "g-comp", cells: ["10101", "Srinivasan", "Comp. Sci.", "65000"], groupStart: true },
        { id: "r-comp2", cells: ["45565", "Katz", "Comp. Sci.", "75000"] },
        { id: "r-comp3", cells: ["83821", "Brandt", "Comp. Sci.", "92000"] },
        { id: "g-elec", cells: ["98345", "Kim", "Elec. Eng.", "80000"], groupStart: true },
        { id: "g-finance", cells: ["12121", "Wu", "Finance", "90000"], groupStart: true },
        { id: "r-finance2", cells: ["76543", "Singh", "Finance", "80000"] },
        { id: "g-history", cells: ["32343", "El Said", "History", "60000"], groupStart: true },
        { id: "r-history2", cells: ["58583", "Califieri", "History", "62000"] },
        { id: "g-music", cells: ["15151", "Mozart", "Music", "40000"], groupStart: true },
        { id: "g-physics", cells: ["22222", "Einstein", "Physics", "95000"], groupStart: true },
        { id: "r-physics2", cells: ["33456", "Gold", "Physics", "87000"] },
      ],
    }}
    links={[
      { from: "dBiology", to: "g-biology" },
      { from: "dComp", to: "g-comp" },
      { from: "dElec", to: "g-elec" },
      { from: "dFinance", to: "g-finance" },
      { from: "dHistory", to: "g-history" },
      { from: "dMusic", to: "g-music" },
      { from: "dPhysics", to: "g-physics" },
    ]}
    caption="Dense index on a non-key field: one entry per distinct search-key value, pointing to the first record of each group (heavier rules)."
  />,

  // 6. sparse_index_file.tex --- one anchor per page; arrows to multi-record
  //    page boxes.
  <IndexMap
    key="sparse"
    mode="pages"
    columns={[
      {
        title: "Sparse index",
        entries: [
          { id: "i0", label: "10101" },
          { id: "i1", label: "32343" },
          { id: "i2", label: "76543" },
        ],
        note: "one anchor per page",
      },
    ]}
    pages={[
      {
        id: "p0",
        title: "Page 0",
        rows: [["10101", "Srinivasan"], ["12121", "Wu"], ["15151", "Mozart"], ["22222", "Einstein"]],
      },
      {
        id: "p1",
        title: "Page 1",
        rows: [["32343", "El Said"], ["33456", "Gold"], ["45565", "Katz"], ["58583", "Califieri"]],
      },
      {
        id: "p2",
        title: "Page 2",
        rows: [["76543", "Singh"], ["76766", "Crick"], ["83821", "Brandt"], ["98345", "Kim"]],
      },
    ]}
    links={[
      { from: "i0", to: "p0", toSide: "left" },
      { from: "i1", to: "p1", toSide: "left" },
      { from: "i2", to: "p2", toSide: "left" },
    ]}
    caption="Sparse index: to search for K, jump to the page with the largest anchor key ≤ K and scan forward."
  />,

  // 7. secondary_index_example.tex --- entry column -> bucket column -> table,
  //    with one bucket fanning out to two records.
  <IndexMap
    key="secondary"
    mode="rows"
    columns={[
      {
        title: "Index on salary",
        entries: [
          { id: "i1", label: "40000" },
          { id: "i2", label: "60000" },
          { id: "i3", label: "65000" },
          { id: "i4", label: "75000" },
          { id: "i5", label: "80000" },
          { id: "i6", label: "92000" },
          { id: "i7", label: "95000" },
        ],
      },
    ]}
    buckets={{
      title: "Buckets",
      kind: "bucket",
      entries: [
        { id: "b1", label: "1 ptr" },
        { id: "b2", label: "1 ptr" },
        { id: "b3", label: "1 ptr" },
        { id: "b4", label: "1 ptr" },
        { id: "b5", label: "2 ptrs" },
        { id: "b6", label: "1 ptr" },
        { id: "b7", label: "1 ptr" },
      ],
    }}
    table={{
      headers: ["ID", "name", "dept", "salary"],
      rows: [
        { id: "d10101", cells: ["10101", "Srinivasan", "Comp. Sci.", "65000"] },
        { id: "d15151", cells: ["15151", "Mozart", "Music", "40000"] },
        { id: "d22222", cells: ["22222", "Einstein", "Physics", "95000"] },
        { id: "d32343", cells: ["32343", "El Said", "History", "60000"] },
        { id: "d45565", cells: ["45565", "Katz", "Comp. Sci.", "75000"] },
        { id: "d76543", cells: ["76543", "Singh", "Finance", "80000"] },
        { id: "d83821", cells: ["83821", "Brandt", "Comp. Sci.", "92000"] },
        { id: "d98345", cells: ["98345", "Kim", "Elec. Eng.", "80000"] },
      ],
    }}
    links={[
      { from: "i1", to: "b1" },
      { from: "i2", to: "b2" },
      { from: "i3", to: "b3" },
      { from: "i4", to: "b4" },
      { from: "i5", to: "b5" },
      { from: "i6", to: "b6" },
      { from: "i7", to: "b7" },
      { from: "b1", to: "d15151", curve: true },
      { from: "b2", to: "d32343", curve: true },
      { from: "b3", to: "d10101", curve: true },
      { from: "b4", to: "d45565", curve: true },
      { from: "b5", to: "d76543", curve: true },
      { from: "b5", to: "d98345", curve: true },
      { from: "b6", to: "d83821", curve: true },
      { from: "b7", to: "d22222", curve: true },
    ]}
    caption="Secondary index on an unsorted field: one entry per value points to a bucket of record pointers, which in turn point into the scattered file."
  />,

  // 8. multilevel_index.tex --- outer index block -> inner index blocks ->
  //    data pages (block cascade).
  <IndexMap
    key="multilevel"
    mode="levels"
    levels={[
      [{ id: "outer", title: "Outer index", rows: 4, ellipsis: true, note: "sparse index on the index file" }],
      [
        { id: "inner0", title: "Inner index 0", rows: 2, ellipsis: true },
        { id: "inner1", title: "Inner index 1", rows: 2, ellipsis: true },
        { id: "inner2", title: "Inner index 2", rows: 2 },
      ],
      [
        { id: "d0", kind: "data", note: "data" },
        { id: "d1", kind: "data", note: "data" },
        { id: "d2", kind: "data", note: "data" },
      ],
    ]}
    links={[
      { from: "outer", to: "inner0" },
      { from: "outer", to: "inner1" },
      { from: "outer", to: "inner2" },
      { from: "inner0", to: "d0" },
      { from: "inner1", to: "d1" },
      { from: "inner2", to: "d2" },
    ]}
    caption="Multilevel index: if one index is too large, build a sparse index on top of it, repeating until the top level is small enough to scan cheaply."
  />,

  // 9. composite_search_key.tex --- two-sided mirror: B+-tree column left,
  //    data table centre, B+-tree column right.
  <IndexMap
    key="composite"
    mode="rows"
    columns={[
      {
        title: "B+-tree on ⟨sname, gpa⟩",
        entries: [
          { id: "sg1", label: "(Mary, 3.95)" },
          { id: "sg2", label: "(Mary, 4.00)" },
          { id: "sg3", label: "(Mike, 3.90)" },
          { id: "sg4", label: "(Sue, 3.80)" },
        ],
      },
    ]}
    rightColumns={[
      {
        title: "B+-tree on ⟨gpa, sname⟩",
        entries: [
          { id: "gs1", label: "(3.80, Sue)" },
          { id: "gs2", label: "(3.90, Mike)" },
          { id: "gs3", label: "(3.95, Mary)" },
          { id: "gs4", label: "(4.00, Mary)" },
        ],
      },
    ]}
    table={{
      headers: ["sid", "sname", "gpa"],
      rows: [
        { id: "rec101", cells: ["101", "Mary", "3.95"] },
        { id: "rec104", cells: ["104", "Sue", "3.80"] },
        { id: "rec107", cells: ["107", "Mike", "3.90"] },
        { id: "rec115", cells: ["115", "Mary", "4.00"] },
      ],
    }}
    links={[
      { from: "sg1", to: "rec101" },
      { from: "sg2", to: "rec115" },
      { from: "sg3", to: "rec107" },
      { from: "sg4", to: "rec104" },
      { from: "gs1", to: "rec104", fromSide: "left", toSide: "right" },
      { from: "gs2", to: "rec107", fromSide: "left", toSide: "right" },
      { from: "gs3", to: "rec101", fromSide: "left", toSide: "right" },
      { from: "gs4", to: "rec115", fromSide: "left", toSide: "right" },
    ]}
    caption="Composite search keys: the same attributes in a different lexicographic order index the same records, but make different predicates efficient."
  />,

  // 10. bplustree_traversal_clustered_unclustered.tex (L5) --- two stacked
  //     mapping panels with a top scan arrow and a doubly-linked leaf chain:
  //     parallel page mapping (clustered) vs crossing (unclustered).
  <IndexMap
    key="bplustree-traversal"
    mode="mapping"
    panelLayout="col"
    panels={[
      {
        title: "Clustered scan",
        scan: "scan",
        chainTop: true,
        topRow: [
          { id: "c1", label: 10 },
          { id: "c2", label: 20 },
          { id: "c3", label: 30 },
          { id: "c4", label: 40 },
          { id: "c5", label: 50 },
        ],
        bottomRow: [
          { id: "cp1", label: 101 },
          { id: "cp2", label: 102 },
          { id: "cp3", label: 103 },
          { id: "cp4", label: 104 },
        ],
        links: [
          { from: "c1", to: "cp1" },
          { from: "c2", to: "cp1" },
          { from: "c3", to: "cp2" },
          { from: "c4", to: "cp3" },
          { from: "c5", to: "cp4" },
        ],
        bottomNote: "leaf order and table-page order are close",
      },
      {
        title: "Unclustered scan",
        scan: "scan",
        chainTop: true,
        topRow: [
          { id: "u1", label: 10 },
          { id: "u2", label: 20 },
          { id: "u3", label: 30 },
          { id: "u4", label: 40 },
          { id: "u5", label: 50 },
        ],
        bottomRow: [
          { id: "up1", label: 101 },
          { id: "up2", label: 102 },
          { id: "up3", label: 103 },
          { id: "up4", label: 104 },
        ],
        links: [
          { from: "u1", to: "up3" },
          { from: "u2", to: "up1" },
          { from: "u3", to: "up4" },
          { from: "u4", to: "up2" },
          { from: "u5", to: "up1" },
        ],
        bottomNote: "leaf order points to scattered table pages",
      },
    ]}
    caption="B+-tree leaf scan: a clustered index walks the table pages in order, an unclustered index jumps to scattered pages (the crossing arrows)."
  />,

  // 11. page_table_buffer_pool.tex (L4) --- 3-tier: page-table entry column ->
  //     buffer-pool frame column (solid links), plus on-disk page row ->
  //     frames (dashed fetch arrows).
  <IndexMap
    key="page-table"
    mode="frames"
    columns={[
      {
        title: "entries",
        entries: [
          { id: "e1", label: "p1: f1" },
          { id: "e2", label: "p3: f2" },
          { id: "e3", label: "p2: f3" },
        ],
      },
    ]}
    frames={{
      title: "frames",
      kind: "bucket",
      entries: [
        { id: "f1", label: "page 1" },
        { id: "f2", label: "page 3" },
        { id: "f3", label: "page 2" },
        { id: "f4", label: "frame 4" },
      ],
    }}
    disk={{
      title: "On-disk file",
      pages: [
        { id: "dp1", label: "page 1" },
        { id: "dp2", label: "page 2" },
        { id: "dp3", label: "page 3" },
        { id: "dp4", label: "page 4" },
      ],
    }}
    links={[
      { from: "e1", to: "f1", variant: "solid" },
      { from: "e2", to: "f2", variant: "solid" },
      { from: "e3", to: "f3", variant: "solid" },
      { from: "dp4", to: "f4", variant: "dashed" },
    ]}
    caption="Page table to buffer pool: solid links map page ids to resident frames; on a miss, the dashed arrow fetches the on-disk page into the free frame."
  />,
];
