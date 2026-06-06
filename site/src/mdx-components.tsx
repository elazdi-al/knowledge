import type { MDXComponents } from "mdx/types";
import { Automaton } from "@/components/Automaton";
import { Callout } from "@/components/Callout";
import { CodePlayground } from "@/components/CodePlayground";
import { DemoFrame } from "@/components/DemoFrame";
import { Mermaid } from "@/components/Mermaid";
import { R2Image } from "@/components/R2Image";
import { Pane, Split } from "@/components/Split";

export function useMDXComponents(
  components: MDXComponents,
): MDXComponents {
  return {
    ...components,
    Automaton,
    Callout,
    CodePlayground,
    DemoFrame,
    Mermaid,
    Pane,
    R2Image,
    Split,
  };
}
