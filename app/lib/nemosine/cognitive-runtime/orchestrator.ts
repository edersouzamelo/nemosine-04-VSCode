import { CognitiveRuntimeConfig, readCognitiveRuntimeConfig } from "./config";
import { assembleCognitiveContextEnvelope } from "./context-envelope";
import { getPersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import {
  ActiveFrontSource,
  buildActiveFrontSnapshot,
  buildPersonaInitiativeBrief,
  classifyConversationInputRichness,
  evaluatePersonaInitiativeQuality,
} from "@/app/lib/nemosine/persona-initiative";
import { buildRedactedAudit } from "./audit-redaction";
import { storeCognitiveAudit } from "./audit-store";
import { extractClaimsAndActions } from "./claim-extractor";
import { deterministicPhilosopherEvaluation, mergePhilosopherEvaluations } from "./philosopher-validator";
import { createAiSdkCognitiveModelProvider } from "./persona-generator";
import { evaluatePromotion } from "./promotion-gate";
import { evaluatePrivacy } from "./privacy-policy";
import {
  authorizeProposedSideEffects,
  commitAuthorizedOptionalEffects,
  CommitOptionalEffectsInput,
  CommitOptionalEffectsResult,
  persistDeliveredAssistantMessage,
  PersistDeliveredAssistantMessageInput,
  PersistDeliveredAssistantMessageResult,
} from "./side-effect-committer";
import { deterministicScientistEvaluation, mergeScientistEvaluations } from "./scientist-validator";
import { CognitiveStateMachine } from "./state-machine";
import { calculateVigiaCoherence } from "./vigia-coherence";
import { buildProfileAuditEvent, classifyRequestRisk, selectExecutionProfile, selectRuntimeModules } from "./module-registry";
import { evaluateVocationalPolicy } from "./vocational-policy";
import {
  CandidateResponse,
  CognitiveAuditEvent,
  CognitiveContextEnvelope,
  CognitiveFinding,
  CognitiveIteration,
  CognitiveModelProvider,
  CognitiveRequest,
  CognitiveRunResult,
  CognitiveRuntimeError,
  DeliveryStatus,
  RedactedCognitiveAudit,
  SideEffectCounts,
  SideEffectStatus,
  philosopherEvaluationSchema,
  scientistEvaluationSchema,
} from "./types";

type RuntimeDependencies = {
  config?: CognitiveRuntimeConfig;
  contextEnvelope?: CognitiveContextEnvelope;
  blockedContextIds?: string[];
  modelProvider?: CognitiveModelProvider;
  candidateOverride?: string;
  persistAssistantMessage?: (input: PersistDeliveredAssistantMessageInput) => Promise<PersistDeliveredAssistantMessageResult>;
  commitOptionalEffects?: (input: CommitOptionalEffectsInput) => Promise<CommitOptionalEffectsResult>;
  storeAudit?: (audit: RedactedCognitiveAudit) => Promise<void>;
};

const SAFE_REJECTION = "Nao posso entregar a resposta gerada nesta execucao, porque ela nao passou pelos controles de coerencia e vigilancia do runtime.";
const SAFE_FAILURE = "Nao posso concluir esta resposta com seguranca agora. A execucao cognitiva falhou fechada, sem entregar candidato nao validado.";
const zeroSideEffectCounts: SideEffectCounts = { memory: 0, registry: 0, destiny: 0 };

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

function auditPersistenceFailureEvent(): CognitiveAuditEvent {
  return {
    code: "AUDIT_PERSISTENCE_FAILURE",
    at: new Date().toISOString(),
    detail: {
      policy: "delivery_allowed_side_effects_blocked",
      rawContentStored: false,
      sideEffectsBlocked: true,
    },
  };
}

function auditEvent(
  code: CognitiveAuditEvent["code"],
  detail: CognitiveAuditEvent["detail"] = {},
): CognitiveAuditEvent {
  return {
    code,
    at: new Date().toISOString(),
    detail,
  };
}

function evaluateRuntimePersonaInitiative(input: {
  request: CognitiveRequest;
  context: CognitiveContextEnvelope;
  candidate: CandidateResponse;
}) {
  const contract = getPersonaBehaviorContract(input.request.personaId);
  const richness = classifyConversationInputRichness(input.request.userText);
  const initiativeEnabled = Boolean(input.context.promptHashes.personaInitiative)
    || input.context.authorizedContext.some((contextItem) => contextItem.id === "system:persona-initiative");

  if (!initiativeEnabled) {
    return {
      richness,
      snapshot: {
        fronts: [],
        selectedFronts: [],
        hasSubstantiveContext: false,
        selectionReason: ["persona-initiative-control-not-present"],
      },
      evaluation: {
        initiativeScore: 1,
        contextualGroundingScore: 1,
        vocationalFitScore: 1,
        specificityScore: 1,
        privacyScore: 1,
        unsupportedInferencePenalty: 0,
        genericQuestionPenalty: 0,
        genericAssistantPenalty: 0,
        findings: [],
        finalPass: true,
      },
      findings: [],
    };
  }

  const sources: ActiveFrontSource[] = input.context.authorizedContext
    .filter((contextItem) => !contextItem.id.startsWith("system:"))
    .map((contextItem, index) => ({
      id: contextItem.id,
      type: contextItem.type,
      text: contextItem.text,
      provenance: contextItem.provenance,
      visibility: contextItem.visibility,
      scope: contextItem.scope,
      recency: 1 - index / Math.max(input.context.authorizedContext.length, 1),
    }));
  const snapshot = buildActiveFrontSnapshot({
    personaId: input.request.personaId,
    userText: input.request.userText,
    richness,
    contract,
    sources,
    allowPrivateContext: input.request.privateRun,
  });
  const brief = buildPersonaInitiativeBrief({
    personaId: input.request.personaId,
    userText: input.request.userText,
    richness,
    snapshot,
    contract,
  });
  const evaluation = evaluatePersonaInitiativeQuality({
    responseText: input.candidate.visibleText,
    personaId: input.request.personaId,
    userText: input.request.userText,
    richness,
    snapshot,
    contract,
    brief,
    privateRun: input.request.privateRun,
  });

  const findings: CognitiveFinding[] = evaluation.findings.map((finding) => ({
    code: finding.code,
    severity: finding.severity,
    category: "persona-initiative",
    explanation: finding.explanation,
    repairInstruction: finding.repairInstruction,
  }));

  return {
    richness,
    snapshot,
    evaluation,
    findings,
  };
}

async function persistAuditWithPolicy(input: {
  audit: RedactedCognitiveAudit;
  storeAudit: (audit: RedactedCognitiveAudit) => Promise<void>;
  auditEvents: CognitiveAuditEvent[];
}) {
  try {
    await input.storeAudit(input.audit);
    return true;
  } catch (error) {
    const event = auditPersistenceFailureEvent();
    input.auditEvents.push(event);
    input.audit.auditEvents.push(event);
    console.error(
      "[CognitiveRuntime] audit persistence failed:",
      error instanceof CognitiveRuntimeError ? error.code : "store_error",
    );
    return false;
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
  deliveryStatus: DeliveryStatus;
  deliveryPersisted: boolean;
  assistantMessageId?: string;
  sideEffectStatus: SideEffectStatus;
  sideEffectCounts: SideEffectCounts;
  auditPersisted: boolean;
  auditEvents: CognitiveAuditEvent[];
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
    auditEvents: input.auditEvents,
    deliveryStatus: input.deliveryStatus,
    sideEffectStatus: input.sideEffectStatus,
    sideEffectCounts: input.sideEffectCounts,
    assistantMessagePersisted: input.deliveryPersisted,
    auditPersisted: input.auditPersisted,
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
    deliveryPersisted: input.deliveryPersisted,
    deliveryStatus: input.deliveryStatus,
    assistantMessageId: input.assistantMessageId,
    sideEffectStatus: input.sideEffectStatus,
    sideEffectCounts: input.sideEffectCounts,
    auditPersisted: input.auditPersisted,
  } satisfies CognitiveRunResult;
}

async function finalizeSelectedAnswer(input: {
  request: CognitiveRequest;
  config: CognitiveRuntimeConfig;
  executionProfile: CognitiveRunResult["executionProfile"];
  stateMachine: CognitiveStateMachine;
  iterations: CognitiveIteration[];
  answer: string;
  promoted: boolean;
  rejectedCandidateTexts: string[];
  promptHashes: Record<string, string>;
  createdAt: Date;
  promotionDecision: RedactedCognitiveAudit["promotionDecision"];
  auditEvents: CognitiveAuditEvent[];
  auditRequired: boolean;
  storeAudit: (audit: RedactedCognitiveAudit) => Promise<void>;
  persistAssistantMessage: (delivery: PersistDeliveredAssistantMessageInput) => Promise<PersistDeliveredAssistantMessageResult>;
  commitOptionalEffects: (effects: CommitOptionalEffectsInput) => Promise<CommitOptionalEffectsResult>;
  sideEffects?: CommitOptionalEffectsInput["sideEffects"];
  failureReason?: string;
}): Promise<CognitiveRunResult> {
  input.stateMachine.transition("FINAL_ANSWER_SELECTED", input.failureReason || input.promotionDecision);

  let auditPersisted = false;
  let deliveryStatus: DeliveryStatus = input.request.runtimeMode === "shadow" ? "shadow_external" : "not_attempted";
  let deliveryPersisted = false;
  let assistantMessageId: string | undefined;
  let sideEffectStatus: SideEffectStatus = "none";
  let sideEffectCounts: SideEffectCounts = { ...zeroSideEffectCounts };
  let sideEffectsCommitted = false;
  let failureReason = input.failureReason;

  if (input.auditRequired) {
    const preEffectAudit = buildResult({
      request: input.request,
      config: input.config,
      executionProfile: input.executionProfile,
      stateMachine: input.stateMachine,
      iterations: input.iterations,
      answer: input.answer,
      promoted: input.promoted,
      rejectedCandidateTexts: input.rejectedCandidateTexts,
      sideEffectsCommitted: false,
      deliveryStatus,
      deliveryPersisted,
      sideEffectStatus,
      sideEffectCounts,
      auditPersisted: false,
      auditEvents: input.auditEvents,
      promptHashes: input.promptHashes,
      createdAt: input.createdAt,
      promotionDecision: input.promotionDecision,
      failureReason,
    });
    auditPersisted = await persistAuditWithPolicy({
      audit: preEffectAudit.audit,
      storeAudit: input.storeAudit,
      auditEvents: input.auditEvents,
    });
  }

  if (input.request.runtimeMode === "shadow") {
    sideEffectStatus = "skipped";
    input.auditEvents.push(auditEvent("SIDE_EFFECTS_SKIPPED", { reason: "shadow_external_delivery" }));
    input.stateMachine.transition("SIDE_EFFECTS_SKIPPED", "shadow external delivery; runtime side effects skipped");
  } else {
    try {
      const delivery = await input.persistAssistantMessage({
        request: input.request,
        answer: input.answer,
      });
      if (!delivery.persisted) {
        throw new CognitiveRuntimeError(
          "DELIVERY_PERSISTENCE_FAILURE",
          "Assistant message persistence did not confirm delivery.",
          { safeMessage: SAFE_FAILURE },
        );
      }
      deliveryPersisted = delivery.persisted;
      assistantMessageId = delivery.messageId;
      deliveryStatus = "persisted";
      input.auditEvents.push(auditEvent("DELIVERY_PERSISTED", {
        assistantMessagePersisted: true,
      }));
      input.stateMachine.transition("DELIVERY_PERSISTED", "assistant message persisted by cognitive run id");
    } catch {
      deliveryStatus = "failed";
      deliveryPersisted = false;
      failureReason = "delivery_persistence_failure";
      input.auditEvents.push(auditEvent("DELIVERY_PERSISTENCE_FAILED", {
        rawContentStored: false,
      }));
      input.stateMachine.transition("FAILED_SAFE", "DELIVERY_PERSISTENCE_FAILURE");
      const failedResult = buildResult({
        request: input.request,
        config: input.config,
        executionProfile: input.executionProfile,
        stateMachine: input.stateMachine,
        iterations: input.iterations,
        answer: input.answer,
        promoted: false,
        rejectedCandidateTexts: input.rejectedCandidateTexts,
        sideEffectsCommitted: false,
        deliveryStatus,
        deliveryPersisted,
        sideEffectStatus,
        sideEffectCounts,
        auditPersisted: input.auditRequired,
        auditEvents: input.auditEvents,
        promptHashes: input.promptHashes,
        createdAt: input.createdAt,
        promotionDecision: "failed_safe",
        failureReason,
      });
      if (input.auditRequired) {
        const persisted = await persistAuditWithPolicy({
          audit: failedResult.audit,
          storeAudit: input.storeAudit,
          auditEvents: input.auditEvents,
        });
        failedResult.auditPersisted = persisted;
        failedResult.audit.auditPersisted = persisted;
      }
      return failedResult;
    }

    if (!auditPersisted && input.auditRequired) {
      sideEffectStatus = "blocked";
      input.auditEvents.push(auditEvent("SIDE_EFFECTS_BLOCKED", {
        reason: "audit_persistence_failure",
      }));
      input.stateMachine.transition("SIDE_EFFECTS_BLOCKED", "blocked by audit persistence policy");
      failureReason = failureReason || "audit_persistence_failure_side_effects_blocked";
    } else if (!input.sideEffects) {
      sideEffectStatus = "skipped";
      input.auditEvents.push(auditEvent("SIDE_EFFECTS_SKIPPED", { reason: "no_promotion_side_effects" }));
      input.stateMachine.transition("SIDE_EFFECTS_SKIPPED", "no optional side effects for final answer");
    } else {
      let optionalResult: CommitOptionalEffectsResult;
      try {
        optionalResult = await input.commitOptionalEffects({
          request: input.request,
          sideEffects: input.sideEffects,
        });
      } catch {
        optionalResult = {
          status: "failed_rolled_back",
          committed: false,
          counts: { ...zeroSideEffectCounts },
          errorCode: "OPTIONAL_EFFECT_TRANSACTION_ROLLED_BACK",
        };
      }
      sideEffectStatus = optionalResult.status;
      sideEffectCounts = optionalResult.counts;
      sideEffectsCommitted = optionalResult.status === "committed";

      if (optionalResult.status === "committed") {
        input.auditEvents.push(auditEvent("SIDE_EFFECTS_COMMITTED", {
          memoryEffectCount: sideEffectCounts.memory,
          registryEffectCount: sideEffectCounts.registry,
          destinyEffectCount: sideEffectCounts.destiny,
        }));
        input.stateMachine.transition("SIDE_EFFECTS_COMMITTED", "optional effects committed transactionally");
      } else if (optionalResult.status === "skipped") {
        input.auditEvents.push(auditEvent("SIDE_EFFECTS_SKIPPED", { reason: "no_authorized_optional_effects" }));
        input.stateMachine.transition("SIDE_EFFECTS_SKIPPED", "no authorized optional side effects");
      } else if (optionalResult.status === "failed_rolled_back") {
        input.auditEvents.push(auditEvent("SIDE_EFFECTS_ROLLED_BACK", {
          reason: optionalResult.errorCode || "optional_effect_failure",
        }));
        input.stateMachine.transition("SIDE_EFFECTS_FAILED", "optional effects failed and rolled back");
        failureReason = failureReason || "optional_effects_failed_rolled_back";
      } else {
        sideEffectStatus = "blocked";
        input.auditEvents.push(auditEvent("SIDE_EFFECTS_BLOCKED", { reason: "optional_effects_blocked" }));
        input.stateMachine.transition("SIDE_EFFECTS_BLOCKED", "optional effects blocked");
      }
    }
  }

  input.stateMachine.transition("DELIVERED", deliveryStatus === "shadow_external" ? "shadow result observed" : "persisted answer ready for stream");

  const finalResult = buildResult({
    request: input.request,
    config: input.config,
    executionProfile: input.executionProfile,
    stateMachine: input.stateMachine,
    iterations: input.iterations,
    answer: input.answer,
    promoted: input.promoted,
    rejectedCandidateTexts: input.rejectedCandidateTexts,
    sideEffectsCommitted,
    deliveryStatus,
    deliveryPersisted,
    assistantMessageId,
    sideEffectStatus,
    sideEffectCounts,
    auditPersisted: input.auditRequired,
    auditEvents: input.auditEvents,
    promptHashes: input.promptHashes,
    createdAt: input.createdAt,
    promotionDecision: input.promotionDecision,
    failureReason,
  });

  if (input.auditRequired) {
    const persisted = await persistAuditWithPolicy({
      audit: finalResult.audit,
      storeAudit: input.storeAudit,
      auditEvents: input.auditEvents,
    });
    finalResult.auditPersisted = persisted;
    finalResult.audit.auditPersisted = persisted;
  }

  return finalResult;
}

export async function runCognitiveRuntime(
  request: CognitiveRequest,
  dependencies: RuntimeDependencies = {},
): Promise<CognitiveRunResult> {
  const config = dependencies.config || readCognitiveRuntimeConfig();
  const createdAt = new Date();
  const stateMachine = new CognitiveStateMachine();
  const provider = dependencies.modelProvider || createAiSdkCognitiveModelProvider();
  const persistAssistantMessage = dependencies.persistAssistantMessage || persistDeliveredAssistantMessage;
  const commitOptionalEffects = dependencies.commitOptionalEffects || commitAuthorizedOptionalEffects;
  const storeAudit = dependencies.storeAudit || storeCognitiveAudit;
  const iterations: CognitiveIteration[] = [];
  const rejectedCandidateTexts: string[] = [];
  const auditEvents: CognitiveAuditEvent[] = [];
  let promptHashes: Record<string, string> = {};
  let executionProfile = request.requestedProfile || config.defaultProfile;
  let auditRequired = config.auditEnabled;

  try {
    stateMachine.transition("AUTHORIZED");

    const contextResult = dependencies.contextEnvelope
      ? { envelope: dependencies.contextEnvelope, blockedContextIds: dependencies.blockedContextIds || [] }
      : await assembleCognitiveContextEnvelope(request);

    promptHashes = contextResult.envelope.promptHashes;
    stateMachine.transition("CONTEXT_ASSEMBLED");
    const authorizedContextItems = contextResult.envelope.authorizedContext
      .filter((contextItem) => !contextItem.id.startsWith("system:"));
    const sourcePersonas = Array.from(new Set(
      authorizedContextItems
        .map((contextItem) => contextItem.scope)
        .filter((scope): scope is string => Boolean(scope)),
    ));
    auditEvents.push(auditEvent("CONTINUITY_CONTEXT_ASSEMBLED", {
      activeTopicsCount: authorizedContextItems.filter((item) => item.type === "active_topic").length,
      recentEpisodesCount: authorizedContextItems.filter((item) => item.type === "episode").length,
      memoriesCount: authorizedContextItems.filter((item) => item.type === "memory").length,
      selectedContextCount: authorizedContextItems.length,
      topContextTypes: authorizedContextItems.slice(0, 6).map((item) => item.type).join(","),
      sourcePersonas: sourcePersonas.slice(0, 6).join(","),
      crossPersonaContinuityUsed: sourcePersonas.some((scope) => scope !== request.personaId && scope !== request.memoryScope),
      privateItemsExcluded: contextResult.blockedContextIds.length,
      runtimeMode: request.runtimeMode,
    }));

    const requestRisk = classifyRequestRisk(request.userText);
    executionProfile = selectExecutionProfile(request, config.defaultProfile);
    auditRequired = config.auditEnabled || executionProfile === "full";
    auditEvents.push(buildProfileAuditEvent({
      requested: request.requestedProfile,
      selected: executionProfile,
      fallback: config.defaultProfile,
      highStakes: requestRisk.highStakes,
    }));
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

      const structuredValidators = executionProfile !== "light";
      const extraction = await extractClaimsAndActions({
        request,
        context: contextResult.envelope,
        candidate,
        provider,
        structured: structuredValidators,
      });
      iteration.extraction = extraction;
      stateMachine.transition("CLAIMS_EXTRACTED", `iteration:${index}`);

      const deterministicScientist = deterministicScientistEvaluation({ candidate, extraction });
      let structuredScientist;
      if (structuredValidators) {
        try {
          structuredScientist = scientistEvaluationSchema.parse(await provider.evaluateScientist({
            request,
            context: contextResult.envelope,
            candidate,
            extraction,
          }));
        } catch (error) {
          throw new CognitiveRuntimeError(
            "MALFORMED_STRUCTURED_OUTPUT",
            `Scientist structured evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
            {
              retryable: true,
              safeMessage: "A avaliacao estruturada do Scientist falhou.",
            },
          );
        }
      }
      const scientist = mergeScientistEvaluations(deterministicScientist, structuredScientist);
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
      const initiative = evaluateRuntimePersonaInitiative({
        request,
        context: contextResult.envelope,
        candidate,
      });
      if (initiative.findings.length > 0) {
        vocation.findings.push(...initiative.findings);
      }
      if (!initiative.evaluation.finalPass) {
        vocation.hardPass = false;
        vocation.decision = vocation.decision === "refusal_required" ? vocation.decision : "warning";
      }
      iteration.vocation = vocation;
      auditEvents.push(auditEvent("PERSONA_INITIATIVE_EVALUATED", {
        inputRichness: initiative.richness.richness,
        inputOpeningType: initiative.richness.openingType,
        activeFrontCandidates: initiative.snapshot.fronts.length,
        selectedActiveFronts: initiative.snapshot.selectedFronts.length,
        vocationalFamily: contextResult.envelope.functionalContract.family,
        contractId: contextResult.envelope.functionalContract.id,
        initiativeScore: Number(initiative.evaluation.initiativeScore.toFixed(3)),
        contextualGroundingScore: Number(initiative.evaluation.contextualGroundingScore.toFixed(3)),
        vocationalFitScore: Number(initiative.evaluation.vocationalFitScore.toFixed(3)),
        specificityScore: Number(initiative.evaluation.specificityScore.toFixed(3)),
        privacyScore: Number(initiative.evaluation.privacyScore.toFixed(3)),
        findingCount: initiative.findings.length,
        findingCodes: initiative.findings.map((finding) => finding.code).join(","),
        falseContextDenialDetected: initiative.findings.some((finding) => finding.code === "FALSE_CONTEXT_DENIAL"),
        genericAssistantLeakDetected: initiative.findings.some((finding) => finding.code === "GENERIC_ASSISTANT_MODE" || finding.code === "GENERIC_INTERVIEW_MODE"),
        finalPass: initiative.evaluation.finalPass,
      }));

      const vigia = calculateVigiaCoherence({
        scientist,
        privacy,
        vocation,
        config,
        profile: executionProfile,
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
          const initiativeRepairCount = repairFindings.filter((finding) => finding.category === "persona-initiative").length;
          if (initiativeRepairCount > 0) {
            auditEvents.push(auditEvent("PERSONA_INITIATIVE_REPAIR_REQUESTED", {
              iteration: index,
              findingCount: initiativeRepairCount,
              regenerated: true,
            }));
          }
          stateMachine.transition("OCV_RETRY_REQUESTED", `iteration:${index}`);
          continue;
        }

        stateMachine.transition("REJECTED", "coherence exhausted");
        return finalizeSelectedAnswer({
          request,
          config,
          executionProfile,
          stateMachine,
          iterations,
          answer: SAFE_REJECTION,
          promoted: false,
          rejectedCandidateTexts,
          auditEvents,
          auditRequired,
          storeAudit,
          persistAssistantMessage,
          commitOptionalEffects,
          promptHashes,
          createdAt,
          promotionDecision: request.runtimeMode === "shadow" ? "shadow_only" : "rejected",
          failureReason: "coherence_exhaustion",
        });
      }

      stateMachine.transition("OCV_CONVERGED", `iteration:${index}`);

      const deterministicPhilosopher = deterministicPhilosopherEvaluation({ candidate });
      let structuredPhilosopher;
      if (config.doubleVigilance && structuredValidators) {
        try {
          structuredPhilosopher = philosopherEvaluationSchema.parse(await provider.evaluatePhilosopher({
            request,
            context: contextResult.envelope,
            candidate,
            extraction,
            scientist,
            vigia,
          }));
        } catch (error) {
          throw new CognitiveRuntimeError(
            "MALFORMED_STRUCTURED_OUTPUT",
            `Philosopher structured evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
            {
              retryable: true,
              safeMessage: "A avaliacao estruturada do Philosopher falhou.",
            },
          );
        }
      }
      const philosopher = mergePhilosopherEvaluations(deterministicPhilosopher, structuredPhilosopher);
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
        executionProfile,
      });
      iteration.promotion = promotion;
      stateMachine.transition("PROMOTION_EVALUATED", `iteration:${index}`);

      if (!promotion.promoted) {
        rejectedCandidateTexts.push(candidate.visibleText);
        iteration.completedAt = new Date().toISOString();
        iterations.push(iteration);

        if (promotion.retriable) {
          repairFindings = collectRepairFindings(iteration);
          const initiativeRepairCount = repairFindings.filter((finding) => finding.category === "persona-initiative").length;
          if (initiativeRepairCount > 0) {
            auditEvents.push(auditEvent("PERSONA_INITIATIVE_REPAIR_REQUESTED", {
              iteration: index,
              findingCount: initiativeRepairCount,
              regenerated: true,
            }));
          }
          stateMachine.transition("OCV_RETRY_REQUESTED", `iteration:${index}`);
          continue;
        }

        stateMachine.transition("REJECTED", "promotion rejected");
        return finalizeSelectedAnswer({
          request,
          config,
          executionProfile,
          stateMachine,
          iterations,
          answer: SAFE_REJECTION,
          promoted: false,
          rejectedCandidateTexts,
          auditEvents,
          auditRequired,
          storeAudit,
          persistAssistantMessage,
          commitOptionalEffects,
          promptHashes,
          createdAt,
          promotionDecision: request.runtimeMode === "shadow" ? "shadow_only" : "rejected",
          failureReason: promotion.reasons.join(",") || "promotion_rejected",
        });
      }

      stateMachine.transition("PROMOTED", `iteration:${index}`);
      iteration.completedAt = new Date().toISOString();
      iterations.push(iteration);

      return finalizeSelectedAnswer({
        request,
        config,
        executionProfile,
        stateMachine,
        iterations,
        answer: candidate.visibleText,
        promoted: true,
        rejectedCandidateTexts,
        auditEvents,
        auditRequired,
        storeAudit,
        persistAssistantMessage,
        commitOptionalEffects,
        sideEffects: sideEffectAuthorization,
        promptHashes,
        createdAt,
        promotionDecision: request.runtimeMode === "shadow" ? "shadow_only" : "promoted",
      });
    }

    throw new CognitiveRuntimeError(
      "COHERENCE_EXHAUSTION",
      "Cognitive runtime exhausted all candidate attempts.",
      { safeMessage: SAFE_REJECTION },
    );
  } catch (error) {
    if (stateMachine.current !== "DELIVERED") {
      try {
        const safeTransitionNote = error instanceof CognitiveRuntimeError
          ? error.code
          : request.privateRun
            ? "runtime_failure"
            : error instanceof Error
              ? error.message
              : "runtime failure";
        stateMachine.transition("FAILED_SAFE", safeTransitionNote);
      } catch {
        // Keep the original transition trace if the failure itself came from an illegal edge.
      }
    }

    const failureReason = error instanceof CognitiveRuntimeError
      ? error.code
      : error instanceof Error
        ? request.privateRun ? "runtime_failure" : error.message
        : request.privateRun ? "runtime_failure" : String(error);

    if (stateMachine.current !== "FAILED_SAFE") {
      return buildResult({
        request,
        config,
        executionProfile,
        stateMachine,
        iterations,
        answer: error instanceof CognitiveRuntimeError ? error.safeMessage : SAFE_FAILURE,
        promoted: false,
        rejectedCandidateTexts,
        sideEffectsCommitted: false,
        deliveryStatus: "failed",
        deliveryPersisted: false,
        sideEffectStatus: "none",
        sideEffectCounts: { ...zeroSideEffectCounts },
        auditPersisted: false,
        auditEvents,
        promptHashes,
        createdAt,
        promotionDecision: "failed_safe",
        failureReason,
      });
    }

    return finalizeSelectedAnswer({
      request,
      config,
      executionProfile,
      stateMachine,
      iterations,
      answer: error instanceof CognitiveRuntimeError ? error.safeMessage : SAFE_FAILURE,
      promoted: false,
      rejectedCandidateTexts,
      auditEvents,
      auditRequired,
      storeAudit,
      persistAssistantMessage,
      commitOptionalEffects,
      promptHashes,
      createdAt,
      promotionDecision: request.runtimeMode === "shadow" ? "shadow_only" : "failed_safe",
      failureReason,
    });
  }
}
