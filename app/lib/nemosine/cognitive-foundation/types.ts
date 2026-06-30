export const userProfileEpistemicTypes = [
  "DECLARED_FACT",
  "OBSERVED_BEHAVIOR",
  "INFERRED_PATTERN",
  "USER_PREFERENCE",
  "GOAL",
  "VALUE",
  "RELATIONSHIP",
  "PROJECT",
  "CONSTRAINT",
  "HYPOTHESIS",
  "PUBLIC_SOURCE_CANDIDATE",
] as const;
export type UserProfileEpistemicType = typeof userProfileEpistemicTypes[number];

export const userProfileStatuses = [
  "CANDIDATE",
  "CONFIRMED",
  "REJECTED",
  "SUPERSEDED",
  "EXPIRED",
  "DELETED",
] as const;
export type UserProfileStatus = typeof userProfileStatuses[number];

export const userProfileSensitivityLevels = [
  "PUBLIC",
  "NORMAL",
  "PERSONAL",
  "SENSITIVE",
  "CONFESSOR_ONLY",
] as const;
export type UserProfileSensitivity = typeof userProfileSensitivityLevels[number];

export const userProfileScopeTypes = [
  "GLOBAL",
  "AUTHORIZED_PERSONAS",
  "PERSONA_SPECIFIC",
  "CONFESSOR",
  "SYSTEM",
  "NON_PROJECTABLE",
] as const;
export type UserProfileScopeType = typeof userProfileScopeTypes[number];

export const userProfileSourceTypes = [
  "conversation",
  "onboarding",
  "file",
  "destiny_line",
  "manual",
  "authorized_public_source",
  "import",
  "system",
  "legacy_memory",
] as const;
export type UserProfileSourceType = typeof userProfileSourceTypes[number];

export type UserProfileEvidenceRecord = {
  id?: string;
  profileNodeId?: string;
  sourceType: string;
  sourceId?: string | null;
  redactedSummary?: string | null;
  contentHash?: string | null;
  evidenceWeight: number;
  evidenceDate?: Date | string | null;
  origin?: string | null;
  allowedAccess?: unknown;
};

export type UserProfileNodeRecord = {
  id: string;
  userId: string;
  normalizedContent: string;
  shortSummary: string;
  category: string;
  subtype?: string | null;
  epistemicType: UserProfileEpistemicType;
  sourceType: UserProfileSourceType | string;
  sourceReference?: string | null;
  sourceDate?: Date | string | null;
  capturedAt?: Date | string | null;
  confidence: number;
  sensitivity: UserProfileSensitivity;
  scopeType: UserProfileScopeType;
  authorizedPersonas?: string[] | null;
  status: UserProfileStatus;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  createdBy: string;
  updatedAt?: Date | string | null;
  removedAt?: Date | string | null;
  evidence?: UserProfileEvidenceRecord[];
};

export type MemoryCandidate = Omit<UserProfileNodeRecord, "id" | "userId" | "status" | "capturedAt" | "updatedAt" | "removedAt"> & {
  id?: string;
  status: "CANDIDATE";
  evidence: UserProfileEvidenceRecord[];
  riskOfError: "low" | "medium" | "high";
  requiresConfirmation: boolean;
  conflictPossible: boolean;
  shouldPersistAutomatically: false;
};

export type MemoryCandidateExtractionResult = {
  candidates: MemoryCandidate[];
  skipped: boolean;
  skipReason?: string;
  findingCodes: string[];
};

export const demandClasses = [
  "DIRECT",
  "INFORMATIONAL",
  "INTERPRETIVE",
  "MENTORIAL",
  "EMOTIONAL",
  "STRATEGIC",
  "MULTI_PERSONA",
  "INVESTIGATIVE",
  "URGENT",
] as const;
export type DemandClass = typeof demandClasses[number];

export type DepthGateEvaluation = {
  demandClass: DemandClass;
  score: number;
  passed: boolean;
  shouldRegenerate: boolean;
  approvedCriteria: string[];
  rejectedCriteria: string[];
  findingCodes: string[];
  critique: string[];
  lazyClosingDetected: boolean;
  finalQuestionValid: boolean | null;
  metrics: {
    wordCount: number;
    specificityScore: number;
    contextUseScore: number;
    depthScore: number;
    noveltyScore: number;
    personaFidelityScore: number;
    substantiveClosingScore: number;
  };
};

export type PersonaContextProjection = {
  personaId: string;
  memoryScope: string;
  core: UserProfileNodeRecord[];
  vocational: UserProfileNodeRecord[];
  blockedCount: number;
  blockedReasons: string[];
  projectionSummary: {
    totalInputNodes: number;
    coreCount: number;
    vocationalCount: number;
    categories: string[];
    epistemicTypes: string[];
  };
  prohibitions: string[];
};
