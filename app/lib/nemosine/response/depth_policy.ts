import { classifyConversationInputRichness } from "@/app/lib/nemosine/persona-initiative";
import { ResponseDepth } from "./types";
import { normalizeResponseText, uniqueTerms } from "./text";

const deepSignals = [
  "sofrimento", "dor", "dilema", "decisao", "decidir", "estrategia", "complexo",
  "profundo", "profundidade", "rasa", "raso", "padrao", "repeticao", "conflito",
  "familia", "relacionamento", "saude", "juridico", "financeiro", "projeto",
  "arquitetura", "academico", "tese", "crise",
];

const developedSignals = [
  "explique", "analise", "organize", "plano", "corrija", "compare", "como",
  "porque", "por que", "problema", "erro", "falha", "orientacao",
];

const simpleSignals = [
  "oi", "ola", "bom dia", "boa tarde", "boa noite", "ok", "sim", "nao",
  "traduza", "resuma em uma frase",
];

export type DepthPolicyInput = {
  userText: string;
  selectedContextCount?: number;
  hasSubstantiveContext?: boolean;
};

export function determineResponseDepth(input: DepthPolicyInput): ResponseDepth {
  const normalized = normalizeResponseText(input.userText);
  const richness = classifyConversationInputRichness(input.userText);
  const termCount = uniqueTerms(input.userText).length;
  const deepHit = deepSignals.some((signal) => normalized.includes(normalizeResponseText(signal)));
  const developedHit = developedSignals.some((signal) => normalized.includes(normalizeResponseText(signal)));
  const simpleHit = simpleSignals.some((signal) => normalized === normalizeResponseText(signal));

  if (deepHit || termCount >= 42 || input.selectedContextCount && input.selectedContextCount >= 6) {
    return "deep";
  }

  if (developedHit || richness.richness === "high" || termCount >= 14 || input.hasSubstantiveContext) {
    return "developed";
  }

  if (simpleHit || richness.richness === "low") {
    return "brief";
  }

  return "developed";
}

export type DirectorComplexityDecision = {
  shouldUse: boolean;
  reason: string;
};

export function shouldUseResponseDirector(input: DepthPolicyInput): DirectorComplexityDecision {
  const normalized = normalizeResponseText(input.userText);
  const richness = classifyConversationInputRichness(input.userText);
  const depth = determineResponseDepth(input);
  const hasComplexSignal = [
    ...deepSignals,
    "critica", "persona", "memoria", "contexto", "runtime", "sistema", "arquitetura",
    "padroes", "tensao", "ambivalencia", "vergonha", "exaustao",
  ].some((signal) => normalized.includes(normalizeResponseText(signal)));

  if (depth === "deep") {
    return { shouldUse: true, reason: "deep-depth-policy" };
  }

  if (hasComplexSignal) {
    return { shouldUse: true, reason: "complex-signal" };
  }

  if ((input.selectedContextCount || 0) >= 4) {
    return { shouldUse: true, reason: "context materially changes answer" };
  }

  if (richness.openingType === "greeting" || richness.richness === "low") {
    return { shouldUse: false, reason: "simple-low-information-opening" };
  }

  if (depth === "developed" && normalized.length >= 180) {
    return { shouldUse: true, reason: "developed-request-with-substance" };
  }

  return { shouldUse: false, reason: "direct-rendering-sufficient" };
}
