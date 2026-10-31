// The figure library stands alone and its layers point one way. Fails on an import that breaks that.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

const LIB = "../packages/figure/src";
const importsOf = (file: string) => [...readFileSync(file, "utf8").matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
const sources = (dir: string) => readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f));

/** What each layer may not reach. Base files know nothing of marks, marks nothing of kits or the pipeline above them. */
const FORBIDDEN: [RegExp, RegExp][] = [
  [/^(model|theme|label|font-metrics|math|measure|diagnostics|paint|route|text|mark)\.tsx?$/, /^(marks|kits|compile|layout|lint|svg|Diagram|index)\b/],
  [/^marks\//, /^(kits|compile|layout$|lint|svg|Diagram|index)\b/],
];

const problems: string[] = [];
for (const file of sources(LIB)) {
  for (const spec of importsOf(join(LIB, file))) {
    if (spec.startsWith("@/") || spec.startsWith("next")) problems.push(`${file} imports ${spec}: the library cannot depend on the site`);
    if (!spec.startsWith(".")) continue;
    const target = normalize(relative(LIB, join(LIB, dirname(file), spec)));
    for (const [from, to] of FORBIDDEN) if (from.test(file) && to.test(target) && !(file.startsWith("marks/") && target.startsWith("marks/"))) problems.push(`${file} imports ${target}: that layer points the wrong way`);
  }
}
for (const dir of ["src", "scripts", "worker"]) {
  for (const file of sources(dir)) {
    for (const spec of importsOf(join(dir, file))) {
      if (/^figure\/(?!marks$|kits$|core$|tokens\.css$)/.test(spec) || /packages\/figure/.test(spec)) problems.push(`${dir}/${file} imports ${spec}: use the "figure" entry points`);
    }
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("figure boundaries hold");
