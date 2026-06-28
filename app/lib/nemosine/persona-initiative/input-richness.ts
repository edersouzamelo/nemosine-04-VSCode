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

const embeddedGreetingPattern = /\b(bom dia|boa tarde|boa noite|oi|ola|hello|hi|salve)\b/;
const contentAfterGreetingPattern = /\b(estou|to|estamos|preciso|quero|tento|tentando|houve|existe|aconteceu|sinto|sentindo)\b/;

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
  /\b(previsao|prever|projeta|projetar|projecao|cenario|cenarios|tendencia|tendencias|futuro|semana)\b/,
  /\bpreciso\b.+\b(revisar|corrigir|decidir|resolver|implementar|publicar|entregar|organizar|conversar|falar)\b/,
];

const personaRoleQuestionPatterns = [
  /\bqual (e )?(teu|seu|tua|sua) papel\b/,
  /\bqual (e )?(teu|seu|tua|sua) funcao\b/,
  /\bo que (voce|vc) faz\b/,
  /\bquem (e )?(voce|vc)\b/,
  /\bpara que (voce|vc) serve\b/,
  /\bnesse sistema\b.*\b(papel|funcao|serve|faz)\b/,
  /\b(papel|funcao) (no|nesse|dentro do) sistema\b/,
];

const personaMetaCritiquePatterns = [
  /\bacho que (voce|vc) errou\b/,
  /\b(respondendo|respondeu|falando|falou)\b.*\b(mesma coisa|igual|identico|idêntico)\b/,
  /\b(mesma coisa|igual|identico|idêntico)\b.*\b(guru|mentor|persona|resposta)\b/,
  /\b(loop|looping|repetindo|repeticao|repetição|repetiu|eco mecanico|eco mecânico)\b/,
  /\b(travou|travou as mensagens|mensagens travaram|nao foi possivel obter resposta|não foi possível obter resposta)\b/,
  /\bnao sabe falar\b/,
  /\bdo que (voce|vc) (esta|ta|tá) falando\b/,
  /\bque (voce|vc) (esta|ta|tá) falando\b/,
  /\b(que bosta|merda|pessimo|péssimo|horrivel|horrível)\b/,
];

const conversationNavigationPatterns = [
  /\bcom quem\b.{0,80}\b(acabei|estava|tava|estive|vinha)\b.{0,80}\b(falar|falando|falei|conversar|conversando|conversei)\b/,
  /\bquem\b.{0,80}\b(acabei|estava|tava|estive|vinha)\b.{0,80}\b(falar|falando|falei|conversar|conversando|conversei)\b/,
  /\b(acabei de|estava|tava|estive|vinha)\s+(falando|conversando|falei|conversei)\s+com\b/,
  /\b(falava|conversava)\s+com\b/,
];

const sourceReferencePatterns = [
  /\b(fonte|fontes|dossie|dossi[eê]|arquivo|documento|upload|subi|carreguei|anexei|pdf|docx|txt|csv)\b/,
  /\b(chat gpt|chatgpt|nemosine original|original do nemosine|persona original|filosofo original)\b.*\b(ensinou|dossie|dossi[eê]|perfil|sobre mim|continuidade)\b/,
  /\b(viu|leu|consultou|considerou)\b.{0,120}\b(ensinou|diz|fala|aponta|mostra|revela)\b.{0,80}\bsobre mim\b/,
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

export function isPersonaRoleQuestion(text: string) {
  const normalized = normalizeInitiativeText(text || "");
  return matchesAny(personaRoleQuestionPatterns, normalized);
}

export function isPersonaMetaCritique(text: string) {
  const normalized = normalizeInitiativeText(text || "");
  return matchesAny(personaMetaCritiquePatterns, normalized);
}

export function isConversationNavigationRequest(text: string) {
  const normalized = normalizeInitiativeText(text || "");
  return matchesAny(conversationNavigationPatterns, normalized);
}

export function isSourceReferenceRequest(text: string) {
  const normalized = normalizeInitiativeText(text || "");
  return matchesAny(sourceReferencePatterns, normalized);
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

  if (isPersonaRoleQuestion(normalized)) {
    signals.push("persona-role-question");
    return {
      richness: "high",
      openingType: "substantive_request",
      requiresContextExpansion: false,
      questionBudget: 0,
      signals,
    };
  }

  if (isConversationNavigationRequest(normalized)) {
    signals.push("conversation-navigation");
    return {
      richness: "high",
      openingType: "substantive_request",
      requiresContextExpansion: false,
      questionBudget: 0,
      signals,
    };
  }

  if (isSourceReferenceRequest(normalized)) {
    signals.push("source-reference");
    return {
      richness: "high",
      openingType: "substantive_request",
      requiresContextExpansion: false,
      questionBudget: 0,
      signals,
    };
  }

  if (isPersonaMetaCritique(normalized)) {
    signals.push("persona-meta-critique");
    return {
      richness: "high",
      openingType: "substantive_request",
      requiresContextExpansion: false,
      questionBudget: 0,
      signals,
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

  if (
    (matchesAny(greetingPatterns, normalized) || embeddedGreetingPattern.test(normalized))
    && terms.length <= 4
    && !contentAfterGreetingPattern.test(normalized)
  ) {
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
