import { Diagram, Dots, Edge, Group, Node, Row } from "@/components/figure";

export type RAIDMode = "striping" | "mirroring" | "parity";

export type RAIDCellKind = "data" | "parity" | "mirror";

export interface RAIDCell {
  /** Cell label, e.g. "Block 0" or "Parity 0-2". Numbers coerce to strings. */
  label: string | number;
  /** Cell type. `parity` is emphasised (bold outline + container tint).
   *  Defaults to "data". */
  kind?: RAIDCellKind;
}

export interface RAIDDisk {
  /** Bold title above the drive, e.g. "Disk 0". */
  title: string;
  /** Block cells, top to bottom. Strings/numbers are treated as data cells. */
  cells: Array<RAIDCell | string | number>;
}

interface Props {
  /** Layout variant. Drives the bracket label default and mirror arrows. */
  mode: RAIDMode;
  /** The disks, left to right. */
  disks: RAIDDisk[];
  /** Bracket label spanning all drives. Defaults from `mode`
   *  ("RAID 0" / "RAID 1" / "RAID 5"). Pass "" to omit the bracket. */
  label?: string;
  /** Trailing dots beneath each drive ("more blocks below"). Default true. */
  ellipsis?: boolean;
  /** @deprecated The svg renders at natural size now; this is ignored. */
  minViewBoxWidth?: number;
  /** Bold heading inside the card (e.g. "Before"). */
  title?: string;
  caption?: string;
  className?: string;
}

const LABEL: Record<RAIDMode, string> = { striping: "RAID 0", mirroring: "RAID 1", parity: "RAID 5" };

export function RAIDDiagram({ mode, disks, label, ellipsis = true, title, caption, className }: Props) {
  const name = label ?? LABEL[mode];
  const drives = disks.map((d, i) => (
    <Group key={i} title={d.title} gap={8} align="stretch">
      {d.cells.map((c, j) => {
        const cell = typeof c === "object" ? c : { label: c };
        return <Node key={j} id={`d${i}.${j}`} title={String(cell.label)} state={cell.kind === "parity" ? "strong" : undefined} />;
      })}
      {ellipsis && <Dots dir="col" />}
    </Group>
  ));
  const mirrors = mode === "mirroring" ? Math.min(...disks.map((d) => d.cells.length)) : 0;
  return (
    <Diagram title={title} caption={caption} className={className}>
      {name ? (
        <Group title={name} dir="row" gap={32} align="start">
          {drives}
        </Group>
      ) : (
        <Row gap={32} align="start">
          {drives}
        </Row>
      )}
      {disks.slice(1).flatMap((_, i) =>
        Array.from({ length: mirrors }, (_, j) => <Edge key={`${i}.${j}`} from={`d${i}.${j}`} to={`d${i + 1}.${j}`} head="both" />),
      )}
    </Diagram>
  );
}
