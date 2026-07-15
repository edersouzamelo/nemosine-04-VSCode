import crypto from "crypto";
import {
  CognitiveAuditEvent,
  CognitiveIteration,
  CognitiveRequest,
  RedactedCognitiveAudit,
  StateTransitionRecord,
} from "./types";

export function hashText(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function contentLength(value: string | undefined | null) {
  return typeof value === "string" ? value.length : 0;
}

export function redactFindings(iterations: CognitiveIteration[]) {
  return Array.from(new Set(iterations.flatMap((iteration) => [
    ...(iteration.scientist?.findings || []),
    ...(iteration.philosopher?.findings || []),
    ...(iteration.privacy?.findings || []),
    ...(iteration.vocation?.findings || []),
    ...(iteration.sideEffectAuthorization?.findings || []),
    ...(iteration.promotion?.findings || []),
    ...iteration.repairFindings,
  ].map((finding) => finding.code))));
}

export function buildRedactedAudit(input: {
  request: CognitiveRequest;
  executionProfile: RedactedCognitiveAudit["executionProfile"];
  transitions: StateTransitionRecord[];
  iterations: CognitiveIteration[];
  auditEvents: CognitiveAuditEvent[];
  deliveryStatus: RedactedCognitiveAudit["deliveryStatus"];
  sideEffectStatus: RedactedCognitiveAudit["sideEffectStatus"];
  sideEffectCounts: {
    memory: number;
    registry: number;
    destiny: number;
  };
  assistantMessagePersisted: boolean;
  auditPersisted: boolean;
  promptHashes: Record<string, string>;
  finalStatus: RedactedCognitiveAudit["finalStatus"];
  promotionDecision: RedactedCognitiveAudit["promotionDecision"];
  failureReason?: string;
  modelIdentifiers?: string[];
  createdAt: Date;
  completedAt: Date;
}): RedactedCognitiveAudit {
  const lastIteration = input.iterations[input.iterations.length - 1];
  const dimensionScores = Object.fromEntries(
    (lastIteration?.vigia?.dimensions || []).map((dimension) => [dimension.name, {
      score: dimension.score,
      status: dimension.status,
      weight: dimension.weight,
      reason: dimension.reason || null,
    }]),
  );

  return {
    runId: input.request.runId,
    userIdHash: hashText(input.request.userId),
    threadIdHash: hashText(input.request.threadId),
    personaId: input.request.personaId,
    placeId: input.request.placeId || null,
    runtimeMode: input.request.runtimeMode,
    executionProfile: input.executionProfile,
    stateTransitions: input.transitions,
    auditEvents: [...input.auditEvents],
    deliveryStatus: input.deliveryStatus,
    sideEffectStatus: input.sideEffectStatus,
    memoryEffectCount: input.sideEffectCounts.memory,
    registryEffectCount: input.sideEffectCounts.registry,
    destinyEffectCount: input.sideEffectCounts.destiny,
    assistantMessagePersisted: input.assistantMessagePersisted,
    auditPersisted: input.auditPersisted,
    iterationCount: input.iterations.length,
    coherence: lastIteration?.vigia?.totalCoherence,
    coherenceThreshold: lastIteration?.vigia?.threshold,
    dimensionScores,
    findingCodes: redactFindings(input.iterations),
    promotionDecision: input.promotionDecision,
    failureReason: input.failureReason,
    latencyPerStageMs: input.transitions.reduce<Record<string, number>>((acc, transition) => {
      const key = `${transition.from}->${transition.to}`;
      acc[key] = (acc[key] || 0) + (transition.latencyMs || 0);
      return acc;
    }, {}),
    modelIdentifiers: Array.from(new Set(input.modelIdentifiers || [])),
    promptHashes: { ...input.promptHashes },
    contentHashes: {
      userText: hashText(input.request.userText),
      displayUserText: hashText(input.request.displayUserText),
      finalCandidate: lastIteration?.candidate?.visibleText ? hashText(lastIteration.candidate.visibleText) : "",
    },
    contentLengths: {
      userText: contentLength(input.request.userText),
      displayUserText: contentLength(input.request.displayUserText),
      finalCandidate: contentLength(lastIteration?.candidate?.visibleText),
    },
    privateRun: input.request.privateRun,
    metadataOnly: input.request.privateRun,
    createdAt: input.createdAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    finalStatus: input.finalStatus,
  };
}
