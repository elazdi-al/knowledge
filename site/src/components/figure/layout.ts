/** `layoutScene`: measure bottom-up, place top-down, route, paint. */
import { edgeOp } from "./marks/edge";
import { idsUnder } from "./mark";
import { lint } from "./lint";
import type { AnyBlock, Box, EdgeSpec, Frame, LayoutCtx, Part, Placed, Rect, Scene, Size } from "./model";
import { labelPillW, routeItems } from "./route";
import { EDGE_LABEL, MARGIN } from "./theme";

interface Ctx extends LayoutCtx {
  sizes: Map<AnyBlock, Size>;
  items: Placed[];
}

const kidSizes = (b: AnyBlock, ctx: Ctx) => b.children.map((c) => size(c, ctx));

function size(b: AnyBlock, ctx: Ctx): Size {
  let s = ctx.sizes.get(b);
  if (!s) {
    s = b.def.arrange ? b.def.arrange(b, kidSizes(b, ctx), ctx).size : (b.def.size?.(b) ?? { w: 0, h: 0 });
    ctx.sizes.set(b, s);
  }
  return s;
}

function place(b: AnyBlock, rect: Rect, parent: Placed | undefined, ctx: Ctx) {
  const it: Placed = { ...b, rect, parent, parts: b.def.parts?.(b, rect) ?? [] };
  ctx.items.push(it);
  if (!b.def.arrange) return;
  const { rects } = b.def.arrange(b, kidSizes(b, ctx), ctx, rect);
  b.children.forEach((c, i) => place(c, { ...rects[i], x: rect.x + rects[i].x, y: rect.y + rects[i].y }, it, ctx));
}

const boxOf = (it: Placed): Box => ({
  id: it.id,
  kind: it.def.kind,
  rect: it.rect,
  parent: it.parent?.id,
  shape: it.def.outline?.(it.data),
  solid: it.def.solid,
  obstacle: it.def.obstacle,
  invisible: !it.def.paint && (!!it.def.arrange || it.rect.w > 0 || it.rect.h > 0),
});
const partBox = (it: Placed, part: Part): Box => ({ id: part.id, kind: `${it.def.kind}-part`, rect: part.rect, parent: it.id });

/** Let a container restyle the edges between its own children. */
function connectEdges(root: AnyBlock, edges: EdgeSpec[], rects: Record<string, Rect>): EdgeSpec[] {
  const owner = new Map<string, AnyBlock>();
  const walk = (b: AnyBlock) => {
    if (b.def.connect) for (const c of b.children) for (const id of idsUnder(c, new Set(), false)) owner.set(id, b);
    b.children.forEach(walk);
  };
  walk(root);
  return edges.map((e) => {
    const o = owner.get(e.from);
    return o?.def.connect && o === owner.get(e.to) ? o.def.connect(o, e, rects) : e;
  });
}

/**
 * Arcs, loops and same-side curves bow past the items, loop labels sit beyond them, and a `Canvas` child may sit at a
 * negative offset (a label left of a plot); keep every item, path and pill in the viewBox. Moves the boxes if it must,
 * and returns the frame size and the final routes.
 */
function growToFit(boxes: Box[], edges: EdgeSpec[], content: Size) {
  let minX = MARGIN, minY = MARGIN, maxX = content.w + MARGIN, maxY = content.h + MARGIN;
  const extend = (x0: number, y0: number, x1: number, y1: number) => {
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  };
  for (const { rect: r } of boxes) extend(r.x, r.y, r.x + r.w, r.y + r.h);
  let routes = routeItems(boxes, edges);
  for (const r of routes) {
    for (const p of r.pts) extend(p.x - 4, p.y - 4, p.x + 4, p.y + 4);
    if (r.label && r.spec.label) {
      const hw = labelPillW(r.spec.label) / 2, hh = EDGE_LABEL.h / 2;
      extend(r.label.x - hw, r.label.y - hh, r.label.x + hw, r.label.y + hh);
    }
  }
  const dx = Math.max(0, MARGIN - minX), dy = Math.max(0, MARGIN - minY);
  if (dx > 0 || dy > 0) {
    for (const { rect } of boxes) {
      rect.x += dx;
      rect.y += dy;
    }
    routes = routeItems(boxes, edges);
  }
  return { w: maxX + dx + MARGIN, h: maxY + dy + MARGIN, routes };
}

/** `uid` prefixes the clip and pattern ids the ops refer to. */
export function layoutScene(scene: Scene, uid = "fig"): Frame {
  const ctx: Ctx = { edges: scene.edges, sizes: new Map(), items: [] };
  const s = size(scene.root, ctx);
  place(scene.root, { x: MARGIN, y: MARGIN, w: s.w, h: s.h }, undefined, ctx);
  const boxes = ctx.items.flatMap((it) => [boxOf(it), ...it.parts.map((p) => partBox(it, p))]);
  const rects = Object.fromEntries(boxes.map((b) => [b.id, b.rect]));
  const fit = growToFit(boxes, connectEdges(scene.root, scene.edges, rects), s);

  /** The fill of the nearest panel around an item, if any. */
  const ground = (it: Placed): "panel" | "surface" | undefined => {
    for (let p = it.parent; p; p = p.parent) {
      if (p.def.panel?.(p.data)) return ground(p) === "panel" ? "surface" : "panel";
    }
    return undefined;
  };
  const ops = [...ctx.items.flatMap((it) => it.def.paint?.(it, { uid, ground }) ?? []), ...fit.routes.map(edgeOp)];
  const frame: Frame = { ...fit, ops, boxes, diagnostics: scene.diagnostics };
  frame.diagnostics = [...scene.diagnostics, ...lint(frame, ctx.items)];
  return frame;
}
