import { ANCHORS, Canvas, Cells, Col, Diagram, Dot, Edge, LINE_H, mark, Node, Path, Row, solid, STATES, Svg, Text, TONES, V, type Anchor, type Common, type Point, type Tone } from "figure";

const LABEL_H = LINE_H.label;
/** Room for a readable arrow between two marks. */
const ARROW = 28;

/* ---------- XOR ---------- */

const XOR_D = 20;
/** The textbook XOR: a circle with a cross touching its rim. Edges meet its outline. */
const Xor = mark<Common, null>({
  kind: "xor",
  solid: true,
  obstacle: true,
  props: { id: true, state: STATES, tone: TONES, at: true, anchor: ANCHORS, offset: "number" },
  data: () => null,
  outline: () => "circle",
  size: () => ({ w: XOR_D, h: XOR_D }),
  paint({ rect: r, tone }) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rad = r.w / 2 - 0.75;
    const style = { fill: "none", stroke: tone ? solid(tone) : V("text"), strokeWidth: 1.5 };
    return [
      { el: "circle", cx, cy, r: rad, style: { ...style, fill: V("canvas") } },
      { el: "line", x1: cx - rad, x2: cx + rad, y1: cy, y2: cy, style },
      { el: "line", x1: cx, x2: cx, y1: cy - rad, y2: cy + rad, style },
    ];
  },
});

/* ---------- the mode family: one cipher box, one XOR, one arrow, one label ---------- */

const BOX_W = 64;
const BOX_H = 34;
/** Distance between the centres of two block columns. */
const PITCH = 160;
const DOT_R = 3;

/** Centre y of each item in a column, top to bottom, `ARROW` apart plus `extra[k]` after item k. */
function column(top: number, heights: number[], extra: number[] = []): number[] {
  let y = top;
  return heights.map((h, k) => {
    const c = y + h / 2;
    y += h + ARROW + (extra[k] ?? 0);
    return c;
  });
}
/** Extra length for an arrow that carries a label or a tap beside it. */
const ROOM = 14;
const IV = "$IV$";

const cipher = (id: string, x: number, y: number, inverse = false) => <Node key={id} id={id} title={inverse ? "$D_K$" : "$E_K$"} w={BOX_W} h={BOX_H} at={[x, y]} />;
const xor = (id: string, x: number, y: number) => <Xor key={id} id={id} at={[x, y]} />;
const value = (id: string, text: string, at: Point, anchor: Anchor = "c", tone?: Tone) => <Text key={id} id={id} text={text} at={at} anchor={anchor} tone={tone} />;
const arrow = (from: string | Point, to: string | Point, tone?: Tone, via?: Point[]) => (
  <Edge key={`${String(from)}>${String(to)}`} from={from} to={to} via={via} route="straight" tone={tone} />
);
const junction = (key: string, at: Point, tone?: Tone) => <Dot key={key} at={at} r={DOT_R} tone={tone} />;
/** A value from column i taken at `from`, carried right then vertically to `y`, and into `to` from the left. */
const feed = (from: Point, y: number, to: string, tone: Tone) => [junction(`dot${from}`, from, tone), arrow(from, to, tone, [[from[0] + PITCH / 2, from[1]], [from[0] + PITCH / 2, y]])];
/** An input entering a mark from the left, its label `ARROW` away. */
const fromLeft = (id: string, text: string, x: number, y: number, to: string, tone?: Tone) => [value(id, text, [x - XOR_D / 2 - ARROW, y], "e", tone), arrow(id, to, tone)];

const BLOCKS = [1, 2, 3];
/** Centre x of block column i, with room on the left for an IV. */
const colX = (i: number) => 96 + (i - 1) * PITCH;
const sectionTitle = (text: string, y: number) => <Text key={text} text={text} weight={600} at={[0, y]} anchor="nw" />;

/** ECB: three independent columns. */
export function EcbSchema() {
  const [yP, yE, yC] = column(0, [LABEL_H, BOX_H, LABEL_H]);
  return (
    <Diagram caption="ECB encrypts each block on its own with the same key. Equal plaintext blocks give equal ciphertext blocks.">
      <Canvas>
        {BLOCKS.map((i) => [
          value(`p${i}`, `$P_${i}$`, [colX(i), yP]),
          cipher(`e${i}`, colX(i), yE),
          value(`c${i}`, `$C_${i}$`, [colX(i), yC]),
          arrow(`p${i}`, `e${i}`),
          arrow(`e${i}`, `c${i}`),
        ])}
      </Canvas>
    </Diagram>
  );
}

const CHAIN: Tone = "red";

/** CBC: encryption chains each ciphertext block into the next XOR; decryption XORs with the previous ciphertext block. */
export function CbcSchema() {
  const titleH = LABEL_H + 8;
  const [eP, eX, eE, eC] = column(titleH, [LABEL_H, XOR_D, BOX_H, LABEL_H], [0, 0, ROOM]);
  const decTop = eC + LABEL_H / 2 + 28;
  const [dC, dD, dX, dP] = column(decTop + titleH, [LABEL_H, BOX_H, XOR_D, LABEL_H], [ROOM]);
  const encTap = (eE + BOX_H / 2 + eC - LABEL_H / 2) / 2;
  const decTap = (dC + LABEL_H / 2 + dD - BOX_H / 2) / 2;
  return (
    <Diagram caption="CBC. Each ciphertext block is XORed into the next block, so encryption is sequential. Decryption needs only $C_i$ and $C_{i-1}$.">
      <Canvas>
        {sectionTitle("Encryption", 0)}
        {fromLeft("eiv", IV, colX(1), eX, "ex1", CHAIN)}
        {BLOCKS.map((i) => [
          value(`ep${i}`, `$P_${i}$`, [colX(i), eP]),
          xor(`ex${i}`, colX(i), eX),
          cipher(`ee${i}`, colX(i), eE),
          value(`ec${i}`, `$C_${i}$`, [colX(i), eC]),
          arrow(`ep${i}`, `ex${i}`),
          arrow(`ex${i}`, `ee${i}`),
          arrow(`ee${i}`, `ec${i}`, CHAIN),
          i < 3 && feed([colX(i), encTap], eX, `ex${i + 1}`, CHAIN),
        ])}
        {sectionTitle("Decryption", decTop)}
        {fromLeft("div", IV, colX(1), dX, "dx1", CHAIN)}
        {BLOCKS.map((i) => [
          value(`dc${i}`, `$C_${i}$`, [colX(i), dC]),
          cipher(`dd${i}`, colX(i), dD, true),
          xor(`dx${i}`, colX(i), dX),
          value(`dp${i}`, `$P_${i}$`, [colX(i), dP]),
          arrow(`dc${i}`, `dd${i}`, CHAIN),
          arrow(`dd${i}`, `dx${i}`),
          arrow(`dx${i}`, `dp${i}`),
          i < 3 && feed([colX(i), decTap], dX, `dx${i + 1}`, CHAIN),
        ])}
      </Canvas>
    </Diagram>
  );
}

/** CTR: each column encrypts its own counter block; nothing passes between columns. */
export function CtrSchema() {
  const [yN, yE, yX, yC] = column(0, [LABEL_H, BOX_H, XOR_D, LABEL_H], [0, ROOM]);
  const yZ = (yE + BOX_H / 2 + yX - XOR_D / 2) / 2;
  return (
    <Diagram caption="CTR. Each keystream block $Z_i$ is the encryption of its own counter block, so every block can be processed in parallel.">
      <Canvas>
        {BLOCKS.map((i) => [
          value(`n${i}`, `$\\text{nonce}\\parallel ${i}$`, [colX(i), yN]),
          cipher(`e${i}`, colX(i), yE),
          value(`z${i}`, `$Z_${i}$`, [colX(i) - 6, yZ], "e", CHAIN),
          xor(`x${i}`, colX(i), yX),
          fromLeft(`p${i}`, `$P_${i}$`, colX(i), yX, `x${i}`),
          value(`c${i}`, `$C_${i}$`, [colX(i), yC]),
          arrow(`n${i}`, `e${i}`),
          arrow(`e${i}`, `x${i}`, CHAIN),
          arrow(`x${i}`, `c${i}`),
        ])}
      </Canvas>
    </Diagram>
  );
}

/** OFB: the cipher output feeds the next cipher before it meets the plaintext. */
export function OfbSchema() {
  const [yE, yX, yC] = column(0, [BOX_H, XOR_D, LABEL_H], [2 * ROOM]);
  const tap = yX - XOR_D / 2 - 16;
  const yO = (yE + BOX_H / 2 + tap) / 2;
  return (
    <Diagram caption="OFB. The keystream feeds back from the cipher output, before the XOR, so it never depends on the plaintext or ciphertext.">
      <Canvas>
        {fromLeft("iv", IV, colX(1) - BOX_W / 2 + XOR_D / 2, yE, "e1", CHAIN)}
        {BLOCKS.map((i) => [
          cipher(`e${i}`, colX(i), yE),
          value(`o${i}`, `$O_${i}$`, [colX(i) - 6, yO], "e", CHAIN),
          xor(`x${i}`, colX(i), yX),
          fromLeft(`p${i}`, `$P_${i}$`, colX(i), yX, `x${i}`),
          value(`c${i}`, `$C_${i}$`, [colX(i), yC]),
          arrow(`e${i}`, `x${i}`, CHAIN),
          arrow(`x${i}`, `c${i}`),
          i < 3 && feed([colX(i), tap], yE, `e${i + 1}`, CHAIN),
        ])}
      </Canvas>
    </Diagram>
  );
}

/** CFB: the ciphertext, after the XOR, feeds the next cipher. */
export function CfbSchema() {
  const [yE, yX, yC] = column(0, [BOX_H, XOR_D, LABEL_H], [0, ROOM]);
  const tap = yX + XOR_D / 2 + 12;
  return (
    <Diagram caption="CFB. Each ciphertext block feeds back, after the XOR, into the next encryption. Compare OFB, which feeds back before the XOR.">
      <Canvas>
        {fromLeft("iv", IV, colX(1) - BOX_W / 2 + XOR_D / 2, yE, "e1", CHAIN)}
        {BLOCKS.map((i) => [
          cipher(`e${i}`, colX(i), yE),
          xor(`x${i}`, colX(i), yX),
          fromLeft(`p${i}`, `$P_${i}$`, colX(i), yX, `x${i}`),
          value(`c${i}`, `$C_${i}$`, [colX(i), yC]),
          arrow(`e${i}`, `x${i}`),
          arrow(`x${i}`, `c${i}`, CHAIN),
          i < 3 && feed([colX(i), tap], yE, `e${i + 1}`, CHAIN),
        ])}
      </Canvas>
    </Diagram>
  );
}

const AUTH: Tone = "blue";

/** GCM: CTR encryption on top, GHASH over A, the ciphertext and the lengths below, and the tag on the right. */
export function GcmSchema() {
  const H_W = 40;
  const step = XOR_D / 2 + ARROW + H_W / 2;
  const xJ0 = BOX_W / 2 + 4;
  const xA = xJ0 + 28;
  const xH0 = xA + 6 + ARROW + H_W / 2;
  const xX = [1, 2, 3, 4].map((k) => xH0 + (2 * k - 1) * step);
  const xH = [1, 2, 3].map((k) => xX[k - 1] + step);
  const xT = xX[3] + XOR_D / 2 + ARROW + 6;
  const [yJ, yE, yX, yC, yG] = column(LABEL_H + 8, [LABEL_H, BOX_H, XOR_D, LABEL_H, XOR_D]);
  const yB = yG + 36;
  const top = [1, 2];
  return (
    <Diagram caption="GCM with one block of associated data $A$ and two plaintext blocks. $J_i=\operatorname{inc}_{32}^{\,i}(J_0)$, $H=E_K(0^{128})$, and every $\cdot H$ multiplies in $GF(2^{128})$.">
      <Canvas>
        <Text text="CTR encryption" size="note" weight={600} tone={CHAIN} at={[xX[2], yJ]} anchor="w" />
        <Text text="GHASH authentication" size="note" weight={600} tone={AUTH} at={[xX[3], yB + 8]} anchor="n" />
        {value("j0", "$J_0$", [xJ0, yJ])}
        {cipher("e0", xJ0, yE)}
        {top.map((i) => [
          value(`j${i}`, `$J_${i}$`, [xX[i - 1], yJ]),
          cipher(`e${i}`, xX[i - 1], yE),
          xor(`x${i}`, xX[i - 1], yX),
          fromLeft(`p${i}`, `$P_${i}$`, xX[i - 1], yX, `x${i}`),
          value(`c${i}`, `$C_${i}$`, [xX[i - 1], yC]),
          <Edge key={`inc${i}`} from={`j${i - 1}`} to={`j${i}`} label="inc" route="straight" />,
          arrow(`j${i}`, `e${i}`),
          arrow(`e${i}`, `x${i}`, CHAIN),
          arrow(`x${i}`, `c${i}`, CHAIN),
          arrow(`c${i}`, `g${i}`, AUTH),
        ])}
        {arrow("j0", "e0")}
        {value("len", "$|A|\\parallel|C|$", [xX[2], yC])}
        {arrow("len", "g3", AUTH)}
        {value("a", "$A$", [xA, yG])}
        {[0, 1, 2, 3].map((k) => (
          <Node key={`h${k}`} id={`h${k}`} title="$\cdot H$" tone={AUTH} w={H_W} at={[k ? xH[k - 1] : xH0, yG]} />
        ))}
        {xX.map((x, k) => (
          <Xor key={`g${k + 1}`} id={`g${k + 1}`} tone={AUTH} at={[x, yG]} />
        ))}
        {value("t", "$T$", [xT, yG], "c", AUTH)}
        {arrow("a", "h0", AUTH)}
        {[1, 2, 3].map((k) => [arrow(`h${k - 1}`, `g${k}`, AUTH), arrow(`g${k}`, `h${k}`, AUTH)])}
        {arrow("h3", "g4", AUTH)}
        {arrow("g4", "t", AUTH)}
        {value("ej0", "$E_K(J_0)$", [xJ0 + 6, (yE + yX) / 2 + 12], "w", AUTH)}
        {arrow("e0", "g4", AUTH, [[xJ0, yB], [xX[3], yB]])}
      </Canvas>
    </Diagram>
  );
}


/* ---------- the 4x4 state ---------- */

/** One byte of the state; every grid figure uses this size. */
const CELL = 26;
const GRID = 4 * CELL;
interface Byte {
  label?: string;
  red?: boolean;
}
/** Bytes of a 4x4 state, row-major: `[4r + c]` is row r, column c. */
const stateBytes = (red: (r: number, c: number) => boolean, label?: (r: number, c: number) => string): Byte[] =>
  Array.from({ length: 16 }, (_, i) => ({ red: red(Math.floor(i / 4), i % 4), label: label?.(Math.floor(i / 4), i % 4) }));
/** A 4x4 state with its top-left corner at `at`. */
const stateGrid = (id: string, bytes: Byte[], at: Point) => (
  <Cells key={id} id={id} cols={4} cell={CELL} at={at} anchor="nw" items={bytes.map((b) => ({ label: b.label, tone: b.red ? "red" : undefined }))} />
);
/** A `Text` whose top centre sits at (x + w/2, y). */
const centred = (key: string, text: string, x: number, w: number, y: number, props: { size?: "note"; muted?: boolean; weight?: 600; tone?: Tone } = {}) => (
  <Text key={key} text={text} {...props} at={[x + w / 2, y]} anchor="n" />
);
const GRID_TOP = LABEL_H + 10;

interface Step {
  key: string;
  title: string;
  note: string;
  before: Byte[];
  after: Byte[];
  op?: "sbox" | "key";
}
const SBOX_W = 60;

/** One step: the state before, the operation, the state after, a note underneath. */
function stepPanel(s: Step) {
  const ow = s.op === "sbox" ? SBOX_W : s.op === "key" ? XOR_D : 0;
  const outX = GRID + (ow ? 2 * ARROW + ow : ARROW + 12);
  const w = outX + GRID;
  const mid: Point = [GRID + ARROW + ow / 2, GRID_TOP + GRID / 2];
  const op = `${s.key}-op`, from = `${s.key}-in`, to = `${s.key}-out`;
  return (
    <Canvas key={s.key}>
      {centred(`${s.key}-title`, s.title, 0, w, 0, { weight: 600 })}
      {stateGrid(from, s.before, [0, GRID_TOP])}
      {stateGrid(to, s.after, [outX, GRID_TOP])}
      {s.op === "sbox" && <Node id={op} title="S-box" w={SBOX_W} at={mid} />}
      {s.op === "key" && [<Xor key={op} id={op} at={mid} />, value(`${s.key}-k`, "$K^{(i)}$", [mid[0], GRID_TOP + LABEL_H / 2])]}
      {centred(`${s.key}-note`, s.note, 0, w, GRID_TOP + GRID + 8, { size: "note", muted: true })}
      {s.op === "key" && arrow(`${s.key}-k`, op)}
      {s.op ? [arrow(from, op), arrow(op, to)] : arrow(from, to)}
    </Canvas>
  );
}

const hex = (r: number, c: number) => `${r}${c}`;
const ROUND_STEPS: Step[] = [
  { key: "sub", title: "1. SubBytes", note: "each byte through the S-box", before: stateBytes((r, c) => r === 1 && c === 2), after: stateBytes((r, c) => r === 1 && c === 2), op: "sbox" },
  { key: "shift", title: "2. ShiftRows", note: "row $r$ rotates left by $r$", before: stateBytes((r) => r > 0, hex), after: stateBytes((r) => r > 0, (r, c) => hex(r, (c + r) % 4)) },
  { key: "mix", title: "3. MixColumns", note: "each column mixed as a unit\nskipped in the final round", before: stateBytes((_, c) => c === 2), after: stateBytes((_, c) => c === 2) },
  { key: "key", title: "4. AddRoundKey", note: "each byte XORed with its key byte", before: stateBytes((r, c) => r === 1 && c === 2), after: stateBytes((r, c) => r === 1 && c === 2), op: "key" },
];

/** The four steps of one full round, each on its own copy of the state. */
export function AesRoundSchema() {
  return (
    <Diagram caption="One full AES round. Red marks the bytes each step touches: SubBytes and AddRoundKey treat every byte alike, and MixColumns every column. The final round skips MixColumns.">
      <Col gap={28}>
        <Row gap={40} align="start" wrap>
          {ROUND_STEPS.slice(0, 2).map(stepPanel)}
        </Row>
        <Row gap={40} align="start" wrap>
          {ROUND_STEPS.slice(2).map(stepPanel)}
        </Row>
      </Col>
    </Diagram>
  );
}

const DIFFUSION = [
  { title: "input", count: "1/16 bytes differ", red: (r: number, c: number) => r === 1 && c === 1 },
  { title: "after round 1", count: "4/16 bytes differ", red: (_: number, c: number) => c === 0 },
  { title: "after round 2", count: "16/16 bytes differ", red: () => true },
];

/** One changed byte fills a column after one round and the whole state after two. */
export function DiffusionSchema() {
  const pitch = GRID + 72;
  return (
    <Diagram caption="Round 1: ShiftRows moves the changed byte to column 0, and MixColumns spreads it over that column. Round 2 spreads each of those four bytes over a different column.">
      <Canvas>
        {DIFFUSION.map((d, i) => [
          centred(`t${i}`, d.title, i * pitch, GRID, 0, { weight: 600 }),
          stateGrid(`s${i}`, stateBytes(d.red), [i * pitch, GRID_TOP]),
          centred(`n${i}`, d.count, i * pitch, GRID, GRID_TOP + GRID + 8, { size: "note", muted: true }),
          i > 0 && arrow(`s${i - 1}`, `s${i}`),
        ])}
      </Canvas>
    </Diagram>
  );
}

/* ---------- key expansion ---------- */

const WORD_W = 56;
const G_W = 84;

/** AES-128 key expansion for one round key: w4 to w7 from w0 to w3, with g applied to w3. */
export function KeyExpansionSchema() {
  const xg = 56;
  const frameL = xg - G_W / 2 - 10, frameR = xg + G_W / 2 + 10;
  const yChannel = 12;
  const frameT = yChannel + 16;
  const [yRot, ySub, yX, yNew] = column(frameT + LABEL_H + 6, [BOX_H, BOX_H, XOR_D, BOX_H]);
  const frameB = yX + XOR_D / 2 + 10;
  const wx = (j: number) => frameR + 52 + j * 100;
  const G: Tone = "red";
  return (
    <Diagram caption="The first expansion round of AES-128. Only $w_4$ uses g: RotWord, SubWord, then XOR with $\mathrm{Rcon}_1$. Each later word is the previous word XORed with the word four positions back.">
      <Canvas>
        <Path points={[[frameL, frameT], [frameR, frameT], [frameR, frameB], [frameL, frameB]]} closed dashed thin tone={G} />
        <Text text="g" weight={600} tone={G} at={[frameL + 8, frameT + 4]} anchor="nw" />
        <Node id="rot" title="RotWord" tone={G} w={G_W} at={[xg, yRot]} />
        <Node id="sub" title="SubWord" tone={G} w={G_W} at={[xg, ySub]} />
        <Xor id="gx" tone={G} at={[xg, yX]} />
        {value("rcon", "$\\mathrm{Rcon}_1$", [xg, yNew], "c", G)}
        {arrow("rot", "sub", G)}
        {arrow("sub", "gx", G)}
        {arrow("rcon", "gx", G)}
        {arrow("gx", "x0", G)}
        {arrow("w3", "rot", G, [[wx(3), yChannel], [xg, yChannel]])}
        {[0, 1, 2, 3].map((j) => [
          <Node key={`w${j}`} id={`w${j}`} title={`$w_${j}$`} w={WORD_W} at={[wx(j), yRot]} />,
          <Xor key={`x${j}`} id={`x${j}`} at={[wx(j), yX]} />,
          <Node key={`w${j + 4}`} id={`w${j + 4}`} title={`$w_${j + 4}$`} w={WORD_W} at={[wx(j), yNew]} />,
          arrow(`w${j}`, `x${j}`),
          arrow(`x${j}`, `w${j + 4}`),
          j < 3 && arrow(`x${j}`, `x${j + 1}`),
        ])}
      </Canvas>
    </Diagram>
  );
}

/* ---------- the ECB penguin ---------- */

const IMG = 32;
const PX = 4;
/** Pixels per cipher block: 16 bytes hold four RGBA pixels. */
const BLOCK = 4;
/** A bold capital A, 32 pixels square. */
function inLetter(x: number, y: number): boolean {
  if (y < 3 || y > 28) return false;
  const edge = 13 - (y - 3) * 0.48;
  const stroke = 6;
  const left = x >= edge && x < edge + stroke;
  const right = x <= 31 - edge && x > 31 - edge - stroke;
  const bar = y >= 18 && y <= 21 && x >= edge && x <= 31 - edge;
  return left || right || bar;
}
/** Shades that read as unrelated ciphertext bytes in both themes. */
const NOISE = ["red-solid", "panel", "text", "red-tint", "line", "red-ink", "rule", "red-line", "muted", "faint"].map(V);
const blocksOf = (y: number) => Array.from({ length: IMG / BLOCK }, (_, b) => Array.from({ length: BLOCK }, (_, k) => inLetter(b * BLOCK + k, y)));
/** ECB: the colour is a function of the block's content alone. */
const ecbColour = (bits: boolean[]) => NOISE[(bits.reduce((n, b) => 2 * n + Number(b), 0) * 7 + 3) % NOISE.length];
/** CBC or CTR: every block looks independent of its content. */
function noiseColours() {
  let s = 0x9e3779b9;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) % NOISE.length;
  };
  return Array.from({ length: IMG }, () => Array.from({ length: IMG / BLOCK }, () => NOISE[next()]));
}

const rectAt = (key: string, x: number, y: number, w: number, fill: string) => <rect key={key} x={x * PX} y={y * PX} width={w * PX} height={PX} style={{ fill }} />;
const frame = <rect x={0.5} y={0.5} width={IMG * PX - 1} height={IMG * PX - 1} style={{ fill: "none", stroke: V("rule") }} />;

function plainImage() {
  return [
    <rect key="bg" width={IMG * PX} height={IMG * PX} style={{ fill: V("panel") }} />,
    ...Array.from({ length: IMG }, (_, y) => Array.from({ length: IMG }, (_, x) => x).filter((x) => inLetter(x, y)).map((x) => rectAt(`${x},${y}`, x, y, 1, V("ink")))).flat(),
  ];
}
const blockImage = (colour: (bits: boolean[], y: number, b: number) => string) =>
  Array.from({ length: IMG }, (_, y) => blocksOf(y).map((bits, b) => rectAt(`${b},${y}`, b * BLOCK, y, BLOCK, colour(bits, y, b)))).flat();

/** The same bitmap as plaintext, under ECB, and under a randomised mode. */
export function EcbPenguinSchema() {
  const side = IMG * PX;
  const pitch = side + 40;
  const noise = noiseColours();
  const images = [
    { label: "plaintext", body: plainImage() },
    { label: "ECB", body: blockImage(ecbColour) },
    { label: "CBC / CTR", body: blockImage((_, y, b) => noise[y][b]) },
  ];
  return (
    <Diagram caption="Each 16-byte block covers four pixels. ECB maps equal blocks to equal ciphertext, so the uniform regions stay uniform and the letter shows. CBC and CTR leave no visible structure.">
      <Canvas>
        {images.map((img, i) => [
          <Svg key={`img${i}`} w={side} h={side} at={[i * pitch, 0]} anchor="nw">
            {img.body}
            {frame}
          </Svg>,
          centred(`l${i}`, img.label, i * pitch, side, side + 8, { weight: 600 }),
        ])}
      </Canvas>
    </Diagram>
  );
}
