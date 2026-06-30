import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";
import { prisma } from "@/app/lib/nemosine/session_store";
import { readCognitiveFoundationConfig, hasAnyCognitiveFoundationRuntime, isFoundationModeActive } from "./config";
import { evaluateDepthGate } from "./depth_gate";
import { extractMemoryCandidates } from "./memory_candidate_extractor";
import { buildPersonaContextProjection } from "./persona_context_projection";
import { getUserProfileNodesForProjection } from "./user_graph_store";
import type { CognitiveFoundationConfig } from "./config";

function safeJsonText(value: unknown) {
  return JSON.stringify(value ?? null);
}

function eventStatus(findingCodes: string[]) {
  return findingCodes.some((code) => /REJECTED|SKIPPED|REQUIRES|INVALID|INSUFFICIENT|SECRET|CONFESSOR/i.test(code))
    ? "attention"
    : "ok";
}

export async function storeCognitiveFoundationAudit(input: {
  userId: string;
  threadId?: string | null;
  personaId?: string | null;
  feature: string;
  mode: string;
  eventType: string;
  status?: string;
  metrics?: Record<string, unknown>;
  findingCodes?: string[];
  contentHashes?: Record<string, string>;
  contentLengths?: Record<string, number>;
  privateRun?: boolean;
}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO "CognitiveFoundationAudit" (
        "id",
        "userIdHash",
        "threadIdHash",
        "personaId",
        "feature",
        "mode",
        "eventType",
        "status",
        "metrics",
        "findingCodes",
        "contentHashes",
        "contentLengths",
        "privateRun",
        "metadataOnly",
        "createdAt"
      )
      VALUES (
        ${crypto.randomUUID()},
        ${hashText(input.userId)},
        ${input.threadId ? hashText(input.threadId) : null},
        ${input.personaId || null},
        ${input.feature},
        ${input.mode},
        ${input.eventType},
        ${input.status || eventStatus(input.findingCodes || [])},
        CAST(${safeJsonText(input.metrics || {})} AS JSONB),
        CAST(${safeJsonText(input.findingCodes || [])} AS JSONB),
        CAST(${safeJsonText(input.contentHashes || {})} AS JSONB),
        CAST(${safeJsonText(input.contentLengths || {})} AS JSONB),
        ${Boolean(input.privateRun)},
        ${true},
        ${new Date()}
      )
    `;
  } catch (error) {
    console.warn("[CognitiveFoundation] audit skipped", {
      feature: input.feature,
      eventType: input.eventType,
      errorCode: error instanceof Error ? error.name : "unknown",
    });
  }
}

function noOpConfig(config: CognitiveFoundationConfig) {
  return !hasAnyCognitiveFoundationRuntime(config);
}

export async function observeCognitiveFoundationResponse(input: {
  userId: string;
  threadId: string;
  personaId: string;
  memoryScope: string;
  placeId?: string | null;
  userText: string;
  responseText: string;
  participantCount?: number;
  privateRun: boolean;
  config?: CognitiveFoundationConfig;
}) {
  const config = input.config || readCognitiveFoundationConfig();
  if (noOpConfig(config)) return;

  const base = {
    userId: input.userId,
    threadId: input.threadId,
    personaId: input.personaId,
    privateRun: input.privateRun,
    contentHashes: {
      userText: hashText(input.userText),
      responseText: hashText(input.responseText),
    },
    contentLengths: {
      userText: input.userText.length,
      responseText: input.responseText.length,
    },
  };

  if (isFoundationModeActive(config.memoryExtractorMode) || isFoundationModeActive(config.userGraphMode)) {
    const extraction = extractMemoryCandidates({
      userText: input.userText,
      personaId: input.personaId,
      memoryScope: input.memoryScope,
      sourceId: input.threadId,
      sourceReference: `thread:${input.threadId}`,
    });

    await storeCognitiveFoundationAudit({
      ...base,
      feature: "memory-extractor",
      mode: config.memoryExtractorMode,
      eventType: "candidate-extraction",
      findingCodes: extraction.findingCodes,
      metrics: {
        candidateCount: extraction.candidates.length,
        skipped: extraction.skipped,
        skipReason: extraction.skipReason || null,
        epistemicTypes: extraction.candidates.map((candidate) => candidate.epistemicType),
        sensitivities: extraction.candidates.map((candidate) => candidate.sensitivity),
        persistedAutomatically: false,
      },
    });
  }

  if (isFoundationModeActive(config.personaProjectionMode)) {
    const nodes = await getUserProfileNodesForProjection({ userId: input.userId });
    const projection = buildPersonaContextProjection({
      personaId: input.personaId,
      memoryScope: input.memoryScope,
      nodes,
    });

    await storeCognitiveFoundationAudit({
      ...base,
      feature: "persona-projection",
      mode: config.personaProjectionMode,
      eventType: "vocational-projection",
      findingCodes: projection.blockedCount > 0 ? ["PROJECTION_BLOCKED_PRIVATE_OR_SCOPE_ITEMS"] : [],
      metrics: {
        ...projection.projectionSummary,
        blockedCount: projection.blockedCount,
        blockedReasons: projection.blockedReasons,
      },
    });
  }

  if (isFoundationModeActive(config.depthGateMode)) {
    const evaluation = evaluateDepthGate({
      userText: input.userText,
      responseText: input.responseText,
      personaId: input.personaId,
      participantCount: input.participantCount,
    });

    await storeCognitiveFoundationAudit({
      ...base,
      feature: "depth-gate",
      mode: config.depthGateMode,
      eventType: "response-depth-evaluation",
      status: evaluation.passed ? "ok" : "attention",
      findingCodes: evaluation.findingCodes,
      metrics: {
        demandClass: evaluation.demandClass,
        score: evaluation.score,
        passed: evaluation.passed,
        shouldRegenerate: evaluation.shouldRegenerate,
        approvedCriteria: evaluation.approvedCriteria,
        rejectedCriteria: evaluation.rejectedCriteria,
        lazyClosingDetected: evaluation.lazyClosingDetected,
        finalQuestionValid: evaluation.finalQuestionValid,
        ...evaluation.metrics,
      },
    });
  }
}
