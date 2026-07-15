import {
  DestinyEvent,
  getDestinyEvents,
} from "@/app/lib/sovereignStore";
import { PersonaBehaviorContract } from "./persona_behavior_contracts";
import { ActiveTopicRecord } from "./conversation_continuity";
import { normalizeInitiativeText } from "./persona-initiative";

export type DestinySourceStatus = "OK" | "EMPTY" | "ERROR" | "NOT_TRIGGERED";

export type DestinyContextStatus = {
  destinySourceStatus: DestinySourceStatus;
  destinyEventsFound: number;
  destinyEventsSelected: number;
  errorCode: string | null;
  userIdMatched: boolean;
};

export type DestinyContextCategory =
  | "FOUNDATIONAL"
  | "ACTIVE_RELEVANT"
  | "RECENT"
  | "PERSONA_RELEVANT"
  | "BACKGROUND";

export type SelectedDestinyContext = {
  event: DestinyEvent;
  categories: DestinyContextCategory[];
  score: number;
  reason: string;
  text: string;
};

export type DestinyContextLoadResult = {
  status: DestinyContextStatus;
  selected: SelectedDestinyContext[];
  allVisibleCount: number;
  blockedByCognitiveVisibility: number;
  retrievalExplanation: string[];
};

const stopwords = new Set([
  "para", "como", "qual", "quais", "voce", "este", "esta", "isso", "essa",
  "aquele", "aquela", "com", "por", "das", "dos", "uma", "que", "nao",
  "bom", "dia", "boa", "noite", "tarde", "ola", "hoje", "agora",
]);

const foundationalCategories = new Set([
  "Familia",
  "Saude",
  "Carreira",
  "Obra",
  "Criacao",
  "Perda",
  "Virada",
  "Travessia",
  "Relacoes",
  "Formacao",
  "Reconhecimento",
]);

function terms(text: string) {
  return Array.from(new Set(
    normalizeInitiativeText(text)
      .split(" ")
      .filter((term) => term.length > 3 && !stopwords.has(term)),
  ));
}

function overlap(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0;
  const set = new Set(left);
  const hits = right.filter((term) => set.has(term)).length;
  return hits / Math.min(left.length, right.length, 10);
}

function eventText(event: DestinyEvent) {
  const date = event.eventDate || event.eventDateLabel || "data nao definida";
  const intensity = event.symbolicIntensity ? ` | intensidade=${event.symbolicIntensity}/5` : "";
  const phase = event.lifePhase ? ` | fase=${event.lifePhase}` : "";
  const emotion = event.dominantEmotion ? ` | emocao=${event.dominantEmotion}` : "";
  const persona = event.associatedPersona ? ` | personaAssociada=${event.associatedPersona}` : "";
  const tags = event.tags.length > 0 ? ` | tags=${event.tags.join(", ")}` : "";
  const details = event.longDescription ? ` | detalhes=${event.longDescription}` : "";
  return `${date}: ${event.title} (${event.category}) - ${event.shortDescription}${details}${intensity}${phase}${emotion}${persona}${tags}`;
}

function eventTimestamp(event: DestinyEvent) {
  const raw = event.eventDate || event.updatedAt || event.createdAt;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function recencyScore(event: DestinyEvent, now = new Date()) {
  const time = eventTimestamp(event);
  if (!time) return 0.35;
  const ageDays = Math.max(0, (now.getTime() - time) / 86_400_000);
  return Math.exp(-ageDays / 365);
}

function biographicalImportance(event: DestinyEvent) {
  const categoryBoost = foundationalCategories.has(event.category) ? 0.3 : 0;
  const intensity = event.symbolicIntensity ? event.symbolicIntensity / 12 : 0.16;
  const detail = event.longDescription && event.longDescription.length > 120 ? 0.1 : 0;
  const phase = event.lifePhase ? 0.08 : 0;
  return Math.max(0.2, Math.min(1, 0.32 + categoryBoost + intensity + detail + phase));
}

function personaAffinity(event: DestinyEvent, personaId: string, contract: PersonaBehaviorContract) {
  const normalizedPersona = normalizeInitiativeText(personaId);
  if (event.associatedPersona && normalizeInitiativeText(event.associatedPersona) === normalizedPersona) return 1;
  if (event.cognitivePersonas.some((item) => normalizeInitiativeText(item) === normalizedPersona)) return 0.95;

  const text = normalizeInitiativeText(eventText(event));
  const hints = [
    ...contract.lexicalHints,
    ...contract.contextToSeek,
    contract.operationalMission,
  ].flatMap(terms);
  if (hints.length === 0) return 0.35;
  const hits = Array.from(new Set(hints)).filter((hint) => text.includes(hint)).length;
  return Math.max(0.25, Math.min(1, 0.25 + hits / 8));
}

function cognitiveVisible(event: DestinyEvent, personaId: string) {
  const normalizedPersona = normalizeInitiativeText(personaId);
  if (event.cognitiveVisibility === "excluded-from-personas") return false;
  if (event.cognitiveVisibility === "all-public-personas") return true;
  if (event.cognitiveVisibility === "source-persona-only") {
    return Boolean(event.associatedPersona && normalizeInitiativeText(event.associatedPersona) === normalizedPersona);
  }
  if (event.cognitiveVisibility === "selected-personas") {
    return event.cognitivePersonas.some((item) => normalizeInitiativeText(item) === normalizedPersona);
  }
  return false;
}

function categoriesFor(input: {
  event: DestinyEvent;
  activeTerms: string[];
  userTerms: string[];
  personaAffinity: number;
  now?: Date;
}): DestinyContextCategory[] {
  const categories: DestinyContextCategory[] = [];
  const eventTerms = terms(eventText(input.event));
  const activeRelevance = Math.max(overlap(eventTerms, input.activeTerms), overlap(eventTerms, input.userTerms));
  if (biographicalImportance(input.event) >= 0.68 || foundationalCategories.has(input.event.category)) categories.push("FOUNDATIONAL");
  if (activeRelevance >= 0.12) categories.push("ACTIVE_RELEVANT");
  if (recencyScore(input.event, input.now) >= 0.72) categories.push("RECENT");
  if (input.personaAffinity >= 0.55) categories.push("PERSONA_RELEVANT");
  if (categories.length === 0) categories.push("BACKGROUND");
  return Array.from(new Set(categories));
}

function scoreEvent(input: {
  event: DestinyEvent;
  userText: string;
  activeTopicText: string;
  personaId: string;
  contract: PersonaBehaviorContract;
  now?: Date;
}) {
  const eventTerms = terms(eventText(input.event));
  const activeTerms = terms(`${input.userText} ${input.activeTopicText}`);
  const relevance = overlap(eventTerms, activeTerms);
  const bio = biographicalImportance(input.event);
  const recency = recencyScore(input.event, input.now);
  const persona = personaAffinity(input.event, input.personaId, input.contract);
  const score = bio * 0.34 + relevance * 0.26 + persona * 0.22 + recency * 0.18;
  return { score, bio, relevance, persona, recency };
}

function pickMixed(items: SelectedDestinyContext[], limit: number) {
  const selected: SelectedDestinyContext[] = [];
  const addFirst = (category: DestinyContextCategory, max: number) => {
    for (const item of items.filter((entry) => entry.categories.includes(category)).sort((a, b) => b.score - a.score)) {
      if (selected.length >= limit || selected.filter((entry) => entry.categories.includes(category)).length >= max) break;
      if (!selected.some((entry) => entry.event.id === item.event.id)) selected.push(item);
    }
  };

  addFirst("FOUNDATIONAL", 3);
  addFirst("ACTIVE_RELEVANT", 3);
  addFirst("PERSONA_RELEVANT", 2);
  addFirst("RECENT", 2);

  for (const item of [...items].sort((a, b) => b.score - a.score)) {
    if (selected.length >= limit) break;
    if (!selected.some((entry) => entry.event.id === item.event.id)) selected.push(item);
  }

  return selected.slice(0, limit);
}

function shouldLoadDestinyContext(input: {
  userText: string;
  activeTopics?: ActiveTopicRecord[];
  contract: PersonaBehaviorContract;
}) {
  const activeTopicText = (input.activeTopics || []).map((topic) => `${topic.title} ${topic.summary} ${topic.keywords.join(" ")}`).join(" ");
  const text = normalizeInitiativeText(`${input.userText} ${activeTopicText}`);
  if (/\b(destino|linha do destino|biografia|biografico|trajetoria|vida|marco|virada|travessia|historia pessoal|historia de vida|origem|passado|familia|carreira|saude|relacoes)\b/.test(text)) {
    return true;
  }
  const contractText = normalizeInitiativeText([
    input.contract.operationalMission,
    ...input.contract.contextToSeek,
    ...input.contract.lexicalHints,
  ].join(" "));
  return /\b(biografia|trajetoria|vida|marco|travessia)\b/.test(contractText)
    && /\b(analise|entenda|leia|interprete|situacao|momento|decisao|historia)\b/.test(text);
}

export function selectDestinyContextFromEvents(input: {
  events: DestinyEvent[];
  personaId: string;
  userText: string;
  contract: PersonaBehaviorContract;
  activeTopics?: ActiveTopicRecord[];
  limit?: number;
  now?: Date;
}): DestinyContextLoadResult {
  if (input.events.length === 0) {
    return {
      status: {
        destinySourceStatus: "EMPTY",
        destinyEventsFound: 0,
        destinyEventsSelected: 0,
        errorCode: null,
        userIdMatched: true,
      },
      selected: [],
      allVisibleCount: 0,
      blockedByCognitiveVisibility: 0,
      retrievalExplanation: ["destinySourceStatus=EMPTY"],
    };
  }

  const activeTopicText = (input.activeTopics || []).map((topic) => `${topic.title} ${topic.summary} ${topic.keywords.join(" ")}`).join("\n");
  const activeTerms = terms(`${input.userText} ${activeTopicText}`);
  const userTerms = terms(input.userText);
  const visible = input.events.filter((event) => cognitiveVisible(event, input.personaId));
  const blockedByCognitiveVisibility = input.events.length - visible.length;
  const candidates = visible.map((event) => {
    const scored = scoreEvent({
      event,
      userText: input.userText,
      activeTopicText,
      personaId: input.personaId,
      contract: input.contract,
      now: input.now,
    });
    const cats = categoriesFor({
      event,
      activeTerms,
      userTerms,
      personaAffinity: scored.persona,
      now: input.now,
    });
    return {
      event,
      categories: cats,
      score: scored.score,
      reason: `bio=${scored.bio.toFixed(2)} relevance=${scored.relevance.toFixed(2)} persona=${scored.persona.toFixed(2)} recency=${scored.recency.toFixed(2)} categories=${cats.join("+")}`,
      text: `[${cats.join("+")}] ${eventText(event)}`,
    } satisfies SelectedDestinyContext;
  });
  const selected = pickMixed(candidates, input.limit || 8);

  return {
    status: {
      destinySourceStatus: "OK",
      destinyEventsFound: input.events.length,
      destinyEventsSelected: selected.length,
      errorCode: null,
      userIdMatched: true,
    },
    selected,
    allVisibleCount: visible.length,
    blockedByCognitiveVisibility,
    retrievalExplanation: [
      "destinySourceStatus=OK",
      `destinyEventsFound=${input.events.length}`,
      `destinyEventsVisible=${visible.length}`,
      `destinyEventsSelected=${selected.length}`,
      `blockedByCognitiveVisibility=${blockedByCognitiveVisibility}`,
      ...selected.map((item) => `destiny:${item.event.id} ${item.reason}`),
    ],
  };
}

export async function loadDestinyContextSource(input: {
  userId: string;
  personaId: string;
  userText: string;
  contract: PersonaBehaviorContract;
  activeTopics?: ActiveTopicRecord[];
  limit?: number;
  now?: Date;
  getEvents?: (userId: string) => Promise<DestinyEvent[]>;
}): Promise<DestinyContextLoadResult> {
  if (!shouldLoadDestinyContext(input)) {
    return {
      status: {
        destinySourceStatus: "NOT_TRIGGERED",
        destinyEventsFound: 0,
        destinyEventsSelected: 0,
        errorCode: null,
        userIdMatched: true,
      },
      selected: [],
      allVisibleCount: 0,
      blockedByCognitiveVisibility: 0,
      retrievalExplanation: ["destinySourceStatus=NOT_TRIGGERED"],
    };
  }

  let events: DestinyEvent[];
  try {
    events = await (input.getEvents || getDestinyEvents)(input.userId);
  } catch (error) {
    const errorCode = error instanceof Error ? error.name : "DESTINY_QUERY_ERROR";
    return {
      status: {
        destinySourceStatus: "ERROR",
        destinyEventsFound: 0,
        destinyEventsSelected: 0,
        errorCode,
        userIdMatched: true,
      },
      selected: [],
      allVisibleCount: 0,
      blockedByCognitiveVisibility: 0,
      retrievalExplanation: [`destinySourceStatus=ERROR errorCode=${errorCode}`],
    };
  }

  return selectDestinyContextFromEvents({
    events,
    personaId: input.personaId,
    userText: input.userText,
    contract: input.contract,
    activeTopics: input.activeTopics,
    limit: input.limit,
    now: input.now,
  });
}
