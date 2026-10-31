/** What the engine found wrong with a figure. Data, so scripts and agents can read it; `Diagram` decides what to do with it. */
export type DiagnosticCode =
  | "edge/unknown-endpoint"
  | "edge/point-outside-canvas"
  | "edge/invisible-endpoint"
  | "edge/crosses-shape"
  | "edge/label-overlap"
  | "overlay/overlap"
  | "id/duplicate"
  | "prop/invalid"
  | "prop/ignored"
  | "frame/too-wide"
  | "node/title-overflow"
  | "siblings/overlap";

export interface Diagnostic {
  code: DiagnosticCode;
  severity: "error" | "warn";
  message: string;
  hint?: string;
}

const distance = (a: string, b: string) => {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
};

/** The closest known name, if any is close enough to be a typo; otherwise the names to choose from. */
export function suggest(name: string, known: Iterable<string>): string {
  const all = [...known];
  const best = all.reduce<string | undefined>((b, k) => (b === undefined || distance(name, k) < distance(name, b) ? k : b), undefined);
  if (best !== undefined && distance(name, best) <= Math.max(2, name.length / 3)) return `Did you mean "${best}"?`;
  return `Known: ${all.slice(0, 16).join(", ")}${all.length > 16 ? ", ..." : ""}.`;
}

export const formatDiagnostic = (d: Diagnostic, figure?: string) =>
  `[figure${figure ? ` "${figure}"` : ""}] ${d.code}: ${d.message}${d.hint ? ` ${d.hint}` : ""}`;
