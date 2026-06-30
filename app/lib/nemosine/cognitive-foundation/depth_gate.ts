import { countVisibleQuestions, questionLooksGeneric } from "@/app/lib/nemosine/response/question_policy";
import { normalizeResponseText, uniqueTerms } from "@/app/lib/nemosine/response/text";
import type { DemandClass, DepthGateEvaluation } from "./types";

const lazyClosingPatterns = [
  /se quiser/i,
  /podemos explorar/i,
  /caso queira/i,
  /me de mais detalhes/i,
  /me dê mais detalhes/i,
  /posso ajudar com/i,
  /ha algo especifico/i,
  /há algo específico/i,
  /quer que eu aprofunde/i,
  /se puder fornecer mais contexto/i,
  /se voce puder compartilhar/i,
  /se você puder compartilhar/i,
];

function wordCount(text: string) {
  return normalizeResponseText(text).split(" ").filter(Boolean).length;
}

function lastParagraph(text: string) {
  return text.trim().split(/\n{2,}/).filter(Boolean).at(-1) || text.trim();
}

function containsAny(text: string, terms: string[]) {
  const normalized = normalizeResponseText(text);
  return terms.some((term) => normalized.includes(normalizeResponseText(term)));
}

export function classifyDemand(input: {
  userText: string;
  participantCount?: number;
}): DemandClass {
  const text = input.userText || "";
  const normalized = normalizeResponseText(text);

  if (/\b(urgente|emergencia|emergência|socorro|agora|risco imediato)\b/i.test(text)) return "URGENT";
  if ((input.participantCount || 1) > 1 || /\b(debate|conselho|todos respondam|luz|sombra|inimigo)\b/i.test(text)) return "MULTI_PERSONA";
  if (/\b(investigue|audite|verifique|descubra|evidencia|evidência|analise os fatos)\b/i.test(text)) return "INVESTIGATIVE";
  if (/\b(estrategia|estratégia|plano|risco|prioridade|trade off|decisao operacional|decisão operacional)\b/i.test(text)) return "STRATEGIC";
  if (/\b(dor|medo|vergonha|triste|ansiedade|relacao|relação|familia|família|sofrimento)\b/i.test(text)) return "EMOTIONAL";
  if (/\b(mentor|direcao|direção|conselho|sentido|proposito|propósito|o que devo)\b/i.test(text)) return "MENTORIAL";
  if (/\b(interprete|interpreta|por que|porque|significa|leitura|analise|análise)\b/i.test(text)) return "INTERPRETIVE";
  if (/\b(o que e|o que é|explique|defina|como funciona|qual e|qual é)\b/i.test(text)) return "INFORMATIONAL";
  if (normalized.split(" ").filter(Boolean).length <= 8) return "DIRECT";
  return "INFORMATIONAL";
}

function score01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function scale4(value: number) {
  return Math.round(score01(value) * 4);
}

function specificityScore(userText: string, responseText: string) {
  const userTerms = uniqueTerms(userText).filter((term) => term.length > 4);
  if (userTerms.length === 0) return wordCount(responseText) >= 12 ? 3 : 2;
  const responseTerms = new Set(uniqueTerms(responseText));
  const hits = userTerms.filter((term) => responseTerms.has(term)).length;
  return scale4((hits + 1) / Math.min(userTerms.length + 1, 10));
}

function contextUseScore(contextSignals: string[], responseText: string) {
  if (contextSignals.length === 0) return 4;
  const response = normalizeResponseText(responseText);
  const hits = contextSignals.filter((signal) => response.includes(normalizeResponseText(signal))).length;
  return scale4((hits + 1) / Math.min(contextSignals.length + 1, 8));
}

function depthThreshold(demandClass: DemandClass) {
  if (demandClass === "DIRECT") return 8;
  if (demandClass === "INFORMATIONAL") return 35;
  if (demandClass === "INTERPRETIVE") return 75;
  if (demandClass === "MENTORIAL") return 95;
  if (demandClass === "EMOTIONAL") return 85;
  if (demandClass === "STRATEGIC") return 80;
  if (demandClass === "MULTI_PERSONA") return 120;
  if (demandClass === "INVESTIGATIVE") return 90;
  return 50;
}

function depthScore(demandClass: DemandClass, responseText: string) {
  const words = wordCount(responseText);
  const threshold = depthThreshold(demandClass);
  if (demandClass === "DIRECT") return words <= 90 ? 4 : 3;
  return scale4(words / threshold);
}

function substantiveClosingScore(responseText: string) {
  const ending = lastParagraph(responseText);
  if (lazyClosingPatterns.some((pattern) => pattern.test(ending))) return 0;
  if (containsAny(ending, ["decisao", "decisão", "acao", "ação", "corte", "risco", "hipotese", "hipótese", "criterio", "critério", "proximo", "próximo", "movimento"])) return 4;
  return wordCount(ending) >= 18 ? 3 : 2;
}

function hasLazyClosing(responseText: string, demandClass: DemandClass) {
  const ending = lastParagraph(responseText);
  const lazy = lazyClosingPatterns.some((pattern) => pattern.test(ending));
  if (!lazy) return false;
  if (demandClass === "DIRECT" && wordCount(responseText) <= 50) return false;
  return wordCount(responseText) < depthThreshold(demandClass) || questionLooksGeneric(ending);
}

function finalQuestionValid(responseText: string) {
  if (countVisibleQuestions(responseText) === 0) return null;
  const ending = lastParagraph(responseText);
  if (!ending.includes("?")) return null;
  if (questionLooksGeneric(ending)) return false;
  return containsAny(ending, ["decidir", "cortar", "assumir", "testar", "provar", "risco", "contradicao", "contradição"]);
}

function evaluateContract(demandClass: DemandClass, responseText: string) {
  const rejected: string[] = [];
  const approved: string[] = [];
  const normalized = normalizeResponseText(responseText);

  function requireSignal(code: string, terms: string[]) {
    if (terms.some((term) => normalized.includes(normalizeResponseText(term)))) approved.push(code);
    else rejected.push(code);
  }

  if (demandClass === "INTERPRETIVE") {
    requireSignal("tese", ["tese", "leitura", "o ponto", "a questao", "a questão"]);
    requireSignal("implicacao", ["implica", "consequencia", "consequência", "portanto", "isso empurra"]);
  }

  if (demandClass === "MENTORIAL") {
    requireSignal("verdade-central", ["o centro", "verdade", "direcao", "direção", "o que atravessa"]);
    requireSignal("direcao-pratica", ["movimento", "decisao", "decisão", "corte", "compromisso"]);
  }

  if (demandClass === "STRATEGIC") {
    requireSignal("prioridade", ["prioridade", "objetivo", "frente"]);
    requireSignal("risco", ["risco", "trade", "flanco", "custo"]);
  }

  if (demandClass === "MULTI_PERSONA") {
    requireSignal("diferenca-de-vozes", ["luz", "sombra", "inimigo", "mentor", "diver", "concord"]);
    requireSignal("progressao", ["entao", "portanto", "divirjo", "avan", "complement"]);
  }

  return { approved, rejected };
}

export function evaluateDepthGate(input: {
  userText: string;
  responseText: string;
  personaId: string;
  participantCount?: number;
  contextSignals?: string[];
}): DepthGateEvaluation {
  const demandClass = classifyDemand({
    userText: input.userText,
    participantCount: input.participantCount,
  });
  const words = wordCount(input.responseText);
  const lazyClosingDetected = hasLazyClosing(input.responseText, demandClass);
  const finalQuestion = finalQuestionValid(input.responseText);
  const contract = evaluateContract(demandClass, input.responseText);
  const scores = {
    specificityScore: specificityScore(input.userText, input.responseText),
    contextUseScore: contextUseScore(input.contextSignals || [], input.responseText),
    depthScore: depthScore(demandClass, input.responseText),
    noveltyScore: questionLooksGeneric(input.responseText) ? 1 : 3,
    personaFidelityScore: containsAny(input.responseText, [input.personaId]) ? 3 : 2,
    substantiveClosingScore: substantiveClosingScore(input.responseText),
  };
  const rejectedCriteria = [
    ...contract.rejected,
    scores.specificityScore < 2 ? "specificity" : "",
    scores.depthScore < 2 ? "depth" : "",
    lazyClosingDetected ? "lazy-closing" : "",
    finalQuestion === false ? "invalid-final-question" : "",
  ].filter(Boolean);
  const approvedCriteria = [
    ...contract.approved,
    scores.specificityScore >= 2 ? "specificity" : "",
    scores.depthScore >= 2 ? "depth" : "",
    scores.contextUseScore >= 2 ? "context-use" : "",
    scores.substantiveClosingScore >= 2 ? "substantive-closing" : "",
  ].filter(Boolean);
  const weightedScore = (
    scores.specificityScore
    + scores.contextUseScore
    + scores.depthScore
    + scores.noveltyScore
    + scores.personaFidelityScore
    + scores.substantiveClosingScore
  ) / 6;
  const passThreshold = demandClass === "DIRECT" ? 1.8 : 2.55;
  const passed = rejectedCriteria.length === 0 && weightedScore >= passThreshold;

  return {
    demandClass,
    score: Number(weightedScore.toFixed(3)),
    passed,
    shouldRegenerate: !passed && demandClass !== "DIRECT",
    approvedCriteria: Array.from(new Set(approvedCriteria)),
    rejectedCriteria: Array.from(new Set(rejectedCriteria)),
    findingCodes: [
      !passed ? "DEPTH_GATE_REJECTED" : "DEPTH_GATE_PASSED",
      lazyClosingDetected ? "LAZY_CLOSING" : "",
      finalQuestion === false ? "INVALID_FINAL_QUESTION" : "",
      words < depthThreshold(demandClass) && demandClass !== "DIRECT" ? "INSUFFICIENT_DEPTH_FOR_DEMAND" : "",
    ].filter(Boolean),
    critique: rejectedCriteria.map((criterion) => `Criterion failed: ${criterion}`),
    lazyClosingDetected,
    finalQuestionValid: finalQuestion,
    metrics: {
      wordCount: words,
      ...scores,
    },
  };
}
