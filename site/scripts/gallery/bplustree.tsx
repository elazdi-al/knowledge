import { BPlusTree } from "@/components/BPlusTree";

export const name = "BPlusTree";

export const examples = [
  <BPlusTree
    key="structure"
    caption="leaf links preserve key order for range scans"
    roles={[
      { level: 0, label: "root node" },
      { level: 1, label: "inner nodes" },
      { level: 2, label: "leaf nodes" },
    ]}
    nodes={[
      { id: "root", keys: [20] },
      { id: "li", keys: [10] },
      { id: "ri", keys: [35] },
      { id: "l1", keys: [6] },
      { id: "l2", keys: [10] },
      { id: "l3", keys: [20, 31] },
      { id: "l4", keys: [38, 44] },
    ]}
    links={[
      { parent: "root", child: "li", label: "< 20" },
      { parent: "root", child: "ri", label: "≥ 20" },
      { parent: "li", child: "l1", label: "< 10" },
      { parent: "li", child: "l2", label: "≥ 10" },
      { parent: "ri", child: "l3", label: "< 35" },
      { parent: "ri", child: "l4", label: "≥ 35" },
    ]}
  />,

  <BPlusTree
    key="search"
    caption="exact search stops in one leaf; range search continues through sibling pointers"
    nodes={[
      { id: "root", keys: [13, 17, 24, 30] },
      { id: "l1", keys: [2, 3, 5, 7] },
      { id: "l2", keys: [14, 16] },
      { id: "l3", keys: [19, 20, 22] },
      { id: "l4", keys: [24, 27, 29] },
      { id: "l5", keys: [33, 34, 38, 39] },
    ]}
    links={[
      { parent: "root", child: "l1" },
      { parent: "root", child: "l2" },
      { parent: "root", child: "l3" },
      { parent: "root", child: "l4" },
      { parent: "root", child: "l5" },
    ]}
  />,

  <BPlusTree
    key="n4"
    caption="order 4: small fan-out, more levels"
    leafLinks="single"
    nodes={[
      { id: "root", keys: ["Mozart"] },
      { id: "i1", keys: ["Einstein", "Gold"] },
      { id: "i2", keys: ["Srinivasan"] },
      { id: "l1", keys: ["Brandt", "Crick"] },
      { id: "l2", keys: ["Einstein", "El Said"] },
      { id: "l3", keys: ["Gold", "Katz"] },
      { id: "l4", keys: ["Mozart", "Singh"] },
      { id: "l5", keys: ["Srinivasan", "Wu"] },
    ]}
    links={[
      { parent: "root", child: "i1" },
      { parent: "root", child: "i2" },
      { parent: "i1", child: "l1" },
      { parent: "i1", child: "l2" },
      { parent: "i1", child: "l3" },
      { parent: "i2", child: "l4" },
      { parent: "i2", child: "l5" },
    ]}
  />,

  <BPlusTree
    key="before"
    title="Before"
    nodes={[
      { id: "r0", keys: [13, 17, 24] },
      { id: "a0", keys: [2, 3, 5, 7], state: "full", note: "target leaf is full" },
      { id: "b0", keys: [14, 16] },
      { id: "c0", keys: [19, 20, 22, 23] },
      { id: "d0", keys: [24, 27, 29] },
    ]}
    links={[
      { parent: "r0", child: "a0" },
      { parent: "r0", child: "b0" },
      { parent: "r0", child: "c0" },
      { parent: "r0", child: "d0" },
    ]}
  />,

  <BPlusTree
    key="after"
    title="After"
    nodes={[
      { id: "r1", keys: [5, 13, 17, 24] },
      { id: "a1", keys: [2, 3] },
      { id: "b1", keys: [5, 7, 8], state: "new", note: "new right leaf after split" },
      { id: "c1", keys: [14, 16] },
      { id: "d1", keys: [19, 20, 22, 23] },
      { id: "e1", keys: [24, 27, 29] },
    ]}
    links={[
      { parent: "r1", child: "a1" },
      { parent: "r1", child: "b1" },
      { parent: "r1", child: "c1" },
      { parent: "r1", child: "d1" },
      { parent: "r1", child: "e1" },
    ]}
    promote={[{ from: "b1", to: "r1", label: "copy up 5", side: "right" }]}
  />,

  // l5.mdx Example 3: two promotes, one bowing each way.
  <BPlusTree
    key="root-split"
    title="After split propagation"
    nodes={[
      { id: "r1", keys: [17] },
      { id: "i1", keys: [5, 13] },
      { id: "i2", keys: [21, 24] },
      { id: "a1", keys: [2, 3] },
      { id: "b1", keys: [5, 7, 8] },
      { id: "c1", keys: [14, 16] },
      { id: "d1", keys: [19, 20] },
      { id: "e1", keys: [21, 22, 23], state: "new", note: "new leaf" },
      { id: "f1", keys: [24, 27, 29] },
    ]}
    links={[
      { parent: "r1", child: "i1" },
      { parent: "r1", child: "i2" },
      { parent: "i1", child: "a1" },
      { parent: "i1", child: "b1" },
      { parent: "i1", child: "c1" },
      { parent: "i2", child: "d1" },
      { parent: "i2", child: "e1" },
      { parent: "i2", child: "f1" },
    ]}
    promote={[
      { from: "e1", to: "i2", label: "copy up 21", side: "right" },
      { from: "i1", to: "r1", label: "push up 17", side: "left" },
    ]}
  />,

  // l5.mdx Example 7 "before": the widest tree in the notes (8 leaves).
  <BPlusTree
    key="widest"
    title="Before non-leaf redistribution"
    nodes={[
      { id: "r0", keys: [22] },
      { id: "i0l", keys: [5, 13, 17, 20] },
      { id: "i0r", keys: [27, 30] },
      { id: "a0", keys: [2, 3] },
      { id: "b0", keys: [5, 7, 8] },
      { id: "c0", keys: [14, 16] },
      { id: "d0", keys: [17, 18] },
      { id: "e0", keys: [20, 21] },
      { id: "f0", keys: [22, 24] },
      { id: "g0", keys: [27, 29] },
      { id: "h0", keys: [33, 34, 38, 39] },
    ]}
    links={[
      { parent: "r0", child: "i0l" },
      { parent: "r0", child: "i0r" },
      { parent: "i0l", child: "a0" },
      { parent: "i0l", child: "b0" },
      { parent: "i0l", child: "c0" },
      { parent: "i0l", child: "d0" },
      { parent: "i0l", child: "e0" },
      { parent: "i0r", child: "f0" },
      { parent: "i0r", child: "g0" },
      { parent: "i0r", child: "h0" },
    ]}
  />,

  // l5.mdx lock-coupling figure: narrow vertical chain inside a Split pane.
  <BPlusTree
    key="latch"
    caption="The thread holds the parent latch while acquiring the child latch, then releases the parent."
    leafLinks={false}
    minViewBoxWidth={190}
    nodes={[
      { id: "root", keys: ["Root"], note: "released" },
      { id: "inner", keys: ["Inner"], state: "full", note: "latched" },
      { id: "leaf", keys: ["Leaf"], state: "highlight", note: "acquiring" },
    ]}
    links={[
      { parent: "root", child: "inner" },
      { parent: "inner", child: "leaf" },
    ]}
  />,
];
