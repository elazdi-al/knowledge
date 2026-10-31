/** What can be wrong with a laid-out figure even though it compiled. */
import { formatDiagnostic, type Diagnostic } from "./diagnostics";
import type { Frame, Placed, Rect } from "./model";
import { encloses, insideOutline, labelPillW, samplePath } from "./route";
import { EDGE_LABEL, MAX_CONTENT_W } from "./theme";

const overlaps = (a: Rect, b: Rect, slack = 0.5) => a.x + a.w > b.x + slack && b.x + b.w > a.x + slack && a.y + a.h > b.y + slack && b.y + b.h > a.y + slack;

export function lint(frame: Frame, items: Placed[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  const warn = (code: Diagnostic["code"], message: string, hint?: string) => out.push({ code, severity: "warn", message, hint });
  if (frame.w > MAX_CONTENT_W) warn("frame/too-wide", `Frame is ${Math.round(frame.w)}px wide (max ${MAX_CONTENT_W}).`, "Stack or wrap.");

  for (const parent of items) {
    if (parent.def.overlapping) continue;
    const sibs = items.filter((it) => it.parent === parent);
    for (let i = 0; i < sibs.length; i++)
      for (let j = i + 1; j < sibs.length; j++)
        if (overlaps(sibs[i].rect, sibs[j].rect)) warn("siblings/overlap", `Siblings "${sibs[i].id}" and "${sibs[j].id}" overlap.`);
  }
  for (const it of items) out.push(...(it.def.check?.(it) ?? []));

  const byId = new Map(frame.boxes.map((b) => [b.id, b]));
  // a line must end on something drawn: layout boxes are invisible, and a sized Space is empty room
  for (const { spec: e } of frame.routes) {
    for (const id of [e.from, e.to]) {
      const it = byId.get(id);
      if (it?.invisible) warn("edge/invisible-endpoint", `Edge ${e.id} ends on invisible ${it.kind} "${id}".`, "Attach it to the shape inside.");
    }
  }
  const solids = frame.boxes.filter((b) => b.solid);
  const obstacles = frame.boxes.filter((b) => b.obstacle);
  const routes = frame.routes;
  const pillOf = (r: (typeof routes)[number]) => {
    const lw = labelPillW(r.spec.label ?? "");
    return { x: r.label!.x - lw / 2, y: r.label!.y - EDGE_LABEL.h / 2, w: lw, h: EDGE_LABEL.h };
  };
  for (const r of routes) {
    const a = byId.get(r.spec.from)!.rect, b = byId.get(r.spec.to)!.rect;
    const owner = (id: string) => byId.get(id)?.parent;
    const along = samplePath(r.pts);
    for (const it of obstacles) {
      if (it.id === r.spec.from || it.id === r.spec.to || it.id === owner(r.spec.from) || it.id === owner(r.spec.to)) continue;
      if (encloses(it.rect, a) || encloses(it.rect, b)) continue;
      if (along.some((p) => insideOutline(it.shape, it.rect, p))) warn("edge/crosses-shape", `Edge ${r.spec.id} crosses "${it.id}".`, "Add a bend, set sides, or move the item.");
    }
    if (!r.label) continue;
    // a pill over its own endpoint means layout reserved no room for the label; only shared ancestors are exempt
    const lr = pillOf(r);
    for (const it of solids) {
      if (encloses(it.rect, a) && encloses(it.rect, b) && it.id !== r.spec.from && it.id !== r.spec.to) continue;
      if (overlaps(lr, it.rect)) warn("edge/label-overlap", `Label "${r.spec.label}" on edge ${r.spec.id} overlaps "${it.id}".`);
    }
  }
  const labelled = routes.filter((r) => r.label);
  for (let i = 0; i < labelled.length; i++)
    for (let j = i + 1; j < labelled.length; j++)
      if (overlaps(pillOf(labelled[i]), pillOf(labelled[j]))) warn("edge/label-overlap", `Labels on edges ${labelled[i].spec.id} and ${labelled[j].spec.id} overlap.`);
  return out;
}

/** Throws on errors, prints warnings in development. */
export function reportDiagnostics(frame: Frame, figure: string) {
  const errors = frame.diagnostics.filter((d) => d.severity === "error");
  if (errors.length) throw new Error(errors.map((d) => formatDiagnostic(d, figure)).join("\n"));
  if (process.env.NODE_ENV === "production") return;
  for (const d of frame.diagnostics) console.warn(formatDiagnostic(d, figure));
}
