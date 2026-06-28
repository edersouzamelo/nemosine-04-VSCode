import type { LanguageModel } from "ai";

export const responsePipelineModes = ["off", "shadow", "enforce"] as const;
export type ResponsePipelineMode = typeof responsePipelineModes[number];

export type ResponsePipelineConfig = {
  mode: ResponsePipelineMode;
  maxRegenerations: number;
  auditEnabled: boolean;
};

export type ResponseLanguage = "pt-BR" | "es" | "en";

export type ChatHistoryMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
};

export type ResponsePipelineRequest = {
  runId: string;
  userId: string;
  threadId: string;
  personaId: string;
  placeId?: string | null;
  language: ResponseLanguage;
  userText: string;
  displayUserText: string;
  memoryScope: string;
  privateRun: boolean;
  priorHistory: ChatHistoryMessage[];
};

export type ResponsePipelineModel = {
  id: string;
  model: string;
  modelInstance: LanguageModel;
};

export type ContextSourceType =
  | "current-message"
  | "recent-history"
  | "memory"
  | "episode"
  | "destiny"
  | "registry"
  | "agenda"
  | "persistent-source"
  | "persona"
  | "place"
  | "active-topic";

export type ContextCandidate = {
  id: string;
  sourceType: ContextSourceType;
  text: string;
  timestamp?: Date | string | number | null;
  scope?: string | null;
  isPrivate: boolean;
  lexicalScore: number;
  recencyScore: number;
  continuityScore: number;
  importanceScore: number;
  personaRelevanceScore: number;
  semanticScore?: number | null;
  finalScore: number;
  selectionReason?: string;
};

export type ContextBrokerMetrics = {
  candidateCount: number;
  selectedCount: number;
  selectedForPromptCount: number;
  privateCandidateCount: number;
  privateItemsExcluded: number;
  sourceTypeCounts: Record<string, number>;
  topSourceTypes: string[];
  topScores: number[];
  semanticReady: boolean;
};

export type ContextBrokerResult = {
  candidates: ContextCandidate[];
  selected: ContextCandidate[];
  selectedForPrompt: ContextCandidate[];
  retrievalExplanation: string[];
  metrics: ContextBrokerMetrics;
};

export type InferenceConfidence = "high" | "medium" | "low";
export type ResponseDepth = "brief" | "developed" | "deep";
export type UserNeedMode =
  | "understand"
  | "decide"
  | "execute"
  | "elaborate"
  | "be-confronted"
  | "be-acknowledged"
  | "create";

export type PlannedInference = {
  statement: string;
  confidence: InferenceConfidence;
  evidence: string[];
};

export type QuestionDecision = {
  required: boolean;
  reason: string;
  question?: string;
};

export type ResponsePlan = {
  primaryIntent: string;
  needMode: UserNeedMode;
  emotionalIntensity: "low" | "medium" | "high";
  supportedFacts: string[];
  inferences: PlannedInference[];
  centralTension: string | null;
  selectedContextAnchors: string[];
  vocationalContribution: string;
  vocationalRisk: string | null;
  recommendedDepth: ResponseDepth;
  questionDecision: QuestionDecision;
  openingMove: string;
  developmentMoves: string[];
  landingMove: string;
  avoid: string[];
};

export type DirectorResult = {
  usedDirector: boolean;
  reason: string;
  plan: ResponsePlan;
  failed: boolean;
  errorCode?: string;
  latencyMs: number;
};

export type ResponseValidation = {
  scores: {
    vocationalFidelity: number;
    specificity: number;
    contextUse: number;
    depth: number;
    initiative: number;
    naturalness: number;
    truthfulness: number;
    inferenceDiscipline: number;
    questionEconomy: number;
    nonSycophancy: number;
    substantiveClosing: number;
    privacy: number;
  };
  criticalFailures: string[];
  findings: string[];
  shouldRegenerate: boolean;
  regenerationInstructions: string[];
  overallScore: number;
};

export type ExtractedMemory = {
  category:
    | "stable-fact"
    | "preference"
    | "goal"
    | "active-theme"
    | "episode"
    | "decision";
  content: string;
  confidence: InferenceConfidence;
  scope: string;
  shouldPersist: boolean;
};

export type MemoryExtractionResult = {
  memories: ExtractedMemory[];
  episodeSummary?: string;
  registrySuggestion?: {
    idea: string;
    deadline?: string | null;
    status?: string | null;
  } | null;
  destinySuggestion?: {
    title: string;
    date?: string | null;
    category: string;
    description: string;
  } | null;
  legacyTagsRemoved: number;
  committed?: {
    memory: number;
    registry: number;
    destiny: number;
  };
};

export type ResponsePipelineTelemetry = {
  mode: ResponsePipelineMode;
  directorUsed: boolean;
  directorReason: string;
  recommendedDepth: ResponseDepth;
  questionRequired: boolean;
  contextCandidateCount: number;
  selectedContextCount: number;
  selectedPromptContextCount: number;
  validationScore: number;
  regenerated: boolean;
  fallbackUsed: boolean;
  latencyMs: {
    contextBroker: number;
    director: number;
    renderer: number;
    validator: number;
    memoryExtractor: number;
    total: number;
  };
};

export type ResponsePipelineResult = {
  runId: string;
  answer: string;
  rawAnswer: string;
  context: ContextBrokerResult;
  director: DirectorResult;
  validation: ResponseValidation;
  memoryExtraction: MemoryExtractionResult;
  regenerated: boolean;
  fallbackUsed: boolean;
  promptHashes: Record<string, string>;
  modelId: string;
  createdAt: Date;
  completedAt: Date;
  telemetry: ResponsePipelineTelemetry;
};
