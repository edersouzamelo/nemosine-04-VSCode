require("./load-ts.cjs");

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { CognitiveStateMachine } = require("../../app/lib/nemosine/cognitive-runtime/state-machine.ts");
const { readCognitiveRuntimeConfig, shouldUseCognitiveRuntime } = require("../../app/lib/nemosine/cognitive-runtime/config.ts");
const { calculateVigiaCoherence } = require("../../app/lib/nemosine/cognitive-runtime/vigia-coherence.ts");
const { evaluatePromotion } = require("../../app/lib/nemosine/cognitive-runtime/promotion-gate.ts");
const { authorizeContextItems, evaluatePrivacy } = require("../../app/lib/nemosine/cognitive-runtime/privacy-policy.ts");
const { extractionResultSchema, scientistEvaluationSchema } = require("../../app/lib/nemosine/cognitive-runtime/types.ts");
const { buildRedactedAudit } = require("../../app/lib/nemosine/cognitive-runtime/audit-redaction.ts");
const { evaluateVocationalPolicy } = require("../../app/lib/nemosine/cognitive-runtime/vocational-policy.ts");
const { authorizeProposedSideEffects } = require("../../app/lib/nemosine/cognitive-runtime/side-effect-committer.ts");
const { selectExecutionProfile } = require("../../app/lib/nemosine/cognitive-runtime/module-registry.ts");
const {
  deterministicScientistEvaluation,
  mergeScientistEvaluations,
} = require("../../app/lib/nemosine/cognitive-runtime/scientist-validator.ts");
const {
  deterministicPhilosopherEvaluation,
  mergePhilosopherEvaluations,
} = require("../../app/lib/nemosine/cognitive-runtime/philosopher-validator.ts");
const { serializeQuotedEvidence } = require("../../app/lib/nemosine/cognitive-runtime/persona-generator.ts");

function request(overrides = {}) {
  return {
    runId: "run-unit",
    userId: "user-1",
    threadId: "thread-1",
    personaId: "Engenheiro",
    placeId: null,
    language: "pt-BR",
    userText: "Corrija este bug de build.",
    displayUserText: "Corrija este bug de build.",
    memoryScope: "Engenheiro",
    runtimeMode: "enforce",
    privateRun: false,
    startedAt: new Date("2026-06-22T00:00:00.000Z"),
    priorHistory: [],
    ...overrides,
  };
}

function scientist(overrides = {}) {
  return {
    logicalConsistency: 0.9,
    factualSupport: 0.9,
    contradictionRisk: 0.05,
    honestUncertainty: 0.9,
    biographicalSafety: 1,
    accessClaimSafety: 1,
    internalConsistency: 0.9,
    responseRelevance: 0.9,
    externalVerificationAvailable: false,
    evidenceSummary: "mock evidence",
    approved: true,
    findings: [],
    modelId: "mock-scientist",
    ...overrides,
  };
}

function scientistWithEqualScore(score) {
  return scientist({
    logicalConsistency: score,
    factualSupport: score,
    contradictionRisk: 1 - score,
    honestUncertainty: score,
    biographicalSafety: score,
    accessClaimSafety: score,
    internalConsistency: score,
    responseRelevance: score,
  });
}

function philosopher(overrides = {}) {
  return {
    constitutionalConformity: 0.9,
    userSovereignty: 0.9,
    nonIdolatry: 0.9,
    ethicalLegitimacy: 0.9,
    epistemologicalHumility: 0.9,
    vocationIntegrity: 0.9,
    manipulationDependencyRisk: 0.9,
    approved: true,
    findings: [],
    modelId: "mock-philosopher",
    ...overrides,
  };
}

function privacy(overrides = {}) {
  return { hardPass: true, privateRun: false, metadataOnlyAudit: false, blockedContextIds: [], findings: [], ...overrides };
}

function vocation(overrides = {}) {
  return {
    decision: "allowed",
    personaId: "Engenheiro",
    classifiedTaskFamilies: ["technical"],
    handoffTargets: [],
    hardPass: true,
    findings: [],
    ...overrides,
  };
}

function vigia(overrides = {}) {
  return {
    totalCoherence: 0.91,
    dimensions: [],
    weights: {},
    hardFailures: [],
    threshold: 0.8,
    passed: true,
    recommendedNextTransition: "OCV_CONVERGED",
    formula: "test",
    profile: "standard",
    ...overrides,
  };
}

test("state machine accepts legal transitions and records illegal ones", () => {
  const machine = new CognitiveStateMachine();
  machine.transition("AUTHORIZED");
  machine.transition("CONTEXT_ASSEMBLED");
  assert.equal(machine.current, "CONTEXT_ASSEMBLED");
  assert.throws(() => machine.transition("PROMOTED"), /Illegal cognitive runtime transition/);
  assert.equal(machine.transitions.at(-1).allowed, false);
});

test("config parses threshold, retries, audit and default off mode", () => {
  assert.equal(readCognitiveRuntimeConfig({}).mode, "off");
  assert.equal(shouldUseCognitiveRuntime(readCognitiveRuntimeConfig({})), false);
  assert.equal(shouldUseCognitiveRuntime(readCognitiveRuntimeConfig({ NEMOSINE_COGNITIVE_RUNTIME_MODE: "shadow" })), true);
  const config = readCognitiveRuntimeConfig({
    NEMOSINE_COGNITIVE_RUNTIME_MODE: "enforce",
    NEMOSINE_COHERENCE_THRESHOLD: "0.65",
    NEMOSINE_COGNITIVE_MAX_RETRIES: "1",
    NEMOSINE_COGNITIVE_AUDIT: "false",
  });
  assert.equal(config.mode, "enforce");
  assert.equal(config.coherenceThreshold, 0.65);
  assert.equal(config.maxRetries, 1);
  assert.equal(config.maxTotalCandidates, 2);
  assert.equal(config.auditEnabled, false);
});

test("Vigia normalized coherence covers edge cases and theta boundary", () => {
  const base = readCognitiveRuntimeConfig({ NEMOSINE_COHERENCE_THRESHOLD: "0.8" });
  const oneWeight = { ...base, coherenceWeights: { factualSupport: 1 } };
  const arbitraryWeights = { ...base, coherenceWeights: { factualSupport: 2, honestUncertainty: 3, responseRelevance: 5 } };

  assert.equal(calculateVigiaCoherence({ scientist: scientistWithEqualScore(1), privacy: privacy(), vocation: vocation(), config: base }).totalCoherence, 1);
  assert.equal(calculateVigiaCoherence({ scientist: scientistWithEqualScore(0), privacy: privacy(), vocation: vocation(), config: base }).totalCoherence, 0);
  assert.equal(calculateVigiaCoherence({ scientist: scientistWithEqualScore(0.37), privacy: privacy(), vocation: vocation(), config: arbitraryWeights }).totalCoherence, 0.37);
  assert.equal(calculateVigiaCoherence({ scientist: scientist({ factualSupport: 0.8 }), privacy: privacy(), vocation: vocation(), config: oneWeight }).passed, true);
  assert.equal(calculateVigiaCoherence({ scientist: scientist({ factualSupport: 0.7999 }), privacy: privacy(), vocation: vocation(), config: oneWeight }).passed, false);
  assert.equal(calculateVigiaCoherence({ scientist: scientist({ factualSupport: 0.8001 }), privacy: privacy(), vocation: vocation(), config: oneWeight }).passed, true);

  const hard = calculateVigiaCoherence({
    scientist: scientistWithEqualScore(1),
    privacy: privacy({ hardPass: false, blockedContextIds: ["confessor"] }),
    vocation: vocation(),
    config: base,
  });
  assert.equal(hard.passed, false);
  assert.ok(hard.hardFailures.includes("privacy"));
});

test("promotion gate blocks Scientist approved=false, errors and profile floors", () => {
  const common = {
    vigia: vigia(),
    philosopher: philosopher(),
    privacy: privacy(),
    vocation: vocation(),
    sideEffects: { approved: true, approvedMemoryActions: [], approvedRegistryActions: [], approvedDestinyActions: [], discardedActions: [], findings: [] },
    retriesRemaining: 0,
  };

  assert.equal(evaluatePromotion({ ...common, scientist: scientist() }).promoted, true);

  const approvedFalse = evaluatePromotion({ ...common, scientist: scientist({ approved: false }) });
  assert.equal(approvedFalse.promoted, false);
  assert.ok(approvedFalse.reasons.includes("scientist_not_approved"));

  const errorFinding = evaluatePromotion({
    ...common,
    scientist: scientist({ findings: [{ code: "SCIENTIST_ERROR", severity: "error", category: "scientist", explanation: "bad" }] }),
  });
  assert.equal(errorFinding.promoted, false);
  assert.ok(errorFinding.reasons.includes("scientist_error_or_critical_finding"));

  const lowFloor = evaluatePromotion({ ...common, scientist: scientist({ factualSupport: 0.59 }), executionProfile: "standard" });
  assert.equal(lowFloor.promoted, false);
  assert.ok(lowFloor.reasons.includes("scientist_floor_factualSupport"));

  const passesStandard = evaluatePromotion({ ...common, scientist: scientist({ factualSupport: 0.79 }), executionProfile: "standard" });
  const failsFull = evaluatePromotion({ ...common, scientist: scientist({ factualSupport: 0.79 }), executionProfile: "full" });
  assert.equal(passesStandard.promoted, true);
  assert.equal(failsFull.promoted, false);
  assert.ok(failsFull.reasons.includes("scientist_floor_factualSupport"));
});

test("schemas reject malformed structured output and enforce renamed Scientist fields", () => {
  assert.throws(() => scientistEvaluationSchema.parse({ logicalConsistency: 2 }), /Number must be less than or equal to 1/);
  assert.throws(() => scientistEvaluationSchema.parse({
    logicalConsistency: 0.9,
    factualSupport: 0.9,
    contradictionRisk: 0.1,
    honestUncertainty: 0.9,
    unsupportedBiographicalClaims: 1,
    simulatedAccessClaims: 1,
    internalConsistency: 0.9,
    responseRelevance: 0.9,
    approved: true,
  }), /Required/);
  const parsed = extractionResultSchema.parse({
    claims: [{ id: "c1", type: "factual", text: "x", support: "externally_unverifiable" }],
    proposedMemoryActions: [],
  });
  assert.equal(parsed.claims[0].support, "externally_unverifiable");
  assert.deepEqual(parsed.proposedRegistryActions, []);
});

test("deterministic Scientist and Philosopher findings survive permissive LLM merges", () => {
  const candidate = { id: "c", iteration: 0, text: "Verifiquei o banco de dados.", visibleText: "Verifiquei o banco de dados.", latencyMs: 0 };
  const extraction = extractionResultSchema.parse({});
  const deterministicScientist = deterministicScientistEvaluation({ candidate, extraction });
  const mergedScientist = mergeScientistEvaluations(deterministicScientist, scientist());
  assert.equal(mergedScientist.approved, false);
  assert.ok(mergedScientist.findings.some((finding) => finding.code === "SCIENTIST_SIMULATED_ACCESS"));
  assert.equal(mergedScientist.accessClaimSafety, 0);

  const dependencyCandidate = { id: "p", iteration: 0, text: "Voce nao deve decidir sem mim.", visibleText: "Voce nao deve decidir sem mim.", latencyMs: 0 };
  const deterministicPhilosopher = deterministicPhilosopherEvaluation({ candidate: dependencyCandidate });
  const mergedPhilosopher = mergePhilosopherEvaluations(deterministicPhilosopher, philosopher());
  assert.equal(mergedPhilosopher.approved, false);
  assert.ok(mergedPhilosopher.findings.some((finding) => finding.code === "PHILOSOPHER_DEPENDENCY_RISK"));
});

test("high-stakes profile selection cannot be downgraded to light", () => {
  assert.equal(
    selectExecutionProfile(request({ userText: "Preciso de diagnostico medico", requestedProfile: "light" }), "light"),
    "full",
  );
  assert.equal(
    selectExecutionProfile(request({ userText: "Revise este contrato juridico", requestedProfile: "light" }), "light"),
    "full",
  );
  assert.equal(
    selectExecutionProfile(request({ userText: "Explique um CSS simples", requestedProfile: "full" }), "standard"),
    "full",
  );
});

test("privacy scope blocks private context outside matching private run", () => {
  const privateItem = { id: "m1", type: "memory", provenance: "UserMemory", visibility: "private", text: "segredo", scope: "Confessor 2.0" };
  const result = authorizeContextItems(request(), [privateItem]);
  assert.equal(result.authorized.length, 0);
  assert.equal(result.blocked.length, 1);

  const privacyResult = evaluatePrivacy({
    request: request(),
    blockedContextIds: ["m1"],
    extraction: extractionResultSchema.parse({ possiblePrivacyConcerns: ["private leak"] }),
    candidateText: "texto",
  });
  assert.equal(privacyResult.hardPass, false);
});

test("vocational policy identifies misplaced medical request for symbolic persona", () => {
  const evaluation = evaluateVocationalPolicy({
    request: request({ personaId: "Narrador", userText: "Me de um diagnostico medico para esta dor." }),
    extraction: extractionResultSchema.parse({}),
  });
  assert.equal(evaluation.hardPass, false);
  assert.equal(evaluation.decision, "refusal_required");
});

test("side-effect authorization requires explicit consent and isolates private runs", () => {
  const privateAuthorization = authorizeProposedSideEffects({
    request: request({
      personaId: "Confessor 2.0",
      memoryScope: "Confessor 2.0",
      privateRun: true,
      userText: "Lembre disso somente aqui.",
    }),
    extraction: extractionResultSchema.parse({
      proposedMemoryActions: [{ id: "m", kind: "memory", source: "structured-extractor", scope: "Confessor 2.0", content: "tema privado" }],
      proposedRegistryActions: [{ id: "r", kind: "registry", source: "structured-extractor", idea: "registro global" }],
      proposedDestinyActions: [{ id: "d", kind: "destiny", source: "structured-extractor", title: "Marco", category: "marco", shortDescription: "privado" }],
    }),
  });

  assert.equal(privateAuthorization.approved, true);
  assert.equal(privateAuthorization.approvedMemoryActions.length, 1);
  assert.equal(privateAuthorization.approvedMemoryActions[0].authorizationProvenance, "explicit-current-message");
  assert.equal(privateAuthorization.approvedRegistryActions.length, 0);
  assert.equal(privateAuthorization.approvedDestinyActions.length, 0);
  assert.equal(privateAuthorization.discardedActions.length, 2);
  assert.ok(privateAuthorization.discardedActions.every((action) => action.authorizationProvenance === "discarded-private-scope"));
});

test("redacted audit stores hashes, lengths, audit events and no raw content", () => {
  const audit = buildRedactedAudit({
    request: request({ userText: "conteudo privado", displayUserText: "conteudo privado", privateRun: true }),
    executionProfile: "standard",
    transitions: [{ from: "RECEIVED", to: "AUTHORIZED", at: "now", allowed: true }],
    iterations: [],
    auditEvents: [{ code: "PROFILE_SELECTED", at: "now", detail: { selectedProfile: "standard" } }],
    promptHashes: { prompt: "abc" },
    finalStatus: "DELIVERED",
    promotionDecision: "failed_safe",
    createdAt: new Date("2026-06-22T00:00:00.000Z"),
    completedAt: new Date("2026-06-22T00:00:01.000Z"),
  });
  assert.equal(audit.metadataOnly, true);
  assert.notEqual(audit.contentHashes.userText, "conteudo privado");
  assert.equal(audit.contentHashes.userText.length, 64);
  assert.equal(audit.contentLengths.userText, "conteudo privado".length);
  assert.deepEqual(audit.auditEvents.map((event) => event.code), ["PROFILE_SELECTED"]);
});

test("quoted evidence packet contains actual evidence as untrusted data", () => {
  const packet = JSON.parse(serializeQuotedEvidence({
    userText: "O usuario disse X",
    context: [{ id: "ctx1", type: "memory", provenance: "UserMemory", visibility: "internal", scope: "Engenheiro", text: "Contexto autorizado Y" }],
    candidateText: "Candidato afirma Z",
  }));
  assert.equal(packet.currentUserMessage.text, "O usuario disse X");
  assert.equal(packet.authorizedContext[0].text, "Contexto autorizado Y");
  assert.equal(packet.candidate.text, "Candidato afirma Z");
  assert.match(packet.instruction, /quoted analytical data/i);
});

test("clean branch has no Persona Manuscripts dependency or files", () => {
  const sideEffectSource = fs.readFileSync("app/lib/nemosine/cognitive-runtime/side-effect-committer.ts", "utf8");
  assert.equal(sideEffectSource.includes("logPersonaManuscriptEvent"), false);
  assert.equal(sideEffectSource.includes("personaManuscript"), false);
  for (const forbiddenPath of [
    "app/lib/personaManuscripts.ts",
    "app/soberano/manuscritos",
    "app/sovereign/manuscritos",
    "test_persona_manuscripts.js",
  ]) {
    assert.equal(fs.existsSync(path.join(process.cwd(), forbiddenPath)), false, forbiddenPath);
  }
});
