import { resolveNativePersonaPrompt } from "@/app/data/nativePersonaPrompts";

export type ManuscriptSensitivity =
  | "public"
  | "internal"
  | "sensitive"
  | "health"
  | "financial"
  | "confessor";

export type ManuscriptEventStatus = "pending" | "processed" | "excluded";
export type ManuscriptEntryType =
  | "observation"
  | "milestone"
  | "warning"
  | "closure"
  | "beginning"
  | "pattern"
  | "achievement";
export type ManuscriptTone =
  | "serene"
  | "vigilant"
  | "concerned"
  | "celebratory"
  | "reflective"
  | "technical"
  | "solemn"
  | "humorous";
export type InterpretationLevel = "factual" | "mixed" | "interpretive";
export type NarrativeFrequency = "discreta" | "equilibrada" | "intensa";

export interface PersonaManuscriptEventInput {
  id?: string;
  userId: string;
  type: string;
  sourceModule: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  factualSummary: string;
  metadata?: Record<string, unknown> | null;
  sensitivity?: ManuscriptSensitivity;
  importanceScore?: number;
  occurredAt?: Date | string;
}

export interface PersonaManuscriptEvent extends Required<Omit<PersonaManuscriptEventInput, "id" | "metadata" | "occurredAt">> {
  id: string;
  metadata: Record<string, unknown>;
  occurredAt: Date;
  status: ManuscriptEventStatus;
  processedAt?: Date | null;
  excludedReason?: string | null;
}

export interface PersonaManuscriptPreference {
  personaId: string;
  enabled: boolean;
  sourceModules: string[];
  minimumSalience: number;
}

export interface PersonaManuscriptSettings {
  enabled: boolean;
  frequency: NarrativeFrequency;
  notificationsEnabled: boolean;
  allowedSourceModules: string[];
}

export interface PersonaCandidate {
  personaId: string;
  score: number;
  salienceScore: number;
  reasons: string[];
  events: PersonaManuscriptEvent[];
}

export interface ManuscriptModelPayload {
  title: string | null;
  body: string;
  entryType: ManuscriptEntryType;
  tone: ManuscriptTone;
  confidence: number;
  sourceEventIds: string[];
  interpretationLevel: InterpretationLevel;
}

export const PERSONA_MANUSCRIPT_MODE = `
Voce esta operando no modo Manuscritos do Castelo.

Escreva como a persona informada, preservando integralmente sua vocacao, voz, estilo, limites e perspectiva funcional.
Produza um manuscrito baseado exclusivamente nos eventos fornecidos.
O manuscrito representa uma interpretacao simbolica da persona sobre acontecimentos verificaveis do sistema.

Regras:
- nao invente fatos;
- nao atribua emocoes nao relatadas como certeza;
- nao diga que observou atividades ausentes dos eventos;
- nao simule consciencia autonoma;
- nao simule percepcao sobrenatural;
- nao faca perguntas ao usuario;
- nao termine com convite generico para continuar a conversa;
- nao ofereca uma lista extensa de recomendacoes;
- nao escreva como assistente conversacional;
- nao misture a voz de outras personas;
- nao revele conteudo do Confessor;
- nao repita literalmente o resumo dos eventos;
- nao use motivacao generica;
- nao mencione que recebeu um prompt ou conjunto de dados;
- nao diga "como IA";
- nao chame o leitor de usuario dentro do manuscrito.

Tamanho habitual: 45 a 120 palavras.
Retorne somente JSON valido com: title, body, entryType, tone, confidence, sourceEventIds, interpretationLevel.
`;

const CONFESSOR_MARKERS = ["confessor", "porao", "porão", "confissao", "confissão"];
const SENSITIVE_MODULES = new Set(["health", "medical", "medico", "médico", "finance", "financial", "mordomo", "nutrition", "food"]);
const DEFAULT_SOURCE_MODULES = ["agenda", "destiny-line", "registros", "projects", "tasks", "persona-chat", "system"];

export const DEFAULT_MANUSCRIPT_SETTINGS: PersonaManuscriptSettings = {
  enabled: true,
  frequency: "equilibrada",
  notificationsEnabled: false,
  allowedSourceModules: DEFAULT_SOURCE_MODULES,
};

export const FREQUENCY_LIMITS: Record<NarrativeFrequency, number> = {
  discreta: 1,
  equilibrada: 4,
  intensa: 8,
};

export const PERSONA_RELEVANCE_MATRIX: Record<string, string[]> = {
  Mentor: ["decision", "persistence", "direction", "completed", "retomada", "coherence", "milestone", "goal"],
  Vigia: ["task", "deadline", "overdue", "pending", "agenda", "interruption", "rescheduled", "retomada", "cancelled"],
  Narrador: ["project", "destiny", "milestone", "beginning", "closure", "sequence", "linha"],
  Engenheiro: ["architecture", "integration", "failure", "module", "system", "structure", "dependency", "technical"],
  Cientista: ["data", "evidence", "measurement", "hypothesis", "result", "correction"],
  Estrategista: ["decision", "priority", "risk", "resource", "plan", "strategy"],
  "Orquestrador-Arquiteto": ["coordination", "project", "priority", "reorganization", "sync"],
  Arauto: ["agenda", "time", "deadline", "commitment", "rescheduled", "calendar"],
  Executor: ["completed", "delivery", "task", "action", "done"],
  Mestre: ["academic", "study", "submission", "publication", "review"],
  Autor: ["text", "publication", "writing", "work", "creative"],
  Curador: ["naming", "aesthetic", "identity", "symbolic", "revision"],
  Treinador: ["training", "workout", "performance", "recovery"],
  "Médico": ["symptom", "exam", "clinical", "health"],
  Aprovisionador: ["food", "diet", "hydration", "nutrition"],
  Mordomo: ["expense", "income", "budget", "financial"],
  "Psicólogo": ["emotion", "behavior", "pattern"],
  "Bobo da Corte": ["irony", "contradiction", "humor"],
  Coveiro: ["closed", "abandoned", "closure", "ended"],
  Vidente: ["trend", "risk", "opportunity", "possible"],
  Inimigo: ["vulnerability", "exposure", "risk", "failure"],
};

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isConfessorRelated(event: Pick<PersonaManuscriptEventInput, "type" | "sourceModule" | "factualSummary" | "metadata" | "sensitivity">) {
  if (event.sensitivity === "confessor") return true;
  const haystack = normalizeText([
    event.type,
    event.sourceModule,
    event.factualSummary,
    JSON.stringify(event.metadata || {}),
  ].join(" "));
  return CONFESSOR_MARKERS.some((marker) => haystack.includes(normalizeText(marker)));
}

export function isSensitiveBlocked(event: PersonaManuscriptEvent, allowedModules: string[]) {
  if (event.sensitivity === "confessor" || isConfessorRelated(event)) return "confessor";
  if (!allowedModules.includes(event.sourceModule)) return "source_module_disabled";
  if (["health", "financial", "sensitive"].includes(event.sensitivity)) return "sensitive_source_disabled";
  if (SENSITIVE_MODULES.has(normalizeText(event.sourceModule))) return "sensitive_source_disabled";
  return null;
}

export function dateKeyForTimezone(date: Date, timeZone = "America/Cuiaba") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function validateManuscriptPayload(value: unknown, allowedEventIds: string[]): ManuscriptModelPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<ManuscriptModelPayload>;
  const entryTypes: ManuscriptEntryType[] = ["observation", "milestone", "warning", "closure", "beginning", "pattern", "achievement"];
  const tones: ManuscriptTone[] = ["serene", "vigilant", "concerned", "celebratory", "reflective", "technical", "solemn", "humorous"];
  const levels: InterpretationLevel[] = ["factual", "mixed", "interpretive"];
  if (payload.title !== null && payload.title !== undefined && typeof payload.title !== "string") return null;
  if (typeof payload.body !== "string" || payload.body.trim().length < 24) return null;
  if (!entryTypes.includes(payload.entryType as ManuscriptEntryType)) return null;
  if (!tones.includes(payload.tone as ManuscriptTone)) return null;
  if (typeof payload.confidence !== "number" || payload.confidence < 0 || payload.confidence > 1) return null;
  if (!Array.isArray(payload.sourceEventIds) || payload.sourceEventIds.length === 0) return null;
  if (!payload.sourceEventIds.every((id) => typeof id === "string" && allowedEventIds.includes(id))) return null;
  if (!levels.includes(payload.interpretationLevel as InterpretationLevel)) return null;
  return {
    title: payload.title ? payload.title.trim().slice(0, 90) : null,
    body: payload.body.trim(),
    entryType: payload.entryType as ManuscriptEntryType,
    tone: payload.tone as ManuscriptTone,
    confidence: payload.confidence,
    sourceEventIds: payload.sourceEventIds,
    interpretationLevel: payload.interpretationLevel as InterpretationLevel,
  };
}

export function buildPersonaCandidates(
  events: PersonaManuscriptEvent[],
  preferences: PersonaManuscriptPreference[] = [],
  settings: PersonaManuscriptSettings = DEFAULT_MANUSCRIPT_SETTINGS,
) {
  const preferenceByPersona = new Map(preferences.map((pref) => [pref.personaId, pref]));
  const candidateMap = new Map<string, PersonaCandidate>();

  for (const event of events) {
    const blocked = isSensitiveBlocked(event, settings.allowedSourceModules);
    if (blocked) continue;
    const eventText = normalizeText(`${event.type} ${event.sourceModule} ${event.factualSummary}`);

    for (const [personaId, terms] of Object.entries(PERSONA_RELEVANCE_MATRIX)) {
      const pref = preferenceByPersona.get(personaId);
      if (pref && !pref.enabled) continue;
      if (pref?.sourceModules?.length && !pref.sourceModules.includes(event.sourceModule)) continue;

      const matched = terms.filter((term) => eventText.includes(normalizeText(term)));
      if (matched.length === 0) continue;
      const salienceScore = Math.min(100, event.importanceScore + matched.length * 12);
      const minimum = pref?.minimumSalience ?? 35;
      if (salienceScore < minimum) continue;

      const existing = candidateMap.get(personaId) || {
        personaId,
        score: 0,
        salienceScore: 0,
        reasons: [],
        events: [],
      };
      existing.score += salienceScore;
      existing.salienceScore = Math.max(existing.salienceScore, salienceScore);
      existing.reasons.push(...matched);
      existing.events.push(event);
      candidateMap.set(personaId, existing);
    }
  }

  return [...candidateMap.values()]
    .map((candidate) => ({
      ...candidate,
      events: dedupeEvents(candidate.events).slice(0, 4),
      reasons: [...new Set(candidate.reasons)].slice(0, 6),
    }))
    .sort((a, b) => b.score - a.score);
}

export function selectCandidatesForCycle(
  candidates: PersonaCandidate[],
  settings: PersonaManuscriptSettings,
  alreadyGeneratedPersonaIds: string[] = [],
) {
  const limit = FREQUENCY_LIMITS[settings.frequency] || FREQUENCY_LIMITS.equilibrada;
  const usedPersonas = new Set(alreadyGeneratedPersonaIds);
  const selected: PersonaCandidate[] = [];
  const usedEventKeys = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (usedPersonas.has(candidate.personaId)) continue;
    if (candidate.personaId === "Confessor 2.0" || normalizeText(candidate.personaId).includes("confessor")) continue;
    const eventKey = candidate.events.map((event) => event.id).sort().join("|");
    if (usedEventKeys.has(eventKey)) continue;
    if (!resolveNativePersonaPrompt(candidate.personaId)) continue;
    selected.push(candidate);
    usedPersonas.add(candidate.personaId);
    usedEventKeys.add(eventKey);
  }

  return selected;
}

function dedupeEvents(events: PersonaManuscriptEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

export function parseModelJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export function composeDeterministicManuscript(candidate: PersonaCandidate): ManuscriptModelPayload {
  const first = candidate.events[0];
  const summaries = candidate.events.map((event) => event.factualSummary);
  const joined = summaries.join("; ");
  const persona = candidate.personaId;
  const sourceEventIds = candidate.events.map((event) => event.id);

  if (persona === "Vigia" || persona === "Arauto") {
    return {
      title: persona === "Arauto" ? "Tempo registrado" : "Pendencias em observacao",
      body: `${joined}. O registro permanece factual: nao ha abandono presumido, apenas acontecimentos que pedem definicao, continuidade ou reagendamento conforme a origem permitir.`,
      entryType: first.type.includes("completed") ? "achievement" : "warning",
      tone: "vigilant",
      confidence: 0.82,
      sourceEventIds,
      interpretationLevel: "mixed",
    };
  }

  if (persona === "Engenheiro") {
    return {
      title: "Estrutura em movimento",
      body: `${joined}. A estrutura avancou por fatos verificaveis, mas o manuscrito preserva a medida: so registra o que deixou rastro no sistema e separa funcionamento de consolidacao definitiva.`,
      entryType: "observation",
      tone: "technical",
      confidence: 0.8,
      sourceEventIds,
      interpretationLevel: "mixed",
    };
  }

  if (persona === "Narrador") {
    return {
      title: first.type.includes("created") ? "Inicio registrado" : "Marco preservado",
      body: `${joined}. Nao e uma profecia nem ornamento vazio; e apenas o ponto em que um acontecimento ganhou data, nome e lugar no arquivo do Castelo.`,
      entryType: first.type.includes("created") ? "beginning" : "milestone",
      tone: "reflective",
      confidence: 0.78,
      sourceEventIds,
      interpretationLevel: "interpretive",
    };
  }

  return {
    title: "Registro preservado",
    body: `${joined}. A leitura permanece proporcional: ha sinais suficientes para arquivar este movimento, sem transformar inferencia em certeza nem silencio em acontecimento.`,
    entryType: first.type.includes("completed") ? "achievement" : "observation",
    tone: "reflective",
    confidence: 0.76,
    sourceEventIds,
    interpretationLevel: "mixed",
  };
}

export function buildIdempotencyKey(userId: string, dateKey: string, candidate: PersonaCandidate, generationVersion = "v1") {
  const eventIds = candidate.events.map((event) => event.id).sort().join("|");
  return `${userId}:${dateKey}:${candidate.personaId}:${generationVersion}:${eventIds}`;
}
