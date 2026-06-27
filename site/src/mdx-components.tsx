import type { MDXComponents } from "mdx/types";
import { Automaton } from "@/components/Automaton";
import { BPlusTree } from "@/components/BPlusTree";
import { BufferQueue } from "@/components/BufferQueue";
import { ClockPolicy } from "@/components/ClockPolicy";
import { CodePlayground } from "@/components/CodePlayground";
import {
  GraphCertificateSchema,
  GrowthRateSchema,
  PnpContainmentSchema,
  RunningTimeSchema,
  VerifierSchema,
} from "@/components/ComplexitySchemas";
import {
  ConflictSerializabilitySchema,
  DeadlockPreventionSchema,
  LockGranularitySchema,
  LockPhaseSchema,
  MultiGranularityLockingSchema,
  WaitForGraphSchema,
} from "@/components/ConcurrencyControlSchemas";
import { DemoFrame } from "@/components/DemoFrame";
import { ERDiagram } from "@/components/ERDiagram";
import { ERInstanceMapping } from "@/components/ERInstanceMapping";
import {
  CausalConsistencySchema,
  DynamoSiblingsSchema,
  KeyRangeLockingSchema,
  PhantomReadSchema,
  QuorumOverlapSchema,
} from "@/components/EventualConsistencySchemas";
import { Figure } from "@/components/Figure";
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
  HistogramBucketSchema,
  LeftDeepPlanSchema,
  OptimizerArchitectureSchema,
  QueryProcessingFlow,
  UniformitySchema,
} from "@/components/QueryExecutionSchemas";
import { R2Image } from "@/components/R2Image";
import { RAIDDiagram } from "@/components/RAIDDiagram";
import {
  DfaToPathReductionSchema,
  ReductionPipelineSchema,
  RegTmReductionSchema,
} from "@/components/ReductionSchemas";
import { SortPasses } from "@/components/SortPasses";
import { Pane, Split } from "@/components/Split";
import { StorageHierarchy } from "@/components/StorageHierarchy";
import {
  RecoveryPhasesSchema,
  ScheduleEquivalenceSchema,
  TransactionLogSchema,
  WalRulesSchema,
} from "@/components/TransactionManagementSchemas";
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
    CausalConsistencySchema,
    ConflictSerializabilitySchema,
    DeadlockPreventionSchema,
    DemoFrame,
    DfaToPathReductionSchema,
    DynamoSiblingsSchema,
    ERDiagram,
    ERInstanceMapping,
    Figure,
    GraphCertificateSchema,
    GrowthRateSchema,
    HashDiagram,
    hr: IdeaBreak,
    IdeaBreak,
    IndexMap,
    KeyRangeLockingSchema,
    LanguageClasses,
    LockGranularitySchema,
    LockPhaseSchema,
    Mermaid,
    MultiGranularityLockingSchema,
    PageLayout,
    Pane,
    PhantomReadSchema,
    PnpContainmentSchema,
    ExecutionModelSchema,
    GraceProbeSchema,
    HashProjectionSchema,
    HistogramBucketSchema,
    LeftDeepPlanSchema,
    OptimizerArchitectureSchema,
    QueryTree,
    QueryProcessingFlow,
    QuorumOverlapSchema,
    UniformitySchema,
    R2Image,
    RAIDDiagram,
    ReductionPipelineSchema,
    RecoveryPhasesSchema,
    RegTmReductionSchema,
    RunningTimeSchema,
    ScheduleEquivalenceSchema,
    SortPasses,
    Split,
    StorageHierarchy,
    TransactionLogSchema,
    TuringTape,
    TuringTrace,
    VerifierSchema,
    WaitForGraphSchema,
    WalRulesSchema,
  };
}
