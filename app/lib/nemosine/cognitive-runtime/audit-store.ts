import { prisma } from "@/app/lib/nemosine/session_store";
import { CognitiveRuntimeError, RedactedCognitiveAudit } from "./types";

export async function storeCognitiveAudit(audit: RedactedCognitiveAudit) {
  try {
    await prisma.cognitiveRunAudit.create({
      data: {
        id: audit.runId,
        userIdHash: audit.userIdHash,
        threadIdHash: audit.threadIdHash,
        personaId: audit.personaId,
        placeId: audit.placeId || null,
        runtimeMode: audit.runtimeMode,
        executionProfile: audit.executionProfile,
        stateTransitions: audit.stateTransitions,
        iterationCount: audit.iterationCount,
        coherence: audit.coherence ?? null,
        dimensionScores: audit.dimensionScores,
        findingCodes: audit.findingCodes,
        promotionDecision: audit.promotionDecision,
        failureReason: audit.failureReason || null,
        latencyPerStageMs: audit.latencyPerStageMs,
        modelIdentifiers: audit.modelIdentifiers,
        promptHashes: audit.promptHashes,
        contentHashes: audit.contentHashes,
        privateRun: audit.privateRun,
        metadataOnly: audit.metadataOnly,
        completedAt: new Date(audit.completedAt),
      },
    });
  } catch (error) {
    throw new CognitiveRuntimeError(
      "AUDIT_PERSISTENCE_FAILURE",
      `Failed to persist cognitive audit: ${error instanceof Error ? error.message : String(error)}`,
      { safeMessage: "A auditoria cognitiva nao pode ser persistida." },
    );
  }
}
