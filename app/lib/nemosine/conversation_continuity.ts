import crypto from "crypto";
import { prisma } from "./session_store";
import { isPrivateMemorySpace } from "./privacy";
import {
  PersonaBehaviorContract,
} from "./persona_behavior_contracts";
import {
  ActiveFrontSource,
  classifyConversationInputRichness,
  ConversationInputRichness,
  normalizeInitiativeText,
} from "./persona-initiative";

export type InvocationMode =
  | "DIRECT_REQUEST"
  | "CONTINUITY_TRIGGER"
  | "GREETING"
  | "FOLLOW_UP"
  | "META_CRITIQUE"
  | "UNKNOWN";

export type ActiveTopicRecord = {
  id: string;
  userId: string;
  title: string;
  summary: string;
  keywords: string[];
  salience: number;
  status: "ACTIVE" | "PENDING" | "RESOLVED" | string;
  privacyScope: "PUBLIC" | "PRIVATE" | string;
  sourceThreadId: string | null;
  sourcePersonaId: string | null;
  firstObservedAt: Date;
  lastObservedAt: Date;
  resolvedAt: Date | null;
  evidenceCount: number;
  metadata: Record<string, unknown> | null;
};

export type ActiveTopicCandidate = {
  title: string;
  summary: string;
  keywords: string[];
  salience: number;
  status: "ACTIVE" | "PENDING" | "RESOLVED";
  privacyScope: "PUBLIC" | "PRIVATE";
};

export type ContextPacketItemType =
  | "ACTIVE_TOPICS"
  | "RECENT_PUBLIC_EPISODES"
  | "RELEVANT_DURABLE_MEMORIES"
  | "PERSONA_AFFINITY_CONTEXT"
  | "BIOGRAPHICAL_FACTS"
  | "CURRENT_THREAD_CONTEXT"
  | "DESTINY_CONTEXT"
  | "AGENDA_AND_REGISTRY_CONTEXT";

export type ContextPacketItem = {
  id: string;
  type: ContextPacketItemType;
  text: string;
  title?: string;
  timestamp?: Date | null;
  sourcePersonaId?: string | null;
  sourceThreadId?: string | null;
  privacyScope: "PUBLIC" | "PRIVATE" | "INTERNAL";
  score: number;
  scoreBreakdown: {
    relevance: number;
    recency: number;
    salience: number;
    personaAffinity: number;
  };
  reason: string;
};

export type ConversationContextPacket = {
  invocationMode: InvocationMode;
  inputRichness: ConversationInputRichness;
  hasSubstantiveContext: boolean;
  activeTopics: ContextPacketItem[];
  recentPublicEpisodes: ContextPacketItem[];
  relevantDurableMemories: ContextPacketItem[];
  personaAffinityContext: ContextPacketItem[];
  biographicalFacts: ContextPacketItem[];
  currentThreadContext: ContextPacketItem[];
  destinyContext: ContextPacketItem[];
  agendaAndRegistryContext: ContextPacketItem[];
  selectedItems: ContextPacketItem[];
  privacyBoundaries: string[];
  retrievalExplanation: string[];
  metrics: {
    activeTopicsCount: number;
    recentEpisodesCount: number;
    memoriesCount: number;
    selectedContextCount: number;
    privateItemsExcluded: number;
    crossPersonaContinuityUsed: boolean;
    topContextTypes: string[];
    topScores: number[];
    sourcePersonas: string[];
  };
};

type SourceInput = {
  id: string;
  type: ContextPacketItemType;
  text: string;
  title?: string;
  timestamp?: Date | string | number | null;
  sourcePersonaId?: string | null;
  sourceThreadId?: string | null;
  privacyScope?: "PUBLIC" | "PRIVATE" | "INTERNAL";
  salience?: number;
};

const stopwords = new Set([
  "a", "o", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
  "e", "em", "para", "por", "com", "que", "como", "qual", "quais", "me", "meu",
  "minha", "meus", "minhas", "voce", "vc", "eu", "tu", "nos", "isso", "esse",
  "essa", "este", "esta", "aquele", "aquela", "agora", "hoje", "ontem", "amanha",
  "bom", "dia", "boa", "noite", "tarde", "ola", "oi", "sobre", "algo",
]);

const substantiveSignals = [
  "decidir", "decisao", "considerando", "preciso", "conflito", "problema", "risco",
  "prazo", "mudanca", "mudar", "encerrar", "iniciar", "terminar", "resolver",
  "falha", "erro", "bug", "saude", "familia", "relacionamento", "financeiro",
  "financas", "carreira", "projeto", "nemosine", "runtime", "memoria", "viagem",
  "frustracao", "rejeicao", "repeticao", "recorrente", "meses", "anos",
];

const unresolvedSignals = [
  "pendente", "nao resolvido", "em aberto", "bloqueado", "travado", "conflito",
  "considerando", "talvez", "risco", "preciso decidir", "ainda", "proximo passo",
];

const resolvedSignals = [
  "resolvi", "resolvido", "decidi", "conclui", "finalizei", "encerrei", "fechei",
  "nao e mais", "deixou de ser", "esta resolvido",
];

const recurrenceSignals = [
  "repeticao", "repetindo", "recorrente", "sempre", "de novo", "ha meses", "ha anos",
  "meses", "anos", "padrao", "ciclo",
];

function hashText(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function compact(text: string, limit = 220) {
  return text.replace(/\s+/g, " ").trim().slice(0, limit);
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
  return null;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(String(value || ""));
  return Number.isFinite(parsed.getTime()) ? parsed : new Date(0);
}

function asTopic(row: any): ActiveTopicRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    summary: row.summary,
    keywords: parseJsonArray(row.keywords),
    salience: Number(row.salience ?? 0.5),
    status: row.status,
    privacyScope: row.privacyScope,
    sourceThreadId: row.sourceThreadId ?? null,
    sourcePersonaId: row.sourcePersonaId ?? null,
    firstObservedAt: toDate(row.firstObservedAt),
    lastObservedAt: toDate(row.lastObservedAt),
    resolvedAt: row.resolvedAt ? toDate(row.resolvedAt) : null,
    evidenceCount: Number(row.evidenceCount ?? 1),
    metadata: parseObject(row.metadata),
  };
}

function uniqueTerms(text: string) {
  return Array.from(new Set(
    normalizeInitiativeText(text)
      .split(" ")
      .filter((term) => term.length > 3 && !stopwords.has(term)),
  ));
}

function keywordList(text: string, max = 12) {
  const terms = uniqueTerms(text);
  const signalTerms = terms.filter((term) =>
    substantiveSignals.some((signal) => normalizeInitiativeText(signal).includes(term) || term.includes(normalizeInitiativeText(signal)))
  );
  return Array.from(new Set([...signalTerms, ...terms])).slice(0, max);
}

function firstSentence(text: string, fallback: string) {
  const cleaned = text
    .replace(/\[CONTEUDO DO ARQUIVO ANEXADO[\s\S]*$/i, "")
    .replace(/\[TRANSCRICAO DE AUDIO ANEXADO[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentence = cleaned.split(/(?<=[.!?])\s+/u)[0]?.trim() || cleaned || fallback;
  return sentence.length > 92 ? `${sentence.slice(0, 89).trim()}...` : sentence;
}

function overlapScore(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0;
  const left = new Set(a);
  const hits = b.filter((term) => left.has(term)).length;
  return hits / Math.min(Math.max(a.length, 1), Math.max(b.length, 1), 10);
}

function countSignalHits(normalized: string, signals: string[]) {
  return signals.filter((signal) => normalized.includes(normalizeInitiativeText(signal))).length;
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function timestampMs(value?: Date | string | number | null) {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function timeDecayScore(value: Date | string | number | null | undefined, halfLifeHours: number, now = new Date()) {
  const time = timestampMs(value);
  if (time === null) return 0.35;
  const ageHours = Math.max(0, (now.getTime() - time) / 3_600_000);
  return Math.exp(-ageHours / Math.max(halfLifeHours, 1));
}

export function classifyInvocationMode(userText: string): InvocationMode {
  const richness = classifyConversationInputRichness(userText);
  const normalized = normalizeInitiativeText(userText || "");
  const greetingWithOptionalPersona = /^(bom dia|boa tarde|boa noite|oi|ola|hello|hi|salve|fala)\b/.test(normalized)
    && uniqueTerms(userText).length <= 3;

  if (/\b(prompt|resposta|persona|chatbot|raso|generico|profundidade|falha)\b/.test(normalized)) {
    return "META_CRITIQUE";
  }
  if (greetingWithOptionalPersona) return "GREETING";
  if (richness.openingType === "greeting") return "GREETING";
  if (richness.openingType === "continuation" || richness.openingType === "return") return "FOLLOW_UP";
  if (richness.openingType === "substantive_request") return "DIRECT_REQUEST";
  if (richness.requiresContextExpansion) return "CONTINUITY_TRIGGER";
  return "UNKNOWN";
}

export function extractActiveTopicCandidates(input: {
  userText: string;
  memoryScope: string;
}): ActiveTopicCandidate[] {
  const raw = input.userText || "";
  const normalized = normalizeInitiativeText(raw);
  const richness = classifyConversationInputRichness(raw);
  const terms = uniqueTerms(raw);

  if (!normalized || (richness.richness === "low" && terms.length <= 5)) return [];
  if (raw.trim().length < 24 && countSignalHits(normalized, substantiveSignals) === 0) return [];

  const signalHits = countSignalHits(normalized, substantiveSignals);
  const recurrenceHits = countSignalHits(normalized, recurrenceSignals);
  const unresolvedHits = countSignalHits(normalized, unresolvedSignals);
  const resolvedHits = countSignalHits(normalized, resolvedSignals);

  if (signalHits === 0 && terms.length < 7) return [];

  const keywords = keywordList(raw);
  const title = firstSentence(raw, keywords.slice(0, 5).join(" "));
  const summary = compact(raw, 360);
  const salience = clamp(
    0.42
    + Math.min(raw.length, 900) / 3000
    + Math.min(signalHits, 4) * 0.07
    + Math.min(unresolvedHits, 3) * 0.08
    + Math.min(recurrenceHits, 3) * 0.07
    + (richness.richness === "high" ? 0.08 : 0),
  );
  const privacyScope = isPrivateMemorySpace(input.memoryScope) ? "PRIVATE" : "PUBLIC";
  const status = resolvedHits > 0 && unresolvedHits === 0 ? "RESOLVED" : unresolvedHits > 0 ? "PENDING" : "ACTIVE";

  return [{
    title,
    summary,
    keywords,
    salience,
    status,
    privacyScope,
  }];
}

export async function ensureActiveTopicTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "ActiveTopic" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "summary" TEXT NOT NULL,
      "keywords" JSONB,
      "salience" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "privacyScope" TEXT NOT NULL DEFAULT 'PUBLIC',
      "sourceThreadId" TEXT,
      "sourcePersonaId" TEXT,
      "firstObservedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "lastObservedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "resolvedAt" TIMESTAMPTZ,
      "evidenceCount" INTEGER NOT NULL DEFAULT 1,
      "metadata" JSONB,
      CONSTRAINT "ActiveTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )
  `;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ActiveTopic_userId_status_lastObservedAt_idx" ON "ActiveTopic" ("userId", "status", "lastObservedAt")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ActiveTopic_userId_privacyScope_lastObservedAt_idx" ON "ActiveTopic" ("userId", "privacyScope", "lastObservedAt")`;
}

async function decayStaleActiveTopics(userId: string) {
  await prisma.$executeRaw`
    UPDATE "ActiveTopic"
    SET "salience" = GREATEST(0.12, "salience" * 0.92)
    WHERE "userId" = ${userId}
      AND "status" IN ('ACTIVE', 'PENDING')
      AND "lastObservedAt" < NOW() - INTERVAL '14 days'
  `;
}

async function findSimilarTopic(input: {
  userId: string;
  candidate: ActiveTopicCandidate;
  memoryScope: string;
}) {
  const rows = input.candidate.privacyScope === "PRIVATE"
    ? await prisma.$queryRaw<any[]>`
      SELECT * FROM "ActiveTopic"
      WHERE "userId" = ${input.userId}
        AND "privacyScope" = 'PRIVATE'
        AND COALESCE("metadata"->>'scope', '') = ${input.memoryScope}
        AND "status" IN ('ACTIVE', 'PENDING')
      ORDER BY "lastObservedAt" DESC
      LIMIT 24
    `
    : await prisma.$queryRaw<any[]>`
      SELECT * FROM "ActiveTopic"
      WHERE "userId" = ${input.userId}
        AND "privacyScope" = 'PUBLIC'
        AND "status" IN ('ACTIVE', 'PENDING')
      ORDER BY "lastObservedAt" DESC
      LIMIT 24
    `;

  const candidateTerms = uniqueTerms(`${input.candidate.title} ${input.candidate.summary} ${input.candidate.keywords.join(" ")}`);
  return rows
    .map(asTopic)
    .map((topic) => {
      const topicTerms = uniqueTerms(`${topic.title} ${topic.summary} ${topic.keywords.join(" ")}`);
      return { topic, score: overlapScore(candidateTerms, topicTerms) };
    })
    .filter((entry) => entry.score >= 0.34)
    .sort((a, b) => b.score - a.score || b.topic.lastObservedAt.getTime() - a.topic.lastObservedAt.getTime())[0]?.topic || null;
}

async function upsertActiveTopic(input: {
  userId: string;
  threadId: string;
  personaId: string;
  memoryScope: string;
  candidate: ActiveTopicCandidate;
}) {
  const existing = await findSimilarTopic({
    userId: input.userId,
    candidate: input.candidate,
    memoryScope: input.memoryScope,
  });
  const metadata = {
    scope: input.memoryScope,
    extractor: "deterministic-active-topic-v1",
    lastEvidenceHash: hashText(input.candidate.summary),
    lastEvidencePreview: compact(input.candidate.summary, 120),
  };
  const resolvedAt = input.candidate.status === "RESOLVED" ? new Date() : null;

  if (existing) {
    await prisma.$executeRaw`
      UPDATE "ActiveTopic"
      SET
        "title" = CASE WHEN ${input.candidate.salience} >= "salience" THEN ${input.candidate.title} ELSE "title" END,
        "summary" = CASE WHEN ${input.candidate.salience} >= "salience" THEN ${input.candidate.summary} ELSE "summary" END,
        "keywords" = ${JSON.stringify(input.candidate.keywords)}::jsonb,
        "salience" = LEAST(1.0, GREATEST("salience" * 0.96, ${input.candidate.salience}) + 0.02),
        "status" = ${input.candidate.status},
        "sourceThreadId" = ${input.threadId},
        "sourcePersonaId" = ${input.personaId},
        "lastObservedAt" = NOW(),
        "resolvedAt" = ${resolvedAt},
        "evidenceCount" = "evidenceCount" + 1,
        "metadata" = ${JSON.stringify(metadata)}::jsonb
      WHERE "id" = ${existing.id}
    `;
    return existing.id;
  }

  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "ActiveTopic" (
      "id", "userId", "title", "summary", "keywords", "salience", "status", "privacyScope",
      "sourceThreadId", "sourcePersonaId", "resolvedAt", "metadata"
    )
    VALUES (
      ${id},
      ${input.userId},
      ${input.candidate.title},
      ${input.candidate.summary},
      ${JSON.stringify(input.candidate.keywords)}::jsonb,
      ${input.candidate.salience},
      ${input.candidate.status},
      ${input.candidate.privacyScope},
      ${input.threadId},
      ${input.personaId},
      ${resolvedAt},
      ${JSON.stringify(metadata)}::jsonb
    )
  `;
  return id;
}

export async function retainActiveTopicsFromUserMessage(input: {
  userId: string;
  threadId: string;
  personaId: string;
  memoryScope: string;
  userText: string;
}) {
  const candidates = extractActiveTopicCandidates({
    userText: input.userText,
    memoryScope: input.memoryScope,
  });
  if (candidates.length === 0) {
    return { extracted: 0, retained: 0, skippedReason: "non-substantive-input" };
  }

  try {
    await ensureActiveTopicTable();
    await decayStaleActiveTopics(input.userId);
    const ids: string[] = [];
    for (const candidate of candidates.slice(0, 3)) {
      ids.push(await upsertActiveTopic({ ...input, candidate }));
    }
    return { extracted: candidates.length, retained: ids.length, ids };
  } catch (error) {
    console.warn("[ConversationContinuity] Active topic retention skipped.", {
      code: error instanceof Error ? error.name : "unknown_error",
      extracted: candidates.length,
    });
    return { extracted: candidates.length, retained: 0, skippedReason: "persistence-failed" };
  }
}

export async function getVisibleActiveTopics(userId: string, targetMemoryScope: string, limit = 8): Promise<ActiveTopicRecord[]> {
  try {
    await ensureActiveTopicTable();
    await decayStaleActiveTopics(userId);
    const rows = isPrivateMemorySpace(targetMemoryScope)
      ? await prisma.$queryRaw<any[]>`
        SELECT * FROM "ActiveTopic"
        WHERE "userId" = ${userId}
          AND "status" IN ('ACTIVE', 'PENDING')
          AND (
            "privacyScope" = 'PUBLIC'
            OR ("privacyScope" = 'PRIVATE' AND COALESCE("metadata"->>'scope', '') = ${targetMemoryScope})
          )
        ORDER BY "lastObservedAt" DESC, "salience" DESC
        LIMIT ${Math.max(limit * 3, limit)}
      `
      : await prisma.$queryRaw<any[]>`
        SELECT * FROM "ActiveTopic"
        WHERE "userId" = ${userId}
          AND "privacyScope" = 'PUBLIC'
          AND "status" IN ('ACTIVE', 'PENDING')
        ORDER BY "lastObservedAt" DESC, "salience" DESC
        LIMIT ${Math.max(limit * 3, limit)}
      `;
    return rows.map(asTopic).slice(0, limit);
  } catch (error) {
    console.warn("[ConversationContinuity] Active topic retrieval skipped.", {
      code: error instanceof Error ? error.name : "unknown_error",
    });
    return [];
  }
}

function relevanceScore(text: string, userText: string, contract: PersonaBehaviorContract, richness: ConversationInputRichness) {
  const terms = Array.from(new Set([
    ...uniqueTerms(userText),
    ...contract.lexicalHints.flatMap(uniqueTerms),
    ...contract.contextToSeek.flatMap(uniqueTerms),
  ]));
  if (terms.length === 0) return richness.requiresContextExpansion ? 0.35 : 0.1;
  const normalized = normalizeInitiativeText(text);
  const hits = terms.filter((term) => normalized.includes(term)).length;
  return clamp(hits / Math.min(terms.length, 10));
}

function personaAffinityScore(text: string, contract: PersonaBehaviorContract) {
  const terms = Array.from(new Set([
    ...contract.lexicalHints.flatMap(uniqueTerms),
    ...contract.contextToSeek.flatMap(uniqueTerms),
    ...uniqueTerms(contract.operationalMission),
  ])).slice(0, 24);
  if (terms.length === 0) return 0.45;
  const normalized = normalizeInitiativeText(text);
  const hits = terms.filter((term) => normalized.includes(term)).length;
  return clamp(0.2 + hits / Math.min(terms.length, 10));
}

function scoreContextItem(input: {
  source: SourceInput;
  userText: string;
  contract: PersonaBehaviorContract;
  richness: ConversationInputRichness;
  now?: Date;
}) {
  const halfLifeByType: Record<ContextPacketItemType, number> = {
    ACTIVE_TOPICS: 24 * 14,
    RECENT_PUBLIC_EPISODES: 72,
    RELEVANT_DURABLE_MEMORIES: 24 * 90,
    PERSONA_AFFINITY_CONTEXT: 24 * 30,
    BIOGRAPHICAL_FACTS: 24 * 180,
    CURRENT_THREAD_CONTEXT: 48,
    DESTINY_CONTEXT: 24 * 365,
    AGENDA_AND_REGISTRY_CONTEXT: 24 * 30,
  };
  const relevance = relevanceScore(input.source.text, input.userText, input.contract, input.richness);
  const halfLifeHours = input.source.type === "RELEVANT_DURABLE_MEMORIES" && input.richness.richness === "low"
    ? 24
    : halfLifeByType[input.source.type];
  const recency = timeDecayScore(input.source.timestamp, halfLifeHours, input.now);
  const salience = clamp(input.source.salience ?? 0.55);
  const personaAffinity = personaAffinityScore(input.source.text, input.contract);
  const unresolvedBoost = countSignalHits(normalizeInitiativeText(input.source.text), unresolvedSignals) > 0 ? 0.06 : 0;
  const recurrenceBoost = countSignalHits(normalizeInitiativeText(input.source.text), recurrenceSignals) > 0 ? 0.04 : 0;
  const invocationMode = classifyInvocationMode(input.userText);
  const continuityWeighted = input.richness.richness === "low"
    || invocationMode === "GREETING"
    || invocationMode === "FOLLOW_UP"
    || invocationMode === "CONTINUITY_TRIGGER";
  const lowInformationScore = input.source.type === "RELEVANT_DURABLE_MEMORIES"
    ? recency * 0.50 + salience * 0.25 + personaAffinity * 0.20 + relevance * 0.05
    : recency * 0.35 + salience * 0.35 + personaAffinity * 0.25 + relevance * 0.05;
  const continuityBoost = continuityWeighted && input.source.type === "RELEVANT_DURABLE_MEMORIES"
    ? 0
    : unresolvedBoost + recurrenceBoost;
  const score = continuityWeighted
    ? lowInformationScore + continuityBoost
    : relevance * 0.30 + recency * 0.30 + salience * 0.25 + personaAffinity * 0.15 + continuityBoost;

  return {
    score: clamp(score),
    scoreBreakdown: { relevance, recency, salience, personaAffinity },
  };
}

function makePacketItem(input: {
  source: SourceInput;
  userText: string;
  contract: PersonaBehaviorContract;
  richness: ConversationInputRichness;
  reason: string;
  now?: Date;
}): ContextPacketItem {
  const scored = scoreContextItem(input);
  return {
    id: input.source.id,
    type: input.source.type,
    text: input.source.text,
    title: input.source.title,
    timestamp: input.source.timestamp ? new Date(input.source.timestamp) : null,
    sourcePersonaId: input.source.sourcePersonaId ?? null,
    sourceThreadId: input.source.sourceThreadId ?? null,
    privacyScope: input.source.privacyScope || "INTERNAL",
    score: scored.score,
    scoreBreakdown: scored.scoreBreakdown,
    reason: input.reason,
  };
}

function selectTop(items: ContextPacketItem[], limit: number) {
  return [...items]
    .sort((a, b) => b.score - a.score || (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
    .slice(0, limit);
}

function renderScore(item: ContextPacketItem) {
  return [
    `score=${item.score.toFixed(2)}`,
    `rel=${item.scoreBreakdown.relevance.toFixed(2)}`,
    `rec=${item.scoreBreakdown.recency.toFixed(2)}`,
    `sal=${item.scoreBreakdown.salience.toFixed(2)}`,
    `persona=${item.scoreBreakdown.personaAffinity.toFixed(2)}`,
  ].join(" ");
}

export function buildConversationContextPacket(input: {
  userText: string;
  personaId: string;
  memoryScope: string;
  contract: PersonaBehaviorContract;
  inputRichness?: ConversationInputRichness;
  activeTopics?: ActiveTopicRecord[];
  memories?: Array<string | { content: string; createdAt?: Date | string | number | null; personaId?: string | null; id?: string }>;
  episodes?: Array<string | { content: string; timestamp?: Date | string | number | null; personaId?: string | null; threadId?: string | null; id?: string }>;
  sources?: string[];
  agenda?: string[];
  registries?: string[];
  destiny?: string[];
  currentThread?: string[];
  now?: Date;
}): ConversationContextPacket {
  const richness = input.inputRichness || classifyConversationInputRichness(input.userText);
  const invocationMode = classifyInvocationMode(input.userText);
  const activeTopics = (input.activeTopics || []).map((topic) => makePacketItem({
    source: {
      id: `active-topic:${topic.id}`,
      type: "ACTIVE_TOPICS",
      title: topic.title,
      text: `${topic.title} | ${topic.summary}`,
      timestamp: topic.lastObservedAt,
      sourcePersonaId: topic.sourcePersonaId,
      sourceThreadId: topic.sourceThreadId,
      privacyScope: topic.privacyScope === "PRIVATE" ? "PRIVATE" : "PUBLIC",
      salience: topic.salience,
    },
    userText: input.userText,
    contract: input.contract,
    richness,
    reason: "active topic persisted deterministically with recency and salience",
    now: input.now,
  }));

  const memories = (input.memories || []).map((memory, index) => {
    const content = typeof memory === "string" ? memory : memory.content;
    const createdAt = typeof memory === "string" ? null : memory.createdAt;
    const personaId = typeof memory === "string" ? input.memoryScope : memory.personaId;
    return makePacketItem({
      source: {
        id: typeof memory === "string" ? `memory:${index}` : `memory:${memory.id || index}`,
        type: "RELEVANT_DURABLE_MEMORIES",
        text: content,
        timestamp: createdAt,
        sourcePersonaId: personaId || input.memoryScope,
        privacyScope: isPrivateMemorySpace(input.memoryScope) ? "PRIVATE" : "INTERNAL",
        salience: 0.56,
      },
      userText: input.userText,
      contract: input.contract,
      richness,
      reason: "durable memory selected after privacy filtering",
      now: input.now,
    });
  });

  const episodes = (input.episodes || []).map((episode, index) => {
    const content = typeof episode === "string" ? episode : episode.content;
    const timestamp = typeof episode === "string" ? null : episode.timestamp;
    const personaId = typeof episode === "string" ? null : episode.personaId;
    const threadId = typeof episode === "string" ? null : episode.threadId;
    return makePacketItem({
      source: {
        id: typeof episode === "string" ? `episode:${index}` : `episode:${episode.id || index}`,
        type: "RECENT_PUBLIC_EPISODES",
        text: content,
        timestamp,
        sourcePersonaId: personaId,
        sourceThreadId: threadId,
        privacyScope: isPrivateMemorySpace(input.memoryScope) ? "PRIVATE" : "PUBLIC",
        salience: 0.64,
      },
      userText: input.userText,
      contract: input.contract,
      richness,
      reason: "recent episode visible to target persona",
      now: input.now,
    });
  });

  const sources = (input.sources || []).map((source, index) => makePacketItem({
    source: {
      id: `source:${index}`,
      type: "PERSONA_AFFINITY_CONTEXT",
      text: source,
      privacyScope: "INTERNAL",
      salience: 0.5,
    },
    userText: input.userText,
    contract: input.contract,
    richness,
    reason: "persistent source matched persona affinity",
    now: input.now,
  }));

  const destiny = (input.destiny || []).map((event, index) => makePacketItem({
    source: {
      id: `destiny:${index}`,
      type: "DESTINY_CONTEXT",
      text: event,
      privacyScope: "INTERNAL",
      salience: 0.72,
    },
    userText: input.userText,
    contract: input.contract,
    richness,
    reason: "destiny line durable biographical context",
    now: input.now,
  }));

  const agendaAndRegistry = [
    ...(input.agenda || []).map((event, index) => ({ id: `agenda:${index}`, text: event, salience: 0.68 })),
    ...(input.registries || []).map((registry, index) => ({ id: `registry:${index}`, text: registry, salience: 0.62 })),
  ].map((entry) => makePacketItem({
    source: {
      id: entry.id,
      type: "AGENDA_AND_REGISTRY_CONTEXT",
      text: entry.text,
      privacyScope: "INTERNAL",
      salience: entry.salience,
    },
    userText: input.userText,
    contract: input.contract,
    richness,
    reason: "agenda or registry item selected by continuity packet",
    now: input.now,
  }));

  const currentThread = (input.currentThread || []).map((entry, index) => makePacketItem({
    source: {
      id: `current-thread:${index}`,
      type: "CURRENT_THREAD_CONTEXT",
      text: entry,
      privacyScope: isPrivateMemorySpace(input.memoryScope) ? "PRIVATE" : "INTERNAL",
      salience: 0.66,
    },
    userText: input.userText,
    contract: input.contract,
    richness,
    reason: "current thread context",
    now: input.now,
  }));

  const durableMemorySelection = selectTop(memories, richness.requiresContextExpansion ? 2 : 6);
  const episodeSelection = selectTop(episodes, richness.requiresContextExpansion ? 8 : 5);
  const activeTopicSelection = selectTop(activeTopics, 5);
  const sourceSelection = selectTop(sources, 4);
  const destinySelection = selectTop(destiny, 8);
  const agendaRegistrySelection = selectTop(agendaAndRegistry, 6);
  const currentThreadSelection = selectTop(currentThread, 4);
  const selectedItems = selectTop([
    ...activeTopicSelection,
    ...episodeSelection,
    ...durableMemorySelection,
    ...sourceSelection,
    ...destinySelection,
    ...agendaRegistrySelection,
    ...currentThreadSelection,
  ], richness.requiresContextExpansion ? 16 : 12);

  const privateItemsExcluded = (input.activeTopics || []).filter((topic) => topic.privacyScope === "PRIVATE" && !isPrivateMemorySpace(input.memoryScope)).length;
  const sourcePersonas = Array.from(new Set(selectedItems.map((item) => item.sourcePersonaId).filter((value): value is string => Boolean(value))));
  const crossPersonaContinuityUsed = sourcePersonas.some((sourcePersona) => sourcePersona !== input.personaId && sourcePersona !== input.memoryScope);
  const hasSubstantiveContext = selectedItems.some((item) => item.score >= 0.28 && item.text.trim().length >= 18);

  return {
    invocationMode,
    inputRichness: richness,
    hasSubstantiveContext,
    activeTopics: activeTopicSelection,
    recentPublicEpisodes: episodeSelection,
    relevantDurableMemories: durableMemorySelection,
    personaAffinityContext: sourceSelection,
    biographicalFacts: [],
    currentThreadContext: currentThreadSelection,
    destinyContext: destinySelection,
    agendaAndRegistryContext: agendaRegistrySelection,
    selectedItems,
    privacyBoundaries: [
      isPrivateMemorySpace(input.memoryScope)
        ? `Escopo privado autorizado: ${input.memoryScope}; temas privados ficam restritos a este espaco.`
        : "Execucao publica: temas privados de Confessor 2.0 e Porao sao excluidos antes do ranking.",
      "Temas publicos podem atravessar personas do mesmo usuario.",
    ],
    retrievalExplanation: [
      `invocationMode=${invocationMode}`,
      `inputRichness=${richness.richness}`,
      `openingType=${richness.openingType}`,
      invocationMode === "GREETING" || invocationMode === "FOLLOW_UP" || invocationMode === "CONTINUITY_TRIGGER"
        ? "short/open invocation weighted by recency, salience and persona affinity before lexical relevance"
        : "substantive request weighted by lexical relevance, recency, salience and persona affinity",
      ...selectedItems.slice(0, 6).map((item) => `${item.id}: ${renderScore(item)} reason=${item.reason}`),
    ],
    metrics: {
      activeTopicsCount: activeTopicSelection.length,
      recentEpisodesCount: episodeSelection.length,
      memoriesCount: durableMemorySelection.length,
      selectedContextCount: selectedItems.length,
      privateItemsExcluded,
      crossPersonaContinuityUsed,
      topContextTypes: selectedItems.slice(0, 6).map((item) => item.type),
      topScores: selectedItems.slice(0, 6).map((item) => Number(item.score.toFixed(3))),
      sourcePersonas,
    },
  };
}

function renderItems(title: string, items: ContextPacketItem[]) {
  if (items.length === 0) return `[${title}]\n(nenhum item selecionado)`;
  return [
    `[${title}]`,
    ...items.map((item, index) => [
      `${index + 1}. ${item.title || compact(item.text, 90)}`,
      `score=${item.score.toFixed(2)}; origem=${item.sourcePersonaId || item.type}; privacidade=${item.privacyScope}`,
      item.text,
    ].join("\n")),
  ].join("\n");
}

export function renderConversationContextPacket(packet: ConversationContextPacket) {
  return [
    "[CONTEXT PACKET - CONTINUIDADE COGNITIVA]",
    "Use este pacote como material interno priorizado. Nao o reproduza como relatorio visivel.",
    `invocationMode=${packet.invocationMode}; inputRichness=${packet.inputRichness.richness}; hasSubstantiveContext=${packet.hasSubstantiveContext ? "sim" : "nao"}`,
    "",
    renderItems("ACTIVE_TOPICS", packet.activeTopics),
    "",
    renderItems("RECENT_PUBLIC_EPISODES", packet.recentPublicEpisodes),
    "",
    renderItems("RELEVANT_DURABLE_MEMORIES", packet.relevantDurableMemories),
    "",
    renderItems("PERSONA_AFFINITY_CONTEXT", packet.personaAffinityContext),
    "",
    renderItems("CURRENT_THREAD_CONTEXT", packet.currentThreadContext),
    "",
    renderItems("DESTINY_CONTEXT", packet.destinyContext),
    "",
    renderItems("AGENDA_AND_REGISTRY_CONTEXT", packet.agendaAndRegistryContext),
    "",
    "[PRIVACY_BOUNDARIES]",
    packet.privacyBoundaries.join("\n"),
    "",
    "[RETRIEVAL_EXPLANATION]",
    packet.retrievalExplanation.join("\n"),
  ].join("\n");
}

export function contextPacketToActiveFrontSources(packet: ConversationContextPacket): ActiveFrontSource[] {
  const items = [
    ...packet.selectedItems,
    ...packet.destinyContext.filter((destinyItem) =>
      !packet.selectedItems.some((selectedItem) => selectedItem.id === destinyItem.id)
    ),
  ];

  return items.map((item) => ({
    id: item.id,
    type: item.type === "ACTIVE_TOPICS"
      ? "active_topic"
      : item.type === "RECENT_PUBLIC_EPISODES"
        ? "episode"
        : item.type === "RELEVANT_DURABLE_MEMORIES"
          ? "memory"
          : item.type === "DESTINY_CONTEXT"
            ? "destiny"
            : item.type === "AGENDA_AND_REGISTRY_CONTEXT"
              ? "registry"
              : "source",
    text: item.text,
    provenance: item.type,
    visibility: item.privacyScope === "PRIVATE" ? "private" : "internal",
    scope: item.sourcePersonaId || null,
    recency: item.scoreBreakdown.recency,
  }));
}

export function redactedContextPreview(items: ContextPacketItem[], privateRun = false) {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    score: Number(item.score.toFixed(3)),
    privacyScope: item.privacyScope,
    sourcePersonaId: item.sourcePersonaId || null,
    preview: item.privacyScope === "PRIVATE" && !privateRun
      ? `[redigido:${hashText(item.text).slice(0, 12)}]`
      : compact(item.text, 180),
  }));
}
