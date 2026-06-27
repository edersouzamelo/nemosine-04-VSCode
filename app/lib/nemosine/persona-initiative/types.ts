import { PersonaFunctionalFamily } from "@/app/lib/nemosine/persona_behavior_contracts";

export type ConversationInputRichness = {
  richness: "low" | "medium" | "high";
  openingType:
    | "greeting"
    | "return"
    | "continuation"
    | "reaction"
    | "open_question"
    | "substantive_request";
  requiresContextExpansion: boolean;
  questionBudget: number;
  signals: string[];
};

export type ActiveFrontStatus = "active" | "blocked" | "pending" | "recent" | "uncertain";

export type ActiveFront = {
  id: string;
  theme: string;
  summary: string;
  status: ActiveFrontStatus;
  urgency: number;
  recency: number;
  unresolvedness: number;
  vocationalRelevance: number;
  confidence: number;
  provenance: string[];
  visibility: "internal" | "private";
  scope?: string | null;
  possibleNextMove?: string | null;
};

export type ActiveFrontSnapshot = {
  fronts: ActiveFront[];
  selectedFronts: ActiveFront[];
  hasSubstantiveContext: boolean;
  selectionReason: string[];
};

export type ActiveFrontSource = {
  id: string;
  type: "active_topic" | "memory" | "episode" | "source" | "agenda" | "registry" | "destiny" | "place" | "thread" | "system";
  text: string;
  provenance: string;
  visibility?: "internal" | "private" | "public" | "confessor" | "metadata-only";
  scope?: string | null;
  recency?: number;
};

export type PersonaInitiativeBrief = {
  groundedFacts: string[];
  relevantActiveFronts: string[];
  inferredTensions: Array<{
    text: string;
    confidence: number;
  }>;
  selectedIntervention: string;
  vocationalObjective: string;
  questionNecessary: boolean;
  questionPurpose?: string | null;
  prohibitedOpenings: string[];
  requiredSubstance: string[];
};

export type PersonaInitiativeQualityFindingCode =
  | "GENERIC_ASSISTANT_MODE"
  | "FALSE_CONTEXT_DENIAL"
  | "GENERIC_INTERVIEW_MODE"
  | "INTERROGATIVE_ELICITATION"
  | "PASSIVE_CONTEXT_WITHHOLDING"
  | "NO_CONTEXT_USE_WHEN_AVAILABLE"
  | "VOCATIONAL_INERTIA"
  | "SELF_DESCRIPTION_INSTEAD_OF_ACTION"
  | "EMPTY_FINAL_QUESTION"
  | "UNSUPPORTED_BIOGRAPHICAL_ASSERTION"
  | "PRIVATE_CONTEXT_LEAK"
  | "GENERIC_CLOSING"
  | "REPETITIVE_LOOP"
  | "THIN_RESPONSE"
  | "INTERNAL_CONTROL_LEAK";

export type PersonaInitiativeQualityFinding = {
  code: PersonaInitiativeQualityFindingCode;
  severity: "info" | "warning" | "error" | "critical";
  explanation: string;
  repairInstruction: string;
};

export type PersonaInitiativeQualityEvaluation = {
  initiativeScore: number;
  contextualGroundingScore: number;
  vocationalFitScore: number;
  specificityScore: number;
  privacyScore: number;
  explicitDetailRequest: boolean;
  genericQuestionCount: number;
  resonantInferenceCount: number;
  contextualConnectionsCount: number;
  elicitationMode: "RESONANT" | "INTERROGATIVE" | "NONE";
  unsupportedInferencePenalty: number;
  genericQuestionPenalty: number;
  genericAssistantPenalty: number;
  repetitionPenalty: number;
  findings: PersonaInitiativeQualityFinding[];
  finalPass: boolean;
};

export type VocationalLens = {
  family: PersonaFunctionalFamily;
  familyLabel: string;
  seeks: string[];
  verbs: string[];
  interventionNoun: string;
};
