import { storeCognitiveAudit } from "@/app/lib/nemosine/cognitive-runtime/audit-store";
import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";
import {
  CognitiveAuditEvent,
  RedactedCognitiveAudit,
  StateTransitionRecord,
} from "@/app/lib/nemosine/cognitive-runtime/types";
import {
  ResponsePipelineRequest,
  ResponsePipelineResult,
} from "./types";

function auditEvent(code: CognitiveAuditEvent["code"], detail: CognitiveAuditEvent["detail"] = {}): CognitiveAuditEvent {
  return {
    code,
    at: new Date().toISOString(),
    detail,
  };
}

function transition(
  from: StateTransitionRecord["from"],
  to: StateTransitionRecord["to"],
  latencyMs?: number,
  note?: string,
): StateTransitionRecord {
  return {
    from,
    to,
    at: new Date().toISOString(),
    allowed: true,
    latencyMs,
    note,
  };
}

function normalizedScores(result: ResponsePipelineResult) {
  return Object.fromEntries(
    Object.entries(result.validation.scores).map(([key, value]) => [key, Number((value / 4).toFixed(3))]),
  );
}

function findingCodes(result: ResponsePipelineResult) {
  return Array.from(new Set([
    ...result.validation.findings,
    ...(result.director.failed ? ["RESPONSE_DIRECTOR_FALLBACK"] : []),
    ...(result.regenerated ? ["RESPONSE_PIPELINE_REGENERATED"] : []),
    ...(result.memoryExtraction.legacyTagsRemoved > 0 ? ["LEGACY_TAGS_REMOVED"] : []),
  ])).slice(0, 80);
}

export async function storeResponsePipelineAudit(input: {
  request: ResponsePipelineRequest;
  result: ResponsePipelineResult;
  delivered: boolean;
  sideEffectsCommitted?: {
    memory: number;
    registry: number;
    destiny: number;
  };
  shadowDeliveredAnswer?: string;
  failureReason?: string;
}) {
  const sideEffects = input.sideEffectsCommitted || { memory: 0, registry: 0, destiny: 0 };
  const sideEffectTotal = sideEffects.memory + sideEffects.registry + sideEffects.destiny;
  const promoted = input.delivered && input.result.validation.criticalFailures.length === 0;
  const transitions: StateTransitionRecord[] = [
    transition("RECEIVED", "AUTHORIZED", 0, "response-pipeline-v2"),
    transition("AUTHORIZED", "CONTEXT_ASSEMBLED", input.result.telemetry.latencyMs.contextBroker, "context-broker"),
    transition("CONTEXT_ASSEMBLED", "MODULES_SELECTED", input.result.telemetry.latencyMs.director, input.result.director.reason),
    transition("MODULES_SELECTED", "CANDIDATE_GENERATED", input.result.telemetry.latencyMs.renderer, "persona-renderer"),
    transition("CANDIDATE_GENERATED", "VIGIA_SCORED", input.result.telemetry.latencyMs.validator, "vocational-validator"),
  ];

  if (input.result.regenerated) {
    transitions.push(transition("VIGIA_SCORED", "OCV_RETRY_REQUESTED", 0, "validator requested one regeneration"));
    transitions.push(transition("OCV_RETRY_REQUESTED", "OCV_CONVERGED", 0, "single regeneration completed"));
  } else {
    transitions.push(transition("VIGIA_SCORED", "OCV_CONVERGED", 0, "deterministic validation completed"));
  }

  transitions.push(transition("OCV_CONVERGED", promoted ? "PROMOTED" : "REJECTED", 0, promoted ? "validated" : "validated-with-findings"));
  transitions.push(transition(promoted ? "PROMOTED" : "REJECTED", "FINAL_ANSWER_SELECTED", 0, input.delivered ? "selected-for-delivery" : "shadow-only"));

  if (input.delivered) {
    transitions.push(transition("FINAL_ANSWER_SELECTED", "DELIVERY_PERSISTED", 0, "route persisted assistant answer"));
    transitions.push(transition("DELIVERY_PERSISTED", sideEffectTotal > 0 ? "SIDE_EFFECTS_COMMITTED" : "SIDE_EFFECTS_SKIPPED", input.result.telemetry.latencyMs.memoryExtractor, "memory extractor completed"));
    transitions.push(transition(sideEffectTotal > 0 ? "SIDE_EFFECTS_COMMITTED" : "SIDE_EFFECTS_SKIPPED", "DELIVERED", 0, "stream response ready"));
  } else {
    transitions.push(transition("FINAL_ANSWER_SELECTED", "SIDE_EFFECTS_SKIPPED", 0, "shadow mode skips delivery and side effects"));
    transitions.push(transition("SIDE_EFFECTS_SKIPPED", "DELIVERED", 0, "shadow audit stored"));
  }

  const auditEvents: CognitiveAuditEvent[] = [
    auditEvent("RESPONSE_PIPELINE_CONTEXT_BROKERED", {
      candidateCount: input.result.context.metrics.candidateCount,
      selectedCount: input.result.context.metrics.selectedCount,
      selectedPromptCount: input.result.context.metrics.selectedForPromptCount,
      privateCandidateCount: input.result.context.metrics.privateCandidateCount,
      privateItemsExcluded: input.result.context.metrics.privateItemsExcluded,
      topSourceTypes: input.result.context.metrics.topSourceTypes.join(","),
      topScores: input.result.context.metrics.topScores.join(","),
      semanticReady: input.result.context.metrics.semanticReady,
    }),
    auditEvent("RESPONSE_PIPELINE_DIRECTOR_PLANNED", {
      usedDirector: input.result.director.usedDirector,
      directorFailed: input.result.director.failed,
      reason: input.result.director.reason,
      recommendedDepth: input.result.director.plan.recommendedDepth,
      questionRequired: input.result.director.plan.questionDecision.required,
      questionReason: input.result.director.plan.questionDecision.reason,
    }),
    auditEvent("RESPONSE_PIPELINE_VALIDATED", {
      validationScore: Number(input.result.validation.overallScore.toFixed(3)),
      criticalFailures: input.result.validation.criticalFailures.join(","),
      findingCount: input.result.validation.findings.length,
      shouldRegenerate: input.result.validation.shouldRegenerate,
    }),
    input.result.regenerated
      ? auditEvent("RESPONSE_PIPELINE_REGENERATED", { regenerated: true, maxRegenerations: 1 })
      : null,
    auditEvent("RESPONSE_PIPELINE_MEMORY_EXTRACTED", {
      memorySuggestions: input.result.memoryExtraction.memories.length,
      registrySuggested: Boolean(input.result.memoryExtraction.registrySuggestion),
      destinySuggested: Boolean(input.result.memoryExtraction.destinySuggestion),
      legacyTagsRemoved: input.result.memoryExtraction.legacyTagsRemoved,
      memoryEffectCount: sideEffects.memory,
      registryEffectCount: sideEffects.registry,
      destinyEffectCount: sideEffects.destiny,
    }),
    input.shadowDeliveredAnswer
      ? auditEvent("RESPONSE_PIPELINE_SHADOW_COMPARED", {
        legacyAnswerHash: hashText(input.shadowDeliveredAnswer),
        legacyAnswerLength: input.shadowDeliveredAnswer.length,
        v2AnswerHash: hashText(input.result.answer),
        v2AnswerLength: input.result.answer.length,
      })
      : null,
  ].filter((event): event is CognitiveAuditEvent => Boolean(event));

  const audit: RedactedCognitiveAudit = {
    runId: input.result.runId,
    userIdHash: hashText(input.request.userId),
    threadIdHash: hashText(input.request.threadId),
    personaId: input.request.personaId,
    placeId: input.request.placeId || null,
    runtimeMode: input.result.telemetry.mode,
    executionProfile: "light",
    stateTransitions: transitions,
    auditEvents,
    deliveryStatus: input.delivered ? "persisted" : "shadow_external",
    sideEffectStatus: sideEffectTotal > 0 ? "committed" : "skipped",
    memoryEffectCount: sideEffects.memory,
    registryEffectCount: sideEffects.registry,
    destinyEffectCount: sideEffects.destiny,
    assistantMessagePersisted: input.delivered,
    auditPersisted: false,
    iterationCount: input.result.regenerated ? 2 : 1,
    coherence: Number((input.result.validation.overallScore / 4).toFixed(3)),
    dimensionScores: normalizedScores(input.result),
    findingCodes: findingCodes(input.result),
    promotionDecision: input.delivered ? (promoted ? "promoted" : "rejected") : "shadow_only",
    failureReason: input.failureReason,
    latencyPerStageMs: input.result.telemetry.latencyMs,
    modelIdentifiers: [input.result.modelId],
    promptHashes: input.result.promptHashes,
    contentHashes: {
      userText: hashText(input.request.userText),
      displayUserText: hashText(input.request.displayUserText),
      finalCandidate: hashText(input.result.answer),
    },
    contentLengths: {
      userText: input.request.userText.length,
      displayUserText: input.request.displayUserText.length,
      finalCandidate: input.result.answer.length,
    },
    privateRun: input.request.privateRun,
    metadataOnly: input.request.privateRun,
    createdAt: input.result.createdAt.toISOString(),
    completedAt: input.result.completedAt.toISOString(),
    finalStatus: "DELIVERED",
  };

  await storeCognitiveAudit({ ...audit, auditPersisted: true });
}
