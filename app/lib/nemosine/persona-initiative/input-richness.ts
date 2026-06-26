import { ConversationInputRichness } from "./types";

const stopwords = new Set([
  "a", "o", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "e",
  "em", "para", "por", "com", "que", "como", "qual", "quais", "me", "meu",
  "minha", "voce", "vc", "eu", "tu", "nos", "isso", "esse", "essa", "este",
  "esta", "agora", "hoje", "ai", "la", "aqui",
]);

const greetingPatterns = [
  /^bom dia\b/,
  /^boa tarde\b/,
  /^boa noite\b/,
  /^(oi|ola|ol[aá]|hello|hi)\b/,
  /^salve\b/,
  /^fala\b/,
  /^e ai\b/,
];

const returnPatterns = [
  /^voltei\b/,
  /^retornei\b/,
  /^cheguei\b/,
  /^estou de volta\b/,
  /^to de volta\b/,
];

const continuationPatterns = [
  /^continue\b/,
  /^continua\b/,
  /^prossiga\b/,
  /^segue\b/,
  /^e agora\??$/,
  /^o que fazemos\??$/,
  /^me diga\??$/,
];

const openQuestionPatterns = [
  /^o que acha\??$/,
  /^qual sua leitura\??$/,
  /^e entao\??$/,
  /^o que voce ve\??$/,
  /^o que temos\??$/,
];

const reactionPatterns = [
  /^pois e\b/,
  /^nao sei\b/,
  /^sei la\b/,
  /^complicado\b/,
  /^ta dificil\b/,
  /^cansei\b/,
  /^triste\b/,
  /^pesado\b/,
];

const substantivePatterns = [
  /\b(estou|to|estamos|preciso|quero|tento|tentando|temos|houve|existe|aconteceu)\b.*\b(separando|separei|separacao|divorcio|luto|morreu|doenca|doente|crise|ansiedade|demitido|falencia|processo|prazo|urgente|risco|erro|bug|build|deploy|runtime|arquitetura|memoria|privacidade|patente|contrato|paper|artigo)\b/,
  /\b(separando|separei|separacao|divorcio|luto|morreu|doenca|doente|crise|ansiedade|demitido|falencia|processo|prazo|urgente|risco|erro|bug|build|deploy|runtime|arquitetura|memoria|privacidade|patente|contrato|paper|artigo)\b/,
  /\bpreciso\b.+\b(revisar|corrigir|decidir|resolver|implementar|publicar|entregar|organizar|conversar|falar)\b/,
];

export function normalizeInitiativeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s?!.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentTerms(normalized: string) {
  return normalized
    .replace(/[?!.]/g, " ")
    .split(" ")
    .filter((term) => term.length > 2 && !stopwords.has(term));
}

function matchesAny(patterns: RegExp[], normalized: string) {
  return patterns.some((pattern) => pattern.test(normalized));
}

export function classifyConversationInputRichness(text: string): ConversationInputRichness {
  const normalized = normalizeInitiativeText(text || "");
  const terms = contentTerms(normalized);
  const signals: string[] = [];

  if (!normalized) {
    return {
      richness: "low",
      openingType: "continuation",
      requiresContextExpansion: true,
      questionBudget: 0,
      signals: ["empty-input"],
    };
  }

  if (matchesAny(substantivePatterns, normalized)) {
    signals.push("substantive-keyword");
    return {
      richness: "high",
      openingType: "substantive_request",
      requiresContextExpansion: false,
      questionBudget: 2,
      signals,
    };
  }

  if (matchesAny(greetingPatterns, normalized) && terms.length <= 2) {
    signals.push("greeting-only");
    return {
      richness: "low",
      openingType: "greeting",
      requiresContextExpansion: true,
      questionBudget: 0,
      signals,
    };
  }

  if (matchesAny(returnPatterns, normalized) && terms.length <= 3) {
    signals.push("return-marker");
    return {
      richness: "low",
      openingType: "return",
      requiresContextExpansion: true,
      questionBudget: 0,
      signals,
    };
  }

  if (matchesAny(continuationPatterns, normalized)) {
    signals.push("continuation-marker");
    return {
      richness: "low",
      openingType: "continuation",
      requiresContextExpansion: true,
      questionBudget: 0,
      signals,
    };
  }

  if (matchesAny(openQuestionPatterns, normalized)) {
    signals.push("open-question");
    return {
      richness: "low",
      openingType: "open_question",
      requiresContextExpansion: true,
      questionBudget: 0,
      signals,
    };
  }

  if (matchesAny(reactionPatterns, normalized) && terms.length <= 3) {
    signals.push("short-reaction");
    return {
      richness: "low",
      openingType: "reaction",
      requiresContextExpansion: true,
      questionBudget: 1,
      signals,
    };
  }

  if (terms.length <= 2) {
    signals.push("few-content-terms");
    return {
      richness: "low",
      openingType: normalized.endsWith("?") ? "open_question" : "reaction",
      requiresContextExpansion: true,
      questionBudget: normalized.endsWith("?") ? 0 : 1,
      signals,
    };
  }

  if (terms.length <= 7) {
    signals.push("limited-content-terms");
    return {
      richness: "medium",
      openingType: normalized.endsWith("?") ? "open_question" : "substantive_request",
      requiresContextExpansion: true,
      questionBudget: 1,
      signals,
    };
  }

  return {
    richness: "high",
    openingType: "substantive_request",
    requiresContextExpansion: false,
    questionBudget: 2,
    signals: ["content-rich"],
  };
}
