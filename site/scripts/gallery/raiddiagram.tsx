import { RAIDDiagram } from "@/components/RAIDDiagram";

export const name = "RAIDDiagram";

export const examples = [
  // RAID 0: striping. Two disks, blocks striped across them, no redundancy.
  <RAIDDiagram
    key="raid0"
    mode="striping"
    disks={[
      {
        title: "Disk 0",
        cells: ["Block 0", "Block 2", "Block 4", "Block 6", "Block 8"],
      },
      {
        title: "Disk 1",
        cells: ["Block 1", "Block 3", "Block 5", "Block 7", "Block 9"],
      },
    ]}
    caption="RAID 0: file blocks are striped across both disks for throughput, with no redundancy."
  />,

  // RAID 1: mirroring. Identical blocks on both disks, joined by mirror arrows.
  <RAIDDiagram
    key="raid1"
    mode="mirroring"
    disks={[
      {
        title: "Disk 0",
        cells: ["Block 0", "Block 1", "Block 2", "Block 3", "Block 4"],
      },
      {
        title: "Disk 1",
        cells: ["Block 0", "Block 1", "Block 2", "Block 3", "Block 4"],
      },
    ]}
    caption="RAID 1: every block is mirrored to both disks; usable capacity is that of one disk."
  />,

  // RAID 5: striping with rotating parity across four disks.
  <RAIDDiagram
    key="raid5"
    mode="parity"
    disks={[
      {
        title: "Disk 0",
        cells: [
          { label: "Parity 0–2", kind: "parity" },
          "Block 3",
          "Block 6",
          "Block 9",
        ],
      },
      {
        title: "Disk 1",
        cells: [
          "Block 0",
          { label: "Parity 3–5", kind: "parity" },
          "Block 7",
          "Block 10",
        ],
      },
      {
        title: "Disk 2",
        cells: [
          "Block 1",
          "Block 4",
          { label: "Parity 6–8", kind: "parity" },
          "Block 11",
        ],
      },
      {
        title: "Disk 3",
        cells: [
          "Block 2",
          "Block 5",
          "Block 8",
          { label: "Parity 9–11", kind: "parity" },
        ],
      },
    ]}
    caption="RAID 5: data is striped across disks, and the parity block rotates diagonally from disk to disk."
  />,
];
