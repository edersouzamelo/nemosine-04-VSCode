import { PersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import {
  ContextBrokerResult,
  ResponsePlan,
  ResponseValidation,
} from "./types";
import {
  compactText,
  countTermHits,
  normalizeResponseText,
  overlapScore,
  uniqueTerms,
} from "./text";
import { countVisibleQuestions, questionLooksGeneric } from "./question_policy";

const genericClosingPatterns = [
  /estou (aqui )?(a disposicao|para ajudar)/i,
  /se precisar( de algo| de uma analise|,?\s*estou)/i,
  /podemos aprofundar/i,
  /quer que eu continue/i,
  /e importante refletir/i,
  /isso exige planejamento cuidadoso/i,
  /mantenha (o )?foco/i,
  /busque equilibrio/i,
  /continue ajustando/i,
];

const internalLeakPatterns = [
  /response director/i,
  /context broker/i,
  /vocational validator/i,
  /memory extractor/i,
  /plano interno/i,
  /selected context/i,
  /system prompt/i,
  /prompt interno/i,
  /\[MEMORY:/i,
  /\[REGISTRY:/i,
  /\[DESTINY:/i,
];

const visibleTemplateHeaders = [
  /^verdade essencial\s*:/im,
  /^acao concreta\s*:/im,
  /^pergunta reflexiva\s*:/im,
  /^auditoria logica\s*:/im,
  /^padroes observados\s*:/im,
  /^reflexao final\s*:/im,
  /^conclusao\s*:/im,
];

const sycophancySignals = [
  "voce esta absolutamente certo",
  "sua leitura esta perfeita",
  "sem duvida voce tem razao",
  "genial",
  "brilhante",
];

function score(value: number) {
  return Math.max(0, Math.min(4, Math.round(value)));
}

function responseWordCount(text: string) {
  return normalizeResponseText(text).split(" ").filter(Boolean).length;
}

function lastParagraph(text: string) {
  return text.trim().split(/\n{2,}/).filter(Boolean).at(-1) || text.trim();
}

function hasGenericClosing(text: string) {
  const ending = lastParagraph(text);
  return genericClosingPatterns.some((pattern) => pattern.test(ending));
}

function hasSubstantiveClosing(text: string, contract: PersonaBehaviorContract) {
  const ending = normalizeResponseText(lastParagraph(text));
  const signals = [
    "decisao", "corte", "proximo", "teste", "criterio", "risco", "orientacao",
    "diagnostico", "hipotese", "acao", "movimento", "imagem", "reparo",
    ...contract.lexicalHints,
  ];
  return countTermHits(ending, signals) > 0 && !hasGenericClosing(text);
}

function contextUseScore(text: string, context: ContextBrokerResult) {
  if (context.selectedForPrompt.length === 0) return 4;
  const responseTerms = uniqueTerms(text);
  const contextTerms = uniqueTerms(context.selectedForPrompt.slice(0, 5).map((item) => item.text).join(" "));
  return score(overlapScore(contextTerms, responseTerms) * 7);
}

function specificityScore(text: string, userText: string) {
  const userTerms = uniqueTerms(userText).filter((term) => term.length > 4);
  if (userTerms.length === 0) return responseWordCount(text) >= 18 ? 3 : 2;
  return score(1 + overlapScore(userTerms, uniqueTerms(text)) * 5);
}

function depthScore(text: string, plan: ResponsePlan) {
  const words = responseWordCount(text);
  if (plan.recommendedDepth === "brief") return words <= 130 ? 4 : 3;
  if (plan.recommendedDepth === "developed") return score(words >= 90 ? 4 : words >= 55 ? 3 : 1);
  return score(words >= 150 ? 4 : words >= 95 ? 3 : 1);
}

function criticalFailures(input: {
  text: string;
  plan: ResponsePlan;
  privateRun: boolean;
}) {
  const failures: string[] = [];
  if (input.text.trim().length < 12) failures.push("EMPTY_RESPONSE");
  if (internalLeakPatterns.some((pattern) => pattern.test(input.text))) failures.push("INTERNAL_CONTROL_LEAK");
  if (questionLooksGeneric(input.text) && responseWordCount(input.text) < 80) failures.push("GENERIC_QUESTION_AS_RESPONSE");
  if (!input.privateRun && /\b(confessor|porao|porão)\b/i.test(input.text) && /\bsegredo|privad|sensivel|sensível\b/i.test(input.text)) {
    failures.push("PRIVATE_CONTEXT_LEAK_RISK");
  }
  if (/\bdiagnostico\b/i.test(input.text) && /\b(depressao|ansiedade|transtorno|doenca)\b/i.test(input.text)) {
    failures.push("UNSAFE_DIAGNOSIS_RISK");
  }
  if (input.plan.recommendedDepth === "deep" && responseWordCount(input.text) < 85) failures.push("TOO_SHORT_FOR_DEEP_RESPONSE");
  return failures;
}

export function validatePersonaResponse(input: {
  responseText: string;
  userText: string;
  personaId: string;
  plan: ResponsePlan;
  context: ContextBrokerResult;
  contract: PersonaBehaviorContract;
  privateRun: boolean;
}): ResponseValidation {
  const text = input.responseText.trim();
  const normalized = normalizeResponseText(text);
  const findings: string[] = [];
  const failures = criticalFailures({ text, plan: input.plan, privateRun: input.privateRun });
  const questionCount = countVisibleQuestions(text);
  const genericClosing = hasGenericClosing(text);
  const templateVisible = visibleTemplateHeaders.some((pattern) => pattern.test(text));
  const genericQuestion = questionLooksGeneric(text);
  const sycophancy = sycophancySignals.some((signal) => normalized.includes(normalizeResponseText(signal)));
  const tooManyQuestions = questionCount > (input.plan.questionDecision.required ? 1 : 0);

  if (genericClosing) findings.push("GENERIC_CLOSING");
  if (templateVisible) findings.push("VISIBLE_TEMPLATE_HEADER");
  if (genericQuestion) findings.push("GENERIC_QUESTION");
  if (tooManyQuestions) findings.push("QUESTION_ECONOMY_VIOLATION");
  if (sycophancy) findings.push("SYCOPHANCY_SIGNAL");
  if (/\b(verifiquei|analisei logs|conferi o banco|li o system prompt)\b/i.test(text)) findings.push("SIMULATED_ACCESS_RISK");

  const scores = {
    vocationalFidelity: score(countTermHits(text, [...input.contract.lexicalHints, ...uniqueTerms(input.contract.operationalMission)]) > 0 ? 4 : 2),
    specificity: specificityScore(text, input.userText),
    contextUse: contextUseScore(text, input.context),
    depth: depthScore(text, input.plan),
    initiative: score(genericQuestion || genericClosing ? 1 : 4),
    naturalness: score(templateVisible ? 1 : 4),
    truthfulness: score(findings.includes("SIMULATED_ACCESS_RISK") ? 1 : 4),
    inferenceDiscipline: score(/\b(hipotese|provavel|infer|lacuna|fato)\b/i.test(text) || input.plan.inferences.length === 0 ? 4 : 3),
    questionEconomy: score(tooManyQuestions || genericQuestion ? 1 : 4),
    nonSycophancy: score(sycophancy ? 1 : 4),
    substantiveClosing: score(hasSubstantiveClosing(text, input.contract) ? 4 : genericClosing ? 1 : 2),
    privacy: score(failures.includes("PRIVATE_CONTEXT_LEAK_RISK") ? 0 : 4),
  };
  const overallScore = Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.keys(scores).length;
  const shouldRegenerate = failures.length > 0
    || findings.some((finding) => ["GENERIC_CLOSING", "GENERIC_QUESTION", "QUESTION_ECONOMY_VIOLATION"].includes(finding))
    || overallScore < 2.85;
  const regenerationInstructions = [
    ...failures.map((failure) => `Corrija falha critica ${failure}.`),
    genericClosing ? "Troque o fechamento generico por uma entrega substantiva, concreta e vocacional." : "",
    genericQuestion ? "Remova pergunta generica e avance com uma leitura ou decisao baseada no material disponivel." : "",
    tooManyQuestions ? "Use no maximo uma pergunta especifica, somente se ela for indispensavel." : "",
    templateVisible ? "Remova cabecalhos automaticos e responda em fala natural da persona." : "",
    input.plan.recommendedDepth === "deep" ? "Desenvolva a tensao central com mais consequencia e nuance." : "",
  ].filter(Boolean);

  return {
    scores,
    criticalFailures: failures,
    findings: [...failures, ...findings],
    shouldRegenerate,
    regenerationInstructions: regenerationInstructions.length > 0
      ? regenerationInstructions
      : [`Aumente especificidade e pouso substantivo. Resposta atual: ${compactText(text, 160)}`],
    overallScore,
  };
}
