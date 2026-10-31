// Moves figure source to the library's current API: imports from "figure", Free becomes Canvas, and x/y on a mark become at + anchor="nw".
// Usage: bun scripts/migrate-canvas.ts [files]. Without files, every .tsx in src/components. Safe to rerun.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const DIR = "src/components";
const MARKS = new Set(["Node", "Text", "Tag", "Cells", "Table", "Space", "Row", "Col", "Group", "Grid", "Graph", "Free", "Canvas"]);
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(DIR).filter((f) => f.endsWith(".tsx")).map((f) => `${DIR}/${f}`);

const valueOf = (a: ts.JsxAttribute | undefined) => {
  const init = a?.initializer;
  return !init ? "0" : ts.isJsxExpression(init) ? init.expression!.getText() : init.getText();
};

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: { start: number; end: number; text: string }[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      if (MARKS.has(n.tagName.getText())) {
        const attrs = n.attributes.properties.filter(ts.isJsxAttribute);
        const named = (name: string) => attrs.find((a) => a.name.getText() === name);
        const x = named("x"), y = named("y");
        const first = x && y ? (x.pos < y.pos ? x : y) : (x ?? y);
        if (first) {
          const sized = n.tagName.getText() !== "Space" || named("w") || named("h");
          edits.push({ start: first.getStart(), end: first.getEnd(), text: `at={[${valueOf(x)}, ${valueOf(y)}]}${sized ? ' anchor="nw"' : ""}` });
          const second = first === x ? y : x;
          if (second) edits.push({ start: second.getFullStart(), end: second.getEnd(), text: "" });
        }
      }
    }
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxClosingElement(n)) && n.tagName.getText() === "Free") {
      edits.push({ start: n.tagName.getStart(), end: n.tagName.getEnd(), text: "Canvas" });
    }
    if (ts.isImportSpecifier(n) && n.name.getText() === "Free") edits.push({ start: n.getStart(), end: n.getEnd(), text: "Canvas" });
    ts.forEachChild(n, visit);
  };
  visit(sf);
  let out = source;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  out = out.replace(/"@\/components\/figure(\/\w+)?"/g, '"figure"');
  if (out === source) continue;
  writeFileSync(file, out);
  console.log(`${file}: ${edits.length} edits`);
}
