import { BufferQueue } from "@/components/BufferQueue";

export const name = "BufferQueue";

export const examples = [
  // sequential_flooding.tex — a long sequential scan floods the buffer pool:
  // the working set of hot pages is displaced by read-once / scan pages that
  // are never reused. Before-stack, a scan sweep through fresh pages, and the
  // polluted after-stack under LRU.
  <BufferQueue
    key="sequential-flooding"
    title="Sequential flooding"
    caption="A sequential scan displaces the hot working set with read-once pages that are never reused; under LRU the buffer pool ends up full of scan pages."
    columns={[
      {
        id: "before",
        title: "Before scan",
        foot: "working set",
        cells: [
          { label: "page 1", role: "hot" },
          { label: "page 2", role: "hot" },
          { label: "page 3", role: "hot" },
          { label: "page 4", role: "hot" },
        ],
      },
      {
        id: "scan",
        title: "Sequential scan",
        framed: false,
        horizontal: true,
        cells: [
          { id: "p5", label: "page 5", role: "read-once" },
          { id: "p6", label: "page 6", role: "scan" },
          { id: "p7", label: "page 7", role: "scan" },
          { id: "p8", label: "page 8", role: "read-once" },
          { id: "p9", label: "page 9", role: "scan" },
        ],
      },
      {
        id: "after",
        title: "After scan under LRU",
        cells: [
          { label: "page 9", role: "scan" },
          { label: "page 8", role: "read-once" },
          { label: "page 7", role: "scan" },
          { label: "page 6", role: "scan" },
        ],
      },
    ]}
    arrows={[
      {
        from: "scan#p5:left",
        to: "scan#p9:right",
        kind: "scan",
        label: "scan sweep",
        labelSide: "below",
      },
    ]}
    note={{
      title: "Sequential flooding",
      body: "Read-once scan pages displace hot pages even though they are not reused later.",
    }}
  />,

  // twoq_policy.tex — 2Q keeps a FIFO queue for recently seen (scan) pages and
  // an LRU queue for pages that proved reuse. New pages enter FIFO; a second
  // hit promotes a page into LRU; evictions prefer FIFO, discarding read-once
  // scan pages there while hot pages stay protected in LRU.
  <BufferQueue
    key="twoq-policy"
    title="2Q replacement policy"
    caption="2Q keeps scan pages in a FIFO queue and promotes only reused pages into the LRU queue; evictions prefer FIFO, so read-once pages are discarded before hot pages."
    columns={[
      {
        id: "fifo",
        title: "FIFO queue",
        foot: "read-once pages",
        cells: [
          { id: "f9", label: "page 9", role: "read-once" },
          { id: "f8", label: "page 8", role: "scan" },
          { id: "f7", label: "page 7", role: "read-once" },
        ],
      },
      {
        id: "lru",
        title: "LRU queue",
        foot: "hot pages",
        cells: [
          { id: "l4", label: "page 4", role: "hot" },
          { id: "l3", label: "page 3", role: "hot" },
          { id: "l2", label: "page 2", role: "hot" },
        ],
      },
    ]}
    arrows={[
      {
        from: "fifo#f9:left",
        fromOffset: [-44, 0],
        to: "fifo#f9:left",
        kind: "insert",
        label: "new page",
      },
      {
        from: "fifo#f7:left",
        to: "fifo#f7:left",
        toOffset: [-44, 0],
        kind: "evict",
        label: "evict",
        labelSide: "below",
      },
      {
        from: "fifo#f8:right",
        to: "lru#l3:left",
        kind: "promote",
        label: "second hit promotes",
      },
    ]}
    note={{
      title: "2Q idea",
      body: "Keep scan pages in FIFO; only pages that show reuse move to the LRU queue.",
    }}
  />,
];
