import type { MDXComponents } from "mdx/types";
import { Automaton } from "@/components/Automaton";
import { BPlusTree } from "@/components/BPlusTree";
import { BufferQueue } from "@/components/BufferQueue";
import { ClockPolicy } from "@/components/ClockPolicy";
import { CodePlayground } from "@/components/CodePlayground";
import { DemoFrame } from "@/components/DemoFrame";
import { ERDiagram } from "@/components/ERDiagram";
import { ERInstanceMapping } from "@/components/ERInstanceMapping";
import { HashDiagram } from "@/components/HashDiagram";
import { IndexMap } from "@/components/IndexMap";
import { Mermaid } from "@/components/Mermaid";
import { PageLayout } from "@/components/PageLayout";
import { QueryTree } from "@/components/QueryTree";
import { R2Image } from "@/components/R2Image";
import { RAIDDiagram } from "@/components/RAIDDiagram";
import { SortPasses } from "@/components/SortPasses";
import { Pane, Split } from "@/components/Split";
import { StorageHierarchy } from "@/components/StorageHierarchy";

export function useMDXComponents(
  components: MDXComponents,
): MDXComponents {
  return {
    ...components,
    Automaton,
    BPlusTree,
    BufferQueue,
    ClockPolicy,
    CodePlayground,
    DemoFrame,
    ERDiagram,
    ERInstanceMapping,
    HashDiagram,
    IndexMap,
    Mermaid,
    PageLayout,
    Pane,
    QueryTree,
    R2Image,
    RAIDDiagram,
    SortPasses,
    Split,
    StorageHierarchy,
  };
}
