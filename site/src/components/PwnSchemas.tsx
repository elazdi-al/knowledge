import { Diagram, Edge, FONT, Free, measure, Node, NODE, Row, Table, Text } from "@/components/figure";
import { nodeTitleW } from "@/components/figure/layout";
import type { State, TableRow, Tone } from "@/components/figure/model";
import { TABLE } from "@/components/figure/theme";

/** Width of a `Text` drawn at `size`; mono text draws half a pixel smaller. */
const textW = (text: string, size: "label" | "note", mono = false) => {
  const px = size === "note" ? FONT.note : FONT.label;
  return measure(text, mono ? px - 0.5 : px, { mono });
};
const NOTE_H = Math.round(FONT.note * 1.4);
const LABEL_H = Math.round(FONT.label * 1.4);
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
      <Free>
        <Node id="rax" title="rax" sub="0x1000" mono x={0} y={top + 1.5 * TABLE.rowH - NODE.hSub / 2} w={raxW} />
        <Text text="memory" size="note" muted x={tx} y={0} />
        <Table id="mem" rows={mem} x={tx} y={top} />
        {eqs.map((e, i) => {
          const y = eqY + i * (LABEL_H + 6);
          return [
            <Text key={`l${i}`} text={e.lhs} mono state={e.state} x={lhsW - textW(e.lhs, "label", true)} y={y} />,
            <Text key={`r${i}`} text={e.rhs} mono state={e.state} x={lhsW + 8} y={y} />,
            <Text key={`n${i}`} text={e.note} size="note" muted x={noteX} y={y + (LABEL_H - NOTE_H) / 2} />,
          ];
        })}
      </Free>
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
          <Free key={s.key}>
            <Text text={s.title} weight={600} x={sx + (w - textW(s.title, "label")) / 2} y={0} />
            <Text id={`${s.key}-rsp`} text="rsp" mono x={0} y={top + slotY(s.rsp) + (SLOT_H - LABEL_H) / 2} />
            {s.slots.map((slot, i) => (
              <Node key={i} id={`${s.key}-${i}`} title={slot.label} state={slot.state} x={sx} y={top + slotY(i)} w={w} h={SLOT_H} />
            ))}
            {s.notes.map((n, i) => (
              <Text key={n} text={n} size="note" mono x={sx} y={notesY + i * (NOTE_H + 2)} />
            ))}
          </Free>
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
    <Text id={reg} text={reg} mono x={sx + w + POINTER_GAP} y={top + slotY(slot) + (SLOT_H - LABEL_H) / 2} />
  );
  const centred = (text: string, y: number) => <Text text={text} size="note" muted x={sx + (w - textW(text, "note")) / 2} y={y} />;
  return (
    <Diagram
      caption={
        overflow
          ? "Input written past the buffer continues upward to the return address, so ret loads an input value into rip."
          : "After the prologue, rbp points at the saved rbp and rsp points at the bottom of the local area."
      }
    >
      <Free>
        {overflow ? <Node id="rip" title="rip" mono x={sx + (w - 48) / 2} y={0} w={48} /> : centred("higher addresses", 0)}
        {FRAME.map((s, i) => (
          <Text key={s.offset} text={s.offset} size="note" mono muted x={0} y={top + slotY(i) + (SLOT_H - NOTE_H) / 2} />
        ))}
        {slots.map((s, i) => (
          <Node key={i} id={`slot${i}`} title={s.label} mono={s.mono} tone={s.tone} x={sx} y={top + slotY(i)} w={w} h={SLOT_H} />
        ))}
        {!overflow && pointer("rbp", 1)}
        {!overflow && pointer("rsp", last)}
        {centred("lower addresses", top + slotY(last) + SLOT_H + 8)}
      </Free>
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
