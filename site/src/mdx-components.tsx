import type { MDXComponents } from "mdx/types";
import { Automaton } from "@/components/Automaton";
import { BPlusTree } from "@/components/BPlusTree";
import { BufferQueue } from "@/components/BufferQueue";
import { ClockPolicy } from "@/components/ClockPolicy";
import { CbcModeSchema, CtrModeSchema, DiffieHellmanSchema, EcbLeakSchema, EllipticCurveSchema, EndiannessSchema, ProgramMemorySchema } from "@/components/CtfSchemas";
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
import { LanguageClasses } from "@/components/LanguageClasses";
import { PerceptronBoundarySchema, RegressionPlaneSchema } from "@/components/LinearModelSchemas";
import {
  CsmaCdSchema,
  MinFrameSizeSchema,
  RtsCtsSchema,
  SharedMediumSchema,
  SpanningTreeSchema,
  SwitchedLanSchema,
  SwitchLoopSchema,
} from "@/components/MediumAccessSchemas";
import {
  CurseOfDimensionalitySchema,
  FeatureScalingSchema,
  LossShapesSchema,
  MinimaSchema,
} from "@/components/MlFoundationsSchemas";
import { networkFigures } from "@/components/NetworkFigures";
import { MomentumSchema, ProjectionSchema, SgdNoiseSchema, StepSizeSchema, SubgradientSchema } from "@/components/OptimizationSchemas";
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
    CsmaCdSchema,
    CbcModeSchema,
    CtrModeSchema,
    CurseOfDimensionalitySchema,
    DeadlockPreventionSchema,
    DiffieHellmanSchema,
    EcbLeakSchema,
    EllipticCurveSchema,
    DfaToPathReductionSchema,
    DhcpRelaySchema,
    DomainNameSchema,
    DynamoSiblingsSchema,
    EncapsulationSchema,
    EndiannessSchema,
    EpflForwardingSchema,
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
    KeyRangeLockingSchema,
    LanguageClasses,
    LockGranularitySchema,
    LockPhaseSchema,
    LanCaptureSchema,
    LongestPrefixMatchSchema,
    LossShapesSchema,
    MomentumSchema,
    ProjectionSchema,
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
    PhantomReadSchema,
    PnpContainmentSchema,
    ExecutionModelSchema,
    GraceProbeSchema,
    HashProjectionSchema,
    HistogramBucketSchema,
    LeftDeepPlanSchema,
    OptimizerArchitectureSchema,
    PrefixDelegationSchema,
    ProgramMemorySchema,
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
