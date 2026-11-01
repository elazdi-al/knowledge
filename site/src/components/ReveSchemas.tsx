import { Canvas, Diagram, Edge, FONT, LINE_H, measure, Path, Poly, Space, Table, TABLE, Text, type TableRow, type Tone } from "figure";

const NOTE_H = LINE_H.note;
const LABEL_H = LINE_H.label;
const TITLE_GAP = 10;

/** Width of a `Text` drawn at `size`; mono text draws half a pixel smaller. */
const textW = (text: string, size: "label" | "note", mono = false) => measure(text, (size === "note" ? FONT.note : FONT.label) - (mono ? 0.5 : 0), { mono });

/** A rectangle with one centred mono label, the unit of every column here. */
function band(key: string, label: string, x: number, y: number, w: number, h: number, tone: Tone) {
  return [
    <Poly key={`${key}-box`} points={[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]} tone={tone} outline />,
    <Text key={`${key}-label`} text={label} mono tone={tone} at={[x + (w - textW(label, "label", true)) / 2, y + (h - LABEL_H) / 2]} anchor="nw" />,
  ];
}

function title(text: string, x: number, w: number) {
  return <Text text={text} weight={600} at={[x + (w - measure(text, FONT.label, { weight: 600 })) / 2, 0]} anchor="nw" />;
}

const OWNED: Tone = "purple";
const GHIDRA: Tone = "teal";
const STEP_H = 36;
const STEP_GAP = 22;
const stepY = (i: number) => LABEL_H + TITLE_GAP + i * (STEP_H + STEP_GAP);

const RUST_STEPS = [
  { key: "analyze", label: "analyze(binary)", row: 0 },
  { key: "read", label: "read_export", row: 2 },
  { key: "model", label: "reve_model::Program", row: 3 },
  { key: "panes", label: "panes", row: 4 },
];
const JVM_STEPS: { key: string; label: string; tone: Tone }[] = [
  { key: "import", label: "import, auto-analysis", tone: GHIDRA },
  { key: "decompile", label: "decompiler", tone: GHIDRA },
  { key: "export", label: "Export.java", tone: OWNED },
];

/** Both processes side by side: a saved analysis takes the left column straight down, and a new binary detours through Ghidra. */
export function RevePipelineDiagram() {
  const leftW = textW("reve_model::Program", "label", true) + 28;
  const rightW = textW("import, auto-analysis", "label", true) + 28;
  const gap = textW("analyzeHeadless", "note", true) + 28;
  const rightX = leftW + gap;
  const midY = (row: number) => stepY(row) + STEP_H / 2;
  const legendY = stepY(3);
  return (
    <Diagram caption="A saved analysis takes the hit path. A new binary runs Ghidra once, and rêve saves its result.pb.">
      <Canvas>
        {title("rêve process (Rust)", 0, leftW)}
        {title("Ghidra process (JVM)", rightX, rightW)}
        {RUST_STEPS.map((s) => [
          band(s.key, s.label, 0, stepY(s.row), leftW, STEP_H, OWNED),
          <Space key={`${s.key}-top`} id={`${s.key}-top`} at={[leftW / 2, stepY(s.row)]} />,
          <Space key={`${s.key}-bottom`} id={`${s.key}-bottom`} at={[leftW / 2, stepY(s.row) + STEP_H]} />,
        ])}
        {JVM_STEPS.map((s, i) => [
          band(s.key, s.label, rightX, stepY(i), rightW, STEP_H, s.tone),
          <Space key={`${s.key}-top`} id={`${s.key}-top`} at={[rightX + rightW / 2, stepY(i)]} />,
          <Space key={`${s.key}-bottom`} id={`${s.key}-bottom`} at={[rightX + rightW / 2, stepY(i) + STEP_H]} />,
        ])}
        <Text text="hit" size="note" muted at={[leftW / 2 + 8, midY(1) - NOTE_H / 2]} anchor="nw" />
        <Space id="spawn-from" at={[leftW, midY(0)]} />
        <Space id="spawn-to" at={[rightX, midY(0)]} />
        <Text text="miss" size="note" muted at={[leftW + (gap - textW("miss", "note")) / 2, midY(0) - NOTE_H - 3]} anchor="nw" />
        <Text text="analyzeHeadless" size="note" mono muted at={[leftW + (gap - textW("analyzeHeadless", "note", true)) / 2, midY(0) + 3]} anchor="nw" />
        <Space id="pb-from" at={[rightX, midY(2)]} />
        <Space id="pb-to" at={[leftW, midY(2)]} />
        <Text text="result.pb" size="note" mono muted at={[leftW + (gap - textW("result.pb", "note", true)) / 2, midY(2) - NOTE_H - 3]} anchor="nw" />
        {[
          { label: "rêve's code", tone: OWNED },
          { label: "Ghidra's code", tone: GHIDRA },
        ].map((l, i) => {
          const y = legendY + i * (NOTE_H + 8);
          return [
            <Poly key={`${l.label}-swatch`} points={[[rightX, y + 2], [rightX + 14, y + 2], [rightX + 14, y + NOTE_H - 2], [rightX, y + NOTE_H - 2]]} tone={l.tone} outline />,
            <Text key={l.label} text={l.label} size="note" muted at={[rightX + 22, y]} anchor="nw" />,
          ];
        })}
      </Canvas>
      <Edge from="spawn-from" to="spawn-to" route="straight" />
      <Edge from="import-bottom" to="decompile-top" route="straight" tone={GHIDRA} />
      <Edge from="decompile-bottom" to="export-top" route="straight" tone={GHIDRA} />
      <Edge from="pb-from" to="pb-to" route="straight" />
      <Edge from="analyze-bottom" to="read-top" route="straight" tone={OWNED} />
      <Edge from="read-bottom" to="model-top" route="straight" tone={OWNED} />
      <Edge from="model-bottom" to="panes-top" route="straight" tone={OWNED} />
    </Diagram>
  );
}

const ADD_INSTRUCTIONS = [
  ["0x100000", "PUSH RBP"],
  ["0x100001", "MOV RBP, RSP"],
  ["0x100004", "MOV dword ptr [RBP + -0x4], EDI"],
  ["0x100007", "MOV dword ptr [RBP + -0x8], ESI"],
  ["0x10000a", "MOV EAX, dword ptr [RBP + -0x4]"],
  ["0x10000d", "ADD EAX, dword ptr [RBP + -0x8]"],
  ["0x100010", "POP RBP"],
  ["0x100011", "RET"],
];
const ADD_LINKED = new Set(["0x10000d", "0x100011"]);
const ADD_C = ["int add(int param_1,int param_2)", "{", "  return param_1 + param_2;", "}"];
const C_LINK = 2;
const C_LINE_H = NOTE_H + 6;

/** Real export of `int add(int a, int b)`, x86-64 at -O0: one C line names two instructions, and the other six mark nothing. */
export function ReveLineAddressesDiagram() {
  const rows: TableRow[] = ADD_INSTRUCTIONS.map((cells) => ({ cells, state: ADD_LINKED.has(cells[0]) ? "active" : undefined }));
  const tableW = textW(ADD_INSTRUCTIONS[0][0], "label", true) + textW(ADD_INSTRUCTIONS[5][1], "label", true) + 4 * TABLE.padX;
  const cx = tableW + 44;
  const tableY = LABEL_H + TITLE_GAP;
  /** Puts the linked C line level with the row between the two instructions it names. */
  const codeY = tableY + 6.5 * TABLE.rowH - NOTE_H / 2 - C_LINK * C_LINE_H;
  return (
    <Diagram caption="Ghidra links the marked C line to the two instructions its tokens came from. The other six instructions mark no line.">
      <Canvas>
        <Text text="Listing" weight={600} at={[0, 0]} anchor="nw" />
        <Table id="code" rows={rows} at={[0, tableY]} anchor="nw" />
        <Text text="Decompile" weight={600} at={[cx, codeY - LABEL_H - TITLE_GAP]} anchor="nw" />
        {ADD_C.map((line, i) => (
          <Text key={line} text={line} size="note" mono state={i === C_LINK ? "active" : undefined} at={[cx, codeY + i * C_LINE_H]} anchor="nw" />
        ))}
        <Space id="c-link" at={[cx - 6, codeY + C_LINK * C_LINE_H + NOTE_H / 2]} />
      </Canvas>
      <Edge from="c-link" to="code.r5" route="ortho" toSide="right" state="active" />
      <Edge from="c-link" to="code.r7" route="ortho" toSide="right" state="active" />
    </Diagram>
  );
}

const LISTING_PARTS: { label: string; h: number; tone: Tone }[] = [
  { label: "program, rows", h: 30, tone: OWNED },
  { label: "cursor", h: 60, tone: "blue" },
  { label: "history", h: 30, tone: OWNED },
];
const FOLLOWERS = ["Symbol Tree", "Decompile", "Functions"];
const FOLLOWER_H = 40;

/** The listing entity holds the state; the other panes hold a handle to it and only follow. */
export function ReveCursorDiagram() {
  const leftW = textW("program, rows", "label", true) + 28;
  const rightW = textW("Symbol Tree", "label", true) + 40;
  const gap = textW("go_to, move_to", "note", true) + 32;
  const rightX = leftW + gap;
  const top = LABEL_H + TITLE_GAP;
  /** On the seams between followers, so the arrows belong to the whole stack and not to one pane. */
  const pressY = top + FOLLOWER_H;
  const observeY = top + 2 * FOLLOWER_H;
  let y = top;
  return (
    <Diagram caption="A press in any pane moves the listing's cursor. Every pane then observes the listing and redraws from the cursor.">
      <Canvas>
        {title("Listing", 0, leftW)}
        {title("Following panes", rightX, rightW)}
        {LISTING_PARTS.map((p) => {
          const placed = band(p.label, p.label, 0, y, leftW, p.h, p.tone);
          y += p.h;
          return placed;
        })}
        {FOLLOWERS.map((f, i) => band(f, f, rightX, top + i * FOLLOWER_H, rightW, FOLLOWER_H, OWNED))}
        <Space id="press-from" at={[rightX, pressY]} />
        <Space id="press-to" at={[leftW, pressY]} />
        <Text text="go_to, move_to" size="note" mono muted at={[leftW + (gap - textW("go_to, move_to", "note", true)) / 2, pressY - NOTE_H - 3]} anchor="nw" />
        <Space id="observe-from" at={[leftW, observeY]} />
        <Space id="observe-to" at={[rightX, observeY]} />
        <Text text="cx.observe" size="note" mono muted at={[leftW + (gap - textW("cx.observe", "note", true)) / 2, observeY + 3]} anchor="nw" />
      </Canvas>
      <Edge from="press-from" to="press-to" route="straight" />
      <Edge from="observe-from" to="observe-to" route="straight" />
    </Diagram>
  );
}

const ARCH_H = 26;
const ARCH_GAP = 6;
const ARCH_PAD = 12;
const ARCH_PITCH = ARCH_H + ARCH_GAP;
/** Height of `rows` cells stacked on the shared grid. */
const archSpan = (rows: number) => rows * ARCH_PITCH - ARCH_GAP;

interface ArchCell {
  label: string;
  x: number;
  y: number;
  w: number;
  h?: number;
  tone?: Tone;
}

/** Fills `w` with one row of cells, sharing the spare width equally so every label keeps the same padding. */
function archRow(labels: string[], x: number, y: number, w: number, tone?: Tone): ArchCell[] {
  const widths = labels.map((l) => textW(l, "note", true));
  const spare = (w - widths.reduce((a, b) => a + b, 0) - ARCH_GAP * (labels.length - 1)) / labels.length;
  let at = x;
  return labels.map((label, i) => {
    const cell = { label, x: at, y, w: widths[i] + spare, tone };
    at += cell.w + ARCH_GAP;
    return cell;
  });
}

function archCell({ label, x, y, w, h = ARCH_H, tone }: ArchCell) {
  return [
    <Poly key={`${label}-${x}-${y}-box`} points={[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]} tone={tone} outline />,
    <Text key={`${label}-${x}-${y}`} text={label} size="note" mono tone={tone} align="center" at={[x + w / 2, y + h / 2]} />,
  ];
}

/** A dashed process boundary with its title level with the first row of cells. */
function archFrame(title: string, x: number, y: number, w: number, h: number) {
  return [
    <Path key={`${title}-frame`} points={[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]} dashed thin />,
    <Text key={title} text={title} weight={600} at={[x + ARCH_PAD, y + ARCH_PAD + (ARCH_H - LABEL_H) / 2]} anchor="nw" />,
  ];
}

const archNote = (text: string, x: number, y: number) => <Text key={`${text}-${x}-${y}`} text={text} size="note" muted at={[x, y]} anchor="nw" />;
const archNoteEnd = (text: string, right: number, y: number) => archNote(text, right - textW(text, "note"), y);
const archNoteMid = (text: string, from: number, to: number, y: number) => archNote(text, (from + to - textW(text, "note")) / 2, y);

/** Every class a call passes through, from the root view down to the native decompiler. Hue is ownership; dashes are build-time generation. */
export function ReveArchitectureDiagram() {
  const W = 640;
  const LEFT = 12;
  const END = W - 12;
  const UI_W = 196;
  const MODEL = 254;
  const MODEL_W = 104;
  const ADAPTER = 404;
  const ADAPTER_W = END - ADAPTER;
  const half = (ADAPTER_W - ARCH_GAP) / 2;
  const HEADER = NOTE_H + 3;

  const reveY = ARCH_PAD;
  const gridY = reveY + ARCH_H + 34;
  const row = (i: number) => gridY + i * ARCH_PITCH;
  const rowMid = (i: number) => row(i) + ARCH_H / 2;
  const rustBottom = row(4) + ARCH_H + ARCH_PAD;

  const protoY = rustBottom + 15;
  const protoMid = protoY + ARCH_H / 2;
  const elbowY = rustBottom + 44;

  const jvmTop = rustBottom + 56;
  const chainY = jvmTop + ARCH_PAD;
  const exportY = chainY + ARCH_PITCH;
  const exportH = archSpan(2);
  const chainBottom = chainY + archSpan(3);
  const apiY = chainBottom + 30;
  const apiBottom = apiY + archSpan(3);
  const internalsY = apiBottom + 34;
  const internalsH = archSpan(2);
  const jvmBottom = internalsY + internalsH + ARCH_PAD;
  const nativeTop = jvmBottom + 28;
  const nativeH = ARCH_H + 2 * ARCH_PAD;

  const SPLIT = 290;
  const PROGRAM = 302;
  const PROGRAM_W = 238;
  const ENGINE_X = 140;
  const ENGINE_W = 76;
  const EXPORT_X = 252;
  const EXPORT_W = 108;
  const readX = ADAPTER + half / 2;
  const spawnX = ADAPTER + half + ARCH_GAP + half / 2;
  const bgX = ADAPTER + 92;
  const protoX = ENGINE_X + ENGINE_W / 2 - 54;
  const protoEnd = protoX + 108;
  const lane = 381;
  const resultX = 340;
  const decompileX = 270;
  const readsX = 340;
  const interfaceX = 130;
  const fillsX = 460;
  const importX = 584;
  const pipeX = 200;

  const cells: ArchCell[] = [
    { label: "Reve", x: 100, y: reveY, w: END - 100, tone: OWNED },
    ...archRow(["Listing", "Symbols"], LEFT, row(0), UI_W, OWNED),
    ...archRow(["Decompile", "Functions"], LEFT, row(1), UI_W, OWNED),
    ...archRow(["Header", "Hud", "Logo", "menu"], LEFT, row(2), UI_W, OWNED),
    ...archRow(["gpui-kit", "GPUI"], LEFT, row(4), UI_W),
    { label: "Program", x: MODEL, y: row(0), w: MODEL_W, tone: OWNED },
    { label: "Function", x: MODEL, y: row(1), w: MODEL_W, tone: OWNED },
    { label: "Instruction", x: MODEL, y: row(2), w: MODEL_W, tone: OWNED },
    { label: "Decompilation", x: MODEL, y: row(3), w: MODEL_W, tone: OWNED },
    ...archRow(["Line", "Token"], MODEL, row(4), MODEL_W, OWNED),
    { label: "GhidraAdapter", x: ADAPTER, y: row(0), w: ADAPTER_W, tone: OWNED },
    ...archRow(["saved_export", "GhidraConfig"], ADAPTER, row(1), ADAPTER_W, OWNED),
    ...archRow(["read_export", "JobDirectory"], ADAPTER, row(2), ADAPTER_W, OWNED),
    ...archRow(["into_model", "ParserError"], ADAPTER, row(3), ADAPTER_W, OWNED),
    { label: "wire::*", x: ADAPTER, y: row(4), w: half, tone: OWNED },
    { label: "run_headless", x: ADAPTER + half + ARCH_GAP, y: row(4), w: half, tone: OWNED },
    { label: "engine.proto", x: protoX, y: protoY, w: protoEnd - protoX, tone: OWNED },
    { label: "analyzeHeadless", x: ADAPTER, y: chainY, w: ADAPTER_W, tone: GHIDRA },
    ...archRow(["launch.sh", "ghidra.Ghidra"], ADAPTER, chainY + ARCH_PITCH, ADAPTER_W, GHIDRA),
    { label: "HeadlessAnalyzer", x: ADAPTER, y: chainY + 2 * ARCH_PITCH, w: ADAPTER_W, tone: GHIDRA },
    { label: "Engine.*", x: ENGINE_X, y: exportY, w: ENGINE_W, h: exportH, tone: OWNED },
    { label: "Export\nGhidraScript", x: EXPORT_X, y: exportY, w: EXPORT_W, h: exportH, tone: OWNED },
    ...archRow(["DecompiledFunction", "DecompilerUtils"], LEFT, apiY, SPLIT - LEFT, GHIDRA),
    ...archRow(["ClangTokenGroup", "ClangLine", "ClangToken"], LEFT, apiY + ARCH_PITCH, SPLIT - LEFT, GHIDRA),
    ...archRow(["DecompInterface", "DecompileResults"], LEFT, apiY + 2 * ARCH_PITCH, SPLIT - LEFT, GHIDRA),
    ...archRow(["Language", "AddressSetView"], PROGRAM, apiY, PROGRAM_W, GHIDRA),
    ...archRow(["Listing", "Function", "Instruction"], PROGRAM, apiY + ARCH_PITCH, PROGRAM_W, GHIDRA),
    ...archRow(["Program", "FunctionManager"], PROGRAM, apiY + 2 * ARCH_PITCH, PROGRAM_W, GHIDRA),
    { label: "DecompileProcess", x: LEFT, y: internalsY, w: SPLIT - LEFT, h: internalsH, tone: GHIDRA },
    ...archRow(["SleighLanguage", "ElfLoader", "ProgramLoader"], PROGRAM, internalsY, END - PROGRAM, GHIDRA),
    ...archRow(["AutoAnalysisManager", "EntryPointAnalyzer"], PROGRAM, internalsY + ARCH_PITCH, END - PROGRAM, GHIDRA),
    { label: "decompile", x: 110, y: nativeTop + ARCH_PAD, w: SPLIT - 110, tone: GHIDRA },
  ];

  const legendX = 340;
  const legendY = nativeTop + 2;
  const legendGap = NOTE_H + 8;
  const swatches: { label: string; tone?: Tone; x: number }[] = [
    { label: "rêve", tone: OWNED, x: legendX },
    { label: "Ghidra", tone: GHIDRA, x: legendX + 94 },
    { label: "third party", x: legendX + 188 },
  ];

  return (
    <Diagram caption="Calls run downward through the layers. Upward arrows carry data.">
      <Canvas>
        {archFrame("rêve (Rust)", 0, 0, W, rustBottom)}
        {archFrame("Ghidra (JVM)", 0, jvmTop, W, jvmBottom - jvmTop)}
        {archFrame("Native (C++)", 0, nativeTop, SPLIT + 12, nativeH)}
        {cells.map(archCell)}

        {archNote("reve-ui", LEFT, gridY - HEADER)}
        {archNote("reve-model", MODEL, gridY - HEADER)}
        {archNote("adapter", ADAPTER, gridY - HEADER)}
        {archNote("extension", EXPORT_X, exportY - HEADER)}
        {archNote("API", LEFT, apiY - HEADER)}
        {archNote("internals", LEFT, internalsY - HEADER)}

        <Edge from={[150, reveY + ARCH_H]} to={[150, gridY]} route="straight" tone={OWNED} />
        {archNote("cx.new", 158, gridY - HEADER)}
        <Edge from={[bgX, reveY + ARCH_H]} to={[bgX, gridY]} route="straight" tone={OWNED} />
        {archNote("background_spawn", bgX + 8, gridY - HEADER)}
        <Edge from={[LEFT + UI_W, rowMid(1)]} to={[MODEL, rowMid(1)]} route="straight" tone={OWNED} />
        {archNoteMid("reads", LEFT + UI_W, MODEL, rowMid(1) - NOTE_H - 3)}
        <Edge from={[ADAPTER, rowMid(3)]} to={[MODEL + MODEL_W, rowMid(3)]} route="straight" tone={OWNED} />
        {archNoteMid("builds", MODEL + MODEL_W, ADAPTER, rowMid(3) - NOTE_H - 3)}
        <Edge from={[LEFT + UI_W / 2, row(2) + ARCH_H]} to={[LEFT + UI_W / 2, row(4)]} route="straight" />
        {archNote("draws", LEFT + UI_W / 2 + 8, rowMid(3) - NOTE_H / 2)}

        <Edge from={[protoEnd, protoMid]} via={[[lane, protoMid], [lane, rowMid(4)]]} to={[ADAPTER, rowMid(4)]} route="straight" tone={OWNED} dashed />
        {archNote("prost-build", protoEnd + 8, protoMid - NOTE_H - 3)}
        <Edge from={[protoX + 54, protoY + ARCH_H]} to={[protoX + 54, exportY]} route="straight" tone={OWNED} dashed />
        {archNote("protoc", protoX + 62, jvmTop + 8)}
        <Edge from={[resultX, exportY]} via={[[resultX, elbowY], [readX, elbowY]]} to={[readX, row(4) + ARCH_H]} route="straight" />
        {archNote("result.pb", readX + 8, rustBottom + 8)}
        <Edge from={[spawnX, row(4) + ARCH_H]} to={[spawnX, chainY]} route="straight" />
        {archNote("spawn", spawnX + 8, rustBottom + 8)}

        <Edge from={[ADAPTER, chainY + 2 * ARCH_PITCH + ARCH_H / 2]} to={[EXPORT_X + EXPORT_W, chainY + 2 * ARCH_PITCH + ARCH_H / 2]} route="straight" tone={GHIDRA} />
        {archNoteMid("runs", EXPORT_X + EXPORT_W, ADAPTER, chainY + 2 * ARCH_PITCH + ARCH_H / 2 - NOTE_H - 3)}
        <Edge from={[EXPORT_X, exportY + exportH / 2]} to={[ENGINE_X + ENGINE_W, exportY + exportH / 2]} route="straight" tone={OWNED} />
        <Edge from={[decompileX, exportY + exportH]} to={[decompileX, apiY]} route="straight" tone={OWNED} />
        {archNoteEnd("decompiles", decompileX - 8, chainBottom + 7)}
        <Edge from={[readsX, exportY + exportH]} to={[readsX, apiY]} route="straight" tone={OWNED} />
        {archNote("reads", readsX + 8, chainBottom + 7)}
        <Edge from={[interfaceX, apiBottom]} to={[interfaceX, internalsY]} route="straight" tone={GHIDRA} />
        {archNote("decompileFunction", interfaceX + 8, apiBottom + 9)}
        <Edge from={[fillsX, internalsY]} to={[fillsX, apiBottom]} route="straight" tone={GHIDRA} />
        {archNoteEnd("fills", fillsX - 8, apiBottom + 9)}
        <Edge from={[importX, chainBottom]} to={[importX, internalsY]} route="straight" tone={GHIDRA} />
        {archNoteEnd("imports, analyzes", importX - 8, apiBottom + 9)}

        <Edge from={[pipeX, internalsY + internalsH]} to={[pipeX, nativeTop + ARCH_PAD]} route="straight" tone={GHIDRA} />
        {archNote("pipes", pipeX + 8, jvmBottom + 6)}

        {swatches.map((s) => [
          <Poly key={`${s.label}-swatch`} points={[[s.x, legendY + 2], [s.x + 22, legendY + 2], [s.x + 22, legendY + NOTE_H - 2], [s.x, legendY + NOTE_H - 2]]} tone={s.tone} outline />,
          archNote(s.label, s.x + 30, legendY),
        ])}
        <Edge from={[legendX, legendY + legendGap + NOTE_H / 2]} to={[legendX + 22, legendY + legendGap + NOTE_H / 2]} route="straight" />
        {archNote("run time", legendX + 30, legendY + legendGap)}
        <Edge from={[legendX + 94, legendY + legendGap + NOTE_H / 2]} to={[legendX + 116, legendY + legendGap + NOTE_H / 2]} route="straight" dashed />
        {archNote("build time", legendX + 124, legendY + legendGap)}
      </Canvas>
    </Diagram>
  );
}

const SCHEMA_ROW = 22;
const SCHEMA_PAD = 10;
const SCHEMA_COL = 12;
const SCHEMA_TITLE = LABEL_H + 6;

interface SchemaBox {
  title: string;
  fields: [string, string][];
  x: number;
  y: number;
}

const schemaColumns = (fields: [string, string][]) => [
  Math.max(...fields.map((_, i) => textW(String(i + 1), "note", true))),
  Math.max(...fields.map(([name]) => textW(name, "note", true))),
  Math.max(...fields.map(([, type]) => textW(type, "note", true))),
];
const schemaW = (fields: [string, string][]) => schemaColumns(fields).reduce((a, b) => a + b, 0) + 2 * SCHEMA_COL + 2 * SCHEMA_PAD;
const schemaRowMid = (box: SchemaBox, i: number) => box.y + SCHEMA_TITLE + (i + 0.5) * SCHEMA_ROW;
const schemaBottom = (box: SchemaBox) => box.y + SCHEMA_TITLE + box.fields.length * SCHEMA_ROW;

function schemaBox(box: SchemaBox) {
  const { title: name, fields, x, y } = box;
  const [numW, nameW] = schemaColumns(fields);
  const w = schemaW(fields);
  const top = y + SCHEMA_TITLE;
  const bottom = schemaBottom(box);
  return [
    <Text key={name} text={name} mono weight={600} at={[x, y]} anchor="nw" />,
    <Poly key={`${name}-box`} points={[[x, top], [x + w, top], [x + w, bottom], [x, bottom]]} tone={OWNED} outline />,
    fields.map(([field, type], i) => {
      const mid = schemaRowMid(box, i);
      const textY = mid - NOTE_H / 2;
      return [
        <Text key={`${name}-${field}-n`} text={String(i + 1)} size="note" mono muted at={[x + SCHEMA_PAD, textY]} anchor="nw" />,
        <Text key={`${name}-${field}`} text={field} size="note" mono tone={OWNED} at={[x + SCHEMA_PAD + numW + SCHEMA_COL, textY]} anchor="nw" />,
        <Text key={`${name}-${field}-t`} text={type} size="note" mono muted at={[x + SCHEMA_PAD + numW + SCHEMA_COL + nameW + SCHEMA_COL, textY]} anchor="nw" />,
      ];
    }),
  ];
}

/** Every message in `engine.proto`, with field numbers and types. An arrow leads from a message field to the message it holds. */
export function ReveSchemaDiagram() {
  const W = 640;
  const programF: [string, string][] = [["name", "string"], ["format", "string"], ["architecture", "string"], ["address_size_bits", "uint32"], ["functions", "repeated"]];
  const functionF: [string, string][] = [["name", "string"], ["entry", "uint64"], ["size", "uint64"], ["instructions", "repeated"], ["decompilation", "message"]];
  const instructionF: [string, string][] = [["address", "uint64"], ["size", "uint32"], ["mnemonic", "string"], ["operands", "string"], ["bytes", "bytes"]];
  const decompF: [string, string][] = [["status", "Status"], ["signature", "string"], ["c_code", "string"], ["error_message", "optional string"], ["lines", "repeated"]];
  const lineF: [string, string][] = [["tokens", "repeated"], ["addresses", "repeated uint64"]];
  const tokenF: [string, string][] = [["text", "string"], ["kind", "Kind"]];

  const rowGap = 44;
  const row1H = SCHEMA_TITLE + 5 * SCHEMA_ROW;
  const row2Y = row1H + rowGap;
  const gap1 = (W - schemaW(programF) - schemaW(functionF) - schemaW(instructionF)) / 2;
  const gap2 = (W - schemaW(decompF) - schemaW(lineF) - schemaW(tokenF)) / 2;

  const program: SchemaBox = { title: "Program", fields: programF, x: 0, y: 0 };
  const fn: SchemaBox = { title: "Function", fields: functionF, x: schemaW(programF) + gap1, y: 0 };
  const instruction: SchemaBox = { title: "Instruction", fields: instructionF, x: W - schemaW(instructionF), y: 0 };
  const decompilation: SchemaBox = { title: "Decompilation", fields: decompF, x: 0, y: row2Y };
  const line: SchemaBox = { title: "Line", fields: lineF, x: schemaW(decompF) + gap2, y: row2Y };
  const token: SchemaBox = { title: "Token", fields: tokenF, x: W - schemaW(tokenF), y: row2Y };

  /** An elbow from a field's row, across the gap, up to the next message's title. */
  const link = (from: SchemaBox, row: number, to: SchemaBox) => {
    const x0 = from.x + schemaW(from.fields);
    const y0 = schemaRowMid(from, row);
    const mid = (x0 + to.x) / 2;
    const y1 = to.y + LABEL_H / 2;
    return <Edge key={`${from.title}-${to.title}`} from={[x0, y0]} via={[[mid, y0], [mid, y1]]} to={[to.x - 6, y1]} route="straight" tone={OWNED} />;
  };

  const downX = fn.x + schemaW(functionF) / 2;
  const elbowY = row1H + rowGap / 2;
  const intoX = decompilation.x + textW("Decompilation", "label", true) / 2;

  return (
    <Diagram caption="Rows give each field's number, name and type. Arrows lead to the message a field holds.">
      <Canvas>
        {[program, fn, instruction, decompilation, line, token].map(schemaBox)}
        {link(program, 4, fn)}
        {link(fn, 3, instruction)}
        {link(decompilation, 4, line)}
        {link(line, 0, token)}
        <Edge key="function-decompilation" from={[downX, row1H]} via={[[downX, elbowY], [intoX, elbowY]]} to={[intoX, row2Y - 3]} route="straight" tone={OWNED} />
      </Canvas>
    </Diagram>
  );
}

/** One schema, two generators and a hand-written model, with the file between the two processes. */
export function ReveFamiliesDiagram() {
  const H = 34;
  const pad = 16;
  const boxes = [
    { key: "engine", label: "Engine.Program", sub: "Java, generated", tone: OWNED as Tone | undefined },
    { key: "file", label: "result.pb", sub: "bytes on disk", tone: undefined },
    { key: "wire", label: "wire::Program", sub: "Rust, generated", tone: OWNED as Tone | undefined },
    { key: "model", label: "reve_model::Program", sub: "Rust, by hand", tone: OWNED as Tone | undefined },
  ];
  const widths = boxes.map((b) => Math.max(textW(b.label, "note", true), textW(b.sub, "note")) + pad);
  const labels = ["writeTo", "decode", "into_model"];
  const gaps = labels.map((l) => textW(l, "note", true) + 12);
  const xs = widths.reduce<number[]>((acc, w, i) => [...acc, i === 0 ? 0 : acc[i - 1] + widths[i - 1] + gaps[i - 1]], []);
  const protoH = 28;
  const rowY = protoH + 46;
  const midY = rowY + H / 2;
  const center = (i: number) => xs[i] + widths[i] / 2;
  const protoW = textW("engine.proto", "note", true) + pad;
  const protoX = center(1) - protoW / 2;
  const protoMid = protoH / 2;
  return (
    <Diagram caption="Dashes generate code at build time. Solid arrows carry one analysis at run time.">
      <Canvas>
        {archCell({ label: "engine.proto", x: protoX, y: 0, w: protoW, h: protoH, tone: OWNED })}
        {boxes.map((b, i) => [
          archCell({ label: b.label, x: xs[i], y: rowY, w: widths[i], h: H, tone: b.tone }),
          <Text key={`${b.key}-sub`} text={b.sub} size="note" muted align="center" at={[center(i), rowY + H + 6 + NOTE_H / 2]} />,
        ])}
        {labels.map((label, i) => {
          const x0 = xs[i] + widths[i];
          const x1 = xs[i + 1];
          return [
            <Edge key={`${label}-edge`} from={[x0, midY]} to={[x1, midY]} route="straight" tone={OWNED} />,
            <Text key={label} text={label} size="note" mono muted at={[(x0 + x1 - textW(label, "note", true)) / 2, midY - NOTE_H - 3]} anchor="nw" />,
          ];
        })}
        <Edge from={[protoX, protoMid]} via={[[center(0), protoMid]]} to={[center(0), rowY]} route="straight" tone={OWNED} dashed />
        <Text text="protoc" size="note" mono muted at={[center(0) + 8, protoH + 6]} anchor="nw" />
        <Edge from={[protoX + protoW, protoMid]} via={[[center(2), protoMid]]} to={[center(2), rowY]} route="straight" tone={OWNED} dashed />
        <Text text="prost-build" size="note" mono muted at={[center(2) + 8, protoH + 6]} anchor="nw" />
      </Canvas>
    </Diagram>
  );
}
