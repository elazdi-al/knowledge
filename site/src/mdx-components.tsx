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
import {
  AddressPrefixSchema,
  DomainNameSchema,
  EncapsulationSchema,
  GatewayPathSchema,
  PacketSwitchingSchema,
  PathStacksSchema,
  StopAndGoSchema,
  SubnetChainSchema,
} from "@/components/InternetArchitectureSchemas";
import {
  EpflForwardingSchema,
  Ipv4HeaderSchema,
  Ipv6AddressSchema,
  Ipv6HeaderSchema,
  LongestPrefixMatchSchema,
  NatTranslationSchema,
  SubnetBitsSchema,
} from "@/components/IpAddressingSchemas";
import {
  DhcpRelaySchema,
  GatewayResolutionSchema,
  HolePunchingSchema,
  Nat64Schema,
  PrefixDelegationSchema,
  SolicitedNodeSchema,
  TracerouteSchema,
} from "@/components/IpServicesSchemas";
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
    AddressPrefixSchema,
    Automaton,
    BPlusTree,
    BufferQueue,
    ClockPolicy,
    CausalConsistencySchema,
    ConflictSerializabilitySchema,
    DeadlockPreventionSchema,
    DfaToPathReductionSchema,
    DhcpRelaySchema,
    DomainNameSchema,
    DynamoSiblingsSchema,
    EncapsulationSchema,
    EpflForwardingSchema,
    ERDiagram,
    ERInstanceMapping,
    GatewayPathSchema,
    GatewayResolutionSchema,
    GraphCertificateSchema,
    HashDiagram,
    HolePunchingSchema,
    hr: IdeaBreak,
    IndexMap,
    Ipv4HeaderSchema,
    Ipv6AddressSchema,
    Ipv6HeaderSchema,
    KeyRangeLockingSchema,
    LanguageClasses,
    LockGranularitySchema,
    LockPhaseSchema,
    LongestPrefixMatchSchema,
    MultiGranularityLockingSchema,
    Nat64Schema,
    NatTranslationSchema,
    NpCompletenessChainSchema,
    PacketSwitchingSchema,
    PageLayout,
    Pane,
    PathStacksSchema,
    PhantomReadSchema,
    PnpContainmentSchema,
    ExecutionModelSchema,
    GraceProbeSchema,
    HashProjectionSchema,
    HistogramBucketSchema,
    LeftDeepPlanSchema,
    OptimizerArchitectureSchema,
    PrefixDelegationSchema,
    QueryTree,
    QueryProcessingFlow,
    QuorumOverlapSchema,
    RAIDDiagram,
    ReductionPipelineSchema,
    RecoveryPhasesSchema,
    RegTmReductionSchema,
    SatToIndsetReductionSchema,
    ScheduleEquivalenceSchema,
    SolicitedNodeSchema,
    SortPasses,
    Split,
    StopAndGoSchema,
    StorageHierarchy,
    SubnetBitsSchema,
    SubnetChainSchema,
    TracerouteSchema,
    TransactionLogSchema,
    TuringTape,
    TuringTrace,
    VerifierSchema,
    WaitForGraphSchema,
    WalRulesSchema,
  };
}
