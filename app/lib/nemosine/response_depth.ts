import type { ConversationPresenceContract } from "./presence_adjustment";

export type ResponseDepthProfileId = "GREETING" | "STANDARD" | "DEEP" | "EXTENSIVE";

export type ResponseDepthProfile = {
  id: ResponseDepthProfileId;
  minWords: number;
  maxWords: number;
  label: string;
  reasoningEffort: "medium" | "high";
};

export const RESPONSE_DEPTH_PROFILES: Record<ResponseDepthProfileId, ResponseDepthProfile> = {
  GREETING: { id: "GREETING", minWords: 40, maxWords: 120, label: "cumprimento simples", reasoningEffort: "medium" },
  STANDARD: { id: "STANDARD", minWords: 350, maxWords: 650, label: "substantivo normal", reasoningEffort: "medium" },
  DEEP: { id: "DEEP", minWords: 700, maxWords: 1200, label: "analise densa", reasoningEffort: "medium" },
  EXTENSIVE: { id: "EXTENSIVE", minWords: 1100, maxWords: 1800, label: "resposta extensa solicitada", reasoningEffort: "high" },
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function countWords(text: string) {
  return (text.trim().match(/\S+/g) || []).length;
}

export function selectResponseDepthProfile(input: {
  userText: string;
  priorHistory?: Array<{ role: string; content: string }>;
  personaId?: string;
  presenceContract?: ConversationPresenceContract | null;
}): ResponseDepthProfile {
  const normalized = normalize(input.userText || "");
  const wordCount = countWords(input.userText || "");
  const historyCount = input.priorHistory?.filter((message) => message.role === "user" || message.role === "assistant").length || 0;

  if (/\b(mais\s+longo|mais\s+longa|longo|longa|mais\s+extenso|mais\s+extensa|extenso|extensa|prolongad[ao]s?|aprofundad[ao]s?|detalhad[ao]s?|desenvolva|rica|densa|maiores|extensiv[ao])\b/.test(normalized)) {
    return RESPONSE_DEPTH_PROFILES.EXTENSIVE;
  }

  if (input.presenceContract?.responseDepth === "DEEP") {
    return RESPONSE_DEPTH_PROFILES.DEEP;
  }

  const greetingOnly = /^(bom dia|boa tarde|boa noite|oi|ola|salve|e ai)([,!\s]*(mentor|inimigo|cientista|terapeuta|estrategista|vidente|.+))?[.!?\s]*$/i.test((input.userText || "").trim());
  if (greetingOnly && wordCount <= 8 && historyCount <= 2) {
    return RESPONSE_DEPTH_PROFILES.GREETING;
  }

  const asksForAnalysis = /\b(analise|analisar|compreender|entender|avaliar|mapear|comparar|explique|explicar|aprofundar)\b/.test(normalized);
  const hasAlternatives = /\b(entre|alternativa|alternativas|opcao|opcoes|caminho|caminhos|por um lado|por outro lado|ou)\b/.test(normalized);
  const hasDevelopedDecision = wordCount >= 18 && /\b(decisao|decidir|escolher|aprovar|recusar|priorizar)\b/.test(normalized);
  const hasDevelopedConflict = wordCount >= 18 && /\b(conflito|impasse|tensao|crise|dilema|contradicao|risco)\b/.test(normalized);
  const hasDevelopedVenting = wordCount >= 18 && /\b(desabafar|desgaste|desgastado|cansado|frustrado|piora|falha|travado)\b/.test(normalized);
  const hasSubstantiveContinuity = historyCount >= 4 && wordCount >= 16 && /\b(isso|essa|esse|continuar|aprofundar|retomar|detalhar|consequencia|proximo passo)\b/.test(normalized);
  const isLongAnalyticalMessage = wordCount >= 45 && asksForAnalysis;
  const hasMultipleFactors = wordCount >= 22 && hasAlternatives && /\b(mas|porque|porem|entao|tambem|alem disso|ao mesmo tempo)\b/.test(normalized);

  if (
    isLongAnalyticalMessage
    || hasMultipleFactors
    || hasDevelopedDecision
    || hasDevelopedConflict
    || hasDevelopedVenting
    || hasSubstantiveContinuity
  ) {
    return RESPONSE_DEPTH_PROFILES.DEEP;
  }

  return RESPONSE_DEPTH_PROFILES.STANDARD;
}

export function renderDepthInstruction(profile: ResponseDepthProfile) {
  return [
    `Perfil de profundidade: ${profile.id} (${profile.label}).`,
    `Extensao orientativa: aproximadamente ${profile.minWords}-${profile.maxWords} palavras.`,
    profile.id === "GREETING"
      ? "Se for apenas cumprimento, cumprimente com voz propria e nao transforme em ensaio ou diagnostico."
      : "Desenvolva a resposta ate cumprir o pedido substantivo; nao encerre cedo por economia de forma.",
  ].join("\n");
}
