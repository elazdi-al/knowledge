import { Diagram, Group, Node } from "@/components/figure";

interface Props {
  title?: string;
  caption?: string;
  className?: string;
}

export function LanguageClasses({ title, caption, className }: Props) {
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Group title="All languages" dashed dir="row" gap={20}>
        <Group title="Recognizable">
          <Group title="Decidable">
            <Node title="Regular" />
          </Group>
        </Group>
        <Node title="Not recognizable" state="placeholder" />
      </Group>
    </Diagram>
  );
}
