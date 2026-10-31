// Each entry is a mistake an author can make and the code the engine must answer it with.
import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { Brace, Curve, Plot, Scatter, Tree, Canvas, Cells, Circle, Col, Edge, Fit, Graph, layoutScene, Legend, Line, Node, Row, Svg, Text, toScene, type DiagnosticCode, type Op } from "figure";

const any = (props: object): object => props;
const cases: [string, DiagnosticCode, ReactNode][] = [
  ["typo in edge id", "edge/unknown-endpoint", <><Node id="a" /><Edge from="a" to="bb" /></>],
  ["typo in part id", "edge/unknown-endpoint", <><Node id="a" /><Cells id="b" items={[1, 2]} /><Edge from="a" to="b.7" /></>],
  ["duplicate id", "id/duplicate", <><Node id="a" /><Node id="a" /></>],
  ["author uses the root id", "id/duplicate", <Node id="root" />],
  ["bad tone", "prop/invalid", <Node {...any({ tone: "orange" })} />],
  ["bad state", "prop/invalid", <Node {...any({ state: "actve" })} />],
  ["bad shape", "prop/invalid", <Node {...any({ shape: "hexagon" })} />],
  ["bad route", "prop/invalid", <><Node id="a" /><Edge from="a" to="a" {...any({ route: "elbow" })} /></>],
  ["unknown prop", "prop/invalid", <Node {...any({ label: "A" })} />],
  ["point end outside a canvas", "edge/point-outside-canvas", <><Node id="a" /><Edge from="a" to={[10, 10]} /></>],
  ["line break in an edge label", "prop/invalid", <><Node id="a" /><Node id="b" /><Edge from="a" to="b" label={"x\ny"} /></>],
  ["brace on a missing id", "edge/unknown-endpoint", <><Node id="a" /><Brace from="a" to="z" /></>],
  ["brace over a neighbour", "overlay/overlap", <Col gap={4}><Node id="a" title="a" /><Node id="b" title="b" /><Brace from="a" to="a" label="x" /></Col>],
  ["position outside a canvas", "prop/ignored", <Row><Node at={[1, 1]} /></Row>],
  ["edge to a layout box", "edge/invisible-endpoint", <><Col id="c"><Node id="a" /></Col><Node id="b" /><Edge from="c" to="b" /></>],
  ["figure too wide", "frame/too-wide", <Node title={"long title ".repeat(12)} />],
  ["title wider than its node", "node/title-overflow", <Node title="a long title here" w={20} />],
  ["siblings overlap", "siblings/overlap", <Row gap={-20}><Node title="a" /><Node title="b" /></Row>],
  ["edge through a node", "edge/crosses-shape", <><Row gap={80}><Node id="a" title="a" /><Node id="b" title="b" /><Node id="c" title="c" /></Row><Edge from="a" to="c" route="straight" /></>],
];
for (const [name, code, figure] of cases) {
  const codes = layoutScene(toScene(figure)).diagnostics.map((d) => d.code);
  assert(codes.includes(code), `${name}: expected ${code}, got [${codes}]`);
}
const typo = layoutScene(toScene(<><Node id="handler" /><Edge from="handler" to="handlr" /></>)).diagnostics[0];
assert.equal(typo.hint, 'Did you mean "handler"?');
const clean = layoutScene(toScene(<Canvas><Node id="a" title="a" at={[0, 0]} anchor="nw" /><Node id="b" title="b" at={[100, 0]} anchor="nw" /><Edge from="a" to="b" /></Canvas>));
assert.deepEqual(clean.diagnostics, []);
const line = layoutScene(toScene(<Canvas><Node id="a" title="a" at={[0, 0]} anchor="nw" /><Edge from="a" to={[200, 16]} label="out" /><Edge from={[0, 100]} to={[200, 100]} via={[[100, 60]]} layer="below" /></Canvas>));
assert.deepEqual(line.diagnostics, []);
assert.equal(line.routes[0].pts.at(-1)!.x - line.boxes.find((b) => b.id === "a")!.rect.x, 200);
assert.equal(line.routes[1].pts.length, 3);
assert.equal(line.ops[0].el, "g", "a below edge is drawn first");
const frame = (figure: React.ReactNode) => {
  const f = layoutScene(toScene(figure));
  assert.deepEqual(f.diagnostics, []);
  return f;
};
const flat = (ops: Op[]): Op[] => ops.flatMap((o) => ("kids" in o ? [o, ...flat(o.kids)] : [o]));
const texts = (f: { ops: Op[] }) => flat(f.ops).filter((o) => o.el === "text");
const rectOf = (f: { boxes: { id: string; rect: object }[] }, id: string) => f.boxes.find((b) => b.id === id)!.rect as { x: number; y: number; w: number; h: number };

const anchored = frame(<Canvas><Node id="c" title="c" w={40} h={20} at={[100, 100]} /><Node id="w" title="w" w={40} h={20} at={[100, 100]} anchor="w" offset={5} /></Canvas>);
assert.equal(rectOf(anchored, "w").x - rectOf(anchored, "c").x, 25, "anchor and offset place by compass");
const union = frame(<Canvas id="u"><Circle id="c" at={[100, 100]} r={40} tone="blue" opacity={0.5} /></Canvas>);
assert.equal(rectOf(union, "u").w, 80, "a canvas is the union of its children");
assert.equal(flat(union.ops).find((o) => o.el === "ellipse")?.style?.opacity, 0.5);
assert.equal(frame(<Canvas><Line from={[0, 0]} to={[100, 0]} head="both" /></Canvas>).ops.length, 3, "a line draws itself and its heads");
assert.equal(texts(frame(<Text>{"one\ntwo"}</Text>)).length, 2, "text children and line breaks");
assert.equal(texts(frame(<Text text="many short words that wrap" maxWidth={60} />)).length > 2, true, "maxWidth wraps");
assert.equal(flat(frame(<Text text="y axis" rotate={-90} />).ops).filter((o) => o.el === "g").length, 1, "rotation wraps in a transform");
const tall = frame(<Text id="t" text="a long label" rotate={90} />);
assert.ok(rectOf(tall, "t").h > rectOf(tall, "t").w, "rotation swaps the box");
assert.ok(rectOf(frame(<Node id="n" title={"two\nlines"} />), "n").h > rectOf(frame(<Node id="n" title="one" />), "n").h, "a two-line title makes a taller node");
const same = frame(<Row id="r" uniform gap={0}><Node id="a" title="a" /><Node id="b" title="a much longer title" /></Row>);
assert.equal(rectOf(same, "a").w, rectOf(same, "b").w, "uniform");
assert.equal(frame(<Fit max={100}><Node title="a title far wider than the limit it was given" /><Node title="narrow" /></Fit>).w < 200, true, "Fit takes the first that fits");
const braced = frame(<><Cells id="arr" items={[1, 2, 3, 4]} index /><Brace from="arr.1" to="arr.2" label="slice" /></>);
assert.ok(braced.h > rectOf(braced, "arr").h + 30, "the frame grows to hold a brace");
assert.ok(frame(<Legend items={[{ label: "a", tone: "blue" }, { label: "b", key: "dashed" }]} />).w > 0);
assert.equal(flat(frame(<Svg w={40} h={40}><path d="M0 0" /></Svg>).ops)[0].el, "raw");
const graph = frame(<><Graph><Node id="a" title="a" /><Node id="b" title="b" /><Node id="c" title="c" /></Graph><Edge from="a" to="b" /><Edge from="b" to="c" /><Edge from="a" to="c" /></>);
assert.ok(graph.routes.length === 3, "a long graph edge goes around what lies between");
const both = frame(<Row gap={80}><Node id="a" title="a" /><Node id="b" title="b" /><Edge from="a" to="b" /><Edge from="b" to="a" /></Row>);
assert.notEqual(both.routes[0].d, both.routes[1].d.split(" ").reverse().join(" "));
assert.ok(both.routes.every((r) => r.d.includes("Q")), "opposite edges bow apart");
const tree = frame(<Tree root={{ id: "r", title: "r", children: [{ id: "x", title: "x" }, { id: "y", title: "y", children: [{ id: "z", title: "z" }] }] }} />);
assert.ok(rectOf(tree, "x").x < rectOf(tree, "y").x, "tree children stay in order");
assert.ok(rectOf(tree, "r").y < rectOf(tree, "x").y && rectOf(tree, "y").y < rectOf(tree, "z").y, "a tree runs top down");
const plot = frame(<Plot legend x={{ domain: [0, 10], title: "x" }} y={{ domain: [0, 10], title: "y" }}><Scatter name="data" points={[[1, 2], [4, 5]]} tone="blue" /><Curve name="fit" f={(v) => v * 2} tone="red" /></Plot>);
assert.ok(texts(plot).some((o) => o.el === "text" && o.text === "fit"), "the legend names the series");
assert.ok(texts(plot).filter((o) => o.el === "text" && /^\d+$/.test(o.text)).length >= 10, "axes have tick labels");
console.log(`${cases.length} diagnostics behave`);
