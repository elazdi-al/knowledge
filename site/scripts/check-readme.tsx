// Renders every example in the figure library's README, and fails on any diagnostic.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
const README = "src/components/figure/README.md";
const LIB = "@/components/figure";
const blocks = [...readFileSync(README, "utf8").matchAll(/```tsx\n([\s\S]*?)```/g)].map((m) => m[1].trim());
const examples = blocks.map((block, i) => {
  const split = block.lastIndexOf("\n\n");
  const [setup, figure] = split < 0 ? ["", block] : [block.slice(0, split), block.slice(split + 2)];
  return `${setup}\nexport const example${i} = (\n${figure}\n);`;
});
const gen = "scripts/.readme-examples.gen.tsx";
writeFileSync(gen, `import * as F from "${LIB}";\nconst { ${await libraryNames()} } = F;\ntype Tone = F.Tone;\n${examples.join("\n\n")}\n`);
try {
  const mod = await import(`../${gen}`);
  const { layoutScene, toScene } = await import(LIB);
  let failed = 0;
  blocks.forEach((_, i) => {
    const { diagnostics } = layoutScene(toScene(mod[`example${i}`]));
    for (const d of diagnostics) {
      console.error(`example ${i}: ${d.code}: ${d.message}`);
      failed++;
    }
  });
  if (failed) process.exit(1);
  console.log(`${blocks.length} README examples render clean`);
} finally {
  rmSync(gen, { force: true });
}

async function libraryNames() {
  return Object.keys(await import(LIB)).filter((n) => /^[A-Za-z]/.test(n)).join(", ");
}
