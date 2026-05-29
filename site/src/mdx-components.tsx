import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/Callout";
import { CodePlayground } from "@/components/CodePlayground";
import { DemoFrame } from "@/components/DemoFrame";
import { R2Image } from "@/components/R2Image";

export function useMDXComponents(
  components: MDXComponents,
): MDXComponents {
  return {
    ...components,
    Callout,
    CodePlayground,
    DemoFrame,
    R2Image,
  };
}
