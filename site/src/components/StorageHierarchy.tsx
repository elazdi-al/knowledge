import { Diagram, Edge, Group, Node, Row, Text } from "@/components/figure";

export interface StorageItem {
  /** Box label, e.g. "File A", "Page 0", "id". */
  label: string;
  /** Visual state. `emphasis` = heavier outline, `new` = dashed outline,
   *  `highlight` = inverted box (ink fill, light text). */
  state?: "normal" | "emphasis" | "new" | "highlight";
}

export interface StorageStage {
  /** Bold heading centred above the stage box. */
  title: string;
  /** Inner element boxes, top to bottom (or left to right when layout="row"). */
  items: Array<StorageItem | string>;
  /** "stack" (default) lays items in a vertical column; "row" lays them
   *  horizontally, as the Record stage does with its fields. */
  layout?: "stack" | "row";
  /** Small muted note centred beneath the items, e.g. "Fields". */
  note?: string;
}

interface Props {
  /** The stage chain, left to right. Consecutive stages are joined by arrows. */
  stages: StorageStage[];
  /** Bold heading inside the card (e.g. a figure label). */
  title?: string;
  caption?: string;
  className?: string;
}

const STATE = { normal: undefined, emphasis: "strong", new: "active", highlight: "strong" } as const;

const item = (it: StorageItem | string, i: number) => {
  const { label, state = "normal" } = typeof it === "string" ? { label: it } : it;
  return <Node key={i} title={label} state={STATE[state]} />;
};

export function StorageHierarchy({ stages, title, caption, className }: Props) {
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Row gap={32}>
        {stages.map((s, i) => (
          <Group key={i} id={`s${i}`} title={s.title} gap={8} pad={10} align="stretch">
            {s.layout === "row" ? <Row gap={6}>{s.items.map(item)}</Row> : s.items.map(item)}
            {s.note && <Text text={s.note} size="note" muted />}
          </Group>
        ))}
      </Row>
      {stages.slice(1).map((_, i) => (
        <Edge key={i} from={`s${i}`} to={`s${i + 1}`} />
      ))}
    </Diagram>
  );
}
