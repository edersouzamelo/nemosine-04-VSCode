import { generateObject } from "ai";
import { z } from "zod";
import { PersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";
import { determineResponseDepth, shouldUseResponseDirector } from "./depth_policy";
import { decideQuestionPolicy } from "./question_policy";
import {
  ContextBrokerResult,
  DirectorResult,
  QuestionDecision,
  ResponsePipelineModel,
  ResponsePipelineRequest,
  ResponsePlan,
} from "./types";
import { compactText, normalizeResponseText } from "./text";

const inferenceConfidenceSchema = z.enum(["high", "medium", "low"]);
const responseDepthSchema = z.enum(["brief", "developed", "deep"]);
const userNeedModeSchema = z.enum([
  "understand",
  "decide",
  "execute",
  "elaborate",
  "be-confronted",
  "be-acknowledged",
  "create",
]);

export const responsePlanSchema = z.object({
  primaryIntent: z.string().min(1).max(240),
  needMode: userNeedModeSchema,
  emotionalIntensity: z.enum(["low", "medium", "high"]),
  supportedFacts: z.array(z.string().max(300)).max(8).default([]),
  inferences: z.array(z.object({
    statement: z.string().min(1).max(320),
    confidence: inferenceConfidenceSchema,
    evidence: z.array(z.string().max(240)).max(4).default([]),
  })).max(6).default([]),
  centralTension: z.string().max(360).nullable().default(null),
  selectedContextAnchors: z.array(z.string().max(120)).max(8).default([]),
  vocationalContribution: z.string().min(1).max(420),
  vocationalRisk: z.string().max(240).nullable().default(null),
  recommendedDepth: responseDepthSchema,
  questionDecision: z.object({
    required: z.boolean(),
    reason: z.string().min(1).max(240),
    question: z.string().max(240).optional(),
  }),
  openingMove: z.string().min(1).max(360),
  developmentMoves: z.array(z.string().max(360)).max(8).default([]),
  landingMove: z.string().min(1).max(360),
  avoid: z.array(z.string().max(180)).max(10).default([]),
});

function inferNeedMode(userText: string): ResponsePlan["needMode"] {
  const normalized = normalizeResponseText(userText);
  if (/\b(decidir|decisao|escolher|prioridade|cortar)\b/.test(normalized)) return "decide";
  if (/\b(faca|crie|escreva|gere|produza|desenhe)\b/.test(normalized)) return "create";
  if (/\b(corrija|implemente|execute|organize|resolva)\b/.test(normalized)) return "execute";
  if (/\b(confronte|critique|flanco|erro|fraco)\b/.test(normalized)) return "be-confronted";
  if (/\b(sinto|dor|cansado|medo|vergonha|ansiedade)\b/.test(normalized)) return "be-acknowledged";
  if (/\b(aprofunde|elabore|desenvolva)\b/.test(normalized)) return "elaborate";
  return "understand";
}

function emotionalIntensity(userText: string): ResponsePlan["emotionalIntensity"] {
  const normalized = normalizeResponseText(userText);
  if (/\b(desespero|insuportavel|morte|crise|urgente|panico|odeio)\b/.test(normalized)) return "high";
  if (/\b(frustrado|dor|medo|cansado|raiva|ansiedade|triste)\b/.test(normalized)) return "medium";
  return "low";
}

function centralTension(userText: string, context: ContextBrokerResult) {
  const normalized = normalizeResponseText(userText);
  if (/\b(raso|generico|profundidade|persona|resposta)\b/.test(normalized)) {
    return "O usuario nao pede mais promessa de melhoria; pede que a persona demonstre leitura concreta agora.";
  }
  if (/\b(decidir|decisao|escolher)\b/.test(normalized)) {
    return "Ha uma escolha em que o custo de uma alternativa precisa aparecer, nao apenas os beneficios.";
  }
  if (context.selectedForPrompt.length > 0) {
    return "A resposta precisa escolher o contexto que muda a leitura sem recitar o perfil inteiro.";
  }
  return null;
}

export function buildFallbackResponsePlan(input: {
  request: ResponsePipelineRequest;
  context: ContextBrokerResult;
  contract: PersonaBehaviorContract;
  questionDecision?: QuestionDecision;
}): ResponsePlan {
  const depth = determineResponseDepth({
    userText: input.request.userText,
    selectedContextCount: input.context.selectedForPrompt.length,
    hasSubstantiveContext: input.context.selectedForPrompt.length > 0,
  });
  const questionDecision = input.questionDecision || decideQuestionPolicy({
    userText: input.request.userText,
    selectedContextCount: input.context.selectedForPrompt.length,
    depth,
  });
  const contextAnchors = input.context.selectedForPrompt.slice(0, 5).map((item) => item.id);
  const tension = centralTension(input.request.userText, input.context);

  return {
    primaryIntent: compactText(input.request.userText || "interacao aberta", 220),
    needMode: inferNeedMode(input.request.userText),
    emotionalIntensity: emotionalIntensity(input.request.userText),
    supportedFacts: [
      input.request.userText ? "Ha uma mensagem atual do usuario a responder." : "A mensagem atual e minima.",
      input.context.selectedForPrompt.length > 0
        ? "Ha contexto autorizado selecionado pelo broker."
        : "Nao ha contexto material selecionado.",
    ],
    inferences: tension ? [{
      statement: tension,
      confidence: input.context.selectedForPrompt.length > 0 ? "medium" : "low",
      evidence: contextAnchors,
    }] : [],
    centralTension: tension,
    selectedContextAnchors: contextAnchors,
    vocationalContribution: input.contract.operationalMission,
    vocationalRisk: input.contract.prohibitions[0] || null,
    recommendedDepth: depth,
    questionDecision,
    openingMove: "Entrar diretamente no detalhe mais material do pedido.",
    developmentMoves: [
      "Separar fato disponivel, inferencia responsavel e lacuna quando necessario.",
      "Executar a contribuicao vocacional da persona sem explicar a arquitetura interna.",
      "Usar contexto somente quando ele muda a interpretacao ou a orientacao.",
    ],
    landingMove: input.contract.vocationalClosing || "Encerrar com uma entrega substantiva.",
    avoid: [
      "pergunta generica",
      "fechamento de disponibilidade",
      "intimidade artificial",
      "plano interno visivel",
      "tags MEMORY/REGISTRY/DESTINY",
    ],
  };
}

function directorSystemPrompt() {
  return [
    "Voce e uma camada interna de planejamento do Sistema Nemosine.",
    "Voce nao e uma persona, nao fala com o usuario e nao aparece na resposta final.",
    "Analise a mensagem atual, o historico recente, o contexto selecionado e o contrato da persona ativa.",
    "Identifique intencao, necessidade, intensidade emocional, fatos sustentados, inferencias provaveis, tensao central, contexto que realmente aprofunda, contribuicao vocacional, risco vocacional, profundidade, decisao de pergunta, abertura, desenvolvimento e pouso.",
    "Nao finja ler pensamentos. Inferencias devem ter confianca alta, media ou baixa.",
    "Inferencias altas podem orientar diretamente; medias devem aparecer como leitura provavel; baixas devem ser omitidas ou apresentadas como hipotese.",
    "Nao diagnostique o usuario.",
    "O padrao e nao fazer perguntas. Use uma pergunta unica apenas quando a informacao ausente mudar materialmente a resposta e nao puder ser recuperada ou assumida com seguranca.",
    "Nunca use pergunta para devolver ao usuario trabalho que o sistema pode executar.",
  ].join("\n");
}

function directorPrompt(input: {
  request: ResponsePipelineRequest;
  context: ContextBrokerResult;
  contract: PersonaBehaviorContract;
  fallbackPlan: ResponsePlan;
}) {
  return [
    `personaId=${input.request.personaId}`,
    `language=${input.request.language}`,
    `recommendedDepthByPolicy=${input.fallbackPlan.recommendedDepth}`,
    "",
    "[CURRENT USER MESSAGE - QUOTED DATA]",
    input.request.userText,
    "",
    "[FUNCTIONAL CONTRACT - QUOTED DATA]",
    [
      `mission=${input.contract.operationalMission}`,
      `expectedInference=${input.contract.expectedInference}`,
      `positiveStyle=${input.contract.positiveStyle}`,
      `honestFailureMode=${input.contract.honestFailureMode}`,
      `vocationalClosing=${input.contract.vocationalClosing}`,
    ].join("\n"),
    "",
    "[SELECTED CONTEXT - QUOTED DATA]",
    input.context.selectedForPrompt.length > 0
      ? input.context.selectedForPrompt.map((item, index) => [
        `${index + 1}. id=${item.id}; type=${item.sourceType}; score=${item.finalScore.toFixed(2)}; reason=${item.selectionReason || "ranked"}`,
        compactText(item.text, 900),
      ].join("\n")).join("\n\n")
      : "No material context selected.",
  ].join("\n");
}

export async function createResponseDirectorPlan(input: {
  request: ResponsePipelineRequest;
  context: ContextBrokerResult;
  contract: PersonaBehaviorContract;
  model: ResponsePipelineModel;
}): Promise<DirectorResult & { promptHash?: string }> {
  const startedAt = Date.now();
  const complexity = shouldUseResponseDirector({
    userText: input.request.userText,
    selectedContextCount: input.context.selectedForPrompt.length,
    hasSubstantiveContext: input.context.selectedForPrompt.length > 0,
  });
  const fallbackPlan = buildFallbackResponsePlan({
    request: input.request,
    context: input.context,
    contract: input.contract,
  });

  if (!complexity.shouldUse) {
    return {
      usedDirector: false,
      reason: complexity.reason,
      plan: fallbackPlan,
      failed: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  const system = directorSystemPrompt();
  const prompt = directorPrompt({
    request: input.request,
    context: input.context,
    contract: input.contract,
    fallbackPlan,
  });

  try {
    const result = await generateObject({
      model: input.model.modelInstance,
      schema: responsePlanSchema,
      system,
      prompt,
      temperature: 0,
      maxRetries: 1,
    });
    const parsed = responsePlanSchema.parse(result.object);
    const policyDepth = fallbackPlan.recommendedDepth;
    const plan = {
      ...parsed,
      recommendedDepth: parsed.recommendedDepth === "brief" && policyDepth !== "brief" ? policyDepth : parsed.recommendedDepth,
      questionDecision: parsed.questionDecision.required
        ? parsed.questionDecision
        : fallbackPlan.questionDecision,
    };

    return {
      usedDirector: true,
      reason: complexity.reason,
      plan,
      failed: false,
      latencyMs: Date.now() - startedAt,
      promptHash: hashText(`${system}\n\n${prompt}`),
    };
  } catch (error) {
    return {
      usedDirector: false,
      reason: `director-fallback:${complexity.reason}`,
      plan: fallbackPlan,
      failed: true,
      errorCode: error instanceof Error ? error.name : "DIRECTOR_ERROR",
      latencyMs: Date.now() - startedAt,
      promptHash: hashText(`${system}\n\n${prompt}`),
    };
  }
}
