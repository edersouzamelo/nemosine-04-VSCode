import { ENTITIES } from "@/app/data/entities";
import { getNativePersonaPromptRecord } from "@/app/data/nativePersonaPrompts";
import { getAgendaEvents } from "@/app/lib/sovereignStore";
import { getVisibleUserSources, getVisibleUserSourceProfileSummaries } from "@/app/lib/sourceStore";
import { getUserRegistros } from "@/app/lib/userFeatureStore";
import {
  getUserMemoryRecords,
  getVisibleConversationEpisodes,
} from "@/app/lib/nemosine/session_store";
import { isPrivateMemorySpace } from "@/app/lib/nemosine/privacy";
import {
  getPersonaBehaviorContract,
  PersonaBehaviorContract,
} from "@/app/lib/nemosine/persona_behavior_contracts";
import {
  classifyConversationInputRichness,
  isConversationNavigationRequest,
  isPersonaMetaCritique,
  isPersonaRoleQuestion,
  isSourceReferenceRequest,
} from "@/app/lib/nemosine/persona-initiative";
import {
  buildConversationContextPacket,
  canCrossPersonaOnGreeting,
  getVisibleActiveTopics,
  ContextPacketItem,
} from "@/app/lib/nemosine/conversation_continuity";
import { loadDestinyContextSource } from "@/app/lib/nemosine/destiny_context";
import {
  ChatHistoryMessage,
  ContextBrokerResult,
  ContextCandidate,
  ContextSourceType,
  ResponsePipelineRequest,
} from "./types";
import {
  clamp01,
  compactText,
  normalizeResponseText,
  overlapScore,
  recencyDecay,
  textSimilarity,
  uniqueTerms,
} from "./text";

export const CONTEXT_SCORE_WEIGHTS = {
  lexicalScore: 0.30,
  recencyScore: 0.15,
  continuityScore: 0.20,
  importanceScore: 0.20,
  personaRelevanceScore: 0.15,
} as const;

export const CONTEXT_BUDGETS: Partial<Record<ContextSourceType, number>> = {
  "recent-history": 6,
  memory: 4,
  episode: 3,
  destiny: 3,
  registry: 3,
  agenda: 3,
  "persistent-source": 2,
  "active-topic": 3,
  place: 1,
  persona: 1,
};

const sourcePriorities: Record<ContextSourceType, number> = {
  "current-message": 1,
  "recent-history": 0.62,
  memory: 0.68,
  episode: 0.64,
  destiny: 0.82,
  registry: 0.58,
  agenda: 0.58,
  "persistent-source": 0.7,
  persona: 0.66,
  place: 0.56,
  "active-topic": 0.74,
};

const sourceHalfLifeHours: Record<ContextSourceType, number> = {
  "current-message": 1,
  "recent-history": 72,
  memory: 24 * 90,
  episode: 72,
  destiny: 24 * 365,
  registry: 24 * 30,
  agenda: 24 * 14,
  "persistent-source": 24 * 120,
  persona: 24 * 365,
  place: 24 * 365,
  "active-topic": 24 * 14,
};

const highImportanceSignals = [
  "familia", "filho", "filha", "separacao", "divorcio", "saude", "luto",
  "morte", "crise", "juridico", "processo", "carreira", "financeiro",
  "divida", "projeto", "decisao", "prazo", "risco", "obra", "nemosine",
];

function summarizeAgenda(events: Awaited<ReturnType<typeof getAgendaEvents>>) {
  return events.map((event) => {
    const time = event.startTime ? `, ${event.startTime}-${event.endTime || "23:59"}` : "";
    const status = event.completed ? "concluido" : "pendente";
    return `${event.date}${time}: ${event.title} (${event.type}, ${status})${event.note ? ` - ${event.note}` : ""}`;
  });
}

function summarizeRegistries(registries: Awaited<ReturnType<typeof getUserRegistros>>) {
  return registries.map((registry) => {
    const persona = registry.persona ? ` | persona: ${registry.persona}` : "";
    const deadline = registry.next_deadline ? ` | prazo: ${registry.next_deadline}` : "";
    return `${registry.idea}${persona}${deadline} | status: ${registry.status}`;
  });
}

function buildPlaceContext(personaId: string, placeId?: string | null) {
  if (!placeId) return null;
  const place = Object.values(ENTITIES).find((entity) => entity.name === placeId && entity.type === "place");
  if (!place) return null;
  return [
    `Lugar ativo: ${place.name}`,
    `${personaId} esta convocado dentro deste Lugar. O Lugar e contexto, nao segunda voz.`,
    (place.prompt || place.transcription || "").slice(0, 1800),
  ].join("\n");
}

function buildTerms(userText: string, contract: PersonaBehaviorContract) {
  return Array.from(new Set([
    ...uniqueTerms(userText),
    ...contract.lexicalHints.flatMap((hint) => uniqueTerms(hint)),
    ...contract.contextToSeek.flatMap((hint) => uniqueTerms(hint)),
  ]));
}

function computeLexicalScore(text: string, terms: string[]) {
  if (terms.length === 0) return 0.1;
  const normalized = normalizeResponseText(text);
  const hits = terms.filter((term) => normalized.includes(term)).length;
  return clamp01(hits / Math.min(terms.length, 12));
}

function computePersonaRelevance(text: string, contract: PersonaBehaviorContract) {
  const personaTerms = Array.from(new Set([
    ...contract.lexicalHints.flatMap((hint) => uniqueTerms(hint)),
    ...contract.contextToSeek.flatMap((hint) => uniqueTerms(hint)),
    ...uniqueTerms(contract.operationalMission),
  ])).slice(0, 24);
  return personaTerms.length === 0 ? 0.35 : clamp01(0.18 + computeLexicalScore(text, personaTerms));
}

function computeImportance(text: string, sourceType: ContextSourceType) {
  const signalBoost = highImportanceSignals.some((signal) =>
    normalizeResponseText(text).includes(normalizeResponseText(signal))
  ) ? 0.18 : 0;
  return clamp01(sourcePriorities[sourceType] + signalBoost);
}

function finalScore(input: {
  lexicalScore: number;
  recencyScore: number;
  continuityScore: number;
  importanceScore: number;
  personaRelevanceScore: number;
}) {
  return clamp01(
    input.lexicalScore * CONTEXT_SCORE_WEIGHTS.lexicalScore
    + input.recencyScore * CONTEXT_SCORE_WEIGHTS.recencyScore
    + input.continuityScore * CONTEXT_SCORE_WEIGHTS.continuityScore
    + input.importanceScore * CONTEXT_SCORE_WEIGHTS.importanceScore
    + input.personaRelevanceScore * CONTEXT_SCORE_WEIGHTS.personaRelevanceScore
  );
}

function makeCandidate(input: {
  id: string;
  sourceType: ContextSourceType;
  text: string;
  userText: string;
  contract: PersonaBehaviorContract;
  timestamp?: Date | string | number | null;
  scope?: string | null;
  isPrivate?: boolean;
  continuityScore?: number;
  selectionReason?: string;
  lexicalScore?: number;
  recencyScore?: number;
  importanceScore?: number;
  personaRelevanceScore?: number;
}): ContextCandidate {
  const terms = buildTerms(input.userText, input.contract);
  const lexicalScore = input.lexicalScore ?? computeLexicalScore(input.text, terms);
  const recencyScore = input.recencyScore ?? recencyDecay(input.timestamp, sourceHalfLifeHours[input.sourceType]);
  const importanceScore = input.importanceScore ?? computeImportance(input.text, input.sourceType);
  const personaRelevanceScore = input.personaRelevanceScore ?? computePersonaRelevance(input.text, input.contract);
  const continuityScore = input.continuityScore ?? clamp01(
    overlapScore(uniqueTerms(input.userText), uniqueTerms(input.text))
    + (input.sourceType === "active-topic" ? 0.25 : 0)
  );

  return {
    id: input.id,
    sourceType: input.sourceType,
    text: input.text,
    timestamp: input.timestamp ?? null,
    scope: input.scope ?? null,
    isPrivate: Boolean(input.isPrivate),
    lexicalScore,
    recencyScore,
    continuityScore,
    importanceScore,
    personaRelevanceScore,
    semanticScore: null,
    finalScore: finalScore({
      lexicalScore,
      recencyScore,
      continuityScore,
      importanceScore,
      personaRelevanceScore,
    }),
    selectionReason: input.selectionReason,
  };
}

function packetSourceType(item: ContextPacketItem): ContextSourceType {
  if (item.type === "ACTIVE_TOPICS") return "active-topic";
  if (item.type === "RECENT_PUBLIC_EPISODES") return "episode";
  if (item.type === "RELEVANT_DURABLE_MEMORIES") return "memory";
  if (item.type === "DESTINY_CONTEXT") return "destiny";
  if (item.type === "AGENDA_AND_REGISTRY_CONTEXT") {
    return item.id.startsWith("agenda:") ? "agenda" : "registry";
  }
  if (item.type === "PERSONA_AFFINITY_CONTEXT") return "persistent-source";
  if (item.type === "CURRENT_THREAD_CONTEXT") return "recent-history";
  return "persistent-source";
}

function candidateFromPacketItem(item: ContextPacketItem, userText: string, contract: PersonaBehaviorContract) {
  return makeCandidate({
    id: item.id,
    sourceType: packetSourceType(item),
    text: item.text,
    userText,
    contract,
    timestamp: item.timestamp,
    scope: item.sourcePersonaId,
    isPrivate: item.privacyScope === "PRIVATE",
    lexicalScore: item.scoreBreakdown.relevance,
    recencyScore: item.scoreBreakdown.recency,
    continuityScore: item.score,
    importanceScore: item.scoreBreakdown.salience,
    personaRelevanceScore: item.scoreBreakdown.personaAffinity,
    selectionReason: item.reason,
  });
}

function historyCandidates(input: {
  history: ChatHistoryMessage[];
  userText: string;
  contract: PersonaBehaviorContract;
  memoryScope: string;
}) {
  return input.history
    .filter((message) => message.role !== "system" && message.content.trim().length > 0)
    .slice(-8)
    .map((message, index) => makeCandidate({
      id: `recent-history:${message.id || index}`,
      sourceType: "recent-history",
      text: `${message.role === "user" ? "Usuario" : "Persona"}: ${message.content}`,
      userText: input.userText,
      contract: input.contract,
      timestamp: message.timestamp || null,
      scope: input.memoryScope,
      isPrivate: isPrivateMemorySpace(input.memoryScope),
      continuityScore: 0.45,
      selectionReason: "recent visible thread history",
    }));
}

function isNearDuplicate(a: ContextCandidate, b: ContextCandidate) {
  const left = normalizeResponseText(a.text);
  const right = normalizeResponseText(b.text);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length > 60 && right.length > 60 && (left.includes(right) || right.includes(left))) return true;
  return textSimilarity(left, right) >= 0.86;
}

export function rankAndSelectContextCandidates(input: {
  candidates: ContextCandidate[];
  currentUserText: string;
  maxTotal?: number;
}) {
  const currentNormalized = normalizeResponseText(input.currentUserText);
  const sorted = [...input.candidates]
    .filter((candidate) => candidate.text.trim().length > 0)
    .sort((a, b) => b.finalScore - a.finalScore || b.recencyScore - a.recencyScore);
  const usedByType: Partial<Record<ContextSourceType, number>> = {};
  const selected: ContextCandidate[] = [];
  const maxTotal = input.maxTotal ?? 12;

  for (const candidate of sorted) {
    if (candidate.sourceType !== "current-message") {
      const normalized = normalizeResponseText(candidate.text);
      if (currentNormalized && normalized.length > 40 && normalized.includes(currentNormalized)) {
        continue;
      }
    }
    if (selected.some((item) => isNearDuplicate(item, candidate))) continue;
    const budget = CONTEXT_BUDGETS[candidate.sourceType] ?? 2;
    const used = usedByType[candidate.sourceType] || 0;
    if (used >= budget) continue;
    if (candidate.finalScore < 0.22 && candidate.sourceType !== "current-message") continue;
    selected.push(candidate);
    usedByType[candidate.sourceType] = used + 1;
    if (selected.filter((item) => item.sourceType !== "current-message").length >= maxTotal) break;
  }

  return selected.sort((a, b) => {
    if (a.sourceType === "recent-history" && b.sourceType !== "recent-history") return -1;
    if (b.sourceType === "recent-history" && a.sourceType !== "recent-history") return 1;
    return b.finalScore - a.finalScore;
  });
}

function sourceTypeCounts(candidates: ContextCandidate[]) {
  return candidates.reduce<Record<string, number>>((acc, candidate) => {
    acc[candidate.sourceType] = (acc[candidate.sourceType] || 0) + 1;
    return acc;
  }, {});
}

export function redactedContextCandidatePreview(candidate: ContextCandidate, privateRun = false) {
  return {
    id: candidate.id,
    sourceType: candidate.sourceType,
    finalScore: Number(candidate.finalScore.toFixed(3)),
    isPrivate: candidate.isPrivate,
    reason: candidate.selectionReason || null,
    preview: candidate.isPrivate && !privateRun
      ? "[private-context-redacted]"
      : compactText(candidate.text, 180),
  };
}

export async function buildContextBroker(input: ResponsePipelineRequest): Promise<ContextBrokerResult> {
  const contract = getPersonaBehaviorContract(input.personaId);
  const inputRichness = classifyConversationInputRichness(input.userText);
  const sourceReferenceRequest = isSourceReferenceRequest(input.userText);
  const suppressContinuityContext = isPersonaRoleQuestion(input.userText)
    || isPersonaMetaCritique(input.userText)
    || isConversationNavigationRequest(input.userText)
    || sourceReferenceRequest;
  const suppressCrossPersonaContinuity = inputRichness.openingType === "greeting";

  const memoryPromise = getUserMemoryRecords(input.userId, input.memoryScope, inputRichness.requiresContextExpansion ? 60 : 40);
  const episodePromise = sourceReferenceRequest
    ? Promise.resolve([])
    : getVisibleConversationEpisodes(input.userId, input.memoryScope, { excludeThreadId: input.threadId })
      .then((items) => items.slice(0, inputRichness.requiresContextExpansion ? 10 : 8));

  const [memoryRecords, sourceProfileSummaries, episodes, activeTopics, userSources, agendaEvents, registries] = await Promise.all([
    memoryPromise.catch(() => []),
    getVisibleUserSourceProfileSummaries(input.userId, input.memoryScope).catch(() => []),
    episodePromise.catch(() => []),
    getVisibleActiveTopics(input.userId, input.memoryScope, 10).catch(() => []),
    getVisibleUserSources(input.userId, input.personaId).catch(() => []),
    getAgendaEvents(input.userId).catch(() => []),
    getUserRegistros(input.userId).catch(() => []),
  ]);

  const activeTopicsForContext = suppressContinuityContext
    ? []
    : suppressCrossPersonaContinuity
      ? activeTopics.filter((topic) => canCrossPersonaOnGreeting(
        `${topic.title} ${topic.summary} ${topic.keywords.join(" ")}`,
        topic.sourcePersonaId,
        input.personaId,
        input.memoryScope,
      ))
      : activeTopics;

  const destinyContext = await loadDestinyContextSource({
    userId: input.userId,
    personaId: input.personaId,
    userText: input.userText,
    contract,
    activeTopics: activeTopicsForContext,
    limit: 8,
  });

  const contextPacket = buildConversationContextPacket({
    userText: input.userText,
    personaId: input.personaId,
    memoryScope: input.memoryScope,
    contract,
    inputRichness,
    activeTopics: activeTopicsForContext,
    memories: [
      ...memoryRecords,
      ...sourceProfileSummaries.filter((summary) =>
        !memoryRecords.some((memory) => memory.content === summary.content)
      ),
    ],
    episodes,
    sources: userSources.slice(0, 5),
    agenda: summarizeAgenda(agendaEvents.slice(0, 8)),
    registries: summarizeRegistries(registries.slice(0, 8)),
    destiny: destinyContext.selected.map((item) => item.text),
  });

  const nativePromptRecord = getNativePersonaPromptRecord(input.personaId);
  const personaData = Object.values(ENTITIES).find((entity) => entity.name === input.personaId && entity.type === "persona");
  const personaText = nativePromptRecord?.prompt || personaData?.prompt || "";
  const placeContext = buildPlaceContext(input.personaId, input.placeId);
  const packetCandidates = [
    ...contextPacket.activeTopics,
    ...contextPacket.recentPublicEpisodes,
    ...contextPacket.relevantDurableMemories,
    ...contextPacket.personaAffinityContext,
    ...contextPacket.destinyContext,
    ...contextPacket.agendaAndRegistryContext,
    ...contextPacket.currentThreadContext,
  ].map((item) => candidateFromPacketItem(item, input.userText, contract));
  const candidates = [
    makeCandidate({
      id: "current-message",
      sourceType: "current-message",
      text: input.userText,
      userText: input.userText,
      contract,
      timestamp: new Date(),
      scope: input.memoryScope,
      isPrivate: input.privateRun,
      lexicalScore: 1,
      recencyScore: 1,
      importanceScore: 1,
      personaRelevanceScore: 1,
      continuityScore: 1,
      selectionReason: "current message is sent as user role, not repeated in renderer prompt",
    }),
    ...historyCandidates({
      history: input.priorHistory,
      userText: input.userText,
      contract,
      memoryScope: input.memoryScope,
    }),
    ...packetCandidates,
    ...(personaText ? [makeCandidate({
      id: "persona:native-contract",
      sourceType: "persona",
      text: `Persona ativa: ${input.personaId}. Vocacao: ${contract.operationalMission}`,
      userText: input.userText,
      contract,
      scope: input.personaId,
      selectionReason: "persona mission summary for vocational framing",
    })] : []),
    ...(placeContext ? [makeCandidate({
      id: `place:${input.placeId}`,
      sourceType: "place",
      text: placeContext,
      userText: input.userText,
      contract,
      scope: input.placeId,
      isPrivate: isPrivateMemorySpace(input.placeId || ""),
      selectionReason: "active place context",
    })] : []),
  ];

  const selected = rankAndSelectContextCandidates({
    candidates,
    currentUserText: input.userText,
    maxTotal: inputRichness.requiresContextExpansion ? 14 : 10,
  });
  const selectedForPrompt = selected.filter((candidate) => candidate.sourceType !== "current-message");
  const metrics = {
    candidateCount: candidates.length,
    selectedCount: selected.length,
    selectedForPromptCount: selectedForPrompt.length,
    privateCandidateCount: candidates.filter((candidate) => candidate.isPrivate).length,
    privateItemsExcluded: contextPacket.metrics.privateItemsExcluded,
    sourceTypeCounts: sourceTypeCounts(selectedForPrompt),
    topSourceTypes: selectedForPrompt.slice(0, 6).map((candidate) => candidate.sourceType),
    topScores: selectedForPrompt.slice(0, 6).map((candidate) => Number(candidate.finalScore.toFixed(3))),
    semanticReady: true,
  };

  return {
    candidates,
    selected,
    selectedForPrompt,
    metrics,
    retrievalExplanation: [
      "context-broker=v2",
      `inputRichness=${inputRichness.richness}`,
      `openingType=${inputRichness.openingType}`,
      `destinySourceStatus=${destinyContext.status.destinySourceStatus}`,
      `destinyEventsSelected=${destinyContext.status.destinyEventsSelected}`,
      `weights=${JSON.stringify(CONTEXT_SCORE_WEIGHTS)}`,
      "semanticScore=null until local semantic infrastructure is attached; interface is ready",
      ...selectedForPrompt.slice(0, 8).map((candidate) =>
        `${candidate.id}: score=${candidate.finalScore.toFixed(2)} type=${candidate.sourceType} reason=${candidate.selectionReason || "hybrid-rank"}`
      ),
    ],
  };
}
