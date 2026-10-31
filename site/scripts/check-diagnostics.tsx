// Each entry is a mistake an author can make and the code the engine must answer it with.
import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { Cells, Col, Edge, Free, Graph, layoutScene, Node, Row, toScene, type DiagnosticCode } from "@/components/figure";

const any = (props: object) => props as never;
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
  ["position outside a canvas", "prop/ignored", <Row><Node x={1} y={1} /></Row>],
  ["edge to a layout box", "edge/invisible-endpoint", <><Col id="c"><Node id="a" /></Col><Node id="b" /><Edge from="c" to="b" /></>],
  ["figure too wide", "frame/too-wide", <Node title={"long title ".repeat(12)} />],
  ["title wider than its node", "node/title-overflow", <Node title="a long title here" w={20} />],
  ["siblings overlap", "siblings/overlap", <Row gap={-20}><Node title="a" /><Node title="b" /></Row>],
  ["long graph edge through a node", "edge/crosses-shape", <><Graph><Node id="a" title="a" /><Node id="b" title="b" /><Node id="c" title="c" /></Graph><Edge from="a" to="b" /><Edge from="b" to="c" /><Edge from="a" to="c" /></>],
];
for (const [name, code, figure] of cases) {
  const codes = layoutScene(toScene(figure)).diagnostics.map((d) => d.code);
  assert(codes.includes(code), `${name}: expected ${code}, got [${codes}]`);
}
const typo = layoutScene(toScene(<><Node id="handler" /><Edge from="handler" to="handlr" /></>)).diagnostics[0];
assert.equal(typo.hint, 'Did you mean "handler"?');
const clean = layoutScene(toScene(<Free><Node id="a" title="a" x={0} y={0} /><Node id="b" title="b" x={100} y={0} /><Edge from="a" to="b" /></Free>));
assert.deepEqual(clean.diagnostics, []);
console.log(`${cases.length} diagnostics behave`);
