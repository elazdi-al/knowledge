import { Cells, Col, Diagram, Dot, Dots, Edge, Free, Group, Node, Path, Row, Space, Text } from "@/components/figure";
import { At, Axes, plotArea, type Anchor, type Pt } from "@/components/PlotFigures";

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
    <Diagram caption="Only $A$ and $B$ cross the network. Both sides compute the same secret $s$; $a$ and $b$ remain private.">
      <Col gap={24}>
        <Text text="Public parameters: $p, g$" size="note" muted />
        <Free>
          <Node id="alice" title="Alice" sub="Private exponent $a$" w={126} x={0} y={0} />
          <Node id="bob" title="Bob" sub="Private exponent $b$" w={126} x={180} y={0} />
          <Node id="alice-secret" title="$s = B^a \bmod p$" tone="blue" w={126} x={0} y={172} />
          <Node id="bob-secret" title="$s = A^b \bmod p$" tone="blue" w={126} x={180} y={172} />
          <Space id="alice-send" x={63} y={86} />
          <Space id="bob-receive" x={243} y={86} />
          <Space id="bob-send" x={243} y={132} />
          <Space id="alice-receive" x={63} y={132} />
          <Edge from="alice" to="alice-secret" head="none" dashed route="straight" />
          <Edge from="bob" to="bob-secret" head="none" dashed route="straight" />
          <Edge from="alice-send" to="bob-receive" label="$A = g^a \bmod p$" route="straight" />
          <Edge from="bob-send" to="alice-receive" label="$B = g^b \bmod p$" route="straight" />
        </Free>
      </Col>
    </Diagram>
  );
}

/** ECB encrypts each block alone, so equal plaintext blocks (blue) give equal ciphertext blocks. */
export function EcbLeakSchema() {
  const w = 96, gap = 12, cols = [0, w + gap, 2 * (w + gap)];
  const block = (id: string, title: string, x: number, y: number, tone?: "blue") => (
    <Node id={id} title={title} mono w={w} x={x} y={y} tone={tone} />
  );
  return (
    <Diagram caption="Each 16-byte block is encrypted on its own, so the two equal plaintext blocks (blue) give the same ciphertext block. ECB leaks wherever the plaintext repeats.">
      <Free>
        <Text text="Plaintext blocks" size="note" muted x={0} y={0} />
        {block("p0", "the lazy", cols[0], 20, "blue")}
        {block("p1", "the lazy", cols[1], 20, "blue")}
        {block("p2", "ps over", cols[2], 20)}
        <Text text="Ciphertext blocks" size="note" muted x={0} y={190} />
        {block("c0", "c7 5b e6", cols[0], 150, "blue")}
        {block("c1", "c7 5b e6", cols[1], 150, "blue")}
        {block("c2", "c6 38 2c", cols[2], 150)}
        <Edge from="p0" to="c0" route="straight" />
        <Edge from="p1" to="c1" label="$E_k$" route="straight" />
        <Edge from="p2" to="c2" route="straight" />
      </Free>
    </Diagram>
  );
}

/** CBC: each plaintext block is XORed with the previous ciphertext block, then encrypted; the IV seeds the first. */
export function CbcModeSchema() {
  const box = (id: string, title: string, cx: number, y: number, tone?: "blue") => (
    <Node id={id} title={title} w={58} x={cx - 29} y={y} tone={tone} />
  );
  const xor = (id: string, cx: number, y: number) => <Node id={id} title="+" shape="circle" w={28} x={cx - 14} y={y} />;
  const c1 = 150, c2 = 330, yP = 0, yX = 72, yE = 132, yC = 208;
  return (
    <Diagram caption="Each plaintext block is XORed with the previous ciphertext block before AES encrypts it; the IV seeds the first. Equal plaintext blocks no longer collide.">
      <Free>
        {box("p1", "$P_1$", c1, yP)}
        {box("p2", "$P_2$", c2, yP)}
        <Node id="iv" title="IV" w={42} x={0} y={yX} />
        {xor("x1", c1, yX)}
        {xor("x2", c2, yX)}
        {box("e1", "$E_k$", c1, yE)}
        {box("e2", "$E_k$", c2, yE)}
        {box("c1", "$C_1$", c1, yC, "blue")}
        {box("c2", "$C_2$", c2, yC, "blue")}
        <Edge from="p1" to="x1" route="straight" />
        <Edge from="p2" to="x2" route="straight" />
        <Edge from="iv" to="x1" toSide="left" />
        <Edge from="x1" to="e1" route="straight" />
        <Edge from="x2" to="e2" route="straight" />
        <Edge from="e1" to="c1" route="straight" />
        <Edge from="e2" to="c2" route="straight" />
        <Edge from="c1" to="x2" fromSide="right" toSide="left" route="ortho" />
      </Free>
    </Diagram>
  );
}

/** CTR: AES encrypts a counter into a keystream block, XORed with the plaintext. A stream cipher built from a block cipher. */
export function CtrModeSchema() {
  const box = (id: string, title: string, cx: number, y: number, w = 56, tone?: "blue") => (
    <Node id={id} title={title} w={w} x={cx - w / 2} y={y} tone={tone} />
  );
  const xor = (id: string, cx: number, y: number) => <Node id={id} title="+" shape="circle" w={28} x={cx - 14} y={y} />;
  const c1 = 170, c2 = 350, yT = 0, yE = 68, yX = 138, yC = 206;
  return (
    <Diagram caption="AES encrypts a counter, started from the nonce, into a keystream block that is XORed with the plaintext. No padding, and encryption equals decryption. A reused nonce repeats the keystream, the two-time pad again.">
      <Free>
        {box("t1", "ctr 0", c1, yT)}
        {box("t2", "ctr 1", c2, yT)}
        {box("e1", "$E_k$", c1, yE)}
        {box("e2", "$E_k$", c2, yE)}
        {xor("x1", c1, yX)}
        {xor("x2", c2, yX)}
        {box("pp1", "$P_1$", 60, yX)}
        {box("pp2", "$P_2$", 240, yX)}
        {box("cc1", "$C_1$", c1, yC, 56, "blue")}
        {box("cc2", "$C_2$", c2, yC, 56, "blue")}
        <Edge from="t1" to="e1" route="straight" />
        <Edge from="t2" to="e2" route="straight" />
        <Edge from="e1" to="x1" route="straight" label="keystream" />
        <Edge from="e2" to="x2" route="straight" />
        <Edge from="pp1" to="x1" toSide="left" />
        <Edge from="pp2" to="x2" toSide="left" />
        <Edge from="x1" to="cc1" route="straight" />
        <Edge from="x2" to="cc2" route="straight" />
      </Free>
    </Diagram>
  );
}

/** y² = x³ - 3x + 3 over the reals, the picture behind the point-addition formulas. */
const ecY = (x: number) => Math.sqrt(Math.max(0, x ** 3 - 3 * x + 3));
const EC_ROOT = -2.1038; // where the curve crosses the x-axis
const EC_END = 2.55;

/** P + Q by the formulas of the note; a tangent when P = Q. */
function ecAdd([x1, y1]: Pt, [x2, y2]: Pt): Pt {
  const m = x1 === x2 ? (3 * x1 * x1 - 3) / (2 * y1) : (y2 - y1) / (x2 - x1);
  const x3 = m * m - x1 - x2;
  return [x3, m * (x1 - x3) - y1];
}

type Labelled = { text: string; anchor: Anchor; gap?: number };

function EcPanel({ title, P, Q, labels }: { title: string; P: Pt; Q: Pt; labels: [Labelled, Labelled | null, Labelled, Labelled] }) {
  const a = plotArea({ x: [-2.7, 2.95], y: [-3.7, 3.7], w: 270, h: 300, at: [0, 30] });
  const xs = Array.from({ length: 121 }, (_, i) => EC_ROOT + (EC_END - EC_ROOT) * (i / 120) ** 2);
  const curve = [...xs.map((x) => a.p([x, -ecY(x)])).reverse(), ...xs.map((x) => a.p([x, ecY(x)]))];
  const sum = ecAdd(P, Q);
  const third: Pt = [sum[0], -sum[1]];
  const along = (t: number): Pt => [P[0] + t * (third[0] - P[0]), P[1] + t * (third[1] - P[1])];
  const points: [Pt, Labelled | null][] = [[P, labels[0]], [Q, labels[1]], [third, labels[2]], [sum, labels[3]]];
  return (
    <Free>
      <Text text={title} size="note" muted x={0} y={0} />
      <Axes area={a} x={[-2.7, 2.95]} y={[-3.7, 3.7]} labels={["$x$", "$y$"]} />
      <Path points={curve} state="strong" />
      <Path points={[a.p(along(-0.22)), a.p(along(1.12))]} />
      <Path points={[a.p(third), a.p(sum)]} dashed />
      {points.map(([p], i) => <Dot key={i} at={a.p(p)} state={i === 3 ? "active" : undefined} />)}
      {points.map(([p, label], i) => label && <At key={`l${i}`} text={label.text} at={a.p(p)} anchor={label.anchor} gap={label.gap ?? 7} tone={i === 3 ? "blue" : undefined} />)}
    </Free>
  );
}

/** Point addition on y² = x³ - 3x + 3: the chord rule, and the tangent rule for doubling. */
export function EllipticCurveSchema() {
  const P: Pt = [-2, -ecY(-2)];
  const Q: Pt = [0.6, ecY(0.6)];
  const D: Pt = [1.6, ecY(1.6)];
  const chord = (
    <EcPanel
      title="Addition: $P + Q$"
      P={P}
      Q={Q}
      labels={[
        { text: "$P$", anchor: "e" },
        { text: "$Q$", anchor: "s" },
        { text: "$-(P + Q)$", anchor: "se" },
        { text: "$P + Q$", anchor: "e", gap: 11 },
      ]}
    />
  );
  const tangent = (
    <EcPanel
      title="Doubling: $P + P$"
      P={D}
      Q={D}
      labels={[
        { text: "$P$", anchor: "nw" },
        null,
        { text: "$-2P$", anchor: "nw", gap: 3 },
        { text: "$2P$", anchor: "s" },
      ]}
    />
  );
  return (
    <Diagram
      caption="The line through $P$ and $Q$ meets the curve a third time; reflecting that point across the x-axis gives $P + Q$. For $P + P$, the line is the tangent at $P$."
      narrowChildren={<Col gap={28}>{chord}{tangent}</Col>}
    >
      <Row gap={48} align="start">{chord}{tangent}</Row>
    </Diagram>
  );
}
