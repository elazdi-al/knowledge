import { Fragment } from "react";
import { Cells, Col, Diagram, Edge, FONT, Grid, Group, measure, Node, Row, Space, Text, type State } from "@/components/figure";
import { nodeTitleW } from "@/components/figure/layout";
import { GROUP, NODE } from "@/components/figure/theme";

/** A page cell's role, mapped onto the family state grammar:
 *  - `hot`: emphasis outline (a protected / working-set page).
 *  - `read-once`: normal outline (a one-off page that should be discarded).
 *  - `scan`: dashed outline (a page brought in by a sequential scan).
 *  - `highlight`: inverted box (the page the arrow is about to act on). */
export type CellRole = "hot" | "read-once" | "scan" | "highlight";

export interface PageCell {
  /** Display label, e.g. "page 7". */
  label: string;
  /** Stable id, used to anchor arrows on this exact cell. Optional. */
  id?: string;
  role?: CellRole;
}

export interface QueueColumn {
  /** Stable id, used to anchor arrows on the column. */
  id: string;
  /** Bold heading above the column frame (e.g. "FIFO queue"). */
  title?: string;
  /** Cells, top to bottom. */
  cells: PageCell[];
  /** Small muted note centred below the column frame (e.g. "hot pages"). */
  foot?: string;
  /** Draw the frame box around the cells. Default true. A `scan` row sets this
   *  false to read as a loose sweep rather than a buffer pool. */
  framed?: boolean;
  /** Lay the cells in a horizontal row instead of a vertical stack. Used for
   *  the sequential-scan strip. */
  horizontal?: boolean;
}

/** An anchor on the figure: a column, a column edge, or a specific cell.
 *  `"colId"` — the column centre. `"colId:top"` / `":bottom"` / `":left"` /
 *  `":right"` — the named edge of the column frame. `"colId#cellId"` or
 *  `"colId#3"` — a specific cell (by id or 0-based index), with an optional
 *  `:edge` suffix, e.g. `"fifo#page8:right"`. */
export type Anchor = string;

export interface QueueArrow {
  from: Anchor;
  to: Anchor;
  label?: string;
  /** `insert` / `evict` / `promote` are plain connectors; `scan` is a long
   *  sweep drawn with a heavier stroke. Default `promote`. */
  kind?: "insert" | "evict" | "promote" | "scan";
  /** Nudge the label off the arrow midpoint. `above` (default) / `below`. */
  labelSide?: "above" | "below";
  /** Pull the `from` endpoint away from its anchor by [dx, dy] px. Lets an
   *  insert/evict arrow start or end in free space beside the frame (the TikZ
   *  "new page" / "evict" arrows that reach in from outside the queue). */
  fromOffset?: [number, number];
  /** Pull the `to` endpoint away from its anchor by [dx, dy] px. */
  toOffset?: [number, number];
}

interface Props {
  /** The columns, left to right (wrapping onto new rows when too wide). */
  columns: QueueColumn[];
  /** Arrows between anchors. */
  arrows?: QueueArrow[];
  /** Deprecated: no longer rendered — the figure caption tells that story.
   *  Kept so existing notes that pass it keep compiling. */
  note?: { title?: string; body: string };
  /** Bold heading inside the card. */
  title?: string;
  caption?: string;
  className?: string;
}

/** Read-once and scan pages are the same kind of page: dashed, never reused. */
const ROLE: Record<CellRole, State | undefined> = { hot: undefined, "read-once": "placeholder", scan: "placeholder", highlight: "strong" };
const GAP = 6;

const pageW = (cells: PageCell[]) => Math.max(...cells.map((c) => nodeTitleW({ title: c.label, mono: true, state: "default", shape: "box" }))) + 2 * NODE.padX;

export function BufferQueue({ columns, arrows = [], note, title, caption, className }: Props) {
  void note; // deprecated: the figure caption carries that text now.
  const scan = columns.find((c) => c.horizontal);
  const sweep = arrows.find((a) => a.kind === "scan");
  const pools = columns.filter((c) => !c.horizontal);
  if (scan && sweep && pools.length) return <Flooding scan={scan} sweep={sweep} before={pools[0]} after={pools.length > 1 ? pools[pools.length - 1] : undefined} title={title} caption={caption} className={className} />;

  const byId = new Map(columns.map((c) => [c.id, c]));
  const cellId = (col: QueueColumn, i: number) => `${col.id}.${col.cells[i].id ?? i}`;
  /** `col`, `col#cell` or `col#3`, with an ignored `:side`, to an item id plus the column and cell index. */
  const resolve = (a: Anchor) => {
    const [colId, sel] = a.split(":")[0].split("#");
    const col = byId.get(colId);
    if (!col || sel === undefined) return col && { id: col.id, col, i: -1 };
    const i = /^\d+$/.test(sel) ? Number(sel) : col.cells.findIndex((c) => c.id === sel);
    return col.cells[i] ? { id: cellId(col, i), col, i } : undefined;
  };
  // insert and evict arrows reach in from outside the queue: a placeholder stub level with the cell, titled with the arrow label
  const stubs = arrows.flatMap((a) => {
    const kind = a.kind ?? "promote";
    const end = resolve(kind === "insert" ? a.to : a.from);
    return (kind === "insert" || kind === "evict") && end && end.i >= 0 ? [{ kind, label: a.label ?? kind, end, id: `${kind}${end.id}` }] : [];
  });
  const stubCol = stubs[0]?.end.col;

  return (
    <Diagram title={title} caption={caption} className={className}>
      <Row gap={48} align="start">
        {columns.flatMap((c) => [
          c === stubCol && (
            <Col key="stubs" gap={GAP} align="end">
              <Space h={GROUP.pad + (c.title ? GROUP.titleBand : 0) - GAP} />
              {c.cells.map((_, i) => {
                const s = stubs.find((s) => s.end.col === c && s.end.i === i);
                return s ? <Node key={i} id={s.id} title={s.label} state="placeholder" /> : <Space key={i} h={NODE.h} />;
              })}
            </Col>
          ),
          <Group key={c.id} id={c.id} title={c.title} dir={c.horizontal ? "row" : "col"} gap={GAP}>
            {c.cells.map((cell, i) => (
              <Node key={i} id={cellId(c, i)} title={cell.label} mono w={pageW(c.cells)} state={ROLE[cell.role ?? "hot"]} />
            ))}
            {c.foot && <Text text={c.foot} size="note" muted />}
          </Group>,
        ])}
      </Row>
      {stubs.map((s) => (s.kind === "insert" ? <Edge key={s.id} from={s.id} to={s.end.id} /> : <Edge key={s.id} from={s.end.id} to={s.id} />))}
      {arrows.map((a, i) => {
        const from = resolve(a.from), to = resolve(a.to);
        return a.kind !== "insert" && a.kind !== "evict" && from && to ? <Edge key={i} from={from.id} to={to.id} label={a.label} /> : null;
      })}
    </Diagram>
  );
}

interface FloodingProps {
  scan: QueueColumn;
  sweep: QueueArrow;
  before: QueueColumn;
  after?: QueueColumn;
  title?: string;
  caption?: string;
  className?: string;
}

/** Grid cells are centred; pad a column of labels to one width so they line up on one edge. */
function flush(texts: (string | undefined)[], align: "start" | "end", size: "label" | "note") {
  const style = size === "note" ? { px: FONT.note, weight: 400 } : { px: FONT.label, weight: 500 };
  const w = Math.max(0, ...texts.map((t) => (t ? measure(t, style.px, { weight: style.weight }) : 0)));
  return texts.map((t) => (
    <Col gap={0} align={align}>
      {t && <Text text={t} size={size} muted={size === "note"} weight={style.weight === 500 ? 500 : undefined} />}
      <Space w={w} />
    </Col>
  ));
}

/**
 * Sequential flooding under LRU as a trace: the pool before the scan, then after each scanned page, most recently
 * used first. Each scanned page enters at the front and pushes the least recently used page out of the back.
 */
function Flooding({ scan, sweep, before, after, title, caption, className }: FloodingProps) {
  void sweep; // the scan column is the sweep now
  const pools = [before.cells];
  for (const r of scan.cells) pools.push([r, ...pools[pools.length - 1]].slice(0, before.cells.length));
  const last = pools.length - 1;
  if (process.env.NODE_ENV !== "production" && after && pools[last].map((p) => p.label).join() !== after.cells.map((c) => c.label).join()) {
    console.warn(`[diagram] "${caption}": LRU leaves ${pools[last].map((p) => p.label).join(", ")}, but the "${after.title}" column shows ${after.cells.map((c) => c.label).join(", ")}`);
  }
  const page = (c: PageCell) => ({ label: c.label, state: ROLE[c.role ?? "hot"] });
  const labels = flush(pools.map((_, k) => (k === 0 ? before.title : k === last ? after?.title : undefined)), "end", "label");
  const notes = flush(pools.map((_, k) => (k === 0 ? before.foot : `evicts ${pools[k - 1][before.cells.length - 1].label}`)), "start", "note");

  return (
    <Diagram title={title} caption={caption} className={className}>
      <Grid cols={4} colGap={20} rowGap={8} align="center">
        <Space />
        {scan.title ? <Text text={scan.title} size="note" muted /> : <Space />}
        <Space />
        <Space />
        {pools.map((pool, k) => (
          <Fragment key={k}>
            {labels[k]}
            {k === 0 ? <Space /> : <Cells id={`scan${k}`} items={[page(scan.cells[k - 1])]} />}
            <Cells id={`pool${k}`} items={pool.map(page)} />
            {notes[k]}
          </Fragment>
        ))}
      </Grid>
      {scan.cells.map((_, i) => (
        <Edge key={i} from={`scan${i + 1}`} to={`pool${i + 1}.0`} />
      ))}
    </Diagram>
  );
}
