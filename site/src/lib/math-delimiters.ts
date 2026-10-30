/**
 * Rewrites `\(...\)` to `$...$` and `\[...\]` to a `$$` block.
 *
 * remark-math only parses dollars, and MDX reads the braces in `\text{or}` as
 * JS expressions before any remark plugin runs, so this has to happen on the
 * source. Code is left alone, as is a delimiter with no close before the next
 * blank line.
 */

const OPENING_FENCE = /^[ \t>]*(?:(?:[-*+]|\d+[.)])[ \t]+)?(`{3,}|~{3,})/;
const BLOCK_PREFIX = /^([ \t>]*)((?:[-*+]|\d+[.)])[ \t]+)?/;
const QUOTE_OR_SPACE = /^[ \t>]*/;
const BLANK_LINE = /\n[ \t>]*\n/y;

/** End of the fenced code block opening at `start`: past its closing line, or the end of the source. */
function fenceEnd(source: string, start: number, fence: string): number {
  const close = new RegExp(`^[ \\t>]*${fence[0]}{${fence.length},}[ \\t]*$`);
  let at = source.indexOf("\n", start);
  while (at !== -1) {
    const next = source.indexOf("\n", at + 1);
    const line = source.slice(at + 1, next === -1 ? undefined : next);
    if (close.test(line)) return next === -1 ? source.length : next + 1;
    at = next;
  }
  return source.length;
}

/** Whether a blank line starts at `index`, which ends a paragraph and so any inline span. */
function blankLineAt(source: string, index: number): boolean {
  BLANK_LINE.lastIndex = index;
  return BLANK_LINE.test(source);
}

/** Index of the backtick run that closes the code span opening at `start` with `length` backticks, or -1. */
function codeSpanClose(source: string, start: number, length: number): number {
  let i = start;
  while (i < source.length) {
    if (source[i] === "\n" && blankLineAt(source, i)) return -1;
    if (source[i] !== "`") {
      i++;
      continue;
    }
    let end = i;
    while (source[end] === "`") end++;
    if (end - i === length) return i;
    i = end;
  }
  return -1;
}

/** Index of the unescaped `\` + `close`, or -1 if a blank line comes first. */
function mathClose(source: string, start: number, close: string): number {
  for (let i = start; i < source.length; i++) {
    if (source[i] === "\n" && blankLineAt(source, i)) return -1;
    if (source[i] !== "\\") continue;
    if (source[i + 1] === close) return i;
    i++;
  }
  return -1;
}

/** A dollar inside the math needs a longer fence around it. */
function inlineMath(body: string): string {
  const longest = Math.max(0, ...(body.match(/\$+/g) ?? []).map((run) => run.length));
  const fence = "$".repeat(longest + 1);
  return `${fence}${body}${fence}`;
}

/** A `$$` block, indented so it stays inside the current list item or blockquote. */
function displayMath(indent: string, body: string): string {
  const lines = body.split("\n").map((line) => indent + line.replace(QUOTE_OR_SPACE, "").trimEnd());
  return `$$\n${lines.join("\n")}\n${indent}$$`;
}

export function normalizeMathDelimiters(source: string): string {
  let out = "";
  let i = 0;

  while (i < source.length) {
    if (i === 0 || source[i - 1] === "\n") {
      const lineEnd = source.indexOf("\n", i);
      const fence = source.slice(i, lineEnd === -1 ? undefined : lineEnd).match(OPENING_FENCE);
      if (fence) {
        const end = fenceEnd(source, i, fence[1]);
        out += source.slice(i, end);
        i = end;
        continue;
      }
    }

    if (source[i] === "`") {
      let open = i;
      while (source[open] === "`") open++;
      const close = codeSpanClose(source, open, open - i);
      const end = close === -1 ? open : close + (open - i);
      out += source.slice(i, end);
      i = end;
      continue;
    }

    if (source[i] !== "\\") {
      out += source[i++];
      continue;
    }

    const opener = source[i + 1];
    const closer = opener === "(" ? ")" : opener === "[" ? "]" : undefined;
    const end = closer ? mathClose(source, i + 2, closer) : -1;
    const body = end === -1 ? "" : source.slice(i + 2, end).trim();
    if (!body) {
      out += source.slice(i, i + 2);
      i += 2;
      continue;
    }

    i = end + 2;
    if (opener === "(") {
      out += inlineMath(body);
      continue;
    }

    const line = out.slice(out.lastIndexOf("\n") + 1);
    const [prefix, quote, marker = ""] = line.match(BLOCK_PREFIX) ?? ["", ""];
    const indent = quote + " ".repeat(marker.length);
    if (line.length > prefix.length) out = `${out.trimEnd()}\n${indent}`;
    out += displayMath(indent, body);

    // Text after the delimiter moves to its own line.
    const nextLine = source.indexOf("\n", i);
    const rest = source.slice(i, nextLine === -1 ? undefined : nextLine);
    if (rest.trim()) out += `\n${indent}`;
    i += rest.length - rest.trimStart().length;
  }

  return out;
}
