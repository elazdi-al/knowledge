import { Fragment, type ReactNode } from "react";
import { Diagram, Edge, Grid, Group, layoutScene, Node, Row, Space, Text, toScene, type Side } from "@/components/figure";

export interface ERNode {
  /** Stable id referenced by edges, attribute owners and aggregation members. */
  id: string;
  /** Display text. Entities/relationships show it; ISA defaults to "ISA". */
  label?: string;
  /** Centre, in the same y-up centimetre grid as the TikZ sources. */
  x: number;
  y: number;
  /** `weak` double-frames an entity; `identifying` double-frames a relationship. */
  variant?: "normal" | "weak" | "identifying";
}

export interface ERAttribute {
  /** Owner entity / relationship id; the connecting line is drawn for you. */
  owner: string;
  label: string;
  x: number;
  y: number;
  /** `key` = solid underline, `partial` = dashed underline, else plain. */
  kind?: "normal" | "key" | "partial";
}

export interface EREdge {
  /** Endpoint ids: entity, relationship, ISA node, or an aggregation box id. */
  from: string;
  to: string;
  /** `thick` = total participation; `arrow` = key / at-most-one (chevron head). */
  style?: "plain" | "thick" | "arrow" | "thickArrow";
  /** Small italic role label, placed by the edge. */
  label?: string;
  /** Optional label nudge in the same centimetre grid as node coordinates. */
  labelDx?: number;
  labelDy?: number;
}

export interface ERAggregation {
  /** Stable id; usable as an edge endpoint (the box edge, e.g. `agg`->`Monitors`). */
  id: string;
  /** Node ids the dashed box should enclose; attributes owned by those nodes
   *  are pulled in automatically, so the box fits the whole sub-schema. */
  members: string[];
}

export interface ERAnnotation {
  /** Free muted label (e.g. a cardinality caption or "Overlapping"). */
  text: string;
  x: number;
  y: number;
  /** Horizontal anchor. Default "middle". */
  anchor?: "start" | "middle" | "end";
}

interface Props {
  entities?: ERNode[];
  relationships?: ERNode[];
  isa?: ERNode[];
  attributes?: ERAttribute[];
  edges?: EREdge[];
  aggregations?: ERAggregation[];
  annotations?: ERAnnotation[];
  /** Bold heading inside the card (e.g. a figure label). */
  title?: string;
  caption?: string;
  className?: string;
}

/** ER names are literal identifiers: `_` and `^` print as typed instead of starting a sub/superscript. */
const esc = (s: string) => s.replace(/[_^]/g, "\\$&");
/** Coordinates (cm) within this distance of a run's first value share a row or column. */
const SNAP = 0.5;
/** Adjacent columns whose items never share a row merge when they are this close (cm). */
const MERGE = 1.5;
/** An annotation this close (cm) to a node in its row is drawn beside that node. */
const ASIDE = 1.25;

interface Unit {
  id: string;
  x: number;
  y: number;
  kind: "entity" | "relationship" | "isa" | "agg" | "note";
  node?: ERNode;
  members?: Unit[];
  text?: ERAnnotation;
  aside?: ERAnnotation;
}

/** Sorted runs of values, each value within SNAP of its run's first. */
function snap(values: number[]): number[][] {
  const runs: number[][] = [];
  for (const v of [...new Set(values)].sort((a, b) => a - b)) {
    const last = runs.at(-1);
    if (last && v - last[0] <= SNAP) last.push(v);
    else runs.push([v]);
  }
  return runs;
}

/**
 * The author's centimetre coordinates are read as topology only: y snaps into rows,
 * x into columns, and every glyph is placed in a Grid cell and sized from its label.
 * Attributes fan out in a row above their owner, or below it when the owner is
 * reached from above. An aggregation is a dashed group holding its members' own grid.
 */
export function ERDiagram({ entities = [], relationships = [], isa = [], attributes = [], edges = [], aggregations = [], annotations = [], title, caption, className }: Props) {
  const kinded = [
    ...entities.map((n) => ({ n, kind: "entity" as const })),
    ...relationships.map((n) => ({ n, kind: "relationship" as const })),
    ...isa.map((n) => ({ n, kind: "isa" as const })),
  ];
  const units = new Map<string, Unit>(kinded.map(({ n, kind }) => [n.id, { id: n.id, x: n.x, y: n.y, kind, node: n }]));
  const inAgg = new Set(aggregations.flatMap((a) => a.members));
  const aggs = aggregations.map((a): Unit => {
    const members = a.members.flatMap((m) => units.get(m) ?? []);
    const mean = (f: (u: Unit) => number) => members.reduce((s, u) => s + f(u), 0) / Math.max(1, members.length);
    return { id: a.id, x: mean((u) => u.x), y: mean((u) => u.y), kind: "agg", members };
  });
  for (const u of aggs) units.set(u.id, u);
  const top = [...units.values()].filter((u) => !inAgg.has(u.id));

  const notes: Unit[] = [];
  annotations.forEach((t, i) => {
    const near = top
      .filter((u) => u.kind !== "agg" && !u.aside && Math.abs(u.y - t.y) <= SNAP && Math.abs(u.x - t.x) <= ASIDE)
      .sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x))[0];
    if (near) near.aside = t;
    else notes.push({ id: `note.${i}`, x: t.x, y: t.y, kind: "note", text: t });
  });

  const yOf = (id: string) => units.get(id)?.y ?? 0;
  const isRel = (id: string) => units.get(id)?.kind === "relationship";
  const reaches = (id: string, dir: 1 | -1) =>
    edges.some((e) => (e.from === id || e.to === id) && dir * (yOf(e.from === id ? e.to : e.from) - yOf(id)) > SNAP);
  const attrsOf = (id: string) => attributes.flatMap((a, i) => (a.owner === id ? [{ a, id: `attr.${i}` }] : []));
  const below = (id: string) => reaches(id, 1) && !reaches(id, -1);

  const glyph = (u: Unit): ReactNode => {
    const label = esc(u.node?.label ?? (u.kind === "isa" ? "ISA" : u.id));
    switch (u.kind) {
      case "entity":
        return <Node id={u.id} title={label} double={u.node?.variant === "weak"} />;
      case "relationship":
        return <Node id={u.id} shape="diamond" title={label} double={u.node?.variant === "identifying"} />;
      case "isa":
        return <Node id={u.id} shape="triangle" title={label} />;
      case "agg":
        return (
          <Group id={u.id} dashed>
            {grid(u.members ?? [], `${u.id}.grid`)}
          </Group>
        );
      case "note":
        return <Text text={esc(u.text!.text)} size="note" muted />;
    }
  };
  const withAside = (u: Unit) => {
    if (!u.aside) return glyph(u);
    const t = <Text text={esc(u.aside.text)} size="note" muted />;
    return <Row gap={8}>{u.aside.x < u.x ? [t, glyph(u)] : [glyph(u), t]}</Row>;
  };
  const attrRow = (u: Unit) => (
    <Row gap={8}>
      {attrsOf(u.id).map(({ a, id }) => (
        <Node key={id} id={id} shape="pill" title={esc(a.label)} underline={a.kind === "key" ? "solid" : a.kind === "partial" ? "dashed" : undefined} />
      ))}
    </Row>
  );

  function grid(list: Unit[], gid: string): ReactNode {
    const rows = snap(list.map((u) => -u.y));
    const rowOf = (u: Unit) => rows.findIndex((r) => r.includes(-u.y));
    const rowsIn = (xs: number[]) => new Set(list.filter((u) => xs.includes(u.x)).map(rowOf));
    const cols: number[][] = [];
    for (const xs of snap(list.map((u) => u.x))) {
      const last = cols.at(-1);
      const apart = last && [...rowsIn(xs)].every((r) => !rowsIn(last).has(r));
      if (last && apart && xs[0] - last.at(-1)! <= MERGE) last.push(...xs);
      else cols.push(xs);
    }
    const colOf = (u: Unit) => cols.findIndex((xs) => xs.includes(u.x));
    const at = (r: number, c: number) => list.filter((u) => rowOf(u) === r && cols[c].includes(u.x));
    // an aside whose neighbouring cell is empty moves into that cell, so it never widens its glyph's column;
    // the aside and the glyph then hug their shared column boundary
    const hug = new Map<string, Unit>();
    for (const u of list) {
      if (!u.aside || at(rowOf(u), colOf(u)).length > 1) continue;
      const key = `${rowOf(u)}:${colOf(u) + (u.aside.x < u.x ? -1 : 1)}`;
      const [r, c] = key.split(":").map(Number);
      if (c >= 0 && c < cols.length && at(r, c).length === 0 && !hug.has(key)) hug.set(key, u);
    }
    const hugged = new Set([...hug.values()].map((u) => u.id));

    const build = (colW?: number[], w?: (id: string) => number) => {
      const pad = (el: ReactNode, id: string, c: number, before: boolean) =>
        colW && w ? <Row gap={0}>{before ? [<Space key="s" w={colW[c] - w(id)} />, el] : [el, <Space key="s" w={colW[c] - w(id)} />]}</Row> : el;
      const draw = (u: Unit) => (hugged.has(u.id) ? pad(glyph(u), u.id, colOf(u), u.aside!.x > u.x) : withAside(u));
      const cell = (us: Unit[], f: (u: Unit) => ReactNode) =>
        us.length === 0 ? <Space /> : us.length === 1 ? f(us[0]) : <Row gap={12}>{us.map(f)}</Row>;
      const band = (r: number, side: boolean) => {
        const has = (u: Unit) => attrsOf(u.id).length > 0 && below(u.id) === side;
        if (!list.some((u) => rowOf(u) === r && has(u))) return [];
        return cols.map((_, c) => cell(at(r, c).filter(has), attrRow));
      };
      const main = (r: number, c: number) => {
        const owner = hug.get(`${r}:${c}`);
        if (!owner) return cell(at(r, c), draw);
        const id = `${owner.id}.aside`;
        return pad(<Text id={id} text={esc(owner.aside!.text)} size="note" muted />, id, c, owner.aside!.x < owner.x);
      };
      const roles = edges.some((e) => e.label && Math.abs(yOf(e.from) - yOf(e.to)) > SNAP);
      return (
        <Grid id={gid} cols={cols.length} colGap={28} rowGap={roles ? 56 : 24}>
          {rows.flatMap((_, r) => [...band(r, false), ...cols.map((_, c) => main(r, c)), ...band(r, true)]).map((c, i) => (
            <Fragment key={i}>{c}</Fragment>
          ))}
        </Grid>
      );
    };
    if (!hug.size) return build();
    const probe = layoutScene(toScene(build()), { lint: false });
    const colW = cols.map(() => 0);
    probe.items.filter((it) => it.parent === gid).forEach((it, i) => (colW[i % cols.length] = Math.max(colW[i % cols.length], it.rect.w)));
    const w = (id: string) => probe.items.find((it) => it.id === id)?.rect.w ?? 0;
    return build(colW, w);
  }

  const pairs = new Map<string, number>();
  const pairKey = (e: EREdge) => [e.from, e.to].sort().join(" ");
  for (const e of edges) pairs.set(pairKey(e), (pairs.get(pairKey(e)) ?? 0) + 1);
  const seen = new Map<string, number>();

  return (
    <Diagram title={title} caption={caption} className={className}>
      {grid([...top, ...notes], "er")}
      {attributes.map((a, i) => {
        const down = below(a.owner);
        return <Edge key={`a${i}`} from={`attr.${i}`} to={a.owner} fromSide={down ? "top" : "bottom"} toSide={down ? "bottom" : "top"} route="straight" head="none" />;
      })}
      {edges.map((e, i) => {
        const arrow = e.style === "arrow" || e.style === "thickArrow";
        // the chevron always points into the relationship, whichever way the edge was written
        const [from, to] = arrow && isRel(e.from) && !isRel(e.to) ? [e.to, e.from] : [e.from, e.to];
        const dy = yOf(to) - yOf(from);
        let sides: [Side | undefined, Side | undefined] = Math.abs(dy) > SNAP ? (dy < 0 ? ["bottom", "top"] : ["top", "bottom"]) : [undefined, undefined];
        // parallel edges (the two roles of a self-relationship) meet the diamond at opposite vertices
        const k = seen.get(pairKey(e)) ?? 0;
        seen.set(pairKey(e), k + 1);
        if ((pairs.get(pairKey(e)) ?? 1) > 1) {
          const side: Side = Math.abs(dy) > SNAP ? (k % 2 ? "right" : "left") : k % 2 ? "bottom" : "top";
          sides = isRel(from) && !isRel(to) ? [side, sides[1]] : [sides[0], side];
        }
        return (
          <Edge
            key={`e${i}`}
            from={from}
            to={to}
            fromSide={sides[0]}
            toSide={sides[1]}
            route="straight"
            head={arrow ? "end" : "none"}
            thick={e.style === "thick" || e.style === "thickArrow"}
            label={e.label}
          />
        );
      })}
    </Diagram>
  );
}
