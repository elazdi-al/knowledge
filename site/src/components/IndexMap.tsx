import { Fragment } from "react";
import { Cells, Col, Diagram, Edge, FONT, Grid, Group, measure, Node, NODE, Row, Space, Table, Text } from "@/components/figure";
import { GROUP, TABLE } from "@/components/figure/theme";

/**
 * Index structures: entry columns (the index) linked into a data side. One
 * `mode` per shape: `rows` (entries into a record table), `pages` (entries
 * into page boxes), `levels` (a multilevel block cascade), `mapping` (node
 * rows joined by parallel or crossing arrows) and `frames` (page table,
 * buffer pool and disk, with the fetch on a miss). Entry columns are
 * one-column tables whose row ids are the entry ids, so links target rows.
 */

// --------------------------------------------------------------------------
// Public data model
// --------------------------------------------------------------------------

/** A single cell in an index entry strip or a bucket strip. */
export interface EntryBox {
  /** Stable id, referenced by links. */
  id: string;
  /** Display text; `_{...}` renders as a subscript. */
  label: string | number;
  /** Visual state: `highlight` = inverted cell, `accent` = heavier stroke. */
  state?: "normal" | "highlight" | "accent";
}

/** A vertical strip of entry/bucket cells with an optional bold title. */
export interface EntryColumn {
  /** Stable id (used to disambiguate two columns). */
  id?: string;
  /** Bold title above the strip. */
  title?: string;
  entries: EntryBox[];
  /** Visual flavour: "entry" (default, element fill) or "bucket" (tint). */
  kind?: "entry" | "bucket";
  /** Small muted note centred beneath the strip. */
  note?: string;
}

/** One record row in the data table; cells are the column values, left→right. */
export interface DataRow {
  id: string;
  cells: Array<string | number>;
  /** Start a new group above this row (draws a heavier separator rule). */
  groupStart?: boolean;
  state?: "normal" | "highlight";
}

/** The central record table on the data side. */
export interface DataTable {
  /** Column headers, left→right. Also fixes the column count. */
  headers: string[];
  rows: DataRow[];
  /** Per-column relative widths (minimums; text never clips). */
  weights?: number[];
  title?: string;
}

/** A multi-record page box on the data side ("pages" mode). */
export interface PageBox {
  id: string;
  title?: string;
  /** Record rows inside the page; each cell laid out as a mini table. */
  rows: Array<Array<string | number>>;
}

/** A small node in a node row ("mapping" mode) or the disk row ("frames"). */
export interface MapNode {
  id: string;
  label: string | number;
  state?: "normal" | "highlight" | "accent";
}

/** A multi-level block ("levels" mode). */
export interface LevelBlock {
  id: string;
  title?: string;
  /** Number of faint placeholder rows drawn inside the block. */
  rows?: number;
  /** Draw a vertical drawn-dots glyph to suggest continuation. */
  ellipsis?: boolean;
  /** Index blocks: muted note beneath the block (wrapped to the block
   *  width). Data blocks: muted label inside the block. */
  note?: string;
  /** Block size: "wide" data-page blocks vs default index blocks. */
  kind?: "index" | "data";
}

/** A connector between two anchors, addressed by id (+ optional side). */
export interface IndexLink {
  /** Source anchor: an entry/bucket id, a page id, or a node id. */
  from: string;
  /** Target anchor: a data-row id, a page id, a node id, or a block id. */
  to: string;
  /** Override which faces are joined. Defaults to a sensible left→right or
   *  top→bottom depending on the relative positions. */
  fromSide?: Side;
  toSide?: Side;
  /** Connector style: solid (default), dashed fetch, or a scan flow.
   *  All connectors share the family ink and one chevron marker. */
  variant?: "solid" | "dashed" | "flow";
  /** Bow the connector gently (bucket fan-out). */
  curve?: boolean;
  label?: string;
}

type Side = "left" | "right" | "top" | "bottom";

/** A self-contained spine, for two-up / stacked layouts. */
export interface Panel {
  title?: string;
  /** Top node row (mapping mode). */
  topRow?: MapNode[];
  /** Bottom node row (mapping mode). */
  bottomRow?: MapNode[];
  /** Link the top row left→right as a doubly-linked leaf chain. */
  chainTop?: boolean;
  /** Mapping arrows from top-row ids to bottom-row ids. */
  links: IndexLink[];
  /** A horizontal "scan" flow arrow above the panel with this label. */
  scan?: string;
  /** Muted notes beneath each row. */
  topNote?: string;
  bottomNote?: string;
}

interface Props {
  mode: "rows" | "pages" | "levels" | "mapping" | "frames";

  // --- rows / pages / levels / frames -------------------------------------
  /** Entry columns on the left of the data side (the index). */
  columns?: EntryColumn[];
  /** Entry columns on the right of the data side (two-sided composite keys). */
  rightColumns?: EntryColumn[];
  /** Bucket column sitting between the index and the data side (secondary). */
  buckets?: EntryColumn;
  /** The central record table. */
  table?: DataTable;
  /** Page boxes on the data side ("pages" mode), stacked vertically. */
  pages?: PageBox[];
  /** Level blocks ("levels" mode), grouped into visual stages. */
  levels?: LevelBlock[][];
  /** Frame column ("frames" mode): the buffer-pool slots. */
  frames?: EntryColumn;
  /** On-disk page row ("frames" mode). */
  disk?: { title?: string; pages: MapNode[] };
  /** Connectors addressed by anchor id. */
  links?: IndexLink[];

  // --- mapping ------------------------------------------------------------
  /** Side-by-side ("row") or stacked ("col") panels for mapping mode. */
  panels?: Panel[];
  panelLayout?: "row" | "col";

  title?: string;
  caption?: string;
  className?: string;
}

// --- shared -------------------------------------------------------------------

const ROW = TABLE.rowH;
const PAGE_PAD = 8;
const PAGE_GAP = 16;
const STATE = { normal: undefined, highlight: "strong", accent: "strong" } as const;

const increasing = (ys: number[]) => ys.every((y, i) => i === 0 || y > ys[i - 1]);

/**
 * Entries and records are table rows with positional ids (`${table}.r${j}`);
 * `alias` maps the author's ids onto them so links land on the exact row.
 */
type Alias = Map<string, string>;

const link = (l: IndexLink, i: number, alias?: Alias, to = l.to) => (
  <Edge
    key={`l${i}`}
    from={alias?.get(l.from) ?? l.from}
    to={alias?.get(to) ?? to}
    fromSide={to === l.to ? l.fromSide : undefined}
    toSide={to === l.to ? l.toSide : undefined}
    dashed={l.variant === "dashed"}
    route={l.curve ? "curve" : undefined}
    label={l.label}
  />
);

/**
 * An entry column drawn as one-column tables: entry i sits `ys[i]` px below
 * the column top (so its link runs level), entries one row apart share a
 * table, and the title heads the first table.
 */
function entryCol(col: EntryColumn, ys: number[], key: string, alias: Alias) {
  const runs: { y: number; entries: EntryBox[] }[] = [];
  col.entries.forEach((e, i) => {
    const last = runs[runs.length - 1];
    if (last && ys[i] === last.y + last.entries.length * ROW) last.entries.push(e);
    else runs.push({ y: ys[i], entries: [e] });
  });
  let end = 0;
  return (
    <Col key={key} gap={8}>
      <Col gap={0} align="stretch">
        {runs.map((r, k) => {
          const head = k === 0 && col.title ? [col.title] : undefined;
          const space = r.y - (head ? ROW : 0) - end;
          end = r.y + r.entries.length * ROW;
          r.entries.forEach((e, j) => alias.set(e.id, `${key}t${k}.r${j}`));
          return (
            <Fragment key={k}>
              {space > 0 && <Space h={space} />}
              <Table id={`${key}t${k}`} columns={head} rows={r.entries.map((e) => ({ cells: [String(e.label)], state: STATE[e.state ?? "normal"] }))} />
            </Fragment>
          );
        })}
      </Col>
      {col.note && <Text text={col.note} size="note" muted />}
    </Col>
  );
}

// --- modes --------------------------------------------------------------------

/** Entry columns into a record table; an entry sits level with its row when the targets walk down the table. */
function RowsMap(p: Props) {
  const { table, buckets, links = [] } = p;
  let left = p.columns ?? [];
  let right = p.rightColumns ?? [];
  // a second plain index mirrors to the right of the table, so its links never cross the first
  if (table && !buckets && !right.length && left.length > 1) [left, right] = [left.slice(0, 1), left.slice(1)];
  const alias: Alias = new Map(table?.rows.map((r, i) => [r.id, `data.r${i}`]));
  const rowAt = new Map(table?.rows.map((r, i) => [r.id, i]));
  const body = (table?.title ? GROUP.pad + GROUP.titleBand : 0) + ROW;
  const ys = (col: EntryColumn) => {
    const pinned = col.entries.map((e) => rowAt.get(links.find((l) => l.from === e.id && rowAt.has(l.to))?.to ?? ""));
    const rows = pinned.every((r) => r !== undefined) ? pinned.map((r) => body + r! * ROW) : [];
    return rows.length && increasing(rows) ? rows : col.entries.map((_, i) => body + i * ROW);
  };
  const data = table && (
    <Table
      id="data"
      columns={table.headers}
      rows={table.rows.map((r) => ({ cells: r.cells, state: r.state === "highlight" ? ("strong" as const) : undefined }))}
    />
  );
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Row gap={56} align="start">
        {left.map((c, i) => entryCol(c, ys(c), `l${i}`, alias))}
        {buckets && entryCol(buckets, ys(buckets), "b", alias)}
        {table && (table.title ? <Group title={table.title}>{data}</Group> : data)}
        {right.map((c, i) => entryCol(c, ys(c), `r${i}`, alias))}
      </Row>
      {links.map((l, i) => link(l, i, alias))}
    </Diagram>
  );
}

/** Entry column into page boxes; the j-th entry linked to a page sits level with its record j. */
function PagesMap(p: Props) {
  const col = p.columns?.[0];
  const pages = p.pages ?? [];
  const links = p.links ?? [];
  if (!col) return null;
  const head = (pg: PageBox) => PAGE_PAD + (pg.title ? GROUP.titleBand : 0);
  const tops = pages.map((_, k) => pages.slice(0, k).reduce((y, pg) => y + head(pg) + pg.rows.length * ROW + PAGE_PAD + PAGE_GAP, 0));
  const pageAt = new Map(pages.map((pg, k) => [pg.id, k]));
  const seen = new Map<number, number>();
  const pins = col.entries.map((e) => {
    const k = pageAt.get(links.find((l) => l.from === e.id && pageAt.has(l.to))?.to ?? "");
    if (k === undefined) return undefined;
    const j = Math.min(seen.get(k) ?? 0, Math.max(0, pages[k].rows.length - 1));
    seen.set(k, (seen.get(k) ?? 0) + 1);
    return { k, j, y: tops[k] + head(pages[k]) + j * ROW };
  });
  const pinned = pins.every((x) => x !== undefined) && increasing(pins.map((x) => x!.y));
  const ys = pinned ? pins.map((x) => x!.y) : col.entries.map((_, i) => head(pages[0] ?? { id: "", rows: [] }) + i * ROW);
  const pinOf = new Map(col.entries.map((e, i) => [e.id, pinned ? pins[i] : undefined]));
  const alias: Alias = new Map();
  const entries = entryCol(col, ys, "ix", alias);
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Row gap={56} align="start">
        {entries}
        <Col gap={PAGE_GAP} align="stretch">
          {pages.map((pg) => (
            <Group key={pg.id} id={pg.id} title={pg.title} pad={PAGE_PAD} align="stretch">
              <Table id={`${pg.id}.rows`} rows={pg.rows.map((r) => ({ cells: r }))} />
            </Group>
          ))}
        </Col>
      </Row>
      {links.map((l, i) => {
        const pin = pinOf.get(l.from);
        const level = pin && pages[pin.k].id === l.to && (!l.toSide || l.toSide === "left");
        return link(l, i, alias, level ? `${l.to}.rows.r${pin.j}` : l.to);
      })}
    </Diagram>
  );
}

function LevelBlockEl({ b }: { b: LevelBlock }) {
  if (b.kind === "data") return <Node id={b.id} title={b.note} w={92} h={62} />;
  return (
    <Group id={b.id} title={b.title} align="stretch" gap={6}>
      <Cells dir="col" items={Array.from({ length: b.rows ?? 2 }, () => null)} ellipsis={b.ellipsis ? "end" : undefined} />
      {b.note && <Text text={b.note} size="note" muted />}
    </Group>
  );
}

/** Stages left to right; a stage with fewer blocks is centred, so a block and its child share a row. */
function LevelsMap(p: Props) {
  const stages = p.levels ?? [];
  const n = Math.max(0, ...stages.map((s) => s.length));
  const cells = Array.from({ length: n }, (_, r) =>
    stages.map((s, k) => {
      const b = s[r - Math.floor((n - s.length) / 2)];
      return b ? <LevelBlockEl key={b.id} b={b} /> : <Space key={`s${r}.${k}`} />;
    }),
  ).flat();
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Grid cols={stages.length} colGap={64} rowGap={16}>
        {cells}
      </Grid>
      {(p.links ?? []).map((l, i) => link(l, i))}
    </Diagram>
  );
}

/**
 * One mapping panel: a row of index entries over a row of data pages, each
 * link a straight arrow from an entry's bottom to a page's top, so clustered
 * links run parallel and unclustered ones cross. A chained top row is a leaf
 * level; the scan line runs between anchors over its first and last leaf.
 */
function MapPanel({ pn, k }: { pn: Panel; k: number }) {
  const top = pn.topRow ?? [];
  const bottom = pn.bottomRow ?? [];
  const scan = pn.scan && top.length > 1;
  const w = Math.max(NODE.h, ...[...top, ...bottom].map((n) => measure(String(n.label), FONT.mono, { mono: true }) + 16));
  const node = (n: MapNode) => <Node key={n.id} id={n.id} title={String(n.label)} mono w={w} state={STATE[n.state ?? "normal"]} />;
  const gap = pn.chainTop ? 28 : 10;
  return (
    <Group title={pn.title} gap={10}>
      <Col gap={44}>
        <Col gap={6}>
          {scan ? (
            <Grid cols={top.length} colGap={gap} rowGap={18}>
              {top.map((_, i) => (
                <Space key={`a${i}`} id={i === 0 ? `scan${k}.0` : i === top.length - 1 ? `scan${k}.1` : undefined} />
              ))}
              {top.map(node)}
            </Grid>
          ) : (
            <Row gap={gap}>{top.map(node)}</Row>
          )}
          {pn.topNote && <Text text={pn.topNote} size="note" muted />}
        </Col>
        <Row gap={10}>{bottom.map(node)}</Row>
      </Col>
      {pn.bottomNote && <Text text={pn.bottomNote} size="note" muted />}
      {pn.chainTop && top.slice(1).map((n, i) => <Edge key={`c${i}`} from={top[i].id} to={n.id} head="both" />)}
      {scan && <Edge from={`scan${k}.0`} to={`scan${k}.1`} label={pn.scan} />}
      {pn.links.map((l, i) => (
        <Edge
          key={`l${i}`}
          from={l.from}
          to={l.to}
          fromSide={l.fromSide ?? "bottom"}
          toSide={l.toSide ?? "top"}
          route={l.curve ? "curve" : "straight"}
          dashed={l.variant === "dashed"}
          label={l.label}
        />
      ))}
    </Group>
  );
}

function MappingMap(p: Props) {
  const Stack = p.panelLayout === "col" ? Col : Row;
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Stack gap={32} align="start">
        {(p.panels ?? []).map((pn, k) => (
          <MapPanel key={k} pn={pn} k={k} />
        ))}
      </Stack>
    </Diagram>
  );
}

/** Page table, buffer pool and disk. A dashed link is the fetch on a miss, into a free frame. */
function FramesMap(p: Props) {
  const entries = p.columns?.[0]?.entries ?? [];
  const frames = p.frames?.entries ?? [];
  const links = p.links ?? [];
  const fetched = new Set(links.filter((l) => l.variant === "dashed").map((l) => l.to));
  return (
    <Diagram title={p.title} caption={p.caption} className={p.className}>
      <Col gap={40}>
        <Row gap={56} align="start">
          <Group title="Page table" align="stretch" gap={6}>
            {entries.map((e) => (
              <Node key={e.id} id={e.id} title={String(e.label)} state={STATE[e.state ?? "normal"]} mono />
            ))}
          </Group>
          <Group title="Buffer pool" align="stretch" gap={6}>
            {frames.map((f) => (
              <Node key={f.id} id={f.id} title={String(f.label)} state={fetched.has(f.id) ? "free" : STATE[f.state ?? "normal"]} mono />
            ))}
          </Group>
        </Row>
        {p.disk && (
          <Group title={p.disk.title ?? "On-disk file"} dir="row" gap={6}>
            {p.disk.pages.map((d) => (
              <Node key={d.id} id={d.id} title={String(d.label)} state={STATE[d.state ?? "normal"]} mono />
            ))}
          </Group>
        )}
      </Col>
      {links.map((l, i) =>
        l.variant === "dashed" ? (
          <Edge key={`l${i}`} from={l.from} to={l.to} fromSide={l.fromSide ?? "top"} toSide={l.toSide ?? "bottom"} dashed label={l.label ?? "on a miss"} />
        ) : (
          link(l, i)
        ),
      )}
    </Diagram>
  );
}

export function IndexMap(props: Props) {
  switch (props.mode) {
    case "rows":
      return <RowsMap {...props} />;
    case "pages":
      return <PagesMap {...props} />;
    case "levels":
      return <LevelsMap {...props} />;
    case "mapping":
      return <MappingMap {...props} />;
    case "frames":
      return <FramesMap {...props} />;
  }
}
