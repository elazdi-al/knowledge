import { Cells, Col, Diagram, Edge, Grid, Group, Node, Row, Space, Table, Text, type Tone } from "@/components/figure";
import { labelPillW } from "@/components/figure/layout";
import { LABEL_CLEAR } from "@/components/figure/theme";
import { TONE } from "@/components/tones";

/** Visual state shared across page boxes and slot cells.
 *  `full` = heavier outline (the page being changed / spilling),
 *  `new` = dashed outline (just created by a split),
 *  `highlight` = inverted box. */
export type HashState = "normal" | "full" | "new" | "highlight";

/** One page box: a header band over zero or more key (or key|value) rows. */
export interface HashPage {
  /** Stable id referenced by links / spills. */
  id: string;
  /** Header band text, e.g. "Bucket 0" or "Overflow". */
  title?: string;
  /** Small muted sub-line under the title, e.g. "primary page". */
  subtitle?: string;
  /** Body rows. Each row is a string, or `[key, value]` for a two-column row. */
  rows?: Array<string | [string, string]>;
  /** Local-depth chip drawn to the left of the box (extendible hashing). */
  depth?: string | number;
  state?: HashState;
  /** Small muted note to the right of the box, e.g. "21 just inserted". */
  note?: string;
}

export interface HashLink {
  /** Source: a directory entry index (number) or a dot/page id (string). */
  from: number | string;
  /** Target page id. */
  to: string;
}

/** A single open-addressing slot cell. */
export interface HashSlot {
  /** Cell contents; empty/omitted renders a blank free cell. */
  label?: string;
  /** "used" (occupied), "free" (empty) or "tomb" (tombstone marker). */
  kind?: "used" | "free" | "tomb";
  /** Small muted tag for the cell, e.g. "home"; drawn beneath its index. */
  top?: string;
}

/** A curved displacement arc above the slot row (probe chain step). */
export interface HashDisplacement {
  /** Source slot index. */
  from: number;
  /** Target slot index. */
  to: number;
  label?: string;
}

export interface HashProps {
  mode: "static" | "chained" | "slotArray" | "directory" | "bucketColumn";

  // -- node-and-pages modes (static, chained, directory, bucketColumn) --
  /** The hash source node, e.g. "h(k)". Drawn as a circle on the left. */
  source?: string;
  /** Small line under the source node, e.g. "h(k) mod N". */
  sourceNote?: string;
  /** Primary pages / buckets, top to bottom. */
  pages?: HashPage[];
  /** Overflow / image pages reached by a spill (chaining) arrow. */
  overflow?: HashPage[];
  /** Spill arrows from a page to an overflow page (id -> id). */
  spills?: Array<{ from: string; to: string; label?: string }>;

  // -- static: dashed numbered fan-out from the source --
  /** Fan-out edges from the source to pages, with an index label. */
  fanout?: Array<{ to: string; label?: string }>;

  // -- directory mode --
  /** Directory entry labels, top to bottom, e.g. ["00","01","10","11"]. */
  directory?: string[];
  /** Title above the directory column. */
  directoryTitle?: string;
  /** Global-depth chip value, drawn above the directory. */
  globalDepth?: string | number;
  /** Links from a directory entry (index) to a page id. */
  links?: HashLink[];

  // -- bucketColumn (linear hashing) --
  /** Bucket index labels, top to bottom; `isNew` is accepted for
   *  compatibility (the page's `new` state carries the meaning). */
  bucketLabels?: Array<{ label: string; isNew?: boolean }>;
  /** Index of the bucket the next/split pointer targets. */
  nextIndex?: number;
  /** Split elbow: from a page id to the new image page id. */
  split?: { from: string; to: string; label?: string };

  // -- slotArray mode --
  slots?: HashSlot[];
  /** Curved probe-displacement arcs above the slot row. */
  displacements?: HashDisplacement[];
  /** Optional second row illustrating a state (e.g. after a delete). */
  secondRow?: {
    /** Leading label to the left of the row. */
    leftLabel?: string;
    slots: HashSlot[];
    /** Trailing note to the right of the row. */
    rightLabel?: string;
  };

  title?: string;
  caption?: string;
  className?: string;
}


const STATE = { normal: undefined, full: "strong", new: "active", highlight: "strong" } as const;
/** Rows are data (mono), except keys written with the subscript syntax (`k_1`). */
const rowCell = (s: string) => (/[_^]/.test(s) ? { text: s, mono: false } : s);

/** A bucket: a titled panel over its rows, or a single value box when it has no rows. */
function Page({ p, badge, tone }: { p: HashPage; badge?: string; tone?: Tone }) {
  const state = STATE[p.state ?? "normal"];
  const chip = badge ?? (p.depth != null ? String(p.depth) : undefined);
  if (p.rows == null && !p.subtitle) return <Node id={p.id} title={p.title} mono badge={chip} state={state} tone={tone} />;
  const rows = (p.rows?.length ? p.rows.map((r) => (Array.isArray(r) ? r : [r]).map(rowCell)) : [[""]]).map((cells) => ({ cells, tone }));
  return (
    <Group id={p.id} title={p.title} badge={chip} state={state} tone={tone} pad={8} gap={4} align="stretch">
      {p.subtitle && <Text text={p.subtitle} size="note" muted />}
      <Table id={`${p.id}.t`} rows={rows} />
    </Group>
  );
}

/** Pages one under the other, equal width, each note beside its page. */
function Pages({ pages, badge, tone }: { pages: HashPage[]; badge?: (i: number) => string | undefined; tone?: Tone }) {
  const notes = pages.some((p) => p.note);
  return (
    <Grid cols={notes ? 2 : 1} colGap={10} rowGap={16} align="stretch">
      {pages.flatMap((p, i) => [
        <Page key={p.id} p={p} badge={badge?.(i)} tone={tone} />,
        notes && (p.note ? <Text key={`${p.id}.n`} text={p.note} size="note" muted /> : <Space key={`${p.id}.n`} />),
      ])}
    </Grid>
  );
}

export function HashDiagram(props: HashProps) {
  return props.mode === "slotArray" ? slotArray(props) : props.mode === "bucketColumn" ? bucketColumn(props) : columnPages(props);
}

/** static, chained and directory: a source or directory feeding a column of pages, overflow pages beside them. */
function columnPages({ mode, source, sourceNote, pages = [], overflow = [], spills = [], fanout = [], directory = [], directoryTitle, globalDepth, links = [], title, caption, className }: HashProps) {
  const groupTitle = directoryTitle ?? (globalDepth != null ? "global depth" : undefined);
  const dir = <Cells id="dir" dir="col" items={directory.map((label) => ({ label, tone: TONE.meta }))} />;
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Row gap={48} align="center">
        {source && <Node id="src" shape="circle" title={source} sub={sourceNote} />}
        {mode !== "static" && directory.length > 0 &&
          (groupTitle || globalDepth != null ? (
            <Group title={groupTitle} badge={globalDepth != null ? String(globalDepth) : undefined} tone={TONE.meta}>
              {dir}
            </Group>
          ) : (
            dir
          ))}
        <Pages pages={pages} />
        {overflow.length > 0 && <Pages pages={overflow} tone={TONE.overflow} />}
      </Row>
      {source && fanout.map((f) => <Edge key={f.to} from="src" to={f.to} dashed label={f.label} />)}
      {links.map((l, i) => (
        <Edge key={i} from={typeof l.from === "number" ? `dir.${l.from}` : l.from} to={l.to} />
      ))}
      {spills.map((s) => (
        <Edge key={`${s.from}>${s.to}`} from={s.from} to={s.to} label={s.label} />
      ))}
    </Diagram>
  );
}

/** Linear hashing: numbered buckets, the next bucket marked, overflow and notes to the right, the split drawn down the left. */
function bucketColumn({ pages = [], overflow = [], spills = [], bucketLabels = [], nextIndex, split, title, caption, className }: HashProps) {
  const idx = (id: string) => {
    const i = pages.findIndex((p) => p.id === id);
    return bucketLabels[i] ? `idx.${i}` : id;
  };
  const extras = (p: HashPage) => {
    const out = spills.filter((s) => s.from === p.id).flatMap((s) => overflow.filter((o) => o.id === s.to).map((o) => ({ s, o })));
    return (
      <Row gap={10}>
        {out.map(({ s, o }) => (
          <Row key={o.id} gap={0}>
            {/* a Grid gap does not grow for an edge label, so leave the spill's label room here */}
            {s.label && <Space w={labelPillW(s.label) + LABEL_CLEAR - 16} />}
            <Page p={o} tone={TONE.overflow} />
          </Row>
        ))}
        {p.note && <Text text={p.note} size="note" muted />}
      </Row>
    );
  };
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Row gap={36} align="center">
        {split?.label && <Text text={split.label} size="note" muted />}
        <Grid cols={3} colGap={16} rowGap={18} align="stretch">
          {pages.flatMap((p, i) => [
            bucketLabels[i] ? <Text key={`i${i}`} id={`idx.${i}`} text={bucketLabels[i].label} weight={600} /> : <Space key={`i${i}`} />,
            <Page key={p.id} p={{ ...p, rows: undefined, subtitle: undefined }} badge={i === nextIndex ? "next" : undefined} />,
            <Row key={`x${i}`} gap={0}>
              {extras(p)}
            </Row>,
          ])}
        </Grid>
      </Row>
      {spills.map((s) => (
        <Edge key={`${s.from}>${s.to}`} from={s.from} to={s.to} label={s.label} />
      ))}
      {split && <Edge from={idx(split.from)} to={idx(split.to)} fromSide="left" toSide="left" route="ortho" dashed />}
    </Diagram>
  );
}

/** Open addressing: the filled slots, each displaced key's probe an arc from where it started, and the row after a delete. */
function slotArray({ slots = [], displacements = [], secondRow, title, caption, className }: HashProps) {
  const cell = (s: HashSlot) => (s.kind === "tomb" ? { label: "tomb", state: "free" as const } : { label: s.label, sub: s.top });
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Col gap={22}>
        <Cells id="slots" index cell={44} items={slots.map(cell)} />
        {secondRow && (
          <Row gap={10}>
            {secondRow.leftLabel && <Text text={secondRow.leftLabel} size="note" muted />}
            <Cells id="after" items={secondRow.slots.map(cell)} />
            {secondRow.rightLabel && <Text text={secondRow.rightLabel} size="note" muted />}
          </Row>
        )}
      </Col>
      {displacements.map((d, j) => (
        <Edge
          key={j}
          from={`slots.${d.from}`}
          to={`slots.${d.to}`}
          route="arc"
          bend={(d.to > d.from ? -1 : 1) * (25 + 55 * Math.abs(d.to - d.from))}
          dashed
          label={d.label}
        />
      ))}
    </Diagram>
  );
}
