import type {
  ConversationPresenceContract,
  CriticalContextCheck,
  PresenceAdjustmentMode,
  PresenceDepth,
  PresenceExtraction,
  PresenceScope,
  PresenceTelemetryEvent,
} from "./types";

export const PERSONA_PRESENCE_QUESTIONS: Record<string, string> = {
  mentor: "Qual decisao, direcao ou compromisso esta exigindo mais de voce agora?",
  estrategista: "Qual resultado voce precisa alcancar e o que esta dificultando isso?",
  psicologo: "Que situacao ou padrao voce esta tentando compreender?",
  vidente: "Que decisao ou acontecimento futuro voce esta tentando antecipar?",
  cigana: "Que mudanca ao seu redor pode afetar seus proximos passos?",
  mestre: "O que voce esta tentando compreender, escrever ou defender?",
  treinador: "Qual e sua condicao fisica atual e o que pretende melhorar?",
  inimigo: "Que risco, vulnerabilidade ou sabotagem voce quer expor?",
};

export const DEFAULT_PRESENCE_CONTRACT: Omit<
  ConversationPresenceContract,
  "userId" | "createdAt" | "updatedAt"
> = {
  scope: "PERSONA",
  responseDepth: "PERSONA_DECIDES",
  genericHelpOfferPolicy: "BLOCK",
  genericContextRequestPolicy: "BLOCK_UNLESS_CRITICAL",
  finalQuestionPolicy: "ALLOW",
  symbolicLanguagePolicy: "NORMAL",
  repetitionPolicy: "STRICT",
  directnessLevel: "BALANCED",
  customConstraints: [],
};

const VALID_MODES = new Set(["off", "internal", "shadow", "enforce"]);

export function normalizePresenceMode(value?: string | null): PresenceAdjustmentMode {
  const normalized = (value || "off").trim().toLowerCase();
  return VALID_MODES.has(normalized) ? normalized as PresenceAdjustmentMode : "off";
}

export function normalizePresenceKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPresenceQuestionForPersona(personaId: string) {
  return PERSONA_PRESENCE_QUESTIONS[normalizePresenceKey(personaId)] || "O que tem acontecido com voce ultimamente?";
}

export function shouldTriggerFirstAgreement(input: {
  enabled: boolean;
  authenticated: boolean;
  personaId?: string | null;
  hasConfirmedContract: boolean;
  skippedForPersona: boolean;
  shownThisSession: boolean;
}) {
  return Boolean(
    input.enabled
    && input.authenticated
    && input.personaId
    && !input.hasConfirmedContract
    && !input.skippedForPersona
    && !input.shownThisSession,
  );
}

export function shouldTriggerContinuityPulse(input: {
  enabled: boolean;
  hasContract: boolean;
  updatedAt: string;
  previousSeenAt?: string | null;
  lastPulseAt?: string | null;
  shownThisSession: boolean;
  now?: string;
  staleDays?: number;
  minDaysBetweenPulses?: number;
}) {
  if (!input.enabled || !input.hasContract || input.shownThisSession) return false;
  const now = Date.parse(input.now || new Date().toISOString());
  const updatedAt = Date.parse(input.updatedAt);
  const previousSeenAt = input.previousSeenAt ? Date.parse(input.previousSeenAt) : now;
  const lastPulseAt = input.lastPulseAt ? Date.parse(input.lastPulseAt) : Number.NaN;
  const staleMs = Math.max(1, input.staleDays || 7) * 86_400_000;
  const minPulseMs = Math.max(1, input.minDaysBetweenPulses || 7) * 86_400_000;

  return Number.isFinite(now)
    && Number.isFinite(updatedAt)
    && Number.isFinite(previousSeenAt)
    && now - updatedAt >= staleMs
    && now - previousSeenAt >= staleMs
    && (!Number.isFinite(lastPulseAt) || now - lastPulseAt >= minPulseMs);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function extractPresenceSignals(text: string): PresenceExtraction {
  const raw = text.trim();
  const normalized = normalizePresenceKey(raw);
  const prohibitedPatterns: string[] = [];
  const involvedPeopleOrProjects: string[] = [];
  const deadlinesOrEvents: string[] = [];
  let currentGoal: string | undefined;
  let preferredDepth: PresenceDepth | undefined;
  let confidence = raw.length >= 40 ? 0.34 : 0.18;

  if (/\b(decidir|decisao|escolher|publicar|aprovar|recusar)\b/.test(normalized)) {
    currentGoal = "tomar uma decisao";
    confidence += 0.24;
  } else if (/\b(plano|organizar|planejar|estruturar|executar)\b/.test(normalized)) {
    currentGoal = "organizar um plano";
    confidence += 0.22;
  } else if (/\b(escrever|produzir|criar|entregar|artigo|texto|documento)\b/.test(normalized)) {
    currentGoal = "produzir alguma coisa";
    confidence += 0.2;
  } else if (/\b(entender|compreender|padrao|situacao|analisar)\b/.test(normalized)) {
    currentGoal = "compreender uma situacao";
    confidence += 0.2;
  } else if (/\b(desabafar|cansado|ansioso|frustrado|triste)\b/.test(normalized)) {
    currentGoal = "desabafar";
    confidence += 0.18;
  }

  if (/\b(resposta|responda|fala)\b.{0,40}\b(profunda|aprofundada|densa)\b/.test(normalized) || /\bprofunda\b/.test(normalized)) {
    preferredDepth = "DEEP";
    confidence += 0.14;
  } else if (/\b(curta|breve|direta|objetiva)\b/.test(normalized)) {
    preferredDepth = "SHORT";
    confidence += 0.12;
  } else if (/\b(equilibrada|normal|media)\b/.test(normalized)) {
    preferredDepth = "BALANCED";
    confidence += 0.1;
  }

  const prohibitionChecks: Array<[RegExp, string]> = [
    [/\bsem\s+se\s+quiser\b|\bnao\s+usar\s+se\s+quiser\b/, "nao usar se quiser"],
    [/\bnao\s+terminar\s+oferecendo\s+ajuda\b|\bsem\s+oferecer\s+ajuda\b/, "nao terminar oferecendo ajuda"],
    [/\bnao\s+terminar\s+com\s+pergunta\b|\bsem\s+pergunta\s+final\b/, "nao terminar com pergunta"],
    [/\bnao\s+pedir\s+mais\s+contexto\b|\bsem\s+pedir\s+contexto\b/, "nao pedir mais contexto sem necessidade"],
    [/\bnao\s+repetir\b|\bsem\s+repetir\b/, "nao repetir o que eu ja disse"],
    [/\bnao\s+suavizar\b|\bsem\s+suavizar\b/, "nao suavizar criticas"],
  ];
  for (const [pattern, label] of prohibitionChecks) {
    if (pattern.test(normalized)) {
      prohibitedPatterns.push(label);
      confidence += 0.08;
    }
  }

  const projectMatches = raw.matchAll(/\b(?:artigo|projeto|processo|tarefa|entrega|Nemosine|Codex|Vercel|GitHub)\b[\w\s-]{0,60}/gi);
  for (const match of projectMatches) involvedPeopleOrProjects.push(match[0].trim());

  const dateMatches = raw.matchAll(/\b(?:hoje|amanha|esta semana|semana que vem|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/gi);
  for (const match of dateMatches) deadlinesOrEvents.push(match[0].trim());

  return {
    recentContext: raw || undefined,
    currentGoal,
    preferredDepth,
    prohibitedPatterns: unique(prohibitedPatterns),
    involvedPeopleOrProjects: unique(involvedPeopleOrProjects).slice(0, 5),
    deadlinesOrEvents: unique(deadlinesOrEvents).slice(0, 5),
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

function mergeContractField<T>(base: T, override: T | undefined): T {
  return override === undefined || override === null ? base : override;
}

export function createPresenceContract(input: {
  userId: string;
  personaId?: string;
  conversationId?: string;
  scope?: PresenceScope;
  recentContext?: string;
  currentGoal?: string;
  importantEntities?: string[];
  responseDepth?: PresenceDepth;
  prohibitedPatterns?: string[];
  customConstraints?: string[];
  validUntil?: string;
}): ConversationPresenceContract {
  const now = new Date().toISOString();
  const prohibited = new Set((input.prohibitedPatterns || []).map(normalizePresenceKey));
  return {
    ...DEFAULT_PRESENCE_CONTRACT,
    userId: input.userId,
    personaId: input.personaId,
    conversationId: input.conversationId,
    scope: input.scope || "PERSONA",
    recentContext: input.recentContext?.trim() || undefined,
    currentGoal: input.currentGoal?.trim() || undefined,
    importantEntities: unique(input.importantEntities || []),
    responseDepth: input.responseDepth || "PERSONA_DECIDES",
    genericHelpOfferPolicy: prohibited.has("nao terminar oferecendo ajuda") || prohibited.has("nao usar se quiser") ? "BLOCK" : "BLOCK",
    genericContextRequestPolicy: prohibited.has("nao pedir mais contexto sem necessidade") ? "BLOCK_UNLESS_CRITICAL" : "BLOCK_UNLESS_CRITICAL",
    finalQuestionPolicy: prohibited.has("nao terminar com pergunta") ? "BLOCK" : "ALLOW",
    symbolicLanguagePolicy: prohibited.has("nao usar simbolismo excessivo") ? "REDUCED" : "NORMAL",
    repetitionPolicy: prohibited.has("nao repetir o que eu ja disse") ? "STRICT" : "STRICT",
    directnessLevel: prohibited.has("nao suavizar criticas") ? "DIRECT" : "BALANCED",
    customConstraints: unique([
      ...(input.customConstraints || []),
      ...(input.prohibitedPatterns || []),
    ]),
    createdAt: now,
    updatedAt: now,
    validUntil: input.validUntil,
  };
}

export function mergePresenceContracts(
  lower: ConversationPresenceContract,
  higher?: Partial<ConversationPresenceContract> | null,
): ConversationPresenceContract {
  if (!higher) return lower;
  return {
    ...lower,
    ...higher,
    recentContext: mergeContractField(lower.recentContext, higher.recentContext),
    currentGoal: mergeContractField(lower.currentGoal, higher.currentGoal),
    importantEntities: higher.importantEntities === undefined ? lower.importantEntities : higher.importantEntities,
    responseDepth: higher.responseDepth || lower.responseDepth,
    genericHelpOfferPolicy: higher.genericHelpOfferPolicy || lower.genericHelpOfferPolicy,
    genericContextRequestPolicy: higher.genericContextRequestPolicy || lower.genericContextRequestPolicy,
    finalQuestionPolicy: higher.finalQuestionPolicy || lower.finalQuestionPolicy,
    symbolicLanguagePolicy: higher.symbolicLanguagePolicy || lower.symbolicLanguagePolicy,
    repetitionPolicy: higher.repetitionPolicy || lower.repetitionPolicy,
    directnessLevel: higher.directnessLevel || lower.directnessLevel,
    customConstraints: higher.customConstraints === undefined ? lower.customConstraints : higher.customConstraints,
    updatedAt: higher.updatedAt || lower.updatedAt,
  };
}

export function resolveEffectivePresenceContract(input: {
  defaultContract: ConversationPresenceContract;
  globalContract?: Partial<ConversationPresenceContract> | null;
  personaContract?: Partial<ConversationPresenceContract> | null;
  conversationContract?: Partial<ConversationPresenceContract> | null;
  sessionContract?: Partial<ConversationPresenceContract> | null;
}) {
  const overrides: Array<Partial<ConversationPresenceContract> | null | undefined> = [
    input.globalContract,
    input.personaContract,
    input.conversationContract,
    input.sessionContract,
  ];
  return overrides.reduce<ConversationPresenceContract>(
    (contract, override) => mergePresenceContracts(contract, override),
    input.defaultContract,
  );
}

export function renderPresenceContractForRuntime(contract?: ConversationPresenceContract | null, mode: PresenceAdjustmentMode = "enforce") {
  if (!contract || mode === "off") return "";

  return [
    "PRESENCE CONTRACT",
    `Mode: ${mode}`,
    `Scope: ${contract.scope}`,
    contract.currentGoal ? `Current goal: ${contract.currentGoal}` : "",
    contract.recentContext ? `Recent context: ${contract.recentContext}` : "",
    contract.importantEntities?.length ? `Important entities: ${contract.importantEntities.join(", ")}` : "",
    `Response depth: ${contract.responseDepth}`,
    `Generic help offer policy: ${contract.genericHelpOfferPolicy}`,
    `Generic context request policy: ${contract.genericContextRequestPolicy}`,
    `Final question policy: ${contract.finalQuestionPolicy}`,
    `Symbolic language policy: ${contract.symbolicLanguagePolicy}`,
    `Repetition policy: ${contract.repetitionPolicy}`,
    `Directness level: ${contract.directnessLevel}`,
    contract.customConstraints.length ? `Custom constraints: ${contract.customConstraints.join("; ")}` : "",
    "This contract controls form, depth and constraints only. It must not alter the persona identity or vocation.",
    "If the current user input is only a greeting or shallow opening, use this contract as the primary context and do not switch to unrelated recent memories.",
  ].filter(Boolean).join("\n");
}

function sentenceSegments(text: string) {
  return text
    .trim()
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function detectGenericClosingViolation(input: {
  responseText: string;
  contract?: ConversationPresenceContract | null;
}) {
  const segments = sentenceSegments(input.responseText);
  const tail = segments.slice(-2).join(" ");
  const normalized = normalizePresenceKey(tail);
  const contract = input.contract;
  const blocksHelp = !contract || contract.genericHelpOfferPolicy === "BLOCK";
  const blocksContext = !contract || contract.genericContextRequestPolicy === "BLOCK_UNLESS_CRITICAL";
  const blocksQuestion = contract?.finalQuestionPolicy === "BLOCK";
  const patterns: Array<[boolean, RegExp, string]> = [
    [blocksHelp, /\b(se quiser|caso queira|se precisar|estou aqui para ajudar|estou a disposicao|posso ajudar|podemos aprofundar|podemos explorar|podemos continuar)\b/, "GENERIC_HELP_OFFER"],
    [blocksContext, /\b(me de mais detalhes|forneca mais contexto|pode fornecer mais detalhes|compartilhe mais contexto|ha algo especifico|quer que eu aprofunde)\b/, "GENERIC_CONTEXT_REQUEST"],
  ];

  const matched = patterns
    .filter(([enabled, pattern]) => enabled && pattern.test(normalized))
    .map(([, , reason]) => reason);
  if (blocksQuestion && /\?\s*$/.test(tail.trim())) {
    matched.push("FINAL_QUESTION_BLOCKED");
  }

  return {
    violation: matched.length > 0,
    reasons: matched,
    inspectedText: tail,
  };
}

export function removeGenericClosingByContract(responseText: string, contract?: ConversationPresenceContract | null) {
  const segments = sentenceSegments(responseText);
  if (segments.length <= 1) return responseText.trim();
  let next = [...segments];

  while (next.length > 1 && detectGenericClosingViolation({
    responseText: next[next.length - 1],
    contract,
  }).violation) {
    next = next.slice(0, -1);
  }

  return next.join(" ").trim() || responseText.trim();
}

export function checkCriticalContextRequest(input: {
  requestedText: string;
  contract?: ConversationPresenceContract | null;
  conversationText?: string;
  userGraphSignals?: string[];
}): CriticalContextCheck {
  const normalizedRequest = normalizePresenceKey(input.requestedText);
  const contractText = normalizePresenceKey([
    input.contract?.recentContext,
    input.contract?.currentGoal,
    ...(input.contract?.importantEntities || []),
  ].filter(Boolean).join(" "));
  const conversationText = normalizePresenceKey(input.conversationText || "");
  const graphText = normalizePresenceKey((input.userGraphSignals || []).join(" "));
  const exactMissingField = /\b(data limite|prazo|valor|nome|arquivo|documento|cidade|idade)\b/.exec(normalizedRequest)?.[1];
  const generic = /\b(mais detalhes|mais contexto|algo especifico|contextualizar)\b/.test(normalizedRequest);

  return {
    existsInPresenceContract: Boolean(contractText && !generic && normalizedRequest.split(" ").some((term) => term.length > 4 && contractText.includes(term))),
    existsInUserGraph: Boolean(graphText && !generic && normalizedRequest.split(" ").some((term) => term.length > 4 && graphText.includes(term))),
    existsInConversation: Boolean(conversationText && !generic && normalizedRequest.split(" ").some((term) => term.length > 4 && conversationText.includes(term))),
    canAnswerWithoutIt: generic || Boolean(input.contract?.recentContext || input.contract?.currentGoal),
    exactMissingField,
  };
}

export function sanitizePresenceTelemetry(event: PresenceTelemetryEvent): PresenceTelemetryEvent {
  return {
    flowType: event.flowType,
    personaId: event.personaId,
    triggerReason: event.triggerReason,
    questionCount: event.questionCount,
    skippedQuestions: event.skippedQuestions,
    durationMs: Math.max(0, Math.min(event.durationMs, 30 * 60_000)),
    outcome: event.outcome,
    scope: event.scope,
    activePolicies: unique(event.activePolicies).slice(0, 12),
    genericClosingDetected: Boolean(event.genericClosingDetected),
    contextRequestBlocked: Boolean(event.contextRequestBlocked),
    regenerationExecuted: Boolean(event.regenerationExecuted),
    contractApplied: Boolean(event.contractApplied),
  };
}
