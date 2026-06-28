import { QuestionDecision } from "./types";
import { normalizeResponseText, uniqueTerms } from "./text";

export const GENERIC_QUESTION_PATTERNS = [
  /como posso (ajudar|auxiliar|contribuir)/i,
  /\bposso ajudar\b/i,
  /o que (voce|vc) gostaria de explorar/i,
  /pode dar mais detalhes/i,
  /ha algo especifico/i,
  /qual aspecto (voce|vc) quer aprofundar/i,
  /quer que eu continue/i,
  /o que (voce|vc) deseja fazer agora/i,
  /contextualizar melhor/i,
  /sobre o que (voce|vc) quer/i,
];

const decisiveMissingSignals = [
  "qual dos", "escolha entre", "prazo exato", "data exata", "arquivo especifico",
  "valor exato", "numero exato", "nome exato",
];

export function questionLooksGeneric(text: string) {
  return GENERIC_QUESTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function countVisibleQuestions(text: string) {
  const matches = text.match(/\?/g);
  return matches ? matches.length : 0;
}

export function decideQuestionPolicy(input: {
  userText: string;
  selectedContextCount?: number;
  depth?: string;
  explicitMissingInfo?: string | null;
}): QuestionDecision {
  const normalized = normalizeResponseText(input.userText);
  const terms = uniqueTerms(input.userText);

  if (input.explicitMissingInfo && decisiveMissingSignals.some((signal) => normalized.includes(normalizeResponseText(signal)))) {
    return {
      required: true,
      reason: "decisive-missing-information",
      question: input.explicitMissingInfo.slice(0, 180),
    };
  }

  if (/\b(ou|versus|vs)\b/.test(normalized) && terms.length <= 8) {
    return {
      required: false,
      reason: "ambiguous-but-answerable-in-parallel",
    };
  }

  if ((input.selectedContextCount || 0) > 0) {
    return {
      required: false,
      reason: "context-available-proceed-with-best-reading",
    };
  }

  if (terms.length <= 2 && !/^(oi|ola|bom dia|boa tarde|boa noite)$/i.test(normalized)) {
    return {
      required: false,
      reason: "low-information-input-safe-to-make-provisional-reading",
    };
  }

  return {
    required: false,
    reason: "default-zero-questions",
  };
}
