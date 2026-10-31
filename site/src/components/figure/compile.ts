/** Walk JSX into a Scene: expand plain components, validate props, resolve ids and ghosting. */
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { suggest, type Diagnostic } from "./diagnostics";
import { partIds } from "./mark";
import { Edge } from "./marks/edge";
import { Col } from "./marks/layout";
import type { AnyBlock, EdgeSpec, MarkDef, Scene, State } from "./model";

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
  if (isMarker(type)) return [{ def: type.def, props, children: collect(props.children) }];
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
  /** id -> state, for edge presence and ghosting */
  states: Map<string, State>;
  diagnostics: Diagnostic[];
}

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
    } else if ((name === "x" || name === "y") && parentKind !== "free") {
      ctx.diagnostics.push({ code: "prop/ignored", severity: "warn", message: `${where} sets ${name}, but only a child of <Free> is positioned.`, hint: `Its parent is <${parentKind}>.` });
    }
  }
}

function resolve(t: TNode, ctx: Ctx, pathId: string, inheritGhost: boolean, parentKind: string): AnyBlock | null {
  checkProps(t, parentKind, ctx);
  const p = t.props as { id?: string; state?: State; tone?: AnyBlock["tone"]; x?: number; y?: number };
  if (t.def === (Edge.def as unknown)) {
    ctx.edges.push(t.def.data(t.props));
    return null;
  }
  const id = typeof p.id === "string" ? p.id : pathId;
  const state: State = inheritGhost ? "ghost" : (p.state ?? "default");
  register(id, state, ctx);
  const children = t.children.map((c, i) => resolve(c, ctx, `${id}.${i}`, state === "ghost", t.def.kind)).filter((b): b is AnyBlock => b !== null);
  const data = t.def.data(t.props);
  const { x, y } = t.def.origin?.(t.props, data) ?? { x: p.x, y: p.y };
  const block: AnyBlock = { id, state, tone: p.tone, x, y, def: t.def as AnyBlock["def"], data, children };
  for (const part of partIds(block)) register(part, state, ctx);
  return block;
}

const ROOT = "root";

function register(id: string, state: State, ctx: Ctx) {
  if (ctx.states.has(id)) ctx.diagnostics.push({ code: "id/duplicate", severity: "error", message: `Two items have id "${id}".`, hint: id === ROOT ? `"${ROOT}" is reserved.` : "Ids must be unique within a figure." });
  ctx.states.set(id, state);
}

/** Compile the children of a `<Diagram>` into a scene. An edge to a missing id is an error; edges touching a ghost are ghosts. */
export function toScene(children: ReactNode): Scene {
  const ctx: Ctx = { edges: [], states: new Map([[ROOT, "default"]]), diagnostics: [] };
  const kids = collect(children)
    .map((n, i) => resolve(n, ctx, `${ROOT}.${i}`, false, "col"))
    .filter((b): b is AnyBlock => b !== null);
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
  return { root, edges, diagnostics: ctx.diagnostics };
}
