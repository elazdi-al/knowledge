import { Col, Diagram, Dots, Edge, Grid, Node, Row, Space, Text } from "@/components/figure";

export interface SortRun {
  /** Stable id, referenced by the next pass's `from` lists. */
  id: string;
  /**
   * Relative width of this run (its share of the file, e.g. number of pages or
   * runs merged). Defaults to 1. Runs in a pass are scaled to fill the row, so
   * absolute values do not matter — only ratios within and across passes.
   */
  span?: number;
  /** Centred label inside the run, e.g. "1 sorted file". Kept short. */
  label?: string;
  /** ids of runs in the pass above that merge into this run. */
  from?: string[];
  /**
   * Visual state. `final` = inverted highlight box (the fully-sorted result),
   * `emphasis` = heavier outline, `new` = dashed outline. Default `normal`.
   */
  state?: "normal" | "final" | "emphasis" | "new";
}

export interface SortPass {
  /** Bold row heading at the left margin, e.g. "Pass 0" or "Final". */
  label?: string;
  /** Muted note for the row, drawn in the right gutter beside the runs. */
  note?: string;
  /** Right-gutter annotation for the row, e.g. cost or run count. */
  annotation?: string;
  /** The runs produced by this pass, left to right. */
  runs: SortRun[];
  /** Append a muted drawn ellipsis after the row's runs ("more runs"). */
  ellipsis?: boolean;
}

interface Props {
  /** Passes top to bottom; pass 0 first, the final merged run last. */
  passes: SortPass[];
  /** Bold heading inside the card (e.g. "External merge sort"). */
  title?: string;
  caption?: string;
  className?: string;
}

const STATE = { normal: undefined, final: "strong", emphasis: "strong", new: "placeholder" } as const;
/** Every pass row spans this width; runs share it by `span`, so run widths show the merge. */
const ROW_W = 380;
const RUN_GAP = 8;

/** Long gutter notes break at the space nearest their middle, so the gutter stays narrow. */
const lines = (s: string) => {
  const cut = s.length > 24 ? [...s.matchAll(/ /g)].map((m) => m.index).sort((a, b) => Math.abs(a - s.length / 2) - Math.abs(b - s.length / 2))[0] : undefined;
  return cut === undefined ? [s] : [s.slice(0, cut), s.slice(cut + 1)];
};

/** Passes top to bottom: each row is the file's runs after that pass, with arrows from the runs merged into each new run. */
export function SortPasses({ passes, title, caption, className }: Props) {
  const gutter = passes.some((p) => p.note || p.annotation);
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Grid cols={gutter ? 3 : 2} colGap={20} rowGap={40} align="center">
        {passes.flatMap((p, k) => {
          const total = p.runs.reduce((a, r) => a + (r.span ?? 1), 0);
          const notes = [...(p.note ? lines(p.note) : []), ...(p.annotation ? [p.annotation] : [])];
          return [
            p.label ? <Text key={`l${k}`} text={p.label} weight={600} /> : <Space key={`l${k}`} />,
            <Row key={`r${k}`} gap={RUN_GAP}>
              {p.runs.map((r) => (
                <Node key={r.id} id={r.id} title={r.label} w={(ROW_W * (r.span ?? 1)) / total - RUN_GAP} state={STATE[r.state ?? "normal"]} />
              ))}
              {p.ellipsis && <Dots />}
            </Row>,
            gutter && (
              <Col key={`n${k}`} gap={2} align="start">
                {notes.map((n, i) => (
                  <Text key={i} text={n} size="note" muted />
                ))}
              </Col>
            ),
          ];
        })}
      </Grid>
      {passes.flatMap((p) => p.runs.flatMap((r) => (r.from ?? []).map((f) => <Edge key={`${f}>${r.id}`} from={f} to={r.id} route="straight" />)))}
    </Diagram>
  );
}
