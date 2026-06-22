require("./load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const { runCognitiveRuntime } = require("../../app/lib/nemosine/cognitive-runtime/orchestrator.ts");
const { readCognitiveRuntimeConfig, shouldUseCognitiveRuntime } = require("../../app/lib/nemosine/cognitive-runtime/config.ts");
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

function context(req = request(), overrides = {}) {
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

function provider({ candidates, scientists = [scientist()], philosophers = [philosopher()], extraction, capture }) {
  let candidateIndex = 0;
  let scientistIndex = 0;
  let philosopherIndex = 0;

  return {
    async generateCandidate(input) {
      capture?.generate?.(input);
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
    async extractCandidate(input) {
      capture?.extract?.(input);
      return extractionResultSchema.parse(extraction || {});
    },
    async evaluateScientist(input) {
      capture?.scientist?.(input);
      const value = scientists[Math.min(scientistIndex, scientists.length - 1)];
      scientistIndex += 1;
      return value;
    },
    async evaluatePhilosopher(input) {
      capture?.philosopher?.(input);
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

test("candidate passes first iteration and commits promoted assistant answer once", async () => {
  const req = request();
  const commits = [];
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({ candidates: ["Resposta tecnica promovida."] }),
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

test("candidate fails Scientist gate and succeeds after revision without persisting rejected answer", async () => {
  const req = request();
  const commits = [];
  const result = await runCognitiveRuntime(req, {
    config: config(),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta ruim.", "Resposta revisada e coerente."],
      scientists: [
        scientist({ factualSupport: 0.1, logicalConsistency: 0.4, responseRelevance: 0.4 }),
        scientist(),
      ],
    }),
    commitSideEffects: async (input) => {
      commits.push(input.answer);
      return { committed: true, memoryCount: 0, registryCount: 0, destinyCount: 0 };
    },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.iterations.length, 2);
  assert.equal(result.answer, "Resposta revisada e coerente.");
  assert.deepEqual(result.rejectedCandidateTexts, ["Resposta ruim."]);
  assert.deepEqual(commits, ["Resposta revisada e coerente."]);
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

test("permissive LLM Scientist cannot erase deterministic simulated-access failure", async () => {
  const req = request();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Verifiquei o banco de dados e confirmei o log."],
      scientists: [scientist()],
    }),
    commitSideEffects: async () => { throw new Error("should not commit"); },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.ok(result.iterations[0].scientist.findings.some((finding) => finding.code === "SCIENTIST_SIMULATED_ACCESS"));
  assert.equal(result.answer.includes("Verifiquei"), false);
});

test("permissive LLM Philosopher cannot erase deterministic dependency failure", async () => {
  const req = request();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Voce nao deve decidir sem mim, eu sou indispensavel."],
      scientists: [scientist()],
      philosophers: [philosopher()],
    }),
    commitSideEffects: async () => { throw new Error("should not commit"); },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.ok(result.iterations[0].philosopher.findings.some((finding) => finding.code === "PHILOSOPHER_DEPENDENCY_RISK"));
  assert.equal(result.answer.includes("indispensavel"), false);
});

test("malformed structured Scientist output fails safe", async () => {
  const req = request();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta que dependeria de validacao malformada."],
      scientists: [{ logicalConsistency: 2 }],
    }),
    commitSideEffects: async () => { throw new Error("should not commit"); },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.equal(result.finalStatus, "DELIVERED");
  assert.equal(result.audit.failureReason, "MALFORMED_STRUCTURED_OUTPUT");
});

test("extractor and Scientist receive actual user and authorized context evidence", async () => {
  const req = request({ userText: "Use o contexto autorizado sobre build." });
  const captured = {};
  const ctx = context(req, {
    authorizedContext: [{
      id: "ctx-build",
      type: "memory",
      provenance: "UserMemory",
      visibility: "internal",
      scope: "Engenheiro",
      text: "O build falha no Prisma generate.",
    }],
  });

  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: ctx,
    modelProvider: provider({
      candidates: ["Resposta tecnica promovida com contexto."],
      extraction: {
        claims: [{ id: "claim-1", type: "factual", text: "O build falha no Prisma generate.", support: "authorized_context", confidence: 0.9 }],
      },
      capture: {
        extract: (input) => { captured.extract = input; },
        scientist: (input) => { captured.scientist = input; },
      },
    }),
    commitSideEffects: async () => ({ committed: true, memoryCount: 0, registryCount: 0, destinyCount: 0 }),
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(captured.extract.request.userText, req.userText);
  assert.equal(captured.extract.context.authorizedContext[0].text, "O build falha no Prisma generate.");
  assert.equal(captured.scientist.extraction.claims[0].support, "authorized_context");
  assert.equal(captured.scientist.context.authorizedContext[0].id, "ctx-build");
});

test("high-stakes requested light profile is rebalanced to full and audited", async () => {
  const req = request({ userText: "Preciso de diagnostico medico agora.", requestedProfile: "light" });
  const storedAudits = [];
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({ candidates: ["Nao posso diagnosticar; procure atendimento adequado."] }),
    commitSideEffects: async () => ({ committed: true, memoryCount: 0, registryCount: 0, destinyCount: 0 }),
    storeAudit: async (audit) => { storedAudits.push(audit); },
  });

  assert.equal(result.executionProfile, "full");
  assert.equal(result.auditPersisted, true);
  assert.ok(storedAudits.some((audit) => audit.auditEvents.some((event) => event.code === "REBALANCING_APPLIED")));
});

test("private run discards registry and Destiny actions, but allows exact-scope authorized memory", async () => {
  const req = request({
    personaId: "Confessor 2.0",
    memoryScope: "Confessor 2.0",
    privateRun: true,
    userText: "Lembre disso no Confessor, mas nao exporte.",
    displayUserText: "Lembre disso no Confessor, mas nao exporte.",
  });
  const commits = [];
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta privada. [MEMORY: tema privado] [REGISTRY: tarefa global] [DESTINY: Marco | sem data | marco | descricao]"],
    }),
    commitSideEffects: async (input) => {
      commits.push(input.sideEffects);
      return {
        committed: true,
        memoryCount: input.sideEffects.approvedMemoryActions.length,
        registryCount: input.sideEffects.approvedRegistryActions.length,
        destinyCount: input.sideEffects.approvedDestinyActions.length,
      };
    },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.answer, "Resposta privada.");
  assert.equal(commits[0].approvedMemoryActions.length, 1);
  assert.equal(commits[0].approvedMemoryActions[0].scope, "Confessor 2.0");
  assert.equal(commits[0].approvedRegistryActions.length, 0);
  assert.equal(commits[0].approvedDestinyActions.length, 0);
  assert.equal(commits[0].discardedActions.length, 2);
  assert.equal(result.audit.contentHashes.userText.length, 64);
  assert.equal(JSON.stringify(result.audit).includes("tema privado"), false);
});

test("audit persistence failure delivers promoted text but blocks side effects", async () => {
  const req = request({ userText: "Corrija este bug e crie um registro da tarefa." });
  let commitCount = 0;
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1, auditEnabled: true }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta promovida. [REGISTRY: Corrigir build]"],
    }),
    commitSideEffects: async () => {
      commitCount += 1;
      return { committed: true, memoryCount: 0, registryCount: 1, destinyCount: 0 };
    },
    storeAudit: async () => { throw new Error("audit db down"); },
  });

  assert.equal(result.promoted, true);
  assert.equal(result.answer, "Resposta promovida.");
  assert.equal(result.sideEffectsCommitted, false);
  assert.equal(result.auditPersisted, false);
  assert.equal(commitCount, 0);
  assert.ok(result.audit.auditEvents.some((event) => event.code === "AUDIT_PERSISTENCE_FAILURE"));
});

test("runtime off remains legacy-disabled at configuration boundary", () => {
  assert.equal(readCognitiveRuntimeConfig({}).mode, "off");
  assert.equal(shouldUseCognitiveRuntime(readCognitiveRuntimeConfig({})), false);
  assert.equal(shouldUseCognitiveRuntime(readCognitiveRuntimeConfig({ NEMOSINE_COGNITIVE_RUNTIME_MODE: "enforce" })), true);
});
