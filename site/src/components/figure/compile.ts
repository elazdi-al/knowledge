/** Walk JSX into a Scene: expand plain components, validate props, resolve ids and ghosting. */
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { suggest, type Diagnostic } from "./diagnostics";
import { partIds, type Common } from "./mark";
import { Edge, type EdgeProps } from "./marks/edge";
import { Col } from "./marks/layout";
import { Space } from "./marks/shapes";
import type { AnyBlock, EdgeSpec, MarkDef, Overlay, Point, Scene, State } from "./model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDef = MarkDef<any, any>;
type Props = Record<string, unknown> & { children?: ReactNode };

interface TNode {
  def: AnyDef;
  props: Props;
  children: TNode[];
}

const isMarker = (t: unknown): t is { def: AnyDef } => typeof t === "function" && "def" in t;
const nameOf = (t: unknown): string => {
  const o = t as { displayName?: string; name?: string; $$typeof?: symbol } | string | undefined;
  return typeof o === "string" ? o : (o?.displayName ?? o?.name ?? o?.$$typeof?.description ?? String(t));
};

/** The markers a component expands to. Components here are plain functions, called once, so they cannot use state or context. */
function expand(type: unknown, props: Props): TNode[] {
  if (type === Fragment) return collect(props.children);
  if (isMarker(type)) return [{ def: type.def, props, children: type.def.arrange ? collect(props.children) : [] }];
  if (typeof type === "function") {
    if (type.prototype?.isReactComponent) throw new Error(`[figure] class component <${nameOf(type)}> cannot be used inside <Diagram>; use a function.`);
    return collect(type(props));
  }
  const wrapper = type as { $$typeof?: symbol; type?: unknown; render?: (p: Props, ref: null) => ReactNode };
  if (wrapper?.$$typeof === Symbol.for("react.memo")) return expand(wrapper.type, props);
  if (wrapper?.$$typeof === Symbol.for("react.forward_ref")) return collect(wrapper.render?.(props, null));
  throw new Error(`[figure] <${nameOf(type)}> cannot be used inside <Diagram>; figures are made of marks and functions that return marks.`);
}

function collect(children: ReactNode): TNode[] {
  const out: TNode[] = [];
  Children.forEach(children, (child) => {
    if (child == null || typeof child === "boolean") return;
    if (!isValidElement(child)) {
      if (typeof child === "string" && child.trim() === "") return;
      throw new Error(`[figure] bare ${typeof child} child; wrap text in <Text>`);
    }
    const el = child as ReactElement<Props>;
    out.push(...expand(el.type, el.props));
  });
  return out;
}

interface Ctx {
  edges: EdgeSpec[];
  overlays: Overlay[];
  /** id -> state, for edge presence and ghosting */
  states: Map<string, State>;
  diagnostics: Diagnostic[];
}

const PLACEMENT = ["at", "anchor", "offset"];

function checkProps(t: TNode, parentKind: string, ctx: Ctx) {
  const table: Record<string, true | "number" | readonly string[]> = t.def.props;
  const where = `<${t.def.kind}${typeof t.props.id === "string" ? ` id="${t.props.id}"` : ""}>`;
  for (const [name, value] of Object.entries(t.props)) {
    if (value === undefined) continue;
    const allowed = table[name];
    if (allowed === undefined) {
      ctx.diagnostics.push({ code: "prop/invalid", severity: "error", message: `${where} has no prop "${name}".`, hint: suggest(name, Object.keys(table)) });
    } else if (allowed === "number" ? typeof value !== "number" : allowed !== true && !allowed.includes(value as string)) {
      ctx.diagnostics.push({ code: "prop/invalid", severity: "error", message: `${where} ${name}="${String(value)}" is not valid.`, hint: allowed === "number" ? "Pass a number." : `One of: ${(allowed as readonly string[]).join(", ")}.` });
    } else if (PLACEMENT.includes(name) && parentKind !== "canvas") {
      ctx.diagnostics.push({ code: "prop/ignored", severity: "warn", message: `${where} sets ${name}, but only a child of <Canvas> is placed.`, hint: `Its parent is <${parentKind}>.` });
    }
  }
}

/** An edge's point ends and waypoints become hidden zero-size children of the canvas, so they size it like anything else and routing sees only ids. */
function resolveEdge(t: TNode, ctx: Ctx, pathId: string, state: State, parentKind: string): AnyBlock[] {
  const { from, to, via = [] } = t.props as Pick<EdgeProps, "from" | "to" | "via">;
  const { label } = t.props as Pick<EdgeProps, "label">;
  if (label?.includes("\n")) ctx.diagnostics.push({ code: "prop/invalid", severity: "error", message: `Edge label "${label}" has a line break.`, hint: "An edge label is one line; shorten it, or place a <Text> beside the edge." });
  const points = [from, to, ...via].filter((e) => Array.isArray(e));
  if (points.length && parentKind !== "canvas") {
    ctx.diagnostics.push({ code: "edge/point-outside-canvas", severity: "error", message: `An edge in <${parentKind}> ends on a point or has via points.`, hint: "Points are coordinates of a <Canvas>; put the edge inside one, or end it on an id." });
    return [];
  }
  const anchors: AnyBlock[] = [];
  const idOf = (end: string | Point, role: string) => {
    if (!Array.isArray(end)) return String(end);
    const id = `${pathId}.${role}`;
    register(id, state, ctx);
    anchors.push({ id, state, at: end, def: Space.def as unknown as AnyBlock["def"], data: { w: 0, h: 0 }, children: [] });
    return id;
  };
  ctx.edges.push({
    ...t.def.data(t.props),
    from: idOf(from, "from"),
    to: idOf(to, "to"),
    via: via.length ? via.map((p, i) => ({ of: idOf(p, `via${i}`), x: 0, y: 0 })) : undefined,
  });
  return anchors;
}

function resolve(t: TNode, ctx: Ctx, pathId: string, inheritGhost: boolean, parentKind: string): AnyBlock[] {
  checkProps(t, parentKind, ctx);
  const p = t.props as Pick<Common, "id" | "state" | "tone" | "at" | "anchor" | "offset">;
  if (t.def === (Edge.def as unknown)) return resolveEdge(t, ctx, pathId, inheritGhost ? "ghost" : "default", parentKind);
  if (t.def.overlay) {
    ctx.overlays.push({ def: t.def, data: t.def.data(t.props) });
    return [];
  }
  const id = typeof p.id === "string" ? p.id : pathId;
  const state: State = inheritGhost ? "ghost" : (p.state ?? "default");
  register(id, state, ctx);
  const children = t.children.flatMap((c, i) => resolve(c, ctx, `${id}.${i}`, state === "ghost", t.def.kind));
  const data = t.def.data(t.props);
  const origin: Point | undefined = t.def.origin?.(t.props, data);
  const block: AnyBlock = { id, state, tone: p.tone, at: origin ?? p.at, anchor: origin ? "nw" : p.anchor, offset: p.offset, def: t.def as AnyBlock["def"], data, children };
  for (const part of partIds(block)) register(part, state, ctx);
  return [block];
}

const ROOT = "root";

function register(id: string, state: State, ctx: Ctx) {
  if (ctx.states.has(id)) ctx.diagnostics.push({ code: "id/duplicate", severity: "error", message: `Two items have id "${id}".`, hint: id === ROOT ? `"${ROOT}" is reserved.` : "Ids must be unique within a figure." });
  ctx.states.set(id, state);
}

/** Compile the children of a `<Diagram>` into a scene. An edge to a missing id is an error; edges touching a ghost are ghosts. */
export function toScene(children: ReactNode): Scene {
  const ctx: Ctx = { edges: [], overlays: [], states: new Map([[ROOT, "default"]]), diagnostics: [] };
  const kids = collect(children).flatMap((n, i) => resolve(n, ctx, `${ROOT}.${i}`, false, "col"));
  const root: AnyBlock = { id: ROOT, state: "default", def: Col.def as unknown as AnyBlock["def"], data: Col.def.data({}), children: kids };
  const known = [...ctx.states.keys()].filter((id) => id !== ROOT);
  const seen = new Set<string>();
  const edges = ctx.edges.flatMap((e) => {
    const missing = [e.from, e.to].filter((id) => !ctx.states.has(id));
    for (const id of new Set(missing)) {
      ctx.diagnostics.push({ code: "edge/unknown-endpoint", severity: "error", message: `Edge "${e.from}" -> "${e.to}" has no item "${id}".`, hint: suggest(id, known) });
    }
    if (missing.length) return [];
    let id = e.id;
    for (let n = 2; seen.has(id); n++) id = `${e.id}#${n}`;
    seen.add(id);
    const ghosted = ctx.states.get(e.from) === "ghost" || ctx.states.get(e.to) === "ghost";
    return [{ ...e, id, state: ghosted ? ("ghost" as const) : e.state }];
  });
  const overlays = ctx.overlays.filter((o) => {
    const missing = (o.def.refs?.(o.data) ?? []).filter((id: string) => !ctx.states.has(id));
    for (const id of missing) ctx.diagnostics.push({ code: "edge/unknown-endpoint", severity: "error", message: `<${o.def.kind}> has no item "${id}".`, hint: suggest(id, known) });
    return !missing.length;
  });
  return { root, edges, overlays, diagnostics: ctx.diagnostics };
}
