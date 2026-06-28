import { getPersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import { sanitizeConversationHistory } from "@/app/lib/nemosine/payload_hygiene";
import {
  DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
  DEFAULT_CHAT_TEMPERATURE,
} from "@/app/lib/nemosine/llm_client";
import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";
import { buildContextBroker } from "./context_broker";
import { createResponseDirectorPlan } from "./response_director";
import { renderPersonaResponse } from "./persona_renderer";
import { validatePersonaResponse } from "./vocational_validator";
import {
  extractMemoryAfterResponse,
  stripInternalActionTags,
} from "./memory_extractor";
import {
  ResponsePipelineConfig,
  ResponsePipelineModel,
  ResponsePipelineRequest,
  ResponsePipelineResult,
} from "./types";

export async function runResponsePipelineV2(input: {
  request: ResponsePipelineRequest;
  config: ResponsePipelineConfig;
  model: ResponsePipelineModel;
  candidateOverride?: string;
}): Promise<ResponsePipelineResult> {
  const createdAt = new Date();
  const totalStarted = Date.now();
  const runId = input.request.runId;
  const sanitized = sanitizeConversationHistory(input.request.priorHistory);
  const request = {
    ...input.request,
    priorHistory: sanitized.sanitizedHistory,
  };
  const contract = getPersonaBehaviorContract(request.personaId);

  const contextStarted = Date.now();
  const context = await buildContextBroker(request);
  const contextLatency = Date.now() - contextStarted;

  const director = await createResponseDirectorPlan({
    request,
    context,
    contract,
    model: input.model,
  });

  const rendererStarted = Date.now();
  const firstCandidate = await renderPersonaResponse({
    request,
    context,
    plan: director.plan,
    contract,
    model: input.model,
    temperature: DEFAULT_CHAT_TEMPERATURE,
    maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
    candidateOverride: input.candidateOverride,
  });
  let rendererLatency = Date.now() - rendererStarted;
  let rawAnswer = firstCandidate.text;
  let answer = stripInternalActionTags(firstCandidate.text);

  const validatorStarted = Date.now();
  let validation = validatePersonaResponse({
    responseText: answer,
    userText: request.userText,
    personaId: request.personaId,
    plan: director.plan,
    context,
    contract,
    privateRun: request.privateRun,
  });
  let validatorLatency = Date.now() - validatorStarted;
  let regenerated = false;

  if (!input.candidateOverride && validation.shouldRegenerate && input.config.maxRegenerations > 0) {
    regenerated = true;
    const regenStarted = Date.now();
    const repairedCandidate = await renderPersonaResponse({
      request,
      context,
      plan: director.plan,
      contract,
      model: input.model,
      temperature: DEFAULT_CHAT_TEMPERATURE,
      maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
      repairInstructions: validation.regenerationInstructions,
    });
    rendererLatency += Date.now() - regenStarted;
    const repairedVisible = stripInternalActionTags(repairedCandidate.text);
    const repairedValidationStarted = Date.now();
    const repairedValidation = validatePersonaResponse({
      responseText: repairedVisible,
      userText: request.userText,
      personaId: request.personaId,
      plan: director.plan,
      context,
      contract,
      privateRun: request.privateRun,
    });
    validatorLatency += Date.now() - repairedValidationStarted;

    const repairedBetter = repairedValidation.criticalFailures.length < validation.criticalFailures.length
      || repairedValidation.overallScore >= validation.overallScore;
    if (repairedBetter) {
      rawAnswer = repairedCandidate.text;
      answer = repairedVisible;
      validation = repairedValidation;
    }
  }

  const memoryStarted = Date.now();
  const memoryExtraction = extractMemoryAfterResponse({
    request,
    rawAnswer,
    visibleAnswer: answer,
  });
  const memoryLatency = Date.now() - memoryStarted;
  const completedAt = new Date();
  const totalLatency = Date.now() - totalStarted;

  return {
    runId,
    answer,
    rawAnswer,
    context,
    director,
    validation,
    memoryExtraction,
    regenerated,
    fallbackUsed: director.failed,
    promptHashes: {
      renderer: firstCandidate.promptHash,
      director: director.promptHash || "",
      selectedContext: hashText(context.selectedForPrompt.map((item) => `${item.id}:${item.finalScore}`).join("|")),
      nativePrompt: firstCandidate.nativePromptKey,
      filteredHistory: hashText(JSON.stringify(sanitized.filteredHistory.map((item) => item.id || item.index))),
    },
    modelId: input.model.model,
    createdAt,
    completedAt,
    telemetry: {
      mode: input.config.mode,
      directorUsed: director.usedDirector,
      directorReason: director.reason,
      recommendedDepth: director.plan.recommendedDepth,
      questionRequired: director.plan.questionDecision.required,
      contextCandidateCount: context.metrics.candidateCount,
      selectedContextCount: context.metrics.selectedCount,
      selectedPromptContextCount: context.metrics.selectedForPromptCount,
      validationScore: Number(validation.overallScore.toFixed(3)),
      regenerated,
      fallbackUsed: director.failed,
      latencyMs: {
        contextBroker: contextLatency,
        director: director.latencyMs,
        renderer: rendererLatency,
        validator: validatorLatency,
        memoryExtractor: memoryLatency,
        total: totalLatency,
      },
    },
  };
}
