import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/Callout";
import { CodePlayground } from "@/components/CodePlayground";
import { DemoFrame } from "@/components/DemoFrame";
import { Mermaid } from "@/components/Mermaid";
import { R2Image } from "@/components/R2Image";

export function useMDXComponents(
  components: MDXComponents,
): MDXComponents {
  return {
    ...components,
    Callout,
    CodePlayground,
    DemoFrame,
    Mermaid,
    R2Image,
  };
}
