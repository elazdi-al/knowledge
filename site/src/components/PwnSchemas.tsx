import { Diagram, Edge, FONT, Canvas, measure, Node, NODE, Path, Poly, Row, Space, Table, Text, nodeTitleW, type State, type TableRow, type Tone, TABLE, LINE_H } from "figure";

/** Width of a `Text` drawn at `size`; mono text draws half a pixel smaller. */
const textW = (text: string, size: "label" | "note", mono = false) => {
  const px = size === "note" ? FONT.note : FONT.label;
  return measure(text, mono ? px - 0.5 : px, { mono });
};
const NOTE_H = LINE_H.note;
const LABEL_H = LINE_H.label;
/** One 8-byte stack slot, and the gap between stacked slots. */
const SLOT_H = 28;
const SLOT_GAP = 4;
const slotY = (i: number) => i * (SLOT_H + SLOT_GAP);
/** Room for a pointer arrow between a register name and the slot it points at. */
const POINTER_GAP = 28;

interface Slot {
  label: string;
  state?: State;
  tone?: Tone;
  mono?: boolean;
}
/** One width for every slot, so stack columns line up whatever their labels. */
const slotW = (slots: Slot[]) => Math.max(...slots.map((s) => nodeTitleW({ title: s.label, mono: s.mono, state: s.state ?? "default", shape: "box", tone: s.tone }))) + 20;

/** `rax` holds an address; `[rax]` is the memory stored at that address. */
export function AddressVsDereferenceDiagram() {
  const mem: TableRow[] = [{ cells: ["0x0ff8", "0x0"] }, { cells: ["0x1000", "0x41414141"], state: "active" }, { cells: ["0x1008", "0x0"] }];
  const raxW = measure("0x1000", FONT.note) + 2 * NODE.padX;
  const tx = raxW + 32;
  const top = NOTE_H + 4;
  const eqY = top + mem.length * TABLE.rowH + 20;
  const lhsW = textW("[rax]", "label", true);
  const noteX = lhsW + 8 + textW("= 0x41414141", "label", true) + 16;
  const eqs = [
    { lhs: "rax", rhs: "= 0x1000", note: "an address" },
    { lhs: "[rax]", rhs: "= 0x41414141", note: "memory at that address", state: "active" as const },
  ];
  return (
    <Diagram caption="rax holds an address. [rax] is the memory at that address.">
      <Canvas>
        <Node id="rax" title="rax" sub="0x1000" mono at={[0, top + 1.5 * TABLE.rowH - NODE.hSub / 2]} anchor="nw" w={raxW} />
        <Text text="memory" size="note" muted at={[tx, 0]} anchor="nw" />
        <Table id="mem" rows={mem} at={[tx, top]} anchor="nw" />
        {eqs.map((e, i) => {
          const y = eqY + i * (LABEL_H + 6);
          return [
            <Text key={`l${i}`} text={e.lhs} mono state={e.state} at={[lhsW - textW(e.lhs, "label", true), y]} anchor="nw" />,
            <Text key={`r${i}`} text={e.rhs} mono state={e.state} at={[lhsW + 8, y]} anchor="nw" />,
            <Text key={`n${i}`} text={e.note} size="note" muted at={[noteX, y + (LABEL_H - NOTE_H) / 2]} anchor="nw" />,
          ];
        })}
      </Canvas>
      <Edge from="rax" to="mem.r1" route="straight" state="active" />
    </Diagram>
  );
}

const CALL_STATES: { key: string; title: string; slots: Slot[]; rsp: number; notes: string[] }[] = [
  { key: "before", title: "Before call", slots: [{ label: "caller data" }, { label: "unused", state: "placeholder" }], rsp: 0, notes: [] },
  {
    key: "call",
    title: "After call",
    slots: [{ label: "caller data" }, { label: "return address", state: "active" }],
    rsp: 1,
    notes: ["rsp -= 8", "[rsp] = return address", "rip = target"],
  },
  { key: "ret", title: "After ret", slots: [{ label: "caller data" }, { label: "return address", state: "ghost" }], rsp: 0, notes: ["rip = [rsp]", "rsp += 8"] },
];

/** `call` pushes the return address and moves rsp down 8; `ret` pops it into rip and moves rsp back up. */
export function StackCallDiagram() {
  const w = slotW(CALL_STATES.flatMap((s) => s.slots));
  const sx = textW("rsp", "label", true) + POINTER_GAP;
  const top = LABEL_H + 8;
  const notesY = top + slotY(2) + 10;
  return (
    <Diagram caption="Higher addresses are at the top. The stack grows toward lower addresses.">
      <Row gap={16} align="start" wrap>
        {CALL_STATES.map((s) => (
          <Canvas key={s.key}>
            <Text text={s.title} weight={600} at={[sx + (w - textW(s.title, "label")) / 2, 0]} anchor="nw" />
            <Text id={`${s.key}-rsp`} text="rsp" mono at={[0, top + slotY(s.rsp) + (SLOT_H - LABEL_H) / 2]} anchor="nw" />
            {s.slots.map((slot, i) => (
              <Node key={i} id={`${s.key}-${i}`} title={slot.label} state={slot.state} at={[sx, top + slotY(i)]} anchor="nw" w={w} h={SLOT_H} />
            ))}
            {s.notes.map((n, i) => (
              <Text key={n} text={n} size="note" mono at={[sx, notesY + i * (NOTE_H + 2)]} anchor="nw" />
            ))}
          </Canvas>
        ))}
      </Row>
      {CALL_STATES.map((s) => (
        <Edge key={s.key} from={`${s.key}-rsp`} to={`${s.key}-${s.rsp}`} route="straight" />
      ))}
    </Diagram>
  );
}

const FRAME: (Slot & { offset: string })[] = [
  { offset: "rbp+0x08", label: "return address" },
  { offset: "rbp+0x00", label: "saved rbp" },
  { offset: "rbp-0x08", label: "local variable" },
  { offset: "rbp-0x10", label: "local variable" },
  { offset: "rbp-0x18", label: "buffer[8..15]", mono: true },
  { offset: "rbp-0x20", label: "buffer[0..7]", mono: true },
];

/**
 * The frame after `push rbp; mov rbp, rsp; sub rsp, 0x20`. With `overflow`, input written
 * from `buffer[0]` upward covers every slot up to the return address, which `ret` loads into rip.
 */
export function StackFrameDiagram({ overflow = false }: { overflow?: boolean }) {
  const slots: Slot[] = overflow ? FRAME.map((s) => ({ ...s, tone: "red" })) : FRAME;
  const w = slotW(slots);
  const sx = textW("rbp+0x08", "note", true) + 12;
  const top = overflow ? NODE.h + 48 : NOTE_H + 8;
  const last = FRAME.length - 1;
  const pointer = (reg: string, slot: number) => (
    <Text id={reg} text={reg} mono at={[sx + w + POINTER_GAP, top + slotY(slot) + (SLOT_H - LABEL_H) / 2]} anchor="nw" />
  );
  const centred = (text: string, y: number) => <Text text={text} size="note" muted at={[sx + (w - textW(text, "note")) / 2, y]} anchor="nw" />;
  return (
    <Diagram
      caption={
        overflow
          ? "Input written past the buffer continues upward to the return address, so ret loads an input value into rip."
          : "After the prologue, rbp points at the saved rbp and rsp points at the bottom of the local area."
      }
    >
      <Canvas>
        {overflow ? <Node id="rip" title="rip" mono at={[sx + (w - 48) / 2, 0]} anchor="nw" w={48} /> : centred("higher addresses", 0)}
        {FRAME.map((s, i) => (
          <Text key={s.offset} text={s.offset} size="note" mono muted at={[0, top + slotY(i) + (SLOT_H - NOTE_H) / 2]} anchor="nw" />
        ))}
        {slots.map((s, i) => (
          <Node key={i} id={`slot${i}`} title={s.label} mono={s.mono} tone={s.tone} at={[sx, top + slotY(i)]} anchor="nw" w={w} h={SLOT_H} />
        ))}
        {!overflow && pointer("rbp", 1)}
        {!overflow && pointer("rsp", last)}
        {centred("lower addresses", top + slotY(last) + SLOT_H + 8)}
      </Canvas>
      {overflow ? (
        <>
          <Edge from={`slot${last}`} to="slot0" label="input" route="ortho" fromSide="right" toSide="right" tone="red" />
          <Edge from="slot0" to="rip" label="ret" route="straight" tone="red" />
        </>
      ) : (
        <>
          <Edge from="rbp" to="slot1" route="straight" />
          <Edge from="rsp" to={`slot${last}`} route="straight" />
        </>
      )}
    </Diagram>
  );
}

/** One band of a memory column, top to bottom. A band without a label is free address space, where `grows` draws the arrow. */
interface Band {
  label?: string;
  perm?: string;
  h: number;
  tone?: Tone;
  note?: string;
  grows?: "down" | "up";
}
const BAND_PAD = 10;
const middle = (y: number, h: number, inner: number) => y + (h - inner) / 2;

/** Stacks `bands` at (`x`, `top`) in a column `w` wide: `elements` for a `Free`, each band's y in `ys`, and the column's `bottom`. */
function placeBands(bands: Band[], x: number, top: number, w: number) {
  let bottom = top;
  const ys = bands.map((b) => {
    const y = bottom;
    bottom += b.h;
    return y;
  });
  const elements = [
    ...bands.map((b, i) =>
      b.label ? (
        <Poly key={i} points={[[x, ys[i]], [x + w, ys[i]], [x + w, ys[i] + b.h], [x, ys[i] + b.h]]} tone={b.tone} outline />
      ) : (
        [x, x + w].map((side) => <Path key={`${i}-${side}`} points={[[side, ys[i]], [side, ys[i] + b.h]]} dashed thin />)
      ),
    ),
    ...bands.map((b, i) => [
      b.label && <Text key={`label${i}`} text={b.label} mono tone={b.tone} at={[b.perm ? x + BAND_PAD : x + (w - textW(b.label, "label", true)) / 2, middle(ys[i], b.h, LABEL_H)]} anchor="nw" />,
      b.perm && <Text key={`perm${i}`} text={b.perm} mono tone={b.tone} at={[x + w - BAND_PAD - textW(b.perm, "label", true), middle(ys[i], b.h, LABEL_H)]} anchor="nw" />,
      b.note && <Text key={`note${i}`} text={b.note} size="note" muted at={[x + w + 16, middle(ys[i], b.h, NOTE_H)]} anchor="nw" />,
    ]),
  ];
  return { elements, ys, bottom };
}

const MEMORY: Band[] = [
  { label: "stack", h: 44, tone: "blue" },
  { h: 56, tone: "blue", note: "grows toward lower addresses", grows: "down" },
  { label: "mmap / shared libraries", h: 40, tone: "teal" },
  { h: 56, tone: "green", note: "grows toward higher addresses", grows: "up" },
  { label: "heap", h: 44, tone: "green" },
  { label: ".bss", h: 30, tone: "purple", note: "zero/uninitialized global/static variables" },
  { label: ".data", h: 30, tone: "purple", note: "initialized global/static variables" },
  { label: ".rodata", h: 30, tone: "purple", note: "read-only constants and strings" },
  { label: ".text", h: 30, tone: "purple", note: "executable program code" },
];
const GROWTH_ARROW = 36;

/** A Linux x86-64 process as one column, high addresses on top: relative position only, no exact addresses. */
export function ProcessMemoryLayoutDiagram() {
  const w = textW("mmap / shared libraries", "label", true) + 48;
  const { elements, ys, bottom } = placeBands(MEMORY, 0, NOTE_H + 6, w);
  return (
    <Diagram caption="Relative positions of the regions in a Linux x86-64 process. The heap and the stack grow toward each other.">
      <Canvas>
        <Text text="high addresses" size="note" mono muted at={[0, 0]} anchor="nw" />
        {elements}
        {MEMORY.map((b, i) => [
          b.grows && <Space key={`from${i}`} id={`from${i}`} at={[w / 2, b.grows === "down" ? ys[i] : ys[i] + b.h]} />,
          b.grows && <Space key={`to${i}`} id={`to${i}`} at={[w / 2, b.grows === "down" ? ys[i] + GROWTH_ARROW : ys[i] + b.h - GROWTH_ARROW]} />,
        ])}
        <Text text="low addresses" size="note" mono muted at={[0, bottom + 6]} anchor="nw" />
      </Canvas>
      {MEMORY.map((b, i) => b.grows && <Edge key={i} from={`from${i}`} to={`to${i}`} route="straight" tone={b.tone} />)}
    </Diagram>
  );
}

/** A `Text` centred over the span of `w` at `x`, measured at its own weight so bold titles centre too. */
const centredText = (text: string, x: number, w: number, y: number, props: { size?: "note"; mono?: boolean; muted?: boolean; tone?: Tone; weight?: 600 } = {}) => {
  const px = (props.size === "note" ? FONT.note : FONT.label) - (props.mono ? 0.5 : 0);
  return <Text key={text} text={text} {...props} at={[x + (w - measure(text, px, { mono: props.mono, weight: props.weight })) / 2, y]} anchor="nw" />;
};
const columnTitle = (text: string, x: number, w: number) => centredText(text, x, w, 0, { weight: 600 });
/** Column top under a title, and under a title plus a "high addresses" note. */
const TITLED_TOP = LABEL_H + 8;
const NOTED_TOP = TITLED_TOP + NOTE_H + 6;

const NX_COLUMNS: { key: string; title: string; stackPerm: string; result: string; tone?: Tone }[] = [
  { key: "off", title: "NX disabled", stackPerm: "rwx", result: "stack code runs" },
  { key: "on", title: "NX enabled", stackPerm: "rw-", result: "fault: stack is not executable", tone: "red" },
];

/** `rip` reaches the stack in both columns; only the writable, non-executable stack faults. */
export function NxDiagram() {
  const w = textW("fault: stack is not executable", "note") + 12;
  const ripW = textW("rip", "label", true);
  const sx = ripW + POINTER_GAP;
  const stackH = 40;
  return (
    <Diagram caption="NX removes execute permission from writable memory.">
      <Row gap={24} align="start" wrap>
        {NX_COLUMNS.map((c) => {
          const { elements, ys, bottom } = placeBands(
            [
              { label: "stack", perm: c.stackPerm, h: stackH, tone: "blue" },
              { h: 28 },
              { label: ".data", perm: "rw-", h: 30, tone: "purple" },
              { label: ".text", perm: "r-x", h: 30, tone: "purple" },
            ],
            sx,
            TITLED_TOP,
            w,
          );
          return (
            <Canvas key={c.key}>
              {columnTitle(c.title, sx, w)}
              <Text text="rip" mono at={[0, middle(ys[0], stackH, LABEL_H)]} anchor="nw" />
              <Space id={`${c.key}-rip`} at={[ripW + 4, ys[0] + stackH / 2]} />
              <Space id={`${c.key}-stack`} at={[sx, ys[0] + stackH / 2]} />
              {elements}
              {centredText(c.result, sx, w, bottom + 8, { size: "note", muted: !c.tone, tone: c.tone })}
            </Canvas>
          );
        })}
      </Row>
      {NX_COLUMNS.map((c) => (
        <Edge key={c.key} from={`${c.key}-rip`} to={`${c.key}-stack`} route="straight" tone={c.tone} />
      ))}
    </Diagram>
  );
}

const CANARY_SLOT_H = 32;
const CANARY_COLUMNS: { key: string; title: string; slots: Band[]; result: string; overflow?: boolean }[] = [
  {
    key: "intact",
    title: "No overflow",
    slots: [
      { label: "return address", h: CANARY_SLOT_H, tone: "blue" },
      { label: "saved rbp", h: CANARY_SLOT_H, tone: "blue" },
      { label: "canary", h: CANARY_SLOT_H, tone: "teal" },
      { label: "local buffer", h: CANARY_SLOT_H, tone: "blue" },
    ],
    result: "canary matches: ret runs",
  },
  {
    key: "overflow",
    title: "Overflow",
    slots: ["return address", "saved rbp", "canary", "local buffer"].map((label) => ({ label, h: CANARY_SLOT_H, tone: "red" })),
    result: "canary changed: program terminates",
    overflow: true,
  },
];

/** A linear overflow runs upward from the buffer, so it changes the canary before it reaches the return address. */
export function StackCanaryDiagram() {
  const w = textW("canary changed: program terminates", "note") + 12;
  return (
    <Diagram caption="The canary sits between the local buffer and the saved control data, so a linear overflow overwrites it first.">
      <Row gap={24} align="start" wrap>
        {CANARY_COLUMNS.map((c) => {
          const { elements, ys, bottom } = placeBands(c.slots, 0, NOTED_TOP, w);
          return (
            <Canvas key={c.key}>
              {columnTitle(c.title, 0, w)}
              <Text text="high addresses" size="note" mono muted at={[0, TITLED_TOP]} anchor="nw" />
              {elements}
              {c.overflow && <Space id="input-from" at={[w, ys[3] + CANARY_SLOT_H / 2]} />}
              {c.overflow && <Space id="input-to" at={[w, ys[0] + CANARY_SLOT_H / 2]} />}
              <Text text="low addresses" size="note" mono muted at={[0, bottom + 6]} anchor="nw" />
              {centredText(c.result, 0, w, bottom + 6 + NOTE_H + 8, { size: "note", muted: !c.overflow, tone: c.overflow ? "red" : undefined })}
            </Canvas>
          );
        })}
      </Row>
      <Edge from="input-from" to="input-to" label="input" route="ortho" fromSide="right" toSide="right" tone="red" />
    </Diagram>
  );
}

const PIE_BAND_H = 92;
const PIE_FUNCTION_Y = 22;
const PIE_COLUMNS: { key: string; title: string; above: number; below: number; base: string; func: string }[] = [
  { key: "fixed", title: "No PIE", above: 130, below: 18, base: "base 0x400000", func: "func 0x4011d6" },
  { key: "run1", title: "PIE, run 1", above: 74, below: 74, base: "base 0x555555554000", func: "func 0x5555555551d6" },
  { key: "run2", title: "PIE, run 2", above: 18, below: 130, base: "base 0x55a431233000", func: "func 0x55a4312341d6" },
];

/** The executable moves as one block: the base changes per run, and the function keeps its offset above the base. */
export function PieDiagram() {
  const w = textW("base 0x555555554000", "note", true) + 16;
  const arrowX = w - 16;
  const offset = "+0x11d6";
  return (
    <Diagram caption="The base changes between PIE runs. The offset of the function from the base stays 0x11d6.">
      <Row gap={16} align="start" wrap>
        {PIE_COLUMNS.map((c) => {
          const { elements, ys, bottom } = placeBands(
            [{ h: c.above }, { label: "executable", h: PIE_BAND_H, tone: "purple" }, { h: c.below }],
            0,
            TITLED_TOP,
            w,
          );
          const funcY = ys[1] + PIE_FUNCTION_Y;
          return (
            <Canvas key={c.key}>
              {columnTitle(c.title, 0, w)}
              {elements}
              <Path points={[[0, funcY], [w, funcY]]} tone="purple" thin />
              {centredText("function", 0, w, funcY - NOTE_H - 2, { size: "note", mono: true, tone: "purple" })}
              <Text text={offset} size="note" mono tone="purple" at={[arrowX - 8 - textW(offset, "note", true), ys[1] + PIE_BAND_H - NOTE_H - 6]} anchor="nw" />
              <Space id={`${c.key}-base`} at={[arrowX, ys[1] + PIE_BAND_H]} />
              <Space id={`${c.key}-func`} at={[arrowX, funcY]} />
              {centredText(c.base, 0, w, bottom + 8, { size: "note", mono: true })}
              {centredText(c.func, 0, w, bottom + 8 + NOTE_H + 2, { size: "note", mono: true })}
            </Canvas>
          );
        })}
      </Row>
      {PIE_COLUMNS.map((c) => (
        <Edge key={c.key} from={`${c.key}-base`} to={`${c.key}-func`} route="straight" tone="purple" />
      ))}
    </Diagram>
  );
}

const ASLR_BAND_H = 34;
/** Free space above each region and below the last; both runs sum to 184 so the columns end level. */
const ASLR_COLUMNS: { title: string; free: [number, number, number, number, number] }[] = [
  { title: "Run 1", free: [14, 28, 62, 18, 62] },
  { title: "Run 2", free: [46, 50, 36, 30, 22] },
];
const ASLR_REGIONS: Band[] = [
  { label: "stack", h: ASLR_BAND_H, tone: "blue" },
  { label: "shared libraries", h: ASLR_BAND_H, tone: "teal" },
  { label: "heap", h: ASLR_BAND_H, tone: "green" },
  { label: "PIE executable", h: ASLR_BAND_H, tone: "purple" },
];

/** Every region moves between runs, while their order stays fixed. */
export function AslrDiagram() {
  const w = textW("shared libraries", "label", true) + 48;
  return (
    <Diagram caption="Each run places every region at a new address. The order of the regions stays the same.">
      <Row gap={32} align="start" wrap>
        {ASLR_COLUMNS.map((c) => {
          const bands = c.free.flatMap((h, i): Band[] => (ASLR_REGIONS[i] ? [{ h }, ASLR_REGIONS[i]] : [{ h }]));
          const { elements, bottom } = placeBands(bands, 0, NOTED_TOP, w);
          return (
            <Canvas key={c.title}>
              {columnTitle(c.title, 0, w)}
              <Text text="high addresses" size="note" mono muted at={[0, TITLED_TOP]} anchor="nw" />
              {elements}
              <Text text="low addresses" size="note" mono muted at={[0, bottom + 6]} anchor="nw" />
            </Canvas>
          );
        })}
      </Row>
    </Diagram>
  );
}

const relroBand = (label: string, perm: "rw-" | "r--", h = 30): Band => ({ label, perm, h, tone: perm === "rw-" ? "red" : "purple" });
const RELRO_COLUMNS: { title: string; bands: Band[] }[] = [
  { title: "No RELRO", bands: [relroBand(".dynamic", "rw-"), relroBand(".got", "rw-"), relroBand(".got.plt", "rw-")] },
  { title: "Partial RELRO", bands: [relroBand(".dynamic", "r--"), relroBand(".got", "r--"), relroBand(".got.plt", "rw-")] },
  { title: "Full RELRO", bands: [relroBand(".dynamic", "r--"), relroBand(".got", "r--", 60)] },
];

/** Each RELRO level leaves fewer dynamic-linking structures writable. */
export function RelroDiagram() {
  const w = textW(".got.plt", "label", true) + textW("rw-", "label", true) + 2 * BAND_PAD + 24;
  return (
    <Diagram caption="Permissions after the loader finishes relocation. Full RELRO merges .got.plt into .got.">
      <Row gap={24} align="start" wrap>
        {RELRO_COLUMNS.map((c) => (
          <Canvas key={c.title}>
            {columnTitle(c.title, 0, w)}
            {placeBands(c.bands, 0, TITLED_TOP, w).elements}
          </Canvas>
        ))}
      </Row>
    </Diagram>
  );
}

const ALIGN_SLOT_H = 36;
const ALIGN_SLOTS: { label: string; address: string; mod: string; stage: string }[] = [
  { label: "caller data", address: "0x1000", mod: "rsp % 16 = 0", stage: "before call foo" },
  { label: "return address", address: "0x0ff8", mod: "rsp % 16 = 8", stage: "after call foo" },
  { label: "saved rbp", address: "0x0ff0", mod: "rsp % 16 = 0", stage: "after push rbp" },
];

/** One stack column, high addresses on top: each 8-byte push moves rsp down one slot, so `rsp % 16` alternates between 0 and 8. */
export function StackAlignmentDiagram() {
  const w = textW("return address", "label", true) + 56;
  const x = textW("0x1000", "note", true) + 12;
  const modX = x + w + POINTER_GAP;
  const stageX = modX + textW("rsp % 16 = 0", "label", true) + 16;
  const bands: Band[] = [...ALIGN_SLOTS.map((s) => ({ label: s.label, h: ALIGN_SLOT_H, tone: "blue" as const })), { h: 56 }];
  const { elements, ys, bottom } = placeBands(bands, x, NOTE_H + 6, w);
  const free = ys[ALIGN_SLOTS.length];
  return (
    <Diagram caption="Each 8-byte push moves rsp down one slot, so rsp % 16 alternates between 0 and 8.">
      <Canvas>
        <Text text="high addresses" size="note" mono muted at={[x, 0]} anchor="nw" />
        {elements}
        {ALIGN_SLOTS.map((s, i) => [
          <Text key={`address${i}`} text={s.address} size="note" mono muted at={[0, middle(ys[i], ALIGN_SLOT_H, NOTE_H)]} anchor="nw" />,
          <Space key={`slot${i}`} id={`slot${i}`} at={[x + w, ys[i] + ALIGN_SLOT_H / 2]} />,
          <Space key={`rsp${i}`} id={`rsp${i}`} at={[modX - 4, ys[i] + ALIGN_SLOT_H / 2]} />,
          <Text key={`mod${i}`} text={s.mod} mono weight={600} at={[modX, middle(ys[i], ALIGN_SLOT_H, LABEL_H)]} anchor="nw" />,
          <Text key={`stage${i}`} text={s.stage} size="note" muted at={[stageX, middle(ys[i], ALIGN_SLOT_H, NOTE_H)]} anchor="nw" />,
        ])}
        <Space id="grow-from" at={[x + w / 2, free]} />
        <Space id="grow-to" at={[x + w / 2, free + GROWTH_ARROW]} />
        <Text text="grows toward lower addresses" size="note" muted at={[modX, middle(free, 56, NOTE_H)]} anchor="nw" />
        <Text text="low addresses" size="note" mono muted at={[x, bottom + 6]} anchor="nw" />
      </Canvas>
      {ALIGN_SLOTS.map((_, i) => (
        <Edge key={i} from={`rsp${i}`} to={`slot${i}`} route="straight" />
      ))}
      <Edge from="grow-from" to="grow-to" route="straight" tone="blue" />
    </Diagram>
  );
}

const OFFSET_BANDS: (Band & { bytes: string })[] = [
  { bytes: "72–79", label: "saved return address", h: 36, tone: "red" },
  { bytes: "64–71", label: "saved rbp", h: 36 },
  { bytes: "0–63", label: "buffer, 64 bytes", h: 88, tone: "blue" },
];

/** Input offsets increase upward, opposite to stack growth. Bands are schematic, not to scale. */
export function OverflowOffsetsDiagram() {
  const w = textW("saved return address", "label", true) + 2 * BAND_PAD;
  const leftW = textW("input bytes", "note");
  const sx = leftW + 12;
  const arrowX = sx + w + 24;
  const top = NOTE_H + 8;
  const { elements, ys, bottom } = placeBands(OFFSET_BANDS, sx, top, w);
  const growY = bottom + 12;
  return (
    <Diagram caption="Byte ranges start at buffer[0]. The saved return address starts at offset 72. Sizes are schematic.">
      <Canvas>
        <Text text="input bytes" size="note" muted at={[0, 0]} anchor="nw" />
        <Text text="high addresses" size="note" mono muted at={[sx, 0]} anchor="nw" />
        {elements}
        {OFFSET_BANDS.map((b, i) => (
          <Text key={b.bytes} text={b.bytes} size="note" mono muted at={[leftW - textW(b.bytes, "note", true), middle(ys[i], b.h, NOTE_H)]} anchor="nw" />
        ))}
        <Space id="write-from" at={[arrowX, bottom]} />
        <Space id="write-to" at={[arrowX, top]} />
        <Text text={"input\nwrites"} size="note" tone="red" at={[arrowX + 10, top + 60]} anchor="nw" />
        <Space id="grow-from" at={[sx + w / 2, growY]} />
        <Space id="grow-to" at={[sx + w / 2, growY + GROWTH_ARROW]} />
        <Text text="stack grows" size="note" tone="blue" at={[sx + w / 2 + 12, growY + 8]} anchor="nw" />
        <Text text="low addresses" size="note" mono muted at={[sx, growY + GROWTH_ARROW + 6]} anchor="nw" />
      </Canvas>
      <Edge from="write-from" to="write-to" route="straight" tone="red" />
      <Edge from="grow-from" to="grow-to" route="straight" tone="blue" />
    </Diagram>
  );
}

/** All stages keep high addresses on top, matching the other stack figures. */
const RET_SLOTS: Slot[] = [
  { label: "next slot", state: "placeholder" },
  { label: "&win", mono: true, tone: "purple" },
  { label: "&ret gadget", mono: true, tone: "purple" },
];
const RET_STAGES = [
  { key: "before", title: "1. At vuln’s ret", rip: "vuln: ret", rsp: 2, mod: "8", advance: "+0 bytes" },
  { key: "gadget", title: "2. At ret gadget", rip: "gadget: ret", rsp: 1, mod: "0", advance: "+8 bytes" },
  { key: "win", title: "3. At win", rip: "win", rsp: 0, mod: "8", advance: "+16 bytes" },
];

/** Each ret reads a code address from the stack and advances rsp toward higher addresses. */
export function RetChainDiagram() {
  const w = slotW(RET_SLOTS);
  const rspX = w + POINTER_GAP;
  const ripY = TITLED_TOP;
  const addressY = ripY + LABEL_H + 12;
  const slotsY = addressY + NOTE_H + 6;
  const bottom = slotsY + slotY(RET_SLOTS.length - 1) + SLOT_H;
  return (
    <Diagram caption="Each ret consumes one 8-byte address. Faded slots are consumed; their bytes remain in memory.">
      <Row gap={24} align="start" wrap>
        {RET_STAGES.map((s) => (
          <Canvas key={s.key}>
            {columnTitle(s.title, 0, w)}
            <Text text={`rip = ${s.rip}`} size="note" mono tone="purple" at={[0, ripY]} anchor="nw" />
            <Text text="high addresses" size="note" muted at={[0, addressY]} anchor="nw" />
            {RET_SLOTS.map((slot, i) => (
              <Node key={i} id={`${s.key}-${i}`} title={slot.label} mono={slot.mono} tone={slot.tone} state={i > s.rsp ? "ghost" : slot.state} at={[0, slotsY + slotY(i)]} anchor="nw" w={w} h={SLOT_H} />
            ))}
            <Text id={`${s.key}-rsp`} text="rsp" mono tone="blue" at={[rspX, slotsY + slotY(s.rsp) + (SLOT_H - LABEL_H) / 2]} anchor="nw" />
            <Text text="low addresses" size="note" muted at={[0, bottom + 6]} anchor="nw" />
            <Text text={`rsp: ${s.advance}`} size="note" mono at={[0, bottom + NOTE_H + 18]} anchor="nw" />
            <Text text={`rsp % 16 = ${s.mod}`} size="note" mono weight={s.key === "win" ? 600 : undefined} at={[0, bottom + 2 * NOTE_H + 22]} anchor="nw" />
          </Canvas>
        ))}
      </Row>
      {RET_STAGES.map((s) => (
        <Edge key={s.key} from={`${s.key}-rsp`} to={`${s.key}-${s.rsp}`} route="straight" tone="blue" />
      ))}
    </Diagram>
  );
}
