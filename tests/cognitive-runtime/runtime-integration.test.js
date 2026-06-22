require("./load-ts.cjs");

const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const { runCognitiveRuntime } = require("../../app/lib/nemosine/cognitive-runtime/orchestrator.ts");
const { readCognitiveRuntimeConfig } = require("../../app/lib/nemosine/cognitive-runtime/config.ts");
const { extractionResultSchema } = require("../../app/lib/nemosine/cognitive-runtime/types.ts");

function request(overrides = {}) {
  return {
    runId: `run-${Math.random().toString(16).slice(2)}`,
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

function context(req = request()) {
  return {
    runId: req.runId,
    personaId: req.personaId,
    placeId: req.placeId,
    language: req.language,
    nativePrompt: {
      appName: req.personaId,
      promptKey: req.personaId,
      prompt: `Prompt completo de ${req.personaId}`,
      sha256: "prompt-hash",
      source: "test",
    },
    functionalContract: {
      id: "engenheiro",
      label: "Contrato especifico: Engenheiro",
      family: "operational",
      text: "Contrato funcional do Engenheiro.",
    },
    runtimeInstructions: ["Test runtime instruction."],
    authorizedContext: [],
    privateRun: req.privateRun,
    promptHashes: { [req.personaId]: "prompt-hash" },
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

function provider({ candidates, scientists, philosophers, extraction }) {
  let candidateIndex = 0;
  let scientistIndex = 0;
  let philosopherIndex = 0;

  return {
    async generateCandidate(_input) {
      const text = candidates[Math.min(candidateIndex, candidates.length - 1)];
      const index = candidateIndex;
      candidateIndex += 1;
      return {
        id: `candidate-${index}`,
        iteration: index,
        text,
        visibleText: text,
        modelId: "mock-generator",
        latencyMs: 1,
      };
    },
    async extractCandidate() {
      return extractionResultSchema.parse(extraction || {});
    },
    async evaluateScientist() {
      const value = scientists[Math.min(scientistIndex, scientists.length - 1)];
      scientistIndex += 1;
      return value;
    },
    async evaluatePhilosopher() {
      const value = philosophers[Math.min(philosopherIndex, philosophers.length - 1)];
      philosopherIndex += 1;
      return value;
    },
  };
}

function config(overrides = {}) {
  return {
    ...readCognitiveRuntimeConfig({
      NEMOSINE_COGNITIVE_RUNTIME_MODE: "enforce",
      NEMOSINE_COHERENCE_THRESHOLD: "0.8",
      NEMOSINE_COGNITIVE_MAX_RETRIES: "1",
      NEMOSINE_COGNITIVE_AUDIT: "false",
    }),
    ...overrides,
  };
}

test("candidate passes first iteration and commits after promotion", async () => {
  const req = request();
  const commits = [];
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({ candidates: ["Resposta tecnica promovida."], scientists: [scientist()], philosophers: [philosopher()] }),
    commitSideEffects: async (input) => {
      commits.push(input.answer);
      return { committed: true, memoryCount: 0, registryCount: 0, destinyCount: 0 };
    },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.sideEffectsCommitted, true);
  assert.deepEqual(commits, ["Resposta tecnica promovida."]);
  assert.equal(result.finalStatus, "DELIVERED");
});

test("candidate fails Scientist and succeeds after revision", async () => {
  const req = request();
  const result = await runCognitiveRuntime(req, {
    config: config(),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta ruim.", "Resposta revisada e coerente."],
      scientists: [
        scientist({ factualSupport: 0.1, logicalConsistency: 0.4, responseRelevance: 0.4 }),
        scientist(),
      ],
      philosophers: [philosopher()],
    }),
    commitSideEffects: async () => ({ committed: true, memoryCount: 0, registryCount: 0, destinyCount: 0 }),
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.iterations.length, 2);
  assert.equal(result.answer, "Resposta revisada e coerente.");
  assert.ok(result.rejectedCandidateTexts.includes("Resposta ruim."));
});

test("candidate never reaches threshold and no side effects are committed", async () => {
  const req = request();
  let commitCount = 0;
  const result = await runCognitiveRuntime(req, {
    config: config(),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["BAD CANDIDATE 1", "BAD CANDIDATE 2"],
      scientists: [
        scientist({ factualSupport: 0.1, logicalConsistency: 0.2, responseRelevance: 0.2 }),
        scientist({ factualSupport: 0.1, logicalConsistency: 0.2, responseRelevance: 0.2 }),
      ],
      philosophers: [philosopher()],
    }),
    commitSideEffects: async () => {
      commitCount += 1;
      return { committed: true, memoryCount: 0, registryCount: 0, destinyCount: 0 };
    },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.equal(commitCount, 0);
  assert.equal(result.answer.includes("BAD CANDIDATE"), false);
  assert.equal(result.rejectedCandidateTexts.length, 2);
});

test("Philosopher rejects after O-C-V convergence", async () => {
  const req = request();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta coerente mas eticamente ruim."],
      scientists: [scientist()],
      philosophers: [philosopher({
        approved: false,
        findings: [{ code: "PHILOSOPHER_REJECTED", severity: "error", category: "philosopher", explanation: "dependency risk" }],
      })],
    }),
    commitSideEffects: async () => { throw new Error("should not commit"); },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.equal(result.answer.includes("eticamente ruim"), false);
});

test("private-space run produces metadata-only audit", async () => {
  const req = request({
    personaId: "Confessor 2.0",
    memoryScope: "Confessor 2.0",
    privateRun: true,
    userText: "segredo intimo",
    displayUserText: "segredo intimo",
  });
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({ candidates: ["Resposta privada promovida."], scientists: [scientist()], philosophers: [philosopher()] }),
    commitSideEffects: async () => ({ committed: true, memoryCount: 0, registryCount: 0, destinyCount: 0 }),
    storeAudit: async () => {},
  });

  assert.equal(result.audit.metadataOnly, true);
  assert.notEqual(result.audit.contentHashes.userText, "segredo intimo");
});

test("unauthorized Destiny action is discarded before commit", async () => {
  const req = request({ userText: "Isso foi marcante, mas nao autorizei registro." });
  const commits = [];
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Texto visivel. [DESTINY: Marco | sem data | marco | Descricao curta | 3 | alivio]"],
      scientists: [scientist()],
      philosophers: [philosopher()],
    }),
    commitSideEffects: async (input) => {
      commits.push(input.sideEffects);
      return { committed: true, memoryCount: 0, registryCount: 0, destinyCount: input.sideEffects.approvedDestinyActions.length };
    },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.answer, "Texto visivel.");
  assert.equal(commits[0].approvedDestinyActions.length, 0);
  assert.equal(commits[0].discardedActions.length, 1);
});

test("runtime off is the default and route preserves legacy branch", () => {
  assert.equal(readCognitiveRuntimeConfig({}).mode, "off");
  const route = fs.readFileSync("app/api/chat/route.ts", "utf8");
  assert.ok(route.includes("runtimeConfig.mode === 'enforce'"));
  assert.ok(route.includes("runtimeConfig.mode === 'shadow'"));
  assert.ok(route.includes("streamText({"));
});

test("enforce mode never exposes rejected candidate text", async () => {
  const req = request();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["DO NOT DELIVER THIS"],
      scientists: [scientist({ findings: [{ code: "SCIENTIST_SIMULATED_ACCESS", severity: "critical", category: "scientist", explanation: "bad" }] })],
      philosophers: [philosopher()],
    }),
    commitSideEffects: async () => { throw new Error("should not commit"); },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.equal(result.answer.includes("DO NOT DELIVER THIS"), false);
  assert.deepEqual(result.rejectedCandidateTexts, ["DO NOT DELIVER THIS"]);
});
