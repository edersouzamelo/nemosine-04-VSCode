import { z } from "zod";

export const cognitiveRuntimeModes = ["off", "shadow", "enforce"] as const;
export const executionProfiles = ["light", "standard", "full"] as const;

export type CognitiveRuntimeMode = typeof cognitiveRuntimeModes[number];
export type ExecutionProfile = typeof executionProfiles[number];

export const cognitiveStates = [
  "RECEIVED",
  "AUTHORIZED",
  "CONTEXT_ASSEMBLED",
  "MODULES_SELECTED",
  "CANDIDATE_GENERATED",
  "CLAIMS_EXTRACTED",
  "SCIENTIST_EVALUATED",
  "VIGIA_SCORED",
  "OCV_RETRY_REQUESTED",
  "OCV_CONVERGED",
  "PHILOSOPHER_EVALUATED",
  "PROMOTION_EVALUATED",
  "PROMOTED",
  "REJECTED",
  "FINAL_ANSWER_SELECTED",
  "DELIVERY_PERSISTED",
  "SIDE_EFFECTS_COMMITTED",
  "SIDE_EFFECTS_SKIPPED",
  "SIDE_EFFECTS_BLOCKED",
  "SIDE_EFFECTS_FAILED",
  "DELIVERED",
  "FAILED_SAFE",
] as const;

export type CognitiveState = typeof cognitiveStates[number];

export const findingSeverities = ["info", "warning", "error", "critical"] as const;
export type FindingSeverity = typeof findingSeverities[number];
export const coherenceDimensionStatuses = ["SCORED", "NOT_APPLICABLE"] as const;
export type CoherenceDimensionStatus = typeof coherenceDimensionStatuses[number];

export const findingSchema = z.object({
  code: z.string().min(1).max(80),
  severity: z.enum(findingSeverities),
  category: z.string().min(1).max(80),
  explanation: z.string().min(1).max(1200),
  affectedExcerpt: z.string().max(500).optional(),
  claimId: z.string().max(80).optional(),
  repairInstruction: z.string().max(1200).optional(),
});

export type CognitiveFinding = z.infer<typeof findingSchema>;

export type RuntimeErrorCode =
  | "MALFORMED_STRUCTURED_OUTPUT"
  | "VALIDATOR_FAILURE"
  | "PROVIDER_TIMEOUT"
  | "ILLEGAL_STATE_TRANSITION"
  | "PRIVACY_VIOLATION"
  | "VOCATION_VIOLATION"
  | "COHERENCE_EXHAUSTION"
  | "AUDIT_PERSISTENCE_FAILURE"
  | "DELIVERY_PERSISTENCE_FAILURE"
  | "SIDE_EFFECT_FAILURE";

export class CognitiveRuntimeError extends Error {
  code: RuntimeErrorCode;
  retryable: boolean;
  safeMessage: string;

  constructor(code: RuntimeErrorCode, message: string, options?: { retryable?: boolean; safeMessage?: string }) {
    super(message);
    this.name = "CognitiveRuntimeError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.safeMessage = options?.safeMessage ?? "A resposta nao passou pelos controles internos desta execucao.";
  }
}

export type CognitiveRequest = {
  runId: string;
  userId: string;
  threadId: string;
  personaId: string;
  placeId?: string | null;
  language: "pt-BR" | "es" | "en";
  userText: string;
  displayUserText: string;
  memoryScope: string;
  runtimeMode: CognitiveRuntimeMode;
  requestedProfile?: ExecutionProfile;
  requestedProfileSource?: "user" | "runtime" | "test";
  privateRun: boolean;
  startedAt: Date;
  priorHistory?: Array<{
    id?: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: number;
  }>;
};

export type ContextVisibility = "public" | "internal" | "private" | "confessor" | "metadata-only";

export type CognitiveContextItem = {
  id: string;
  type: "active_topic" | "memory" | "episode" | "source" | "agenda" | "registry" | "destiny" | "place" | "system";
  provenance: string;
  visibility: ContextVisibility;
  text: string;
  scope?: string | null;
  hash?: string;
};

export type CognitiveContextEnvelope = {
  runId: string;
  personaId: string;
  placeId?: string | null;
  language: CognitiveRequest["language"];
  nativePrompt: {
    appName: string;
    promptKey: string;
    prompt: string;
    soulCard?: string;
    sha256: string;
    source: string;
  };
  functionalContract: {
    id: string;
    label: string;
    family: string;
    text: string;
  };
  runtimeInstructions: string[];
  authorizedContext: CognitiveContextItem[];
  activePlaceContext?: CognitiveContextItem;
  privateRun: boolean;
  promptHashes: Record<string, string>;
  diagnostics?: {
    destinySourceStatus?: "OK" | "EMPTY" | "ERROR";
    destinyEventsFound?: number;
    destinyEventsSelected?: number;
    destinyErrorCode?: string | null;
    destinyUserIdMatched?: boolean;
  };
};

export type SelectedModule = {
  id: "orchestrator" | "persona-generator" | "claim-extractor" | "scientist" | "vigia" | "philosopher" | "promotion-gate" | "side-effect-committer";
  kind: "typescript" | "llm" | "deterministic";
  personaId?: string;
  purpose: string;
  enabled: boolean;
};

export type CandidateResponse = {
  id: string;
  iteration: number;
  text: string;
  visibleText: string;
  modelId?: string;
  promptHash?: string;
  latencyMs: number;
};

export const extractedClaimSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(["factual", "inferential", "uncertainty", "access_or_verification"]),
  text: z.string().min(1).max(1200),
  support: z.enum([
    "current_user_message",
    "authorized_context",
    "inferential",
    "candidate_only",
    "unknown",
    "contradicted",
    "externally_unverifiable",
  ]).default("unknown"),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type ExtractedClaim = z.infer<typeof extractedClaimSchema>;

const proposedActionBaseSchema = z.object({
  id: z.string().min(1).max(80),
  source: z.enum(["legacy-tag", "structured-extractor", "runtime"]),
  authorized: z.boolean().default(false),
  authorizationProvenance: z.enum([
    "explicit-current-message",
    "preconfigured-user-consent",
    "system-conversation-history",
    "unauthorized",
    "discarded-private-scope",
  ]).default("unauthorized"),
  reason: z.string().max(500).optional(),
});

export const proposedMemoryActionSchema = proposedActionBaseSchema.extend({
  kind: z.literal("memory"),
  scope: z.string().min(1).max(120),
  content: z.string().min(1).max(1000),
  memoryType: z.enum(["fact", "episode", "active_theme", "other"]).default("other"),
});

export type ProposedMemoryAction = z.infer<typeof proposedMemoryActionSchema>;

export const proposedRegistryActionSchema = proposedActionBaseSchema.extend({
  kind: z.literal("registry"),
  idea: z.string().min(1).max(500),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.string().min(1).max(80).default("Pendente"),
});

export type ProposedRegistryAction = z.infer<typeof proposedRegistryActionSchema>;

export const proposedDestinyActionSchema = proposedActionBaseSchema.extend({
  kind: z.literal("destiny"),
  title: z.string().min(1).max(200),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  eventDateLabel: z.string().max(120).nullable().optional(),
  category: z.string().min(1).max(80).default("marco"),
  shortDescription: z.string().min(1).max(600),
  symbolicIntensity: z.number().int().min(1).max(5).nullable().optional(),
  dominantEmotion: z.string().max(80).nullable().optional(),
});

export type ProposedDestinyAction = z.infer<typeof proposedDestinyActionSchema>;

export const extractionResultSchema = z.object({
  claims: z.array(extractedClaimSchema).default([]),
  proposedMemoryActions: z.array(proposedMemoryActionSchema).default([]),
  proposedRegistryActions: z.array(proposedRegistryActionSchema).default([]),
  proposedDestinyActions: z.array(proposedDestinyActionSchema).default([]),
  extractorFindings: z.array(findingSchema).default([]),
  possibleVocationConflicts: z.array(z.string().max(300)).default([]),
  possiblePrivacyConcerns: z.array(z.string().max(300)).default([]),
  legacyTagsRemoved: z.number().int().min(0).default(0),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

const scoreSchema = z.number().min(0).max(1);
const dimensionApplicabilityStatusSchema = z.enum(["scored", "not_applicable"]);

export const scientistEvaluationSchema = z.object({
  logicalConsistency: scoreSchema,
  factualSupport: scoreSchema,
  contradictionRisk: scoreSchema,
  honestUncertainty: scoreSchema,
  biographicalSafety: scoreSchema.describe("0 = unsafe unsupported biographical claim risk; 1 = safe/passing."),
  accessClaimSafety: scoreSchema.describe("0 = unsafe simulated access or verification claim risk; 1 = safe/passing."),
  internalConsistency: scoreSchema,
  responseRelevance: scoreSchema,
  externalVerificationAvailable: z.boolean().default(false),
  evidenceSummary: z.string().max(1200).optional(),
  approved: z.boolean(),
  findings: z.array(findingSchema).default([]),
  dimensionApplicability: z.record(dimensionApplicabilityStatusSchema).default({}),
  modelId: z.string().max(120).optional(),
});

export type ScientistEvaluation = z.infer<typeof scientistEvaluationSchema>;

export const philosopherEvaluationSchema = z.object({
  constitutionalConformity: scoreSchema,
  userSovereignty: scoreSchema,
  nonIdolatry: scoreSchema,
  ethicalLegitimacy: scoreSchema,
  epistemologicalHumility: scoreSchema,
  vocationIntegrity: scoreSchema,
  manipulationDependencyRisk: scoreSchema,
  approved: z.boolean(),
  findings: z.array(findingSchema).default([]),
  modelId: z.string().max(120).optional(),
});

export type PhilosopherEvaluation = z.infer<typeof philosopherEvaluationSchema>;

export type VocationalEvaluation = {
  decision: "allowed" | "warning" | "refusal_required" | "handoff_recommended";
  personaId: string;
  classifiedTaskFamilies: string[];
  handoffTargets: string[];
  hardPass: boolean;
  findings: CognitiveFinding[];
};

export type PrivacyEvaluation = {
  hardPass: boolean;
  privateRun: boolean;
  metadataOnlyAudit: boolean;
  blockedContextIds: string[];
  findings: CognitiveFinding[];
};

export type CoherenceDimension = {
  name: string;
  score: number | null;
  weight: number;
  status: CoherenceDimensionStatus;
  reason?: string | null;
};

export type VigiaCoherenceResult = {
  totalCoherence: number;
  dimensions: CoherenceDimension[];
  weights: Record<string, number>;
  hardFailures: string[];
  threshold: number;
  passed: boolean;
  recommendedNextTransition: CognitiveState;
  formula: string;
  profile: ExecutionProfile;
};

export type SideEffectAuthorization = {
  approved: boolean;
  approvedMemoryActions: ProposedMemoryAction[];
  approvedRegistryActions: ProposedRegistryAction[];
  approvedDestinyActions: ProposedDestinyAction[];
  discardedActions: Array<ProposedMemoryAction | ProposedRegistryAction | ProposedDestinyAction>;
  findings: CognitiveFinding[];
};

export type CognitiveAuditEvent = {
  code:
    | "REBALANCING_APPLIED"
    | "CONTINUITY_CONTEXT_ASSEMBLED"
    | "AUDIT_PERSISTENCE_FAILURE"
    | "PROFILE_SELECTED"
    | "DELIVERY_PERSISTED"
    | "DELIVERY_PERSISTENCE_FAILED"
    | "SIDE_EFFECTS_COMMITTED"
    | "SIDE_EFFECTS_SKIPPED"
    | "SIDE_EFFECTS_BLOCKED"
    | "SIDE_EFFECTS_ROLLED_BACK"
    | "PERSONA_INITIATIVE_EVALUATED"
    | "PERSONA_INITIATIVE_REPAIR_REQUESTED"
    | "STRUCTURED_VALIDATOR_DEGRADED"
    | "REJECTION_CLASSIFIED"
    | "RECOVERY_BASAL_GATE"
    | "RECOVERY_DELIVERED"
    | "RETRY_SHORT_CIRCUITED"
    | "RESPONSE_PIPELINE_CONTEXT_BROKERED"
    | "RESPONSE_PIPELINE_DIRECTOR_PLANNED"
    | "RESPONSE_PIPELINE_VALIDATED"
    | "RESPONSE_PIPELINE_REGENERATED"
    | "RESPONSE_PIPELINE_MEMORY_EXTRACTED"
    | "RESPONSE_PIPELINE_SHADOW_COMPARED"
    | "RESPONSE_PIPELINE_FALLBACK";
  at: string;
  detail: Record<string, string | number | boolean | null>;
};

export type DeliveryStatus = "not_attempted" | "persisted" | "failed" | "shadow_external";
export type SideEffectStatus = "none" | "skipped" | "blocked" | "committed" | "failed_rolled_back";

export type SideEffectCounts = {
  memory: number;
  registry: number;
  destiny: number;
};

export type PromotionDecision = {
  promoted: boolean;
  status: "promoted" | "rejected" | "retry";
  reasons: string[];
  retriable: boolean;
  findings: CognitiveFinding[];
};

export type CognitiveIteration = {
  index: number;
  candidate?: CandidateResponse;
  extraction?: ExtractionResult;
  scientist?: ScientistEvaluation;
  privacy?: PrivacyEvaluation;
  vocation?: VocationalEvaluation;
  vigia?: VigiaCoherenceResult;
  philosopher?: PhilosopherEvaluation;
  sideEffectAuthorization?: SideEffectAuthorization;
  promotion?: PromotionDecision;
  repairFindings: CognitiveFinding[];
  startedAt: string;
  completedAt?: string;
};

export type StateTransitionRecord = {
  from: CognitiveState;
  to: CognitiveState;
  at: string;
  allowed: boolean;
  latencyMs?: number;
  note?: string;
};

export type RedactedCognitiveAudit = {
  runId: string;
  userIdHash: string;
  threadIdHash: string;
  personaId: string;
  placeId?: string | null;
  runtimeMode: CognitiveRuntimeMode;
  executionProfile: ExecutionProfile;
  stateTransitions: StateTransitionRecord[];
  auditEvents: CognitiveAuditEvent[];
  deliveryStatus: DeliveryStatus;
  sideEffectStatus: SideEffectStatus;
  memoryEffectCount: number;
  registryEffectCount: number;
  destinyEffectCount: number;
  assistantMessagePersisted: boolean;
  auditPersisted: boolean;
  iterationCount: number;
  coherence?: number;
  coherenceThreshold?: number;
  dimensionScores: Record<string, number | null | {
    score: number | null;
    status: CoherenceDimensionStatus;
    weight?: number | null;
    reason?: string | null;
  }>;
  findingCodes: string[];
  promotionDecision: "promoted" | "rejected" | "failed_safe" | "shadow_only" | "recovery_delivered";
  failureReason?: string;
  latencyPerStageMs: Record<string, number>;
  modelIdentifiers: string[];
  promptHashes: Record<string, string>;
  contentHashes: Record<string, string>;
  contentLengths: Record<string, number>;
  privateRun: boolean;
  metadataOnly: boolean;
  createdAt: string;
  completedAt: string;
  finalStatus: CognitiveState;
};

export type CognitiveRunResult = {
  runId: string;
  runtimeMode: CognitiveRuntimeMode;
  executionProfile: ExecutionProfile;
  finalStatus: CognitiveState;
  answer: string;
  promoted: boolean;
  rejectedCandidateTexts: string[];
  iterations: CognitiveIteration[];
  audit: RedactedCognitiveAudit;
  sideEffectsCommitted: boolean;
  deliveryPersisted: boolean;
  deliveryStatus: DeliveryStatus;
  assistantMessageId?: string;
  sideEffectStatus: SideEffectStatus;
  sideEffectCounts: SideEffectCounts;
  auditPersisted: boolean;
};

export type CognitiveModelProvider = {
  generateCandidate(input: {
    request: CognitiveRequest;
    context: CognitiveContextEnvelope;
    selectedModules: SelectedModule[];
    repairFindings: CognitiveFinding[];
    iteration: number;
  }): Promise<CandidateResponse>;
  extractCandidate(input: {
    request: CognitiveRequest;
    context: CognitiveContextEnvelope;
    candidate: CandidateResponse;
  }): Promise<ExtractionResult>;
  evaluateScientist(input: {
    request: CognitiveRequest;
    context: CognitiveContextEnvelope;
    candidate: CandidateResponse;
    extraction: ExtractionResult;
  }): Promise<ScientistEvaluation>;
  evaluatePhilosopher(input: {
    request: CognitiveRequest;
    context: CognitiveContextEnvelope;
    candidate: CandidateResponse;
    extraction: ExtractionResult;
    scientist: ScientistEvaluation;
    vigia: VigiaCoherenceResult;
  }): Promise<PhilosopherEvaluation>;
};
