import { PersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import { normalizeInitiativeText } from "./input-richness";
import {
  ActiveFrontSnapshot,
  ConversationInputRichness,
  PersonaInitiativeBrief,
  PersonaInitiativeQualityEvaluation,
  PersonaInitiativeQualityFinding,
  PersonaInitiativeQualityFindingCode,
} from "./types";

const genericAssistantPatterns = [
  /\bestou aqui para (ajudar|auxiliar|oferecer|contribuir)\b/,
  /\bcomo posso (ajudar|auxiliar|contribuir)\b/,
  /\bo que posso fazer por voce\b/,
  /\bestou a disposicao\b/,
  /\bcaso precise\b/,
  /\bse precisar de algo\b/,
  /\batender melhor suas expectativas\b/,
];

const falseContextDenialPatterns = [
  /\bnao tenho (informacoes|dados|contexto) (especificas|suficientes)?\s*(sobre|a respeito de)?\s*(voce|sua historia|o usuario)\b/,
  /\bnao possuo (informacoes|dados|contexto) (especificas|suficientes)?\s*(sobre|a respeito de)?\s*(voce|sua historia|o usuario)\b/,
  /\bsem informacoes especificas sobre voce\b/,
  /\bsem contexto sobre voce\b/,
];

const genericInterviewPatterns = [
  /\bqual (e )?(a )?(missao|prioridade|tarefa|demanda|questao|assunto|desafio)\b.*\?/,
  /\bsobre o que (voce )?(quer|gostaria de) (falar|tratar|explorar)\b.*\?/,
  /\bo que (voce )?(quer|gostaria de) (fazer|explorar)\b.*\?/,
  /\bpor onde (quer|gostaria de) comecar\b.*\?/,
];

const selfDescriptionPatterns = [
  /\bminha funcao e\b/,
  /\beu sou (o|a)?\b/,
  /\bcomo persona\b/,
  /\bno sistema nemosine\b.*\bminha missao\b/,
];

const genericClosingPatterns = [
  /\b(e importante refletir|busque equilibrio|mantenha foco|planejamento cuidadoso|continue ajustando|podemos explorar depois)\.?$/,
  /\bse precisar\b.*$/,
  /\bestou a disposicao\b.*$/,
];

const unsupportedBioPatterns = [
  /\bdesde crianca\b/,
  /\bvoce sempre\b/,
  /\bsua historia mostra\b/,
  /\bsua carreira\b/,
  /\bantes de 2021\b/,
  /\bera conhecido por\b/,
];

const privateLeakPatterns = [
  /\bconfessor\b/,
  /\bporao\b/,
  /\bpor[aã]o\b/,
];

const familyVocab: Record<string, string[]> = {
  strategic: ["prioridade", "risco", "decisao", "direcao", "corte", "movimento", "frente", "hierarquia"],
  operational: ["gargalo", "falha", "teste", "reparo", "execucao", "dependencia", "estrutura", "verificar"],
  emotional: ["tensao", "afeto", "padrao", "limite", "necessidade", "hipotese", "relacao", "gesto"],
  symbolic: ["imagem", "narrativa", "simbolo", "sentido", "fase", "contradicao", "cena", "forma"],
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function finding(
  code: PersonaInitiativeQualityFindingCode,
  severity: PersonaInitiativeQualityFinding["severity"],
  explanation: string,
  repairInstruction: string,
): PersonaInitiativeQualityFinding {
  return { code, severity, explanation, repairInstruction };
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function countQuestions(text: string) {
  return (text.match(/\?/g) || []).length;
}

function firstQuestionIndex(text: string) {
  const index = text.indexOf("?");
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function lexicalTerms(text: string) {
  const stop = new Set([
    "para", "como", "qual", "quais", "voce", "este", "esta", "isso", "essa",
    "aquele", "aquela", "com", "por", "das", "dos", "uma", "que", "nao",
  ]);
  return Array.from(new Set(
    normalizeInitiativeText(text)
      .split(" ")
      .filter((term) => term.length >= 5 && !stop.has(term)),
  ));
}

function contextGroundingScore(response: string, snapshot: ActiveFrontSnapshot) {
  if (!snapshot.hasSubstantiveContext || snapshot.selectedFronts.length === 0) return 1;
  const responseNorm = normalizeInitiativeText(response);
  const selectedTerms = lexicalTerms(snapshot.selectedFronts.map((front) => `${front.theme} ${front.summary}`).join(" "));
  if (selectedTerms.length === 0) return 0.6;
  const hits = selectedTerms.filter((term) => responseNorm.includes(term)).length;
  return clamp(hits / Math.min(selectedTerms.length, 7));
}

function vocationalFitScore(response: string, contract: PersonaBehaviorContract, brief?: PersonaInitiativeBrief) {
  const responseNorm = normalizeInitiativeText(response);
  const vocab = [
    ...(familyVocab[contract.family] || []),
    ...contract.goodResponseCriteria,
    ...contract.lexicalHints,
    brief?.selectedIntervention || "",
  ].flatMap((item) => lexicalTerms(item));

  const unique = Array.from(new Set(vocab)).slice(0, 18);
  if (unique.length === 0) return 0.65;
  const hits = unique.filter((term) => responseNorm.includes(term)).length;
  return clamp(hits / Math.min(unique.length, 6));
}

function specificityScore(response: string) {
  const terms = lexicalTerms(response);
  const hasConcreteMarker = /\b(primeiro|agora|prazo|frente|risco|teste|reparo|decisao|gesto|imagem|hipotese|prioridade)\b/i.test(normalizeInitiativeText(response));
  return clamp((terms.length >= 12 ? 0.55 : terms.length / 22) + (hasConcreteMarker ? 0.35 : 0));
}

export function evaluatePersonaInitiativeQuality(input: {
  responseText: string;
  personaId: string;
  userText: string;
  richness: ConversationInputRichness;
  snapshot: ActiveFrontSnapshot;
  contract: PersonaBehaviorContract;
  brief?: PersonaInitiativeBrief;
  privateRun?: boolean;
}): PersonaInitiativeQualityEvaluation {
  const text = input.responseText.trim();
  const normalized = normalizeInitiativeText(text);
  const findings: PersonaInitiativeQualityFinding[] = [];
  const questionCount = countQuestions(text);
  const questionBudget = input.richness.questionBudget;
  const grounding = contextGroundingScore(text, input.snapshot);
  const vocation = vocationalFitScore(text, input.contract, input.brief);
  const specificity = specificityScore(text);

  if (matchesAny(normalized, genericAssistantPatterns)) {
    findings.push(finding(
      "GENERIC_ASSISTANT_MODE",
      "error",
      "A resposta usa formula de atendente ou disponibilidade generica.",
      "Remova disponibilidade generica; abra com leitura aplicada, direcao, reparo, imagem ou intervencao da persona.",
    ));
  }

  if (input.snapshot.hasSubstantiveContext && matchesAny(normalized, falseContextDenialPatterns)) {
    findings.push(finding(
      "FALSE_CONTEXT_DENIAL",
      "error",
      "Havia contexto autorizado substantivo, mas a resposta declarou ausencia de informacoes sobre o usuario.",
      "Remova a falsa lacuna; selecione a frente contextual disponivel, marque inferencias e opere pela vocacao da persona.",
    ));
  }

  if (
    matchesAny(normalized, genericInterviewPatterns)
    || (questionCount > questionBudget && firstQuestionIndex(text) < Math.max(160, text.length * 0.45))
  ) {
    findings.push(finding(
      "GENERIC_INTERVIEW_MODE",
      "error",
      "A persona devolveu ao usuario o trabalho cognitivo antes de apresentar leitura.",
      "Selecione uma frente, apresente uma hipotese ou direcao vocacional, e so pergunte se houver lacuna decisiva.",
    ));
  }

  if (input.snapshot.hasSubstantiveContext && grounding < 0.18) {
    findings.push(finding(
      "NO_CONTEXT_USE_WHEN_AVAILABLE",
      input.richness.richness === "low" ? "error" : "warning",
      "Havia contexto autorizado relevante, mas a resposta nao ancorou uma frente concreta.",
      "Use pelo menos uma frente selecionada pelo snapshot e mostre como ela orienta a resposta.",
    ));
  }

  if (vocation < 0.18 && specificity < 0.5) {
    findings.push(finding(
      "VOCATIONAL_INERTIA",
      "error",
      "A resposta nao exerceu a funcao propria da persona com substancia verificavel.",
      "Cumprir a missao operacional do contrato especifico antes de encerrar.",
    ));
  }

  if (matchesAny(normalized, selfDescriptionPatterns) && specificity < 0.6) {
    findings.push(finding(
      "SELF_DESCRIPTION_INSTEAD_OF_ACTION",
      "error",
      "A persona explicou quem e ou o que faz, mas nao operou.",
      "Substitua autoapresentacao por acao vocacional aplicada ao contexto.",
    ));
  }

  if (text.endsWith("?") && (!input.brief?.questionNecessary || matchesAny(normalized, genericInterviewPatterns))) {
    findings.push(finding(
      "EMPTY_FINAL_QUESTION",
      "error",
      "A resposta encerrou com pergunta automatica ou vazia.",
      "Termine com decisao, criterio, reparo, gesto, imagem ou pergunta especifica justificada.",
    ));
  }

  if (matchesAny(normalized, unsupportedBioPatterns)) {
    findings.push(finding(
      "UNSUPPORTED_BIOGRAPHICAL_ASSERTION",
      "critical",
      "A resposta apresentou afirmacao biografica ampla sem base explicita.",
      "Remova a afirmacao ou marque claramente como inferencia limitada pelo contexto autorizado.",
    ));
  }

  if (!input.privateRun && matchesAny(normalized, privateLeakPatterns)) {
    findings.push(finding(
      "PRIVATE_CONTEXT_LEAK",
      "critical",
      "A resposta mencionou ou insinuou espaco privado fora de execucao privada.",
      "Remova qualquer referencia a Confessor, Porao ou conteudo privado nao autorizado.",
    ));
  }

  if (matchesAny(normalized, genericClosingPatterns)) {
    findings.push(finding(
      "GENERIC_CLOSING",
      "warning",
      "O encerramento usa conselho ou disponibilidade abstrata.",
      "Encerrar com consequencia concreta da leitura vocacional.",
    ));
  }

  const genericAssistantPenalty = findings.some((item) => item.code === "GENERIC_ASSISTANT_MODE") ? 0.4 : 0;
  const genericQuestionPenalty = findings.some((item) =>
    item.code === "GENERIC_INTERVIEW_MODE" || item.code === "EMPTY_FINAL_QUESTION"
  ) ? 0.35 : 0;
  const unsupportedInferencePenalty = findings.some((item) => item.code === "UNSUPPORTED_BIOGRAPHICAL_ASSERTION") ? 0.45 : 0;
  const privacyScore = findings.some((item) => item.code === "PRIVATE_CONTEXT_LEAK") ? 0 : 1;
  const initiativeScore = clamp(
    0.28
    + grounding * 0.24
    + vocation * 0.22
    + specificity * 0.18
    + privacyScore * 0.08
    - genericAssistantPenalty
    - genericQuestionPenalty
    - unsupportedInferencePenalty,
  );
  const finalPass = initiativeScore >= 0.62
    && !findings.some((item) => item.severity === "error" || item.severity === "critical");

  return {
    initiativeScore,
    contextualGroundingScore: grounding,
    vocationalFitScore: vocation,
    specificityScore: specificity,
    privacyScore,
    unsupportedInferencePenalty,
    genericQuestionPenalty,
    genericAssistantPenalty,
    findings,
    finalPass,
  };
}

export function renderPersonaInitiativeRepairFeedback(evaluation: PersonaInitiativeQualityEvaluation) {
  if (evaluation.findings.length === 0) return "";

  return [
    "[TRUSTED PERSONA INITIATIVE REPAIR FEEDBACK - NAO EXIBIR]",
    "A resposta candidata foi rejeitada antes de chegar ao usuario. Repare somente estes pontos e preserve a persona ativa.",
    evaluation.findings.map((findingItem) => [
      `code=${findingItem.code}`,
      `severity=${findingItem.severity}`,
      `repair=${findingItem.repairInstruction}`,
    ].join(" | ")).join("\n"),
  ].join("\n");
}
