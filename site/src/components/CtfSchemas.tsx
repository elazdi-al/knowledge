import { Cells, Col, Diagram, Dots, Edge, Free, Group, Node, Row, Space, Text } from "@/components/figure";

/** Byte order changes; the value and the identity of its low byte do not. */
export function EndiannessSchema() {
  const order = (bytes: string[]) => bytes.map((label) => ({ label, tone: label === "78" ? "blue" as const : undefined }));
  return (
    <Diagram caption="One cell is one byte. Addresses increase to the right; 78 is the least significant byte.">
      <Col gap={16}>
        <Text text="0x12345678" mono size="title" />
        <Free>
          <Text text="Address" size="note" muted x={0} y={0} />
          {["+0", "+1", "+2", "+3"].map((label, i) => <Text key={label} text={label} mono muted size="note" x={130 + 40 * i} y={0} />)}
          <Text text="Little-endian" x={0} y={35} />
          <Cells items={order(["78", "56", "34", "12"])} cell={40} x={120} y={24} />
          <Text text="Big-endian" x={0} y={83} />
          <Cells items={order(["12", "34", "56", "78"])} cell={40} x={120} y={72} />
        </Free>
      </Col>
    </Diagram>
  );
}

/** One address space, with its stack expanded beside it (below it on mobile). */
export function ProgramMemorySchema() {
  const overview = (
    <Col gap={14}>
          <Text text="Process address space" size="title" weight={500} />
          <Col gap={6}>
            <Text text="Higher addresses" size="note" muted />
            <Node id="stack-region" title="Stack" sub="Calls and local variables" tone="blue" w={234} />
            <Dots />
            <Node title="mmap" sub="Libraries and other mappings" w={234} />
            <Dots />
            <Node title="Heap" sub="Dynamic allocations" w={234} />
            <Node title=".bss · zero-initialized globals" w={234} />
            <Node title=".data · initialized globals" w={234} />
            <Node title=".rodata · constants" w={234} />
            <Node title=".text · instructions" tone="purple" w={234} />
            <Text text="Lower addresses" size="note" muted />
          </Col>
        </Col>
  );
  const detail = (
    <Col gap={14}>
          <Text id="stack-detail" text="Inside the stack" size="title" weight={500} />
          <Free>
            <Text text="Caller frames" size="note" muted x={112} y={0} />
            <Node id="return" title="Return address" sub="8 bytes" tone="purple" w={172} h={46} x={78} y={28} />
            <Node id="saved" title="Saved rbp" sub="8 bytes" w={172} h={46} x={78} y={78} />
            <Group id="buffer" tone="blue" pad={10} x={78} y={128}>
              <Free>
                <Space w={152} h={96} />
                <Text text="buf[31]" mono size="note" x={52} y={0} />
                <Text text="32-byte buffer" tone="blue" weight={500} x={33} y={40} />
                <Text text="buf[0]" mono size="note" x={55} y={80} />
              </Free>
            </Group>
            <Text text="rbp + 8" mono size="note" x={0} y={42} />
            <Text text="rbp" mono size="note" x={28} y={92} />
            <Text text="rsp" mono size="note" x={28} y={220} />
            <Space id="rp" x={58} y={51} />
            <Space id="bp" x={58} y={101} />
            <Space id="sp" x={58} y={228} />
            <Space id="start" x={78} y={228} />
            <Edge from="rp" to="return" head="none" route="straight" toSide="left" />
            <Edge from="bp" to="saved" head="none" route="straight" toSide="left" />
            <Edge from="sp" to="start" head="none" route="straight" />
            <Space id="write-start" x={266} y={228} />
            <Space id="write-end" x={266} y={42} />
            <Edge from="write-start" to="write-end" tone="red" route="straight" />
            <Text text="Write" tone="red" size="note" x={278} y={174} />
            <Space id="grow-start" x={164} y={254} />
            <Space id="grow-end" x={164} y={292} />
            <Edge from="grow-start" to="grow-end" tone="blue" route="straight" />
            <Text text="Stack grows down" size="note" muted x={115} y={304} />
            <Text text="Return offset: 32 + 8 = 40 bytes" size="note" x={78} y={346} />
          </Free>
        </Col>
  );
  return (
    <Diagram
      caption="Linux x86-64 user space, schematic. Stack detail: one frame with a 32-byte buffer, saved rbp, and no canary or padding. Both views run from higher to lower addresses."
      narrowChildren={<Col gap={32}>{overview}{detail}</Col>}
    >
      <Row gap={44} align="start">{overview}{detail}</Row>
      <Edge from="stack-region" to="stack-detail" dashed head="none" route="auto" />
    </Diagram>
  );
}

export function DiffieHellmanSchema() {
  return (
    <Diagram caption="Only A and B cross the network. Both sides compute the same secret s; a and b remain private.">
      <Col gap={24}>
        <Text text="Public parameters: p, g" size="note" muted />
        <Free>
          <Node id="alice" title="Alice" sub="Private exponent a" w={126} x={0} y={0} />
          <Node id="bob" title="Bob" sub="Private exponent b" w={126} x={180} y={0} />
          <Node id="alice-secret" title="s = Bᵃ mod p" tone="blue" w={126} x={0} y={172} />
          <Node id="bob-secret" title="s = Aᵇ mod p" tone="blue" w={126} x={180} y={172} />
          <Space id="alice-send" x={63} y={86} />
          <Space id="bob-receive" x={243} y={86} />
          <Space id="bob-send" x={243} y={132} />
          <Space id="alice-receive" x={63} y={132} />
          <Edge from="alice" to="alice-secret" head="none" dashed route="straight" />
          <Edge from="bob" to="bob-secret" head="none" dashed route="straight" />
          <Edge from="alice-send" to="bob-receive" label="A = gᵃ mod p" route="straight" />
          <Edge from="bob-send" to="alice-receive" label="B = gᵇ mod p" route="straight" />
        </Free>
      </Col>
    </Diagram>
  );
}
