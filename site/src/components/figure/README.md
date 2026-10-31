# figure

Draw figures in TypeScript. You describe the structure; the library measures text, lays out, routes lines, and reports mistakes. A figure renders to static SVG at build time, with no client JavaScript, and follows the site's themes.

## The loop

Write the figure in a `.tsx` file, then check it:

```sh
bun run figure:preview path/to/figure.tsx   # diagnostics, every box's position, and a PNG
```

The file exports the figure as a component, as `export default`. Read the diagnostics first. An error throws in the build; a warning fails `check:figures`. Each one names the problem and usually the fix, such as `Did you mean "handler"?`.

## Which tool

Start at the top and stop at the first row that fits. Tiers nest: a `Plot` can sit in a `Group`, a `Canvas` in a `Row`.

| You have | Use |
|---|---|
| boxes and arrows, no fixed positions | `Graph` |
| a tree | `Tree` |
| states and transitions | `Automaton` |
| a function, data or geometry on axes | `Plot`, `Scatter`, `Curve`, `Series` |
| messages over time | `SequenceChart`, `TimeSpace` |
| boxes in a known arrangement | `Row`, `Col`, `Grid`, `Group` with `Node`, `Cells`, `Table`, `Text`, `Tag`, `Edge`, `Brace` |
| exact shapes at coordinates | `Canvas` with `Circle`, `Ellipse`, `Poly`, `Path`, `Line`, `Dot`, `Text` |
| something none of these draws | `<Svg>` for one-off SVG, `mark()` for a reusable mark |

## Examples

Every example in this file is rendered by `bun run check:readme`, so they stay correct.

A graph. The layout ranks the nodes, routes long edges around what lies between, and bows opposite edges apart.

```tsx
<>
  <Graph>
    <Node id="req" title="Request" />
    <Node id="auth" title="Auth" tone="blue" />
    <Node id="handler" title="Handler" />
    <Node id="db" shape="cylinder" title="DB" />
  </Graph>
  <Edge from="req" to="auth" />
  <Edge from="auth" to="handler" label="ok" />
  <Edge from="handler" to="auth" label="retry" />
  <Edge from="handler" to="db" />
  <Edge from="req" to="db" dashed label="cached" />
</>
```

A tree.

```tsx
<Tree root={{ id: "r", title: "root", children: [{ id: "a", title: "left" }, { id: "b", title: "right", children: [{ id: "c", title: "leaf" }] }] }} />
```

An automaton.

```tsx
<Automaton
  states={[{ id: "q0" }, { id: "q1" }, { id: "q2", accepting: true }]}
  transitions={[
    { from: "q0", to: "q1", label: "a" },
    { from: "q1", to: "q0", label: "b" },
    { from: "q1", to: "q1", label: "a" },
    { from: "q1", to: "q2", label: "b" },
  ]}
/>
```

A plot. Ticks are chosen for you; pass `ticks` to set them. For anything else on the axes, pass a function of the plot's area.

```tsx
<Plot w={400} h={200} legend x={{ domain: [0, 10], title: "x (input)" }} y={{ domain: [0, 10], title: "y (response)" }}>
  <Scatter name="data" points={[[1, 2.1], [3, 3.9], [5, 5.2], [8, 7.1]]} tone="blue" />
  <Curve name="fit" f={(x) => 1.4 + 0.75 * x} tone="red" />
</Plot>
```

A layout. Edges address the parts of `Cells` and `Table` by id: `arr.3`, or `rows.r1`. Gaps grow by themselves to fit an edge and its label.

```tsx
<>
  <Col gap={40}>
    <Node id="p" title="p" mono />
    <Cells id="arr" items={[7, 3, 9, 1, 4, 8]} index />
  </Col>
  <Edge from="p" to="arr.3" />
  <Brace from="arr.1" to="arr.2" label="slice" />
</>
```

A group with a title, and a table.

```tsx
<Row gap={24} align="start">
  <Group title="Client" tone="teal">
    <Node id="app" title="App" sub="v2" />
  </Group>
  <Table id="t" columns={["key", "value"]} rows={[["a", 1], { id: "hit", cells: ["b", 2], state: "active" }]} />
  <Edge from="app" to="hit" label="reads" />
</Row>
```

A canvas. Every child sits by `at`, a point; `anchor` says which part of it sits there (`c` by default, or a compass side, so `w` puts its west edge on the point and the child to the right); `offset` pushes it away. The canvas is exactly as big as what it holds. Edges inside a canvas may end on points and pass through `via` points.

```tsx
<Canvas>
  <Circle at={[120, 120]} r={80} tone="blue" opacity={0.5} />
  <Circle at={[220, 120]} r={80} tone="red" opacity={0.5} />
  <Text at={[120, 24]} text="Set A" />
  <Text at={[220, 24]} text="Set B" />
  <Text at={[170, 120]} text="$A \cap B$" />
  <Line from={[120, 210]} to={[220, 210]} head="both" />
  <Text at={[170, 210]} anchor="n" offset={4} size="note" muted text="distance" />
</Canvas>
```

Sizing to what is available. `Fit` takes the first child that fits; `uniform` gives a stack's children one size.

```tsx
<Fit max={300}>
  <Row uniform gap={8}><Node title="one long title" /><Node title="b" /><Node title="c" /></Row>
  <Col><Node title="one long title" /><Node title="b" /><Node title="c" /></Col>
</Fit>
```

Going custom. `Svg` holds any SVG in a measured box and takes part in layout and edges. A `mark` is written exactly as the built-in marks are: `props` lists what it accepts, which gives it the same errors, and `paint` returns drawing ops.

```tsx
const Gauge = mark<{ id?: string; value: number; tone?: Tone }, { value: number }>({
  kind: "gauge",
  props: { id: true, value: "number", tone: TONES },
  data: (p) => ({ value: p.value }),
  size: () => ({ w: 120, h: 12 }),
  paint: ({ rect: r, data, tone = "blue" }) => [
    { el: "rect", x: r.x, y: r.y, width: r.w, height: r.h, rx: 6, style: { fill: V("panel") } },
    { el: "rect", x: r.x, y: r.y, width: r.w * data.value, height: r.h, rx: 6, style: { fill: solid(tone) } },
  ],
});

<Row gap={16}>
  <Gauge id="g" value={0.7} />
  <Svg id="s" w={40} h={40}><path d="M0 40 L20 0 L40 40 Z" fill="var(--dg-blue-tint)" /></Svg>
  <Edge from="g" to="s" />
</Row>
```

Components you write yourself are plain functions returning marks; call them freely inside a figure. They cannot use state or context, because a figure is compiled once at build time.

## Text

Labels may hold TeX, `$A \cap B$`. `\n` breaks a line in `Text` and in a `Node` title, and `maxWidth` wraps both at spaces; edge labels are one line. Text is the `text` prop or the children on `Text`, `text` on `Tag`, `title` and `sub` on `Node`, `title` on `Group`, `label` on `Edge`, and `label` and `sub` on a cell.

`Text` takes `size` (`title`, `label`, `note`), `muted`, `mono`, `weight`, `align`, and `rotate` in degrees.

## Meaning

`tone` is a hue that carries meaning: `blue`, `teal`, `green`, `purple`, `red`. `state` is how an item is treated:

| State | Means |
|---|---|
| `default` | a normal item |
| `active` | the one to look at, in the accent colour |
| `strong` | emphasised, with a heavier outline |
| `placeholder` | a slot with nothing in it yet, dashed and italic |
| `free` | empty room, hatched |
| `ghost` | not here any more; its edges fade with it |

Fills follow nesting, so a node on a panel is light and a node on a light ground is grey. Do not set fills to get contrast. `fill`, `stroke` and `opacity` exist on canvas marks for shapes that need them.

Follow these when you draw:

- Keep one meaning per hue across a course, and at most three hues in a figure.
- Never use colour alone. Pair it with a label, a shape or a dash; `Legend` lists what each means.
- Do not use unicode arrows, bullets or ellipses in labels. Draw them: `Dots`, `head`, `Edge`.
- Keep figures under 720 px wide. Stack, or use `Row wrap`, or `Fit`.

## What the engine reports

| Code | Severity | Means |
|---|---|---|
| `edge/unknown-endpoint` | error | an edge or brace names an id that does not exist |
| `edge/point-outside-canvas` | error | an edge ends on a point outside a `Canvas` |
| `id/duplicate` | error | two items share an id; `root` is reserved |
| `prop/invalid` | error | an unknown prop, or a value it cannot take |
| `prop/ignored` | warning | `at`, `anchor` or `offset` outside a `Canvas` |
| `edge/invisible-endpoint` | warning | an edge ends on a layout box or empty room |
| `edge/crosses-shape` | warning | an edge runs through something that is not its end |
| `edge/label-overlap` | warning | an edge label sits on a shape or another label |
| `overlay/overlap` | warning | a `Brace` sits on a shape; give it room |
| `siblings/overlap` | warning | children of a stack or grid overlap |
| `node/title-overflow` | warning | a title is wider than a node with a set width |
| `frame/too-wide` | warning | wider than the content column |

## Reference

Props are documented on their types; your editor shows them. `layoutScene(toScene(children))` returns a frame, plain data: `{ w, h, ops, boxes, routes, diagnostics }`. Use `measure` and `LINE_H` when you must reason about text yourself.
