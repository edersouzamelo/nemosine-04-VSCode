import fs from "fs/promises";
import os from "os";
import path from "path";

export type ChatPayloadMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
};

export type FilteredHistoryEntry = {
  id?: string;
  index: number;
  role: string;
  matched: string[];
  preview: string;
};

export type PayloadAuditInput = {
  personaId: string;
  threadId: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  messages: ChatPayloadMessage[];
  filteredHistory: FilteredHistoryEntry[];
  debug: {
    memoriesInjected: number;
    episodesInjected: number;
    sourcesInjected?: number;
    memoryPreview: string[];
    episodePreview: string[];
    sourcePreview?: string[];
    contractApplied: string;
    nativePromptResolved: boolean;
    nativePromptKey?: string;
    nativePromptSource?: string;
  };
};

export const SUSPICIOUS_PAYLOAD_PHRASES = [
  "conhecimento treinado ate 2021",
  "treinado ate 2021",
  "estou aqui para ajudar",
  "estou a disposicao",
  "como posso ajudar",
  "como posso auxiliar",
  "como posso contribuir",
  "o que gostaria de explorar",
  "qual desafio",
  "vamos focar",
  "vamos ajustar",
  "caso precise",
  "espero ter ajudado",
  "recomendo uma analise detalhada",
  "recomendo uma analise mais detalhada",
  "verifiquei",
  "identifiquei",
];

const ASSISTANT_LEAK_PATTERNS = [
  /conhecimento treinado ate 2021/i,
  /treinado ate 2021/i,
  /como posso (ajudar|auxiliar|contribuir)/i,
  /estou (aqui|a) (para ajudar|disposicao)/i,
  /o que gostaria de explorar/i,
  /qual desafio/i,
  /se precisar de algo especifico/i,
  /caso precise/i,
  /espero ter ajudado/i,
  /oferecer informacoes claras e diretas/i,
  /vamos (focar|ajustar)/i,
  /recomendo uma analise (mais )?detalhada/i,
  /minha missao e .* estou aqui/i,
  /sou o .* minha missao e .* como posso/i,
  /\?\s*$/i,
  /verifiquei/i,
  /identifiquei/i,
];

export function normalizePayloadText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectSuspiciousPayloadPhrases(text: string) {
  const normalized = normalizePayloadText(text);
  return SUSPICIOUS_PAYLOAD_PHRASES.filter((phrase) =>
    normalized.includes(normalizePayloadText(phrase))
  );
}

export function isContaminatedAssistantMessage(content: string) {
  const normalized = normalizePayloadText(content);
  if (normalized.length < 24) return false;

  const matches = ASSISTANT_LEAK_PATTERNS.filter((pattern) => pattern.test(normalized));
  if (matches.length > 0) return true;

  const words = normalized.split(" ");
  const genericVocabularyHits = [
    "ajudar",
    "disposicao",
    "explorar",
    "desafio",
    "expectativas",
    "orientacao",
    "clareza",
    "precisao",
  ].filter((word) => words.includes(word)).length;

  return genericVocabularyHits >= 3 && words.length < 90;
}

export function sanitizeConversationHistory(history: ChatPayloadMessage[]) {
  const filteredHistory: FilteredHistoryEntry[] = [];
  const sanitizedHistory = history.map((message, index) => {
    if (message.role !== "assistant" || !isContaminatedAssistantMessage(message.content)) {
      return message;
    }

    const matched = detectSuspiciousPayloadPhrases(message.content);
    filteredHistory.push({
      id: message.id,
      index,
      role: message.role,
      matched,
      preview: message.content.replace(/\s+/g, " ").slice(0, 220),
    });

    return {
      ...message,
      content: "[Resposta anterior do assistant suprimida por conter estilo generico incompativel com a persona.]",
    };
  });

  return { sanitizedHistory, filteredHistory };
}

export function buildRuntimePersonaGuard(personaId: string, userText: string) {
  return [
    `Controle final de persona ativa: ${personaId}.`,
    "Historico anterior com tom de atendente, oferta de ajuda, pergunta automatica, boilerplate obsoleto ou simulacao de saber deve ser tratado como erro anterior, nao como exemplo a imitar.",
    "A proxima resposta deve executar a vocacao da persona sobre o pedido atual, nao explicar genericamente o que a persona faz.",
    "Proibido terminar oferecendo ajuda, disponibilidade ou perguntando genericamente como pode ajudar.",
    "Proibido mencionar conhecimento treinado ate 2021 ou inventar fatos biograficos sobre Eder/Edervaldo/Autor.",
    "Se o usuario estiver criticando a qualidade da persona, responda corrigindo o modo de presenca: reconheca a falha concreta, nomeie a causa provavel e aja na voz da persona.",
    `Pedido atual a responder: ${userText || "(sem texto)"}`,
  ].join("\n");
}

export async function writePromptDebugAudit(input: PayloadAuditInput) {
  if (process.env.PROMPT_DEBUG !== "true") return;

  const combinedPayload = [
    input.systemPrompt,
    ...input.messages.map((message) => `${message.role}: ${message.content}`),
  ].join("\n\n");
  const suspiciousPayloadPhrases = detectSuspiciousPayloadPhrases(combinedPayload);
  const audit = {
    createdAt: new Date().toISOString(),
    personaId: input.personaId,
    threadId: input.threadId,
    model: input.model,
    temperature: input.temperature,
    maxOutputTokens: input.maxOutputTokens,
    historyMessagesSent: input.messages.filter((message) => message.role !== "system").length,
    totalMessagesSent: input.messages.length,
    filteredHistoryCount: input.filteredHistory.length,
    filteredHistory: input.filteredHistory,
    memoriesInjected: input.debug.memoriesInjected,
    episodesInjected: input.debug.episodesInjected,
    sourcesInjected: input.debug.sourcesInjected || 0,
    memoryPreview: input.debug.memoryPreview,
    episodePreview: input.debug.episodePreview,
    sourcePreview: input.debug.sourcePreview || [],
    contractApplied: input.debug.contractApplied,
    nativePromptResolved: input.debug.nativePromptResolved,
    nativePromptKey: input.debug.nativePromptKey || null,
    nativePromptSource: input.debug.nativePromptSource || null,
    suspiciousPayloadPhrases,
    systemPromptLength: input.systemPrompt.length,
    systemPromptPreview: input.systemPrompt.slice(0, 30000),
    messages: input.messages.map((message, index) => ({
      index,
      role: message.role,
      contentLength: message.content.length,
      suspiciousPhrases: detectSuspiciousPayloadPhrases(message.content),
      contentPreview: message.content.slice(0, 5000),
    })),
  };

  console.log("[PROMPT_DEBUG_PAYLOAD]", {
    personaId: audit.personaId,
    threadId: audit.threadId,
    model: audit.model,
    temperature: audit.temperature,
    maxOutputTokens: audit.maxOutputTokens,
    totalMessagesSent: audit.totalMessagesSent,
    historyMessagesSent: audit.historyMessagesSent,
    filteredHistoryCount: audit.filteredHistoryCount,
    suspiciousPayloadPhrases: audit.suspiciousPayloadPhrases,
    contractApplied: audit.contractApplied,
    nativePromptResolved: audit.nativePromptResolved,
    nativePromptKey: audit.nativePromptKey,
    systemPromptLength: audit.systemPromptLength,
  });

  try {
    const dir = path.join(os.tmpdir(), "nemosine-prompt-debug");
    await fs.mkdir(dir, { recursive: true });
    const safePersona = input.personaId.replace(/[^\w-]+/g, "_");
    const filename = `${Date.now()}-${safePersona}-${input.threadId}.json`.slice(0, 180);
    await fs.writeFile(path.join(dir, filename), JSON.stringify(audit, null, 2), "utf8");
  } catch (error) {
    console.error("[PROMPT_DEBUG_PAYLOAD] Failed to write audit file:", error);
  }
}
