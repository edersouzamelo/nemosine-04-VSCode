import { generateText } from "ai";
import { ENTITIES } from "@/app/data/entities";
import { buildNativePersonaSoulCard, getNativePersonaPromptRecord } from "@/app/data/nativePersonaPrompts";
import { PersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";
import {
  ChatHistoryMessage,
  ContextBrokerResult,
  ResponsePipelineModel,
  ResponsePipelineRequest,
  ResponsePlan,
} from "./types";
import { compactText } from "./text";

const languageName: Record<ResponsePipelineRequest["language"], string> = {
  "pt-BR": "portugues brasileiro",
  es: "espanol",
  en: "English",
};

function getNativePrompt(personaId: string) {
  const personaData = Object.values(ENTITIES).find((entity) => entity.name === personaId && entity.type === "persona");
  const nativePromptRecord = getNativePersonaPromptRecord(personaId);
  const sourcePrompt = nativePromptRecord?.prompt || personaData?.prompt || `Voce e ${personaId}.`;
  const localPersonaVoice = personaData?.script || personaData?.transcription || sourcePrompt;
  const nativeSoulCard = buildNativePersonaSoulCard(personaId, localPersonaVoice);
  return {
    prompt: nativeSoulCard.soulCard,
    source: nativeSoulCard.source,
    key: nativeSoulCard.promptKey,
  };
}

function generationContract(contract: PersonaBehaviorContract) {
  return [
    `Missao: ${contract.operationalMission}`,
    `Contribuicao exclusiva: ${contract.expectedInference}`,
    `Voz: ${contract.positiveStyle}`,
    `Limite honesto: ${contract.honestFailureMode}`,
    `Criterios positivos: ${contract.goodResponseCriteria.join("; ")}`,
    `Pouso vocacional: ${contract.vocationalClosing}`,
  ].join("\n");
}

function renderContext(context: ContextBrokerResult) {
  if (context.selectedForPrompt.length === 0) {
    return "Nenhum contexto material foi selecionado. Nao invente contexto ausente.";
  }

  return context.selectedForPrompt.map((item, index) => [
    `${index + 1}. id=${item.id}; tipo=${item.sourceType}; score=${item.finalScore.toFixed(2)}; motivo=${item.selectionReason || "ranked"}`,
    compactText(item.text, item.sourceType === "persona" ? 360 : 900),
  ].join("\n")).join("\n\n");
}

function renderPlan(plan: ResponsePlan) {
  return [
    `Intencao primaria: ${plan.primaryIntent}`,
    `Necessidade: ${plan.needMode}`,
    `Intensidade emocional aparente: ${plan.emotionalIntensity}`,
    `Profundidade: ${plan.recommendedDepth}`,
    `Tensao central: ${plan.centralTension || "nao determinada"}`,
    `Fatos sustentados: ${plan.supportedFacts.join(" | ") || "nenhum alem da mensagem atual"}`,
    `Inferencias responsaveis: ${plan.inferences.map((item) => `${item.confidence}: ${item.statement}`).join(" | ") || "nenhuma"}`,
    `Contribuicao vocacional: ${plan.vocationalContribution}`,
    `Risco vocacional: ${plan.vocationalRisk || "nenhum especifico"}`,
    `Pergunta: ${plan.questionDecision.required ? `uma pergunta permitida: ${plan.questionDecision.question || plan.questionDecision.reason}` : `nao perguntar; ${plan.questionDecision.reason}`}`,
    `Abertura: ${plan.openingMove}`,
    `Desenvolvimento: ${plan.developmentMoves.join(" | ")}`,
    `Pouso: ${plan.landingMove}`,
    `Evitar: ${plan.avoid.join(" | ")}`,
  ].join("\n");
}

export function buildRendererSystemPrompt(input: {
  request: ResponsePipelineRequest;
  context: ContextBrokerResult;
  plan: ResponsePlan;
  contract: PersonaBehaviorContract;
  repairInstructions?: string[];
}) {
  const nativePrompt = getNativePrompt(input.request.personaId);
  const repair = input.repairInstructions && input.repairInstructions.length > 0
    ? [
      "[VALIDATOR REPAIR INSTRUCTIONS - INTERNAL]",
      "Corrija apenas estes pontos sem explicar a correcao ao usuario:",
      input.repairInstructions.map((instruction) => `- ${instruction}`).join("\n"),
    ].join("\n")
    : "";

  const system = [
    "[IDENTIDADE E VOZ NATIVA]",
    `Fale exclusivamente como ${input.request.personaId}.`,
    "Preserve missao, temperamento, vocacao e limites. O Lugar ativo, quando existir, e atmosfera/contexto, nao uma segunda persona.",
    "O prompt nativo abaixo e fonte primaria de assinatura, cadencia e imaginario:",
    nativePrompt.prompt,
    "",
    "[CONTRATO DE GERACAO]",
    generationContract(input.contract),
    "",
    "[CONTEXTO SELECIONADO PELO BROKER]",
    "Use apenas o que muda materialmente a resposta. Nao recite perfil, memoria ou historico como lista visivel.",
    renderContext(input.context),
    "",
    "[PLANO INTERNO DE RESPOSTA]",
    "Use este plano como materia-prima invisivel, nunca como formato ou conteudo a ser exposto.",
    renderPlan(input.plan),
    "",
    "[REGRAS ESSENCIAIS DE SAIDA]",
    "Entre diretamente no assunto e demonstre compreensao de um detalhe especifico.",
    "Desenvolva a tensao central na profundidade recomendada, sem alongar automaticamente.",
    "Diferencie fato, inferencia e lacuna quando isso proteger a verdade.",
    "Avance a conversa por leitura, decisao, orientacao, imagem ou acao.",
    "Termine com entrega substantiva: decisao, diagnostico, orientacao, corte, proximo passo ou imagem precisa.",
    "Nao exponha plano interno, broker, validator, memoria, tags ou arquitetura.",
    "Nao emita tags [MEMORY:], [REGISTRY:] ou [DESTINY:]. A extracao de memoria e posterior e separada.",
    "Nao force intimidade, bajulacao, pergunta generica, lista automatica ou fechamento de disponibilidade.",
    `Responda em ${languageName[input.request.language]}, salvo pedido explicito em outro idioma na mensagem atual.`,
    repair,
  ].filter(Boolean).join("\n\n");

  return {
    system,
    promptHash: hashText(system),
    nativePromptKey: nativePrompt.key,
    nativePromptSource: nativePrompt.source,
  };
}

function rendererMessages(history: ChatHistoryMessage[], userText: string) {
  const prior = history
    .filter((message) => message.role !== "system")
    .slice(-12)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

  return [
    ...prior,
    {
      role: "user" as const,
      content: userText,
    },
  ];
}

export async function renderPersonaResponse(input: {
  request: ResponsePipelineRequest;
  context: ContextBrokerResult;
  plan: ResponsePlan;
  contract: PersonaBehaviorContract;
  model: ResponsePipelineModel;
  temperature: number;
  maxOutputTokens: number;
  repairInstructions?: string[];
  candidateOverride?: string;
}) {
  const startedAt = Date.now();
  const prompt = buildRendererSystemPrompt({
    request: input.request,
    context: input.context,
    plan: input.plan,
    contract: input.contract,
    repairInstructions: input.repairInstructions,
  });

  if (input.candidateOverride !== undefined) {
    return {
      text: input.candidateOverride,
      latencyMs: Date.now() - startedAt,
      promptHash: prompt.promptHash,
      nativePromptKey: prompt.nativePromptKey,
      nativePromptSource: prompt.nativePromptSource,
    };
  }

  const result = await generateText({
    model: input.model.modelInstance,
    system: prompt.system,
    messages: rendererMessages(input.request.priorHistory, input.request.userText),
    temperature: input.temperature,
    maxOutputTokens: input.maxOutputTokens,
    maxRetries: 1,
  });

  return {
    text: result.text,
    latencyMs: Date.now() - startedAt,
    promptHash: prompt.promptHash,
    nativePromptKey: prompt.nativePromptKey,
    nativePromptSource: prompt.nativePromptSource,
  };
}
