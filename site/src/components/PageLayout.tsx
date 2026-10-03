import { Fragment } from "react";
import { Cells, Col, Diagram, Dots, Edge, FONT, Grid, Group, measure, Node, NODE, Row, Space, Table, Tag, Text, type CellItem } from "@/components/figure";
import { CELL, GROUP } from "@/components/figure/theme";

/**
 * Storage-layout figures, one `mode` per shape: slot-grid, byte-strip,
 * slotted, row-column, pax, orc, heap-dir, overflow and node-strip. Each mode
 * is a small composition of figure primitives. The packed delete
 * (`byte-strip` with `shiftLabel`) shows the page before and after.
 */

// --- public prop types ------------------------------------------------------

/** One fixed-size cell in a `slot-grid`. */
export interface SlotCell {
  label: string;
  /** `hit` = emphasis ring (the RID target); `empty` = dashed free slot. */
  state?: "normal" | "hit" | "empty";
}

/** One cell in a `byte-strip`. */
export interface ByteCell {
  label: string;
  /** Relative width weight (default 1); wider cells get more horizontal room. */
  span?: number;
  /** `gap` = dashed deletion/free cell; `meta` = muted secondary cell. */
  state?: "normal" | "gap" | "meta";
  /** Optional small caption centred above the cell (e.g. a field group). */
  group?: string;
}

/** A slot-directory entry in `slotted` mode. */
export interface SlotEntry {
  label: string;
  /** Height weight of the matching record on the right (default 1). */
  recWeight?: number;
  recLabel?: string;
}

/** A page in `heap-dir` mode. */
export interface HeapPage {
  title: string;
  /** Fraction of the page that is free, 0..1. */
  free: number;
  /** Directory-entry text above the page, e.g. "P42 | 20% free". */
  entry: string;
  /** Label inside the used region. */
  usedLabel?: string;
  /** Label inside the free region (omit if free is 0). */
  freeLabel?: string;
}

/** A data page in `overflow` mode. */
export interface OrderedPage {
  title: string;
  records: Array<string | number>;
}

/** A stripe/band in `orc` mode. */
export interface OrcBand {
  label: string;
  /** `meta` muted, `data` element-box, `footer` emphasised. */
  kind?: "meta" | "data" | "footer";
}

interface CommonProps {
  title?: string;
  caption?: string;
  className?: string;
}

interface SlotGridProps extends CommonProps {
  mode: "slot-grid";
  /** Bold header text inside the page (e.g. "Page 42"). */
  header: string;
  /** Small muted label at the header's left (e.g. "header"). */
  headerNote?: string;
  cells: SlotCell[];
  /** Cells per row (default = all on one row). */
  columns?: number;
  /** A second header line, right-aligned (e.g. a bitmap "1 1 0 1 0"). */
  headerRight?: string;
  /** Annotation text pointing at the first `hit` cell (e.g. RID). */
  annotation?: string;
  /** Caption note centred below the grid. */
  footnote?: string;
}

interface ByteStripProps extends CommonProps {
  mode: "byte-strip";
  header?: string;
  cells: ByteCell[];
  /** Byte offsets under the cell boundaries; length = cells.length + 1. */
  offsets?: Array<string | number>;
  /** Label for the offset ruler (e.g. "bytes"). */
  rulerLabel?: string;
  /** Below-strip arrow: shifts the lower bound toward the upper. */
  shiftLabel?: string;
  footnote?: string;
}

interface SlottedProps extends CommonProps {
  mode: "slotted";
  /** Header rows above the slot directory (e.g. "# entries = 3", "free ptr"). */
  headerRows: string[];
  slots: SlotEntry[];
  leftTitle?: string;
  rightTitle?: string;
  freeLabel?: string;
}

interface RowColumnProps extends CommonProps {
  mode: "row-column";
  columns: string[];
  /** Cell text per row, each row an array aligned with `columns`. */
  rows: string[][];
  rowLabels?: string[];
  leftTitle: string;
  rightTitle: string;
  leftTag?: string;
  rightTag?: string;
  /** Row index ringed in the row store. */
  highlightRow?: number;
  /** Column index ringed in the column store. */
  highlightColumn?: number;
  leftNote?: string;
  rightNote?: string;
}

interface PaxProps extends CommonProps {
  mode: "pax";
  header: string;
  headerNote?: string;
  columns: string[];
  /** Each row group: per-column arrays of cell labels. */
  groups: Array<{ label?: string; cells: string[][] }>;
  footnote?: string;
}

interface OrcProps extends CommonProps {
  mode: "orc";
  leftTitle: string;
  rightTitle: string;
  /** Each stripe: an ordered list of bands. */
  stripes: Array<{ label: string; bands: OrcBand[] }>;
  /** A trailing footer band under the stripe stack (e.g. "File footer"). */
  fileFooter?: string;
  /** Whether to draw a vertical-dots ellipsis before the last stripe. */
  ellipsis?: boolean;
  /** Detail panel rows on the right (the "zoom" into one stripe). */
  detail: Array<{ label: string; kind?: "index" | "data" }>;
  footnote?: string;
}

interface HeapDirProps extends CommonProps {
  mode: "heap-dir";
  dirTitle?: string;
  pages: HeapPage[];
  /** Show a drawn-dots ellipsis after the last directory entry. */
  ellipsis?: boolean;
  footnote?: string;
}

interface OverflowProps extends CommonProps {
  mode: "overflow";
  pages: OrderedPage[];
  overflow: { title: string; record: string | number; afterPage: number };
  topNote?: string;
  footnote?: string;
}

interface NodeStripProps extends CommonProps {
  mode: "node-strip";
  /** Each strip is a node: a title plus cells. Internal nodes alternate
   *  pointer/key; leaves alternate key/ptr and end with a "next" link.
   *  A cell of "..." renders as drawn ellipsis dots. */
  nodes: Array<{
    title: string;
    cells: string[];
    /** Draw a trailing arrow leaving the right edge (leaf "next" link). */
    nextLink?: boolean;
  }>;
  footnote?: string;
}

export type PageLayoutProps =
  | SlotGridProps
  | ByteStripProps
  | SlottedProps
  | RowColumnProps
  | PaxProps
  | OrcProps
  | HeapDirProps
  | OverflowProps
  | NodeStripProps;

// --- shared -------------------------------------------------------------------

const Footnote = ({ text }: { text?: string }) => (text ? <Text text={text} size="note" muted /> : null);

const SLOT = { normal: undefined, hit: "strong", empty: "placeholder" } as const;
const BYTE = { normal: undefined, gap: "placeholder", meta: "ghost" } as const;
const BAND = { meta: "ghost", data: undefined, footer: "strong" } as const;
/** Record height per unit of `recWeight` in a slotted page. */
const REC_H = 40;
/** Body height of a heap page; its free and used regions split it by `free`. */
const PAGE_BODY = 120;
const STACK_GAP = 8;

// --- modes --------------------------------------------------------------------

function SlotGrid(p: SlotGridProps) {
  const cols = p.columns ?? p.cells.length;
  const bits = p.headerRight?.trim().split(/\s+/);
  const bitRow = bits && bits.length === p.cells.length && p.cells.length <= cols;
  const hit = p.cells.findIndex((c) => c.state === "hit");
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Row gap={48}>
        <Group title={p.header} align="stretch" gap={8}>
          {p.headerNote && <Node title={p.headerNote} state="ghost" />}
          {p.headerRight && !bitRow && <Text text={p.headerRight} mono muted />}
          <Grid cols={cols} colGap={8} rowGap={bitRow ? 4 : 8} align="stretch">
            {bitRow && bits.map((b, i) => <Text key={`b${i}`} text={b} mono muted={b === "0"} />)}
            {p.cells.map((c, i) => (
              <Node key={i} id={`slot${i}`} title={c.label} state={SLOT[c.state ?? "normal"]} />
            ))}
          </Grid>
        </Group>
        {p.annotation && <Node id="annotation" title={p.annotation} mono />}
      </Row>
      <Footnote text={p.footnote} />
      {p.annotation && hit >= 0 && <Edge from="annotation" to={`slot${hit}`} />}
    </Diagram>
  );
}

/** The packed delete, before and after: the gap closes and every later record moves left. */
function PackedDelete(p: ByteStripProps & { shiftLabel: string }) {
  const kept = p.cells.flatMap((c, i) => (c.state === "gap" ? [] : [i]));
  const before: CellItem[] = p.cells.map((c) => ({ label: c.label, state: c.state === "gap" ? "active" : BYTE[c.state ?? "normal"] }));
  const after: CellItem[] = [
    ...kept.map((i) => ({ label: p.cells[i].label, state: BYTE[p.cells[i].state ?? "normal"] })),
    ...Array.from({ length: p.cells.length - kept.length }, () => ({ state: "free" as const })),
  ];
  const cell = Math.max(...p.cells.map((c) => measure(c.label, FONT.mono, { mono: true }))) + CELL.pad;
  const strips = (
    <Col gap={32}>
      <Cells id="before" items={before} cell={cell} />
      <Cells id="after" items={after} cell={cell} />
    </Col>
  );
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      {p.header ? <Group title={p.header}>{strips}</Group> : strips}
      <Text text={p.shiftLabel} size="note" muted />
      <Footnote text={p.footnote} />
      {kept.map((i, j) => i !== j && <Edge key={i} from={`before.${i}`} to={`after.${j}`} />)}
    </Diagram>
  );
}

/** A record layout: one panel per field group, byte ranges as the column heads. */
function ByteStrip(p: ByteStripProps) {
  if (p.shiftLabel && p.cells.some((c) => c.state === "gap")) return <PackedDelete {...p} shiftLabel={p.shiftLabel} />;
  const runs: { title?: string; at: number; cells: ByteCell[] }[] = [];
  p.cells.forEach((c, i) => {
    if (c.group !== undefined || !runs.length) runs.push({ title: c.group, at: i, cells: [] });
    runs[runs.length - 1].cells.push(c);
  });
  const range = (i: number) => `${p.offsets?.[i] ?? ""}-${p.offsets?.[i + 1] ?? ""}`;
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      {p.header && <Text text={p.header} weight={600} />}
      <Row gap={6}>
        {p.rulerLabel && <Text text={p.rulerLabel} size="note" muted />}
        {runs.map((r, k) => (
          <Group key={k} title={r.title} pad={8}>
            {p.offsets ? (
              <Table columns={r.cells.map((_, j) => range(r.at + j))} rows={[r.cells.map((c) => c.label)]} />
            ) : (
              <Cells items={r.cells.map((c) => ({ label: c.label, state: BYTE[c.state ?? "normal"] }))} />
            )}
          </Group>
        ))}
      </Row>
      <Footnote text={p.footnote} />
    </Diagram>
  );
}

/** Header and slot directory at the front, records at the back, free space between. */
function Slotted(p: SlottedProps) {
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Group dir="row" align="stretch" gap={28}>
        <Group title={p.leftTitle} align="stretch" gap={STACK_GAP}>
          {p.headerRows.map((h, i) => (
            <Node key={`h${i}`} id={`hdr${i}`} title={h} state="ghost" />
          ))}
          {p.slots.map((s, i) => (
            <Node key={i} id={`slot${i}`} title={s.label} />
          ))}
        </Group>
        <Group id="free" title={p.freeLabel ?? "Free space"} state="free" />
        <Group title={p.rightTitle} align="stretch" gap={STACK_GAP}>
          {p.headerRows.length > 0 && <Space h={p.headerRows.length * (NODE.h + STACK_GAP) - STACK_GAP} />}
          {p.slots.map((s, i) => (
            <Node key={i} id={`rec${i}`} title={s.recLabel ?? `record ${i}`} h={Math.round(REC_H * (s.recWeight ?? 1))} />
          ))}
        </Group>
      </Group>
      {p.headerRows.length > 1 && <Edge from="hdr1" to="free" />}
      {p.slots.map((_, i) => (
        <Edge key={i} from={`slot${i}`} to={`rec${i}`} route="curve" />
      ))}
    </Diagram>
  );
}

/** A row store keeps each tuple in one strip; a column store keeps each attribute in one strip. */
function RowColumn(p: RowColumnProps) {
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Row gap={24} align="start">
        <Group title={p.leftTitle} gap={10}>
          {p.leftTag && <Tag text={p.leftTag} />}
          <Grid cols={p.rowLabels ? 2 : 1} colGap={10} rowGap={6}>
            {p.rows.map((r, i) => (
              <Fragment key={i}>
                {p.rowLabels && <Text text={p.rowLabels[i] ?? ""} size="note" muted />}
                <Cells items={r} state={i === p.highlightRow ? "strong" : undefined} />
              </Fragment>
            ))}
          </Grid>
          {p.leftNote && <Text text={p.leftNote} size="note" muted />}
        </Group>
        <Group title={p.rightTitle} gap={10}>
          {p.rightTag && <Tag text={p.rightTag} />}
          <Row gap={10} align="start">
            {p.columns.map((c, j) => (
              <Col key={j} gap={6}>
                <Text text={c} size="note" weight={600} />
                <Cells dir="col" items={p.rows.map((r) => r[j] ?? null)} state={j === p.highlightColumn ? "strong" : undefined} />
              </Col>
            ))}
          </Row>
          {p.rightNote && <Text text={p.rightNote} size="note" muted />}
        </Group>
      </Row>
    </Diagram>
  );
}

/** PAX: each row group is split into one minipage per attribute, all inside one page. */
function Pax(p: PaxProps) {
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Group title={p.header} align="stretch" gap={10}>
        {p.headerNote && <Node title={p.headerNote} state="ghost" />}
        {p.groups.map((g, gi) => (
          <Group key={gi} title={g.label} dashed dir="row" gap={18} align="end">
            <Node title="mini header" state="ghost" />
            {p.columns.map((col, ci) => (
              <Col key={ci} gap={6}>
                <Text text={`partition ${col}`} size="note" weight={600} />
                <Cells items={g.cells[ci] ?? []} />
              </Col>
            ))}
          </Group>
        ))}
      </Group>
      <Footnote text={p.footnote} />
    </Diagram>
  );
}

/** A file of stripes, and one stripe opened up into its per-column streams. */
function Orc(p: OrcProps) {
  const n = p.stripes.length;
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Row gap={56} align="start">
        <Group title={p.leftTitle} align="stretch" gap={8}>
          {p.stripes.map((s, i) => (
            <Fragment key={i}>
              {p.ellipsis && n > 1 && i === n - 1 && <Dots dir="col" />}
              <Group id={`stripe${i}`} title={s.label} align="stretch" gap={4} pad={8}>
                {s.bands.map((b, j) => (
                  <Node key={j} title={b.label} state={BAND[b.kind ?? "data"]} />
                ))}
              </Group>
            </Fragment>
          ))}
          {p.fileFooter && <Node title={p.fileFooter} state="strong" />}
        </Group>
        <Group id="detail" title={p.rightTitle} align="stretch" gap={4}>
          {p.detail.map((d, i) => (
            <Fragment key={i}>
              {i > 0 && (d.kind === "data") !== (p.detail[i - 1].kind === "data") && <Space h={10} />}
              <Node title={d.label} state={d.kind === "data" ? undefined : "ghost"} />
            </Fragment>
          ))}
        </Group>
      </Row>
      <Footnote text={p.footnote} />
      <Edge from="stripe0" to="detail" />
    </Diagram>
  );
}

/** A directory of free-space summaries, each pointing straight down at its page. */
function HeapDir(p: HeapDirProps) {
  // entries and pages share one width, and both rows end in dots, so entry i sits over page i
  const w = Math.max(...p.pages.map((pg) => measure(pg.entry, FONT.mono, { mono: true }))) + 2 * NODE.padX;
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Col gap={36}>
        <Group title={p.dirTitle ?? "Directory"} dir="row" gap={16}>
          {p.pages.map((pg, i) => (
            <Node key={i} id={`entry${i}`} title={pg.entry} mono w={w} />
          ))}
          {p.ellipsis && <Dots />}
        </Group>
        <Row gap={16}>
          {p.pages.map((pg, i) => {
            const free = pg.free > 0 ? Math.round(pg.free * PAGE_BODY) : 0;
            return (
              <Group key={i} id={`page${i}`} title={pg.title} gap={4}>
                {free > 0 && <Node title={pg.freeLabel} state="free" w={w - 2 * GROUP.pad} h={free} />}
                <Node title={pg.usedLabel} w={w - 2 * GROUP.pad} h={PAGE_BODY - (free > 0 ? free + 4 : 0)} />
              </Group>
            );
          })}
          {p.ellipsis && <Dots />}
        </Row>
      </Col>
      <Footnote text={p.footnote} />
      {p.pages.map((_, i) => (
        <Edge key={i} from={`entry${i}`} to={`page${i}`} fromSide="bottom" toSide="top" />
      ))}
    </Diagram>
  );
}

/** The insert into a full page: the record sits in an overflow block spliced into the chain after it. */
function Overflow(p: OverflowProps) {
  const { title: block, record, afterPage } = p.overflow;
  const next = afterPage + 1 < p.pages.length;
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      {p.topNote && <Text text={p.topNote} size="note" muted />}
      <Col gap={36}>
        <Row gap={48} align="start">
          {p.pages.map((pg, i) => (
            <Group key={i} id={`pg${i}`} title={pg.title} badge={i === afterPage ? "full" : undefined} align="stretch">
              <Table rows={pg.records.map((r) => [r])} />
            </Group>
          ))}
        </Row>
        <Group id="ovf" title={block} align="stretch" state="active">
          <Table rows={[[record]]} />
        </Group>
      </Col>
      <Footnote text={p.footnote} />
      <Edge from={`pg${afterPage}`} to="ovf" />
      {next && <Edge from="ovf" to={`pg${afterPage + 1}`} />}
    </Diagram>
  );
}

/** Node anatomy: a `...` cell splits a strip, and a leaf's next link leaves its right end. */
function NodeStrip(p: NodeStripProps) {
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Col gap={20}>
        {p.nodes.map((n, i) => {
          const cut = n.cells.indexOf("...");
          const head = cut < 0 ? n.cells : n.cells.slice(0, cut);
          const tail = cut < 0 ? [] : n.cells.slice(cut + 1);
          const last = tail.length ? `n${i}b.${tail.length - 1}` : `n${i}a.${head.length - 1}`;
          return (
            <Col key={i} gap={6}>
              <Text text={n.title} weight={600} />
              <Row gap={6}>
                <Cells id={`n${i}a`} items={head} mono={false} ellipsis={cut < 0 ? undefined : "end"} />
                {tail.length > 0 && <Cells id={`n${i}b`} items={tail} mono={false} />}
                {n.nextLink && <Space w={30} />}
                {n.nextLink && <Space id={`n${i}next`} />}
              </Row>
              {n.nextLink && <Edge from={last} to={`n${i}next`} />}
            </Col>
          );
        })}
      </Col>
      <Footnote text={p.footnote} />
    </Diagram>
  );
}

export function PageLayout(props: PageLayoutProps) {
  switch (props.mode) {
    case "slot-grid":
      return <SlotGrid {...props} />;
    case "byte-strip":
      return <ByteStrip {...props} />;
    case "slotted":
      return <Slotted {...props} />;
    case "row-column":
      return <RowColumn {...props} />;
    case "pax":
      return <Pax {...props} />;
    case "orc":
      return <Orc {...props} />;
    case "heap-dir":
      return <HeapDir {...props} />;
    case "overflow":
      return <Overflow {...props} />;
    case "node-strip":
      return <NodeStrip {...props} />;
  }
}
