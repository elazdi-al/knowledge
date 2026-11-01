import katex from "katex";

interface Node {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: Node[];
}

const attribute = (name: string, value: unknown) => ({ type: "mdxJsxAttribute", name, value });

/** `<span className={className} dangerouslySetInnerHTML={{ __html: html }} />`, as a node MDX compiles. */
function rawSpan(className: string, html: string) {
  const expression = {
    type: "ObjectExpression",
    properties: [
      {
        type: "Property",
        key: { type: "Identifier", name: "__html" },
        value: { type: "Literal", value: html },
        kind: "init",
        computed: false,
        method: false,
        shorthand: false,
      },
    ],
  };
  const estree = { type: "Program", sourceType: "module", body: [{ type: "ExpressionStatement", expression }] };
  return {
    type: "mdxJsxTextElement",
    name: "span",
    children: [],
    attributes: [
      attribute("className", className),
      attribute("dangerouslySetInnerHTML", { type: "mdxJsxAttributeValueExpression", value: "", data: { estree } }),
    ],
  };
}

function typeset(tex: string, displayMode: boolean): Node {
  let html: string;
  try {
    html = katex.renderToString(tex, { displayMode, throwOnError: true });
  } catch (error) {
    return {
      type: "element",
      tagName: "span",
      properties: { className: ["katex-error"], style: "color:#cc0000", title: String(error) } as Node["properties"],
      children: [{ type: "text", value: tex }],
    };
  }
  const root = html.match(/^<span class="([^"]+)">([\s\S]*)<\/span>$/);
  if (!root) throw new Error(`[math] unexpected KaTeX root: ${html.slice(0, 80)}`);
  return rawSpan(root[1], root[2]);
}

/**
 * Typesets remark-math's output as one raw-HTML element per formula. KaTeX emits
 * dozens of spans per formula; as JSX they were 70% of a page's elements, and
 * React's dev build records a stack trace for each one.
 */
export function rehypeMath() {
  const visit = (parent: Node) => {
    parent.children?.forEach((child, index) => {
      const code = child.tagName === "pre" ? child.children?.find((c) => c.tagName === "code") : child;
      const classes = code?.properties?.className;
      if (code && Array.isArray(classes) && classes.includes("language-math")) {
        const tex = code.children?.map((c) => c.value ?? "").join("") ?? "";
        parent.children![index] = typeset(tex, child.tagName === "pre");
      } else {
        visit(child);
      }
    });
  };
  return visit;
}
