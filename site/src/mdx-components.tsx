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
import { IdeaBreak } from "@/components/IdeaBreak";
import { IndexMap } from "@/components/IndexMap";
import { LanguageClasses } from "@/components/LanguageClasses";
import { Mermaid } from "@/components/Mermaid";
import { PageLayout } from "@/components/PageLayout";
import { QueryTree } from "@/components/QueryTree";
import {
  ExecutionModelSchema,
  GraceProbeSchema,
  HashProjectionSchema,
  QueryProcessingFlow,
} from "@/components/QueryExecutionSchemas";
import { R2Image } from "@/components/R2Image";
import { RAIDDiagram } from "@/components/RAIDDiagram";
import { SortPasses } from "@/components/SortPasses";
import { Pane, Split } from "@/components/Split";
import { StorageHierarchy } from "@/components/StorageHierarchy";
import { TuringTape } from "@/components/TuringTape";
import { TuringTrace } from "@/components/TuringTrace";

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
    hr: IdeaBreak,
    IdeaBreak,
    IndexMap,
    LanguageClasses,
    Mermaid,
    PageLayout,
    Pane,
    ExecutionModelSchema,
    GraceProbeSchema,
    HashProjectionSchema,
    QueryTree,
    QueryProcessingFlow,
    R2Image,
    RAIDDiagram,
    SortPasses,
    Split,
    StorageHierarchy,
    TuringTape,
    TuringTrace,
  };
}
