import { buildNativePersonaPromptPayload, getNativePersonaPromptRecord } from "@/app/data/nativePersonaPrompts";
import { ENTITIES } from "@/app/data/entities";
import {
  getUserMemoryRecords,
  getVisibleConversationEpisodes,
  type UserMemoryRecord,
} from "./session_store";
import { getVisibleActiveTopics } from "./conversation_continuity";
import type { ConversationPresenceContract } from "./presence_adjustment";
import { renderDepthInstruction, type ResponseDepthProfile } from "./response_depth";
import {
  buildV1StablePromptStack,
  type PresencePromptStackStatus,
  type PromptStackPreset,
  type PromptStackResolvedModule,
} from "./prompt_stack";

const PROMPT_STACK_GUARANTEE_SOURCE_MARKERS = [
  "prompt original e a principal autoridade de estilo, vocacao, cadencia, simbolismo e comportamento",
  "A producao 1.0 e conversa individual",
].join(" | ");

type PromptFirstHistoryMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
};

export type PromptFirstAssembly = {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  promptStackPreset: PromptStackPreset;
  promptStackModules: PromptStackResolvedModule[];
  promptStackPresence: PresencePromptStackStatus;
  promptStackTokenCount: number;
  codexDirectoryInserted: boolean;
  constitutionInserted: boolean;
  retrievedMemoryCount: number;
  retrievedEpisodeCount: number;
  retrievedTopicCount: number;
  nativePromptResolved: boolean;
  nativePromptKey: string;
  promptSource: string;
  depthProfile: ResponseDepthProfile;
};

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

export function stripPromptFirstTechnicalMarkers(text: string) {
  return normalizeWhitespace(text)
    .replace(/\[\[NEMOSINE_[^\]]+\]\]/gi, " ")
    .replace(/\[NEMOSINE_FILE:[^\]]+\]/gi, " ")
    .replace(/\[NEMOSINE_AUDIO\]/gi, " ")
    .replace(/\[(MEMORY|REGISTRY|DESTINY):[^\]]+\]/gi, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForStyle(text: string) {
  return normalizeWhitespace(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function userRequestedStructuredOutput(text: string) {
  const normalized = normalizeForStyle(text);
  return /\b(lista|liste|bullet|bullets|topicos|tópicos|checklist|passo a passo|tabela|quadro|matriz|resumo|esquema|plano|roteiro|pr[oó]s e contras|compare|comparar)\b/i.test(normalized);
}

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) || []).length;
}

export type PromptFirstNarrativeStyleEvaluation = {
  shouldRepair: boolean;
  findings: string[];
  headingCount: number;
  bulletCount: number;
  numberedCount: number;
};

export function evaluatePromptFirstNarrativeStyle(input: {
  answer: string;
  userText: string;
}): PromptFirstNarrativeStyleEvaluation {
  const answer = input.answer || "";
  const normalized = normalizeForStyle(answer);
  const structuredRequested = userRequestedStructuredOutput(input.userText || "");
  const headingCount = countMatches(answer, /(^|\n|\s)#{2,6}\s+\S/g);
  const bulletCount = countMatches(answer, /^\s*[-*+]\s+\S/gm);
  const numberedCount = countMatches(answer, /(^|\n|\s)\d+[.)]\s+(?:\*\*)?\S/g);
  const findings: string[] = [];

  if (headingCount > 0 || /\b(conclusao|crescimento e impacto|tensoes e desafios|linhas ocultas)\b/i.test(normalized)) {
    findings.push("VISIBLE_REPORT_HEADING");
  }
  if (bulletCount >= 2 || numberedCount >= 2) findings.push("VISIBLE_LIST_STRUCTURE");
  if (/^\s*(ah[,! ]+o fascinante|claro[,!]|com certeza|vamos explorar|essa area[, ]+de fato)/i.test(normalized)) {
    findings.push("GENERIC_ASSISTANT_OPENING");
  }
  if (/\b(estou aqui para ajudar|se quiser explorar|se precisar|posso ajudar)\b/i.test(normalized)) {
    findings.push("GENERIC_ASSISTANT_CLOSING");
  }

  return {
    shouldRepair: !structuredRequested && findings.length > 0,
    findings,
    headingCount,
    bulletCount,
    numberedCount,
  };
}

export function buildPromptFirstNarrativeRepairInstruction(input: {
  personaId: string;
  userText: string;
  findings: string[];
  minWords: number;
}) {
  const minWords = Math.max(180, Math.min(input.minWords || 350, 900));
  return [
    `A resposta anterior falhou na forma (${input.findings.join(", ")}). Reescreva do zero antes de entregar ao usuario.`,
    `Responda como ${input.personaId}, com a vocacao nativa da persona em primeiro plano.`,
    "Mantenha apenas o que for verdadeiro e util da resposta anterior, mas abandone o formato de relatorio.",
    "Use prosa viva, fio de raciocinio narrativo, imagens precisas e inferencias explicitamente marcadas quando forem inferencias.",
    `Escreva em paragrafos naturais, com pelo menos ${minWords} palavras se o pedido for substantivo.`,
    "Proibido neste reparo: markdown, titulos, subtitulos, bullets, listas numeradas, secao 'Conclusao', emoji decorativo, abertura de assistente generico ou fechamento 'estou aqui para ajudar'.",
    "Nao explique este reparo ao usuario.",
  ].join("\n");
}

function sanitizeHistoryContent(text: string) {
  return stripPromptFirstTechnicalMarkers(text).slice(0, 4000);
}

function sanitizePromptFirstHistory(history: PromptFirstHistoryMessage[]) {
  return history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: sanitizeHistoryContent(message.content || ""),
    }))
    .filter((message) => message.content.trim())
    .slice(-12);
}

function memoryLine(memory: UserMemoryRecord) {
  const scope = memory.personaId ? `escopo=${memory.personaId}` : "escopo=global";
  return `- (${scope}; ${memory.createdAt.toISOString()}) ${stripPromptFirstTechnicalMarkers(memory.content)}`;
}

function renderPresenceContract(contract: ConversationPresenceContract | null) {
  if (!contract) return "";
  return [
    "Ajuste de Presenca confirmado pelo usuario nesta conversa:",
    contract.currentGoal ? `- objetivo: ${contract.currentGoal}` : "",
    `- profundidade: ${contract.responseDepth}`,
    `- tom: ${contract.directnessLevel}`,
    contract.customConstraints.length ? `- restricoes: ${contract.customConstraints.join("; ")}` : "",
    "Use este bloco apenas para modular profundidade, objetivo e tom. Nao invente fatos a partir dele.",
  ].filter(Boolean).join("\n");
}

export async function buildInpiPromptFirstAssembly(input: {
  userId: string;
  personaId: string;
  memoryScope: string;
  userText: string;
  language: "pt-BR" | "es" | "en";
  priorHistory: PromptFirstHistoryMessage[];
  activeThreadId: string;
  presenceContract?: ConversationPresenceContract | null;
  depthProfile: ResponseDepthProfile;
  promptStackPreset?: PromptStackPreset | null;
  overlayStatus?: Partial<PresencePromptStackStatus>;
}): Promise<PromptFirstAssembly> {
  const persona = Object.values(ENTITIES).find((entity) => entity.name === input.personaId && entity.type === "persona");
  const nativePrompt = getNativePersonaPromptRecord(input.personaId);
  const localPersonaVoice = persona?.script || persona?.transcription || persona?.prompt || `Voce e ${input.personaId}.`;
  const nativePromptPayload = buildNativePersonaPromptPayload(input.personaId, localPersonaVoice);
  const [memories, episodes, topics] = await Promise.all([
    getUserMemoryRecords(input.userId, input.memoryScope, 8).catch(() => []),
    getVisibleConversationEpisodes(input.userId, input.memoryScope, { excludeThreadId: input.activeThreadId }).then((items) => items.slice(0, 4)).catch(() => []),
    getVisibleActiveTopics(input.userId, input.memoryScope, 4).catch(() => []),
  ]);

  const promptStack = buildV1StablePromptStack({
    userId: input.userId,
    personaId: input.personaId,
    memoryScope: input.memoryScope,
    userText: input.userText,
    language: input.language,
    priorHistory: input.priorHistory,
    activeThreadId: input.activeThreadId,
    presenceContract: input.presenceContract || null,
    depthProfile: input.depthProfile,
    memories,
    episodes,
    topics,
    preset: input.promptStackPreset || null,
    overlayStatus: input.overlayStatus,
  });

  return {
    systemPrompt: promptStack.systemPrompt,
    messages: promptStack.messages,
    promptStackPreset: promptStack.preset,
    promptStackModules: promptStack.modules,
    promptStackPresence: promptStack.presence,
    promptStackTokenCount: promptStack.tokenCount,
    codexDirectoryInserted: promptStack.codexDirectoryInserted,
    constitutionInserted: promptStack.constitutionInserted,
    retrievedMemoryCount: memories.length,
    retrievedEpisodeCount: episodes.length,
    retrievedTopicCount: topics.length,
    nativePromptResolved: Boolean(nativePrompt?.prompt),
    nativePromptKey: nativePromptPayload.promptKey,
    promptSource: nativePromptPayload.source,
    depthProfile: input.depthProfile,
  };
}
