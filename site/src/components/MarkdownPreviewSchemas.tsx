import { Diagram, Edge, Graph, Group, Text } from "figure";

/** The encoded tag survives as text until later parsers turn it into active HTML. */
export function MarkdownPreviewPipelineSchema() {
  return (
    <Diagram caption="The sanitizer inspects text. The final HTML parse creates the event handler.">
      <Graph dir="down" rankGap={44}>
        <Group id="sanitized" title="1. DOMPurify output" gap={8} pad={16}>
          <Text text={"&lt;img src=x onerror='run()'&gt;"} mono size="note" />
          <Text text="Text only: no img element exists." size="note" muted />
        </Group>
        <Group id="attribute" title="2. HTML attribute parse" gap={8} pad={16}>
          <Text text="<img src=x onerror='run()'>" mono size="note" />
          <Text text="getAttribute reads this decoded string." size="note" muted />
        </Group>
        <Group id="converted" title="3. Showdown output" gap={8} pad={16}>
          <Text text="<img src=x onerror='run()'>" mono size="note" />
          <Text text="Raw HTML passes through." size="note" muted />
        </Group>
        <Group id="live" title="4. innerHTML: live DOM" tone="red" state="strong" gap={8} pad={16}>
          <Text text="img element + onerror handler" mono size="note" tone="red" />
          <Text text="Image failure runs the handler." size="note" tone="red" />
        </Group>
      </Graph>
      <Edge from="sanitized" to="attribute" label="entities decode" />
      <Edge from="attribute" to="converted" label="makeHtml" />
      <Edge from="converted" to="live" label="no sanitizer" tone="red" />
    </Diagram>
  );
}
