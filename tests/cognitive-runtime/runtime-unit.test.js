require("./load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const { CognitiveStateMachine } = require("../../app/lib/nemosine/cognitive-runtime/state-machine.ts");
const { readCognitiveRuntimeConfig } = require("../../app/lib/nemosine/cognitive-runtime/config.ts");
const { calculateVigiaCoherence } = require("../../app/lib/nemosine/cognitive-runtime/vigia-coherence.ts");
const { evaluatePromotion } = require("../../app/lib/nemosine/cognitive-runtime/promotion-gate.ts");
const { authorizeContextItems, evaluatePrivacy } = require("../../app/lib/nemosine/cognitive-runtime/privacy-policy.ts");
const { extractionResultSchema, scientistEvaluationSchema } = require("../../app/lib/nemosine/cognitive-runtime/types.ts");
const { buildRedactedAudit } = require("../../app/lib/nemosine/cognitive-runtime/audit-redaction.ts");
const { evaluateVocationalPolicy } = require("../../app/lib/nemosine/cognitive-runtime/vocational-policy.ts");
const { authorizeProposedSideEffects } = require("../../app/lib/nemosine/cognitive-runtime/side-effect-committer.ts");

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
    unsupportedBiographicalClaims: 1,
    simulatedAccessClaims: 1,
    internalConsistency: 0.9,
    responseRelevance: 0.9,
    approved: true,
    findings: [],
    modelId: "mock-scientist",
    ...overrides,
  };
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

test("Vigia computes deterministic coherence and hard failures override averages", () => {
  const config = readCognitiveRuntimeConfig({ NEMOSINE_COHERENCE_THRESHOLD: "0.8" });
  const pass = calculateVigiaCoherence({
    scientist: scientist(),
    privacy: { hardPass: true, privateRun: false, metadataOnlyAudit: false, blockedContextIds: [], findings: [] },
    vocation: { decision: "allowed", personaId: "Engenheiro", classifiedTaskFamilies: ["technical"], handoffTargets: [], hardPass: true, findings: [] },
    config,
  });
  assert.equal(pass.passed, true);
  assert.ok(pass.totalCoherence >= 0.8);

  const hard = calculateVigiaCoherence({
    scientist: scientist(),
    privacy: { hardPass: false, privateRun: false, metadataOnlyAudit: false, blockedContextIds: ["confessor"], findings: [] },
    vocation: { decision: "allowed", personaId: "Engenheiro", classifiedTaskFamilies: ["technical"], handoffTargets: [], hardPass: true, findings: [] },
    config,
  });
  assert.equal(hard.passed, false);
  assert.ok(hard.hardFailures.includes("privacy"));
});

test("promotion gate requires coherence, Scientist, Philosopher, privacy, vocation and side effects", () => {
  const vigia = {
    totalCoherence: 0.91,
    dimensions: [],
    weights: {},
    hardFailures: [],
    threshold: 0.8,
    passed: true,
    recommendedNextTransition: "OCV_CONVERGED",
    formula: "test",
  };
  const decision = evaluatePromotion({
    vigia,
    scientist: scientist(),
    philosopher: philosopher(),
    privacy: { hardPass: true, privateRun: false, metadataOnlyAudit: false, blockedContextIds: [], findings: [] },
    vocation: { decision: "allowed", personaId: "Engenheiro", classifiedTaskFamilies: ["technical"], handoffTargets: [], hardPass: true, findings: [] },
    sideEffects: { approved: true, approvedMemoryActions: [], approvedRegistryActions: [], approvedDestinyActions: [], discardedActions: [], findings: [] },
    retriesRemaining: 0,
  });
  assert.equal(decision.promoted, true);

  const rejected = evaluatePromotion({
    vigia,
    scientist: scientist({ findings: [{ code: "SCIENTIST_CRITICAL", severity: "critical", category: "scientist", explanation: "bad" }] }),
    philosopher: philosopher(),
    privacy: { hardPass: true, privateRun: false, metadataOnlyAudit: false, blockedContextIds: [], findings: [] },
    vocation: { decision: "allowed", personaId: "Engenheiro", classifiedTaskFamilies: ["technical"], handoffTargets: [], hardPass: true, findings: [] },
    sideEffects: { approved: true, approvedMemoryActions: [], approvedRegistryActions: [], approvedDestinyActions: [], discardedActions: [], findings: [] },
    retriesRemaining: 0,
  });
  assert.equal(rejected.promoted, false);
  assert.ok(rejected.reasons.includes("critical_scientist_finding"));
});

test("schemas reject malformed structured output", () => {
  assert.throws(() => scientistEvaluationSchema.parse({ logicalConsistency: 2 }), /Number must be less than or equal to 1/);
  const parsed = extractionResultSchema.parse({ claims: [], proposedMemoryActions: [] });
  assert.deepEqual(parsed.proposedRegistryActions, []);
});

test("privacy scope blocks private context outside matching private run", () => {
  const privateItem = { id: "m1", type: "memory", provenance: "UserMemory", visibility: "private", text: "segredo", scope: "Confessor 2.0" };
  const result = authorizeContextItems(request(), [privateItem]);
  assert.equal(result.authorized.length, 0);
  assert.equal(result.blocked.length, 1);

  const privacy = evaluatePrivacy({
    request: request(),
    blockedContextIds: ["m1"],
    extraction: extractionResultSchema.parse({ possiblePrivacyConcerns: ["private leak"] }),
    candidateText: "texto",
  });
  assert.equal(privacy.hardPass, false);
});

test("vocational policy identifies misplaced medical request for symbolic persona", () => {
  const evaluation = evaluateVocationalPolicy({
    request: request({ personaId: "Narrador", userText: "Me de um diagnostico medico para esta dor." }),
    extraction: extractionResultSchema.parse({}),
  });
  assert.equal(evaluation.hardPass, false);
  assert.equal(evaluation.decision, "refusal_required");
});

test("side-effect authorization discards unauthorized Destiny actions", () => {
  const authorization = authorizeProposedSideEffects({
    request: request({ userText: "Isso foi importante, mas nao registre nada." }),
    extraction: extractionResultSchema.parse({
      proposedDestinyActions: [{
        id: "d1",
        kind: "destiny",
        source: "legacy-tag",
        authorized: false,
        title: "Marco",
        eventDate: null,
        eventDateLabel: "sem data",
        category: "marco",
        shortDescription: "Descricao",
      }],
    }),
  });
  assert.equal(authorization.approved, true);
  assert.equal(authorization.approvedDestinyActions.length, 0);
  assert.equal(authorization.discardedActions.length, 1);
});

test("redacted audit stores hashes and metadata, not raw content", () => {
  const audit = buildRedactedAudit({
    request: request({ userText: "conteudo privado", privateRun: true }),
    executionProfile: "standard",
    transitions: [{ from: "RECEIVED", to: "AUTHORIZED", at: "now", allowed: true }],
    iterations: [],
    promptHashes: { prompt: "abc" },
    finalStatus: "DELIVERED",
    promotionDecision: "failed_safe",
    createdAt: new Date("2026-06-22T00:00:00.000Z"),
    completedAt: new Date("2026-06-22T00:00:01.000Z"),
  });
  assert.equal(audit.metadataOnly, true);
  assert.notEqual(audit.contentHashes.userText, "conteudo privado");
  assert.equal(audit.contentHashes.userText.length, 64);
});
