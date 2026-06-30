export type PresenceFlowStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "REVIEW"
  | "CONFIRMED"
  | "SKIPPED"
  | "STALE";

export type PresenceFlowType =
  | "FIRST_AGREEMENT"
  | "CONTINUITY_PULSE"
  | "MANUAL_RECONFIGURATION";

export type PresenceFieldOrigin =
  | "USER_EXPLICIT"
  | "SYSTEM_EXTRACTION"
  | "DEFAULT";

export type PresenceScope = "SESSION" | "CONVERSATION" | "PERSONA" | "GLOBAL";

export type PresenceDepth = "SHORT" | "BALANCED" | "DEEP" | "PERSONA_DECIDES";

export type PresenceAdjustmentMode = "off" | "internal" | "shadow" | "enforce";

export type PresenceExtraction = {
  recentContext?: string;
  currentGoal?: string;
  preferredDepth?: PresenceDepth;
  prohibitedPatterns?: string[];
  involvedPeopleOrProjects?: string[];
  deadlinesOrEvents?: string[];
  confidence: number;
};

export type ConversationPresenceContract = {
  userId: string;
  personaId?: string;
  conversationId?: string;
  scope: PresenceScope;

  recentContext?: string;
  currentGoal?: string;
  importantEntities?: string[];

  responseDepth: PresenceDepth;
  genericHelpOfferPolicy: "ALLOW" | "BLOCK";
  genericContextRequestPolicy: "ALLOW" | "BLOCK_UNLESS_CRITICAL";
  finalQuestionPolicy: "ALLOW" | "BLOCK";
  symbolicLanguagePolicy: "NORMAL" | "REDUCED";
  repetitionPolicy: "NORMAL" | "STRICT";
  directnessLevel: "SOFT" | "BALANCED" | "DIRECT";
  customConstraints: string[];

  createdAt: string;
  updatedAt: string;
  validUntil?: string;
};

export type PresenceReviewField = {
  key: "recentContext" | "currentGoal" | "importantEntities" | "responseDepth" | "customConstraints";
  label: string;
  value: string;
  origin: PresenceFieldOrigin;
  useOnlyThisConversation?: boolean;
};

export type CriticalContextCheck = {
  existsInPresenceContract: boolean;
  existsInUserGraph: boolean;
  existsInConversation: boolean;
  canAnswerWithoutIt: boolean;
  exactMissingField?: string;
};

export type PresenceTelemetryEvent = {
  flowType: PresenceFlowType;
  personaId?: string;
  triggerReason: string;
  questionCount: number;
  skippedQuestions: number;
  durationMs: number;
  outcome: "CONFIRMED" | "SKIPPED" | "ABANDONED";
  scope?: PresenceScope;
  activePolicies: string[];
  genericClosingDetected?: boolean;
  contextRequestBlocked?: boolean;
  regenerationExecuted?: boolean;
  contractApplied?: boolean;
};
