import type { MDXComponents } from "mdx/types";
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
  QuorumOverlapSchema,
} from "@/components/EventualConsistencySchemas";
import { figureComponents } from "figure";
import { HashDiagram } from "@/components/HashDiagram";
import { IdeaBreak } from "@/components/IdeaBreak";
import { IndexMap } from "@/components/IndexMap";
import {
  AddressPrefixSchema,
  DomainNameSchema,
  EncapsulationSchema,
  FrameAddressesSchema,
  GatewayPathSchema,
  PacketSwitchingSchema,
  PathStacksSchema,
  StopAndGoSchema,
  StoreForwardSchema,
  SubnetChainSchema,
} from "@/components/InternetArchitectureSchemas";
import {
  EpflForwardingSchema,
  Ipv4HeaderSchema,
  Ipv6AddressSchema,
  Ipv6HeaderSchema,
  LanCaptureSchema,
  LongestPrefixMatchSchema,
  NatTranslationSchema,
  SubnetBitsSchema,
  SubnetRuleSchema,
} from "@/components/IpAddressingSchemas";
import {
  DhcpRelaySchema,
  GatewayResolutionSchema,
  HolePunchingSchema,
  IceSchema,
  TurnRelaySchema,
  Nat64Schema,
  PrefixDelegationSchema,
  SolicitedNodeSchema,
  TracerouteSchema,
  UpnpSchema,
  StunSchema,
} from "@/components/IpServicesSchemas";
import {
  BartLisaSchema,
  BridgedPathSchema,
  Dot1xSchema,
  EthernetFrameSchema,
  MacAddressSchema,
  MacsecFrameSchema,
  MeshWifiSchema,
  VlanRouterSchema,
  VlanTrunkSchema,
} from "@/components/LanSchemas";
import { LanguageClasses } from "@/components/LanguageClasses";
import { PerceptronBoundarySchema, RegressionPlaneSchema } from "@/components/LinearModelSchemas";
import {
  CsmaCdSchema,
  LinkFailureSchema,
  LoopTreeSchema,
  MinFrameSizeSchema,
  RtsCtsSchema,
  SharedMediumSchema,
  SpanningTreeSchema,
  SwitchedLanSchema,
  SwitchLoopSchema,
  TransparentSwitchSchema,
} from "@/components/MediumAccessSchemas";
import {
  CurseOfDimensionalitySchema,
  FeatureScalingSchema,
  LossShapesSchema,
  MinimaSchema,
} from "@/components/MlFoundationsSchemas";
import { networkFigures } from "@/components/NetworkFigures";
import { ConvexSetsSchema, LinearizationSchema, LrScheduleSchema, MomentumSchema, ProjectionSchema, SGDSchema, SgdNoiseSchema, StepSizeSchema, SubgradientSchema } from "@/components/OptimizationSchemas";
import { packetFigures } from "@/components/PacketFigures";
import { PageLayout } from "@/components/PageLayout";
import { AddressVsDereferenceDiagram, AslrDiagram, NxDiagram, OverflowOffsetsDiagram, PieDiagram, ProcessMemoryLayoutDiagram, RelroDiagram, RetChainDiagram, StackAlignmentDiagram, StackCallDiagram, StackCanaryDiagram, StackFrameDiagram } from "@/components/PwnSchemas";
import { MonsterBreakEvenPlot, MonsterHourCostDiagram, MonsterPlanDiagram, MonsterRoadmapDiagram, MonsterTiersDiagram, MonsterZonesDiagram } from "@/components/MonsterSchemas";
import { QueryTree } from "@/components/QueryTree";
import { ReveArchitectureDiagram, ReveCursorDiagram, ReveFamiliesDiagram, ReveLineAddressesDiagram, RevePipelineDiagram, ReveSchemaDiagram } from "@/components/ReveSchemas";
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
    AddressVsDereferenceDiagram,
    BartLisaSchema,
    BridgedPathSchema,
    Dot1xSchema,
    EthernetFrameSchema,
    MacAddressSchema,
    MacsecFrameSchema,
    MeshWifiSchema,
    VlanRouterSchema,
    VlanTrunkSchema,
    BPlusTree,
    BufferQueue,
    ClockPolicy,
    CausalConsistencySchema,
    ConflictSerializabilitySchema,
    CsmaCdSchema,
    CurseOfDimensionalitySchema,
    DeadlockPreventionSchema,
    DfaToPathReductionSchema,
    DhcpRelaySchema,
    DomainNameSchema,
    DynamoSiblingsSchema,
    EncapsulationSchema,
    EpflForwardingSchema,
    ConvexSetsSchema,
    FeatureScalingSchema,
    ERDiagram,
    ERInstanceMapping,
    GatewayPathSchema,
    GatewayResolutionSchema,
    GraphCertificateSchema,
    HashDiagram,
    HolePunchingSchema,
    IceSchema,
    TurnRelaySchema,
    hr: IdeaBreak,
    IndexMap,
    Ipv4HeaderSchema,
    Ipv6AddressSchema,
    Ipv6HeaderSchema,
    LanguageClasses,
    LockGranularitySchema,
    LockPhaseSchema,
    LanCaptureSchema,
    LinkFailureSchema,
    LongestPrefixMatchSchema,
    LoopTreeSchema,
    LinearizationSchema,
    LossShapesSchema,
    LrScheduleSchema,
    MomentumSchema,
    MonsterBreakEvenPlot,
    MonsterHourCostDiagram,
    MonsterPlanDiagram,
    MonsterRoadmapDiagram,
    MonsterTiersDiagram,
    MonsterZonesDiagram,
    ProjectionSchema,
    SGDSchema,
    SgdNoiseSchema,
    StepSizeSchema,
    SubgradientSchema,
    MinimaSchema,
    MinFrameSizeSchema,
    MultiGranularityLockingSchema,
    Nat64Schema,
    NatTranslationSchema,
    NpCompletenessChainSchema,
    FrameAddressesSchema,
    PacketSwitchingSchema,
    PageLayout,
    Pane,
    PathStacksSchema,
    PerceptronBoundarySchema,
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
    RegressionPlaneSchema,
    RegTmReductionSchema,
    RtsCtsSchema,
    SatToIndsetReductionSchema,
    SharedMediumSchema,
    ScheduleEquivalenceSchema,
    SolicitedNodeSchema,
    SortPasses,
    AslrDiagram,
    NxDiagram,
    OverflowOffsetsDiagram,
    PieDiagram,
    ProcessMemoryLayoutDiagram,
    RelroDiagram,
    RetChainDiagram,
    ReveArchitectureDiagram,
    ReveCursorDiagram,
    ReveFamiliesDiagram,
    ReveLineAddressesDiagram,
    RevePipelineDiagram,
    ReveSchemaDiagram,
    StackAlignmentDiagram,
    StackCallDiagram,
    StackCanaryDiagram,
    StackFrameDiagram,
    SpanningTreeSchema,
    Split,
    StopAndGoSchema,
    StoreForwardSchema,
    StorageHierarchy,
    SubnetBitsSchema,
    SubnetRuleSchema,
    SubnetChainSchema,
    SwitchedLanSchema,
    SwitchLoopSchema,
    TracerouteSchema,
    TransparentSwitchSchema,
    TransactionLogSchema,
    TuringTape,
    TuringTrace,
    UpnpSchema,
    StunSchema,
    VerifierSchema,
    WaitForGraphSchema,
    WalRulesSchema,
  };
}
