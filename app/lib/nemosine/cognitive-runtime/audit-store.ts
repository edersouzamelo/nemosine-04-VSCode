import { prisma } from "@/app/lib/nemosine/session_store";
import { CognitiveRuntimeError, RedactedCognitiveAudit } from "./types";

export async function storeCognitiveAudit(audit: RedactedCognitiveAudit) {
  try {
    const data = {
      userIdHash: audit.userIdHash,
      threadIdHash: audit.threadIdHash,
      personaId: audit.personaId,
      placeId: audit.placeId || null,
      runtimeMode: audit.runtimeMode,
      executionProfile: audit.executionProfile,
      stateTransitions: audit.stateTransitions,
      auditEvents: audit.auditEvents,
      deliveryStatus: audit.deliveryStatus,
      sideEffectStatus: audit.sideEffectStatus,
      memoryEffectCount: audit.memoryEffectCount,
      registryEffectCount: audit.registryEffectCount,
      destinyEffectCount: audit.destinyEffectCount,
      assistantMessagePersisted: audit.assistantMessagePersisted,
      auditPersisted: audit.auditPersisted,
      iterationCount: audit.iterationCount,
      coherence: audit.coherence ?? null,
      coherenceThreshold: audit.coherenceThreshold ?? null,
      dimensionScores: audit.dimensionScores,
      findingCodes: audit.findingCodes,
      promotionDecision: audit.promotionDecision,
      failureReason: audit.failureReason || null,
      latencyPerStageMs: audit.latencyPerStageMs,
      modelIdentifiers: audit.modelIdentifiers,
      promptHashes: audit.promptHashes,
      contentHashes: audit.contentHashes,
      contentLengths: audit.contentLengths,
      privateRun: audit.privateRun,
      metadataOnly: audit.metadataOnly,
      completedAt: new Date(audit.completedAt),
      finalStatus: audit.finalStatus,
    };

    await prisma.cognitiveRunAudit.upsert({
      where: { id: audit.runId },
      create: {
        id: audit.runId,
        ...data,
      },
      update: data,
    });
  } catch (error) {
    throw new CognitiveRuntimeError(
      "AUDIT_PERSISTENCE_FAILURE",
      `Failed to persist cognitive audit: ${error instanceof Error ? error.message : String(error)}`,
      { safeMessage: "A auditoria cognitiva nao pode ser persistida." },
    );
  }
}
