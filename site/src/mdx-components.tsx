import type { MDXComponents } from "mdx/types";
import { Automaton } from "@/components/Automaton";
import { BPlusTree } from "@/components/BPlusTree";
import { BufferQueue } from "@/components/BufferQueue";
import { ClockPolicy } from "@/components/ClockPolicy";
import {
  GraphCertificateSchema,
  PnpContainmentSchema,
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
import { ERDiagram } from "@/components/ERDiagram";
import { ERInstanceMapping } from "@/components/ERInstanceMapping";
import {
  CausalConsistencySchema,
  DynamoSiblingsSchema,
  KeyRangeLockingSchema,
  PhantomReadSchema,
  QuorumOverlapSchema,
} from "@/components/EventualConsistencySchemas";
import { figureComponents } from "@/components/figure";
import { HashDiagram } from "@/components/HashDiagram";
import { IdeaBreak } from "@/components/IdeaBreak";
import { IndexMap } from "@/components/IndexMap";
import { internetArchitectureSchemas } from "@/components/InternetArchitectureSchemas";
import { ipAddressingSchemas } from "@/components/IpAddressingSchemas";
import { ipServicesSchemas } from "@/components/IpServicesSchemas";
import { LanguageClasses } from "@/components/LanguageClasses";
import { networkFigures } from "@/components/NetworkFigures";
import { packetFigures } from "@/components/PacketFigures";
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
} from "@/components/QueryExecutionSchemas";
import { RAIDDiagram } from "@/components/RAIDDiagram";
import {
  DfaToPathReductionSchema,
  NpCompletenessChainSchema,
  ReductionPipelineSchema,
  RegTmReductionSchema,
  SatToIndsetReductionSchema,
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
    ...figureComponents,
    ...networkFigures,
    ...packetFigures,
    ...internetArchitectureSchemas,
    ...ipAddressingSchemas,
    ...ipServicesSchemas,
    Automaton,
    BPlusTree,
    BufferQueue,
    ClockPolicy,
    CausalConsistencySchema,
    ConflictSerializabilitySchema,
    DeadlockPreventionSchema,
    DfaToPathReductionSchema,
    DynamoSiblingsSchema,
    ERDiagram,
    ERInstanceMapping,
    GraphCertificateSchema,
    HashDiagram,
    hr: IdeaBreak,
    IndexMap,
    KeyRangeLockingSchema,
    LanguageClasses,
    LockGranularitySchema,
    LockPhaseSchema,
    MultiGranularityLockingSchema,
    NpCompletenessChainSchema,
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
    RAIDDiagram,
    ReductionPipelineSchema,
    RecoveryPhasesSchema,
    RegTmReductionSchema,
    SatToIndsetReductionSchema,
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
