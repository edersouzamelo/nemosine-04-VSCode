import { CognitiveRuntimeConfig, readCognitiveRuntimeConfig } from "./config";
import { assembleCognitiveContextEnvelope } from "./context-envelope";
import { buildRedactedAudit } from "./audit-redaction";
import { storeCognitiveAudit } from "./audit-store";
import { extractClaimsAndActions } from "./claim-extractor";
import { deterministicPhilosopherEvaluation } from "./philosopher-validator";
import { createAiSdkCognitiveModelProvider } from "./persona-generator";
import { evaluatePromotion } from "./promotion-gate";
import { evaluatePrivacy } from "./privacy-policy";
import {
  authorizeProposedSideEffects,
  commitApprovedSideEffects,
  CommitSideEffectsInput,
  CommitSideEffectsResult,
} from "./side-effect-committer";
import { deterministicScientistEvaluation } from "./scientist-validator";
import { CognitiveStateMachine } from "./state-machine";
import { calculateVigiaCoherence } from "./vigia-coherence";
import { selectExecutionProfile, selectRuntimeModules } from "./module-registry";
import { evaluateVocationalPolicy } from "./vocational-policy";
import {
  CandidateResponse,
  CognitiveContextEnvelope,
  CognitiveFinding,
  CognitiveIteration,
  CognitiveModelProvider,
  CognitiveRequest,
  CognitiveRunResult,
  CognitiveRuntimeError,
  RedactedCognitiveAudit,
} from "./types";

type RuntimeDependencies = {
  config?: CognitiveRuntimeConfig;
  contextEnvelope?: CognitiveContextEnvelope;
  blockedContextIds?: string[];
  modelProvider?: CognitiveModelProvider;
  candidateOverride?: string;
  commitSideEffects?: (input: CommitSideEffectsInput) => Promise<CommitSideEffectsResult>;
  storeAudit?: (audit: RedactedCognitiveAudit) => Promise<void>;
};

const SAFE_REJECTION = "Nao posso entregar a resposta gerada nesta execucao, porque ela nao passou pelos controles de coerencia e vigilancia do runtime.";
const SAFE_FAILURE = "Nao posso concluir esta resposta com seguranca agora. A execucao cognitiva falhou fechada, sem entregar candidato nao validado.";

function makeCandidateFromOverride(text: string, iteration: number): CandidateResponse {
  return {
    id: crypto.randomUUID(),
    iteration,
    text,
    visibleText: text,
    modelId: "candidate-override",
    latencyMs: 0,
  };
}

function philosopherBypass() {
  return {
    constitutionalConformity: 1,
    userSovereignty: 1,
    nonIdolatry: 1,
    ethicalLegitimacy: 1,
    epistemologicalHumility: 1,
    vocationIntegrity: 1,
    manipulationDependencyRisk: 1,
    approved: true,
    findings: [],
    modelId: "double-vigilance-disabled",
  };
}

function coherenceRepairFinding(total: number, threshold: number): CognitiveFinding {
  return {
    code: "VIGIA_COHERENCE_BELOW_THRESHOLD",
    severity: "error",
    category: "vigia",
    explanation: `Coherence ${total} is below threshold ${threshold}.`,
    repairInstruction: "Repair the listed issues while preserving native persona identity and answer only with the active persona voice.",
  };
}

function collectRepairFindings(iteration: CognitiveIteration): CognitiveFinding[] {
  const findings = [
    ...(iteration.scientist?.findings || []),
    ...(iteration.privacy?.findings || []),
    ...(iteration.vocation?.findings || []),
    ...(iteration.sideEffectAuthorization?.findings || []),
    ...(iteration.philosopher?.findings || []),
    ...(iteration.promotion?.findings || []),
  ];

  if (iteration.vigia && !iteration.vigia.passed) {
    findings.push(coherenceRepairFinding(iteration.vigia.totalCoherence, iteration.vigia.threshold));
  }

  return findings.map((finding) => ({
    code: finding.code,
    severity: finding.severity,
    category: finding.category,
    explanation: finding.explanation,
    repairInstruction: finding.repairInstruction,
  }));
}

async function persistAuditSafely(input: {
  audit: RedactedCognitiveAudit;
  storeAudit: (audit: RedactedCognitiveAudit) => Promise<void>;
}) {
  try {
    await input.storeAudit(input.audit);
  } catch (error) {
    console.error("[CognitiveRuntime] audit persistence failed:", error);
  }
}

function buildResult(input: {
  request: CognitiveRequest;
  config: CognitiveRuntimeConfig;
  executionProfile: CognitiveRunResult["executionProfile"];
  stateMachine: CognitiveStateMachine;
  iterations: CognitiveIteration[];
  answer: string;
  promoted: boolean;
  rejectedCandidateTexts: string[];
  sideEffectsCommitted: boolean;
  promptHashes: Record<string, string>;
  createdAt: Date;
  promotionDecision: RedactedCognitiveAudit["promotionDecision"];
  failureReason?: string;
}) {
  const completedAt = new Date();
  const modelIdentifiers = input.iterations.flatMap((iteration) => [
    iteration.candidate?.modelId,
    iteration.scientist?.modelId,
    iteration.philosopher?.modelId,
  ].filter(Boolean) as string[]);

  const audit = buildRedactedAudit({
    request: input.request,
    executionProfile: input.executionProfile,
    transitions: input.stateMachine.transitions,
    iterations: input.iterations,
    promptHashes: input.promptHashes,
    finalStatus: input.stateMachine.current,
    promotionDecision: input.promotionDecision,
    failureReason: input.failureReason,
    modelIdentifiers,
    createdAt: input.createdAt,
    completedAt,
  });

  return {
    runId: input.request.runId,
    runtimeMode: input.request.runtimeMode,
    executionProfile: input.executionProfile,
    finalStatus: input.stateMachine.current,
    answer: input.answer,
    promoted: input.promoted,
    rejectedCandidateTexts: input.rejectedCandidateTexts,
    iterations: input.iterations,
    audit,
    sideEffectsCommitted: input.sideEffectsCommitted,
  } satisfies CognitiveRunResult;
}

export async function runCognitiveRuntime(
  request: CognitiveRequest,
  dependencies: RuntimeDependencies = {},
): Promise<CognitiveRunResult> {
  const config = dependencies.config || readCognitiveRuntimeConfig();
  const createdAt = new Date();
  const stateMachine = new CognitiveStateMachine();
  const provider = dependencies.modelProvider || createAiSdkCognitiveModelProvider();
  const commitSideEffects = dependencies.commitSideEffects || commitApprovedSideEffects;
  const storeAudit = dependencies.storeAudit || storeCognitiveAudit;
  const iterations: CognitiveIteration[] = [];
  const rejectedCandidateTexts: string[] = [];
  let promptHashes: Record<string, string> = {};
  let executionProfile = request.requestedProfile || config.defaultProfile;

  try {
    stateMachine.transition("AUTHORIZED");

    const contextResult = dependencies.contextEnvelope
      ? { envelope: dependencies.contextEnvelope, blockedContextIds: dependencies.blockedContextIds || [] }
      : await assembleCognitiveContextEnvelope(request);

    promptHashes = contextResult.envelope.promptHashes;
    stateMachine.transition("CONTEXT_ASSEMBLED");

    executionProfile = selectExecutionProfile(request, config.defaultProfile);
    const selectedModules = selectRuntimeModules(request, executionProfile);
    stateMachine.transition("MODULES_SELECTED");

    let repairFindings: CognitiveFinding[] = [];

    for (let index = 0; index < config.maxTotalCandidates; index += 1) {
      const iteration: CognitiveIteration = {
        index,
        repairFindings,
        startedAt: new Date().toISOString(),
      };

      const candidate = dependencies.candidateOverride && index === 0
        ? makeCandidateFromOverride(dependencies.candidateOverride, index)
        : await provider.generateCandidate({
          request,
          context: contextResult.envelope,
          selectedModules,
          repairFindings,
          iteration: index,
        });
      iteration.candidate = candidate;
      stateMachine.transition("CANDIDATE_GENERATED", `iteration:${index}`);

      const structuredValidators = executionProfile !== "light" || request.runtimeMode === "enforce";
      const extraction = await extractClaimsAndActions({
        request,
        context: contextResult.envelope,
        candidate,
        provider,
        structured: structuredValidators,
      });
      iteration.extraction = extraction;
      stateMachine.transition("CLAIMS_EXTRACTED", `iteration:${index}`);

      const scientist = structuredValidators
        ? await provider.evaluateScientist({
          request,
          context: contextResult.envelope,
          candidate,
          extraction,
        })
        : deterministicScientistEvaluation({ candidate, extraction });
      iteration.scientist = scientist;
      stateMachine.transition("SCIENTIST_EVALUATED", `iteration:${index}`);

      const privacy = evaluatePrivacy({
        request,
        blockedContextIds: contextResult.blockedContextIds,
        extraction,
        candidateText: candidate.visibleText,
      });
      iteration.privacy = privacy;

      const vocation = evaluateVocationalPolicy({ request, extraction });
      iteration.vocation = vocation;

      const vigia = calculateVigiaCoherence({
        scientist,
        privacy,
        vocation,
        config,
      });
      iteration.vigia = vigia;
      stateMachine.transition("VIGIA_SCORED", `iteration:${index}`);

      const retriesRemainingAfterVigia = config.maxRetries - index;
      if (!vigia.passed) {
        rejectedCandidateTexts.push(candidate.visibleText);
        iteration.completedAt = new Date().toISOString();
        iterations.push(iteration);

        if (retriesRemainingAfterVigia > 0) {
          repairFindings = collectRepairFindings(iteration);
          stateMachine.transition("OCV_RETRY_REQUESTED", `iteration:${index}`);
          continue;
        }

        stateMachine.transition("REJECTED", "coherence exhausted");
        stateMachine.transition("DELIVERED", "safe rejection delivered");
        const result = buildResult({
          request,
          config,
          executionProfile,
          stateMachine,
          iterations,
          answer: SAFE_REJECTION,
          promoted: false,
          rejectedCandidateTexts,
          sideEffectsCommitted: false,
          promptHashes,
          createdAt,
          promotionDecision: request.runtimeMode === "shadow" ? "shadow_only" : "rejected",
          failureReason: "coherence_exhaustion",
        });
        if (config.auditEnabled) await persistAuditSafely({ audit: result.audit, storeAudit });
        return result;
      }

      stateMachine.transition("OCV_CONVERGED", `iteration:${index}`);

      const philosopher = config.doubleVigilance
        ? await provider.evaluatePhilosopher({
          request,
          context: contextResult.envelope,
          candidate,
          extraction,
          scientist,
          vigia,
        })
        : philosopherBypass();
      iteration.philosopher = philosopher;
      stateMachine.transition("PHILOSOPHER_EVALUATED", `iteration:${index}`);

      const sideEffectAuthorization = authorizeProposedSideEffects({ request, extraction });
      iteration.sideEffectAuthorization = sideEffectAuthorization;

      const promotion = evaluatePromotion({
        vigia,
        scientist,
        philosopher,
        privacy,
        vocation,
        sideEffects: sideEffectAuthorization,
        retriesRemaining: config.maxRetries - index,
      });
      iteration.promotion = promotion;
      stateMachine.transition("PROMOTION_EVALUATED", `iteration:${index}`);

      if (!promotion.promoted) {
        rejectedCandidateTexts.push(candidate.visibleText);
        iteration.completedAt = new Date().toISOString();
        iterations.push(iteration);

        if (promotion.retriable) {
          repairFindings = collectRepairFindings(iteration);
          stateMachine.transition("OCV_RETRY_REQUESTED", `iteration:${index}`);
          continue;
        }

        stateMachine.transition("REJECTED", "promotion rejected");
        stateMachine.transition("DELIVERED", "safe rejection delivered");
        const result = buildResult({
          request,
          config,
          executionProfile,
          stateMachine,
          iterations,
          answer: SAFE_REJECTION,
          promoted: false,
          rejectedCandidateTexts,
          sideEffectsCommitted: false,
          promptHashes,
          createdAt,
          promotionDecision: request.runtimeMode === "shadow" ? "shadow_only" : "rejected",
          failureReason: promotion.reasons.join(",") || "promotion_rejected",
        });
        if (config.auditEnabled) await persistAuditSafely({ audit: result.audit, storeAudit });
        return result;
      }

      stateMachine.transition("PROMOTED", `iteration:${index}`);
      let sideEffectsCommitted = false;

      if (request.runtimeMode === "enforce") {
        try {
          await commitSideEffects({
            request,
            answer: candidate.visibleText,
            sideEffects: sideEffectAuthorization,
          });
          sideEffectsCommitted = true;
        } catch (error) {
          throw new CognitiveRuntimeError(
            "SIDE_EFFECT_FAILURE",
            `Failed to commit promoted side effects: ${error instanceof Error ? error.message : String(error)}`,
            { safeMessage: "A resposta foi promovida, mas os efeitos persistentes falharam." },
          );
        }
      }

      stateMachine.transition("SIDE_EFFECTS_COMMITTED", request.runtimeMode === "enforce" ? "committed" : "shadow-no-commit");
      iteration.completedAt = new Date().toISOString();
      iterations.push(iteration);
      stateMachine.transition("DELIVERED", "promoted answer delivered");

      const result = buildResult({
        request,
        config,
        executionProfile,
        stateMachine,
        iterations,
        answer: candidate.visibleText,
        promoted: true,
        rejectedCandidateTexts,
        sideEffectsCommitted,
        promptHashes,
        createdAt,
        promotionDecision: request.runtimeMode === "shadow" ? "shadow_only" : "promoted",
      });
      if (config.auditEnabled) await persistAuditSafely({ audit: result.audit, storeAudit });
      return result;
    }

    throw new CognitiveRuntimeError(
      "COHERENCE_EXHAUSTION",
      "Cognitive runtime exhausted all candidate attempts.",
      { safeMessage: SAFE_REJECTION },
    );
  } catch (error) {
    if (stateMachine.current !== "DELIVERED") {
      try {
        stateMachine.transition("FAILED_SAFE", error instanceof Error ? error.message : "runtime failure");
      } catch {
        // Keep the original transition trace if the failure itself came from an illegal edge.
      }
      if (stateMachine.current === "FAILED_SAFE") {
        stateMachine.transition("DELIVERED", "failed-safe answer delivered");
      }
    }

    const failureReason = error instanceof CognitiveRuntimeError
      ? error.code
      : error instanceof Error
        ? error.message
        : String(error);
    const result = buildResult({
      request,
      config,
      executionProfile,
      stateMachine,
      iterations,
      answer: error instanceof CognitiveRuntimeError ? error.safeMessage : SAFE_FAILURE,
      promoted: false,
      rejectedCandidateTexts,
      sideEffectsCommitted: false,
      promptHashes,
      createdAt,
      promotionDecision: request.runtimeMode === "shadow" ? "shadow_only" : "failed_safe",
      failureReason,
    });
    if (config.auditEnabled) await persistAuditSafely({ audit: result.audit, storeAudit });
    return result;
  }
}
