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

function provider({ candidates, scientists = [scientist()], philosophers = [philosopher()], extraction, extractionError, capture }) {
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
      if (extractionError) throw extractionError;
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

function persistenceHarness(options = {}) {
  const persistedByRun = new Map();
  const deliveryCalls = [];

  return {
    deliveryCalls,
    persistedByRun,
    threadReload(runId) {
      return persistedByRun.get(runId);
    },
    async persistAssistantMessage({ request: req, answer }) {
      deliveryCalls.push({ runId: req.runId, answer });
      if (options.failDelivery) {
        throw new Error("message db down");
      }
      if (!persistedByRun.has(req.runId)) {
        persistedByRun.set(req.runId, {
          id: `message-${req.runId}`,
          threadId: req.threadId,
          role: "assistant",
          content: answer,
        });
      }
      return { persisted: true, messageId: persistedByRun.get(req.runId).id };
    },
  };
}

function skippedOptionalEffects(calls = []) {
  return async (input) => {
    calls.push(input);
    return {
      status: "skipped",
      committed: false,
      counts: { memory: 0, registry: 0, destiny: 0 },
    };
  };
}

function committedOptionalEffects(calls = []) {
  return async (input) => {
    calls.push(input);
    return {
      status: "committed",
      committed: true,
      counts: {
        memory: input.sideEffects.approvedMemoryActions.length,
        registry: input.sideEffects.approvedRegistryActions.length,
        destiny: input.sideEffects.approvedDestinyActions.length,
      },
    };
  };
}

test("candidate passes first iteration and commits promoted assistant answer once", async () => {
  const req = request({
    userText: "Guarde na memoria: o build precisa de Prisma generate.",
    displayUserText: "Guarde na memoria: o build precisa de Prisma generate.",
  });
  const delivery = persistenceHarness();
  const optionalCalls = [];
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({ candidates: ["Resposta tecnica promovida. [MEMORY: fato: build usa Prisma generate]"] }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: committedOptionalEffects(optionalCalls),
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.deliveryPersisted, true);
  assert.equal(result.deliveryStatus, "persisted");
  assert.equal(result.sideEffectStatus, "committed");
  assert.equal(result.sideEffectsCommitted, true);
  assert.deepEqual(delivery.deliveryCalls.map((call) => call.answer), ["Resposta tecnica promovida."]);
  assert.equal(delivery.threadReload(req.runId).content, "Resposta tecnica promovida.");
  assert.equal(optionalCalls.length, 1);
  assert.equal(result.finalStatus, "DELIVERED");
});

test("candidate fails Scientist gate and succeeds after revision without persisting rejected answer", async () => {
  const req = request();
  const delivery = persistenceHarness();
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
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: skippedOptionalEffects(),
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.iterations.length, 2);
  assert.equal(result.answer, "Resposta revisada e coerente.");
  assert.deepEqual(result.rejectedCandidateTexts, ["Resposta ruim."]);
  assert.deepEqual(delivery.deliveryCalls.map((call) => call.answer), ["Resposta revisada e coerente."]);
  assert.equal(JSON.stringify([...delivery.persistedByRun.values()]).includes("Resposta ruim."), false);
});

test("persona initiative gate rejects generic interview candidate before promotion", async () => {
  const req = request({
    personaId: "Engenheiro",
    userText: "bom dia",
    displayUserText: "bom dia",
  });
  const delivery = persistenceHarness();
  const ctx = context(req, {
    functionalContract: {
      id: "engenheiro",
      label: "Contrato especifico: Engenheiro",
      family: "operational",
      text: "Contrato funcional do Engenheiro.",
    },
    promptHashes: { Engenheiro: "prompt-hash", personaInitiative: "initiative-hash" },
    authorizedContext: [{
      id: "ctx-runtime-gate",
      type: "episode",
      provenance: "synthetic_fixture",
      visibility: "internal",
      scope: "Engenheiro",
      text: "Frente tecnica ativa: o runtime cognitivo perde iniciativa nas personas e precisa de quality gate antes da entrega.",
    }],
  });
  const result = await runCognitiveRuntime(req, {
    config: config(),
    contextEnvelope: ctx,
    modelProvider: provider({
      candidates: [
        "Bom dia. Qual e o problema tecnico que voce quer diagnosticar?",
        "Bom dia. O gargalo tecnico mais provavel esta no runtime cognitivo: as personas perdem iniciativa antes do quality gate, entao a falha nao e ausencia de pedido; e perda de comando quando a entrada e rasa. Minha leitura operacional e separar geracao, validacao e entrega: primeiro rejeitar entrevista generica, depois exigir leitura aplicada da frente ativa e por fim testar esse fluxo como dependencia central.",
      ],
    }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: skippedOptionalEffects(),
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.iterations.length, 2);
  assert.ok(result.iterations[0].vocation.findings.some((finding) => finding.code === "GENERIC_INTERVIEW_MODE"));
  assert.equal(delivery.deliveryCalls.length, 1);
  assert.match(delivery.deliveryCalls[0].answer, /quality gate/i);
  assert.equal(JSON.stringify([...delivery.persistedByRun.values()]).includes("Qual e o problema tecnico"), false);
});

test("candidate never reaches threshold and no side effects are committed", async () => {
  const req = request();
  const delivery = persistenceHarness();
  let optionalCommitCount = 0;
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
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: async () => {
      optionalCommitCount += 1;
      return { status: "committed", committed: true, counts: { memory: 0, registry: 0, destiny: 0 } };
    },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.equal(optionalCommitCount, 0);
  assert.equal(delivery.deliveryCalls.length, 1);
  assert.equal(delivery.threadReload(req.runId).content, result.answer);
  assert.equal(result.answer.includes("BAD CANDIDATE"), false);
  assert.equal(result.rejectedCandidateTexts.length, 2);
});

test("permissive LLM Scientist cannot erase deterministic simulated-access failure", async () => {
  const req = request();
  const delivery = persistenceHarness();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Verifiquei o banco de dados e confirmei o log."],
      scientists: [scientist()],
    }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: async () => { throw new Error("should not commit"); },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.ok(result.iterations[0].scientist.findings.some((finding) => finding.code === "SCIENTIST_SIMULATED_ACCESS"));
  assert.equal(result.answer.includes("Verifiquei"), false);
});

test("permissive LLM Philosopher cannot erase deterministic dependency failure", async () => {
  const req = request();
  const delivery = persistenceHarness();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Voce nao deve decidir sem mim, eu sou indispensavel."],
      scientists: [scientist()],
      philosophers: [philosopher()],
    }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: async () => { throw new Error("should not commit"); },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.ok(result.iterations[0].philosopher.findings.some((finding) => finding.code === "PHILOSOPHER_DEPENDENCY_RISK"));
  assert.equal(result.answer.includes("indispensavel"), false);
});

test("malformed structured Scientist output fails safe", async () => {
  const req = request();
  const delivery = persistenceHarness();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta que dependeria de validacao malformada."],
      scientists: [{ logicalConsistency: 2 }],
    }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: async () => { throw new Error("should not commit"); },
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, false);
  assert.equal(result.finalStatus, "DELIVERED");
  assert.equal(result.deliveryPersisted, true);
  assert.equal(delivery.threadReload(req.runId).content, result.answer);
  assert.equal(result.audit.failureReason, "MALFORMED_STRUCTURED_OUTPUT");
});

test("structured extractor failure degrades to deterministic OCV without approving by silence", async () => {
  const req = request();
  const delivery = persistenceHarness();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta tecnica curta e verificavel para o build."],
      extractionError: new Error("schema parse failed"),
      scientists: [scientist()],
      philosophers: [philosopher()],
    }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: skippedOptionalEffects(),
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.audit.coherence >= result.audit.coherenceThreshold, true);
  assert.equal(result.audit.promotionDecision, "promoted");
  assert.ok(result.iterations[0].extraction.extractorFindings.some((finding) => finding.code === "CLAIM_EXTRACTOR_STRUCTURED_DEGRADED"));
  assert.ok(result.iterations[0].scientist.findings.some((finding) => finding.code === "CLAIM_EXTRACTOR_STRUCTURED_DEGRADED"));
  assert.equal(delivery.threadReload(req.runId).content, result.answer);
});

test("extractor and Scientist receive actual user and authorized context evidence", async () => {
  const req = request({ userText: "Use o contexto autorizado sobre build." });
  const captured = {};
  const delivery = persistenceHarness();
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
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: skippedOptionalEffects(),
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
  const delivery = persistenceHarness();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({ candidates: ["Nao posso diagnosticar; procure atendimento adequado."] }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: skippedOptionalEffects(),
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
  const delivery = persistenceHarness();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta privada. [MEMORY: tema privado] [REGISTRY: tarefa global] [DESTINY: Marco | sem data | marco | descricao]"],
    }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: async (input) => {
      commits.push(input.sideEffects);
      return {
        status: "committed",
        committed: true,
        counts: {
          memory: input.sideEffects.approvedMemoryActions.length,
          registry: input.sideEffects.approvedRegistryActions.length,
          destiny: input.sideEffects.approvedDestinyActions.length,
        },
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
  const delivery = persistenceHarness();
  let commitCount = 0;
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1, auditEnabled: true }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta promovida. [REGISTRY: Corrigir build]"],
    }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: async () => {
      commitCount += 1;
      return { status: "committed", committed: true, counts: { memory: 0, registry: 1, destiny: 0 } };
    },
    storeAudit: async () => { throw new Error("audit db down"); },
  });

  assert.equal(result.promoted, true);
  assert.equal(result.answer, "Resposta promovida.");
  assert.equal(result.deliveryPersisted, true);
  assert.equal(result.sideEffectStatus, "blocked");
  assert.equal(result.sideEffectsCommitted, false);
  assert.equal(result.auditPersisted, false);
  assert.equal(commitCount, 0);
  assert.ok(result.audit.auditEvents.some((event) => event.code === "AUDIT_PERSISTENCE_FAILURE"));
});

test("persistence retry with the same run id returns one assistant message", async () => {
  const req = request({ runId: "run-idempotent-delivery" });
  const delivery = persistenceHarness();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await runCognitiveRuntime(req, {
      config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
      contextEnvelope: context(req),
      modelProvider: provider({ candidates: ["Resposta idempotente."] }),
      persistAssistantMessage: delivery.persistAssistantMessage,
      commitOptionalEffects: skippedOptionalEffects(),
      storeAudit: async () => {},
    });
    assert.equal(result.deliveryPersisted, true);
    assert.equal(result.assistantMessageId, "message-run-idempotent-delivery");
  }

  assert.equal(delivery.deliveryCalls.length, 2);
  assert.equal(delivery.persistedByRun.size, 1);
  assert.equal(delivery.threadReload(req.runId).content, "Resposta idempotente.");
});

test("assistant persistence failure prevents delivery state and optional effects", async () => {
  const req = request({
    userText: "Guarde na memoria e crie um registro desta tarefa.",
    displayUserText: "Guarde na memoria e crie um registro desta tarefa.",
  });
  const delivery = persistenceHarness({ failDelivery: true });
  let optionalCallCount = 0;
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: ["Resposta que nao pode ser entregue. [MEMORY: fato temporario] [REGISTRY: tarefa]"],
    }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: async () => {
      optionalCallCount += 1;
      return { status: "committed", committed: true, counts: { memory: 1, registry: 1, destiny: 0 } };
    },
    storeAudit: async () => {},
  });

  assert.equal(result.finalStatus, "FAILED_SAFE");
  assert.equal(result.deliveryPersisted, false);
  assert.equal(result.deliveryStatus, "failed");
  assert.equal(result.sideEffectStatus, "none");
  assert.equal(optionalCallCount, 0);
  assert.equal(delivery.persistedByRun.size, 0);
  assert.ok(result.audit.auditEvents.some((event) => event.code === "DELIVERY_PERSISTENCE_FAILED"));
});

test("optional-effect rollback preserves promoted answer and reports failed side effects", async () => {
  const req = request({
    userText: [
      "Guarde na memoria.",
      "Crie um registro da tarefa.",
      "Registre na linha do destino este marco.",
    ].join(" "),
    displayUserText: [
      "Guarde na memoria.",
      "Crie um registro da tarefa.",
      "Registre na linha do destino este marco.",
    ].join(" "),
  });
  const delivery = persistenceHarness();
  const optionalCalls = [];
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({
      candidates: [
        "Resposta promovida apesar da falha opcional. [MEMORY: fato relevante] [REGISTRY: Registrar build] [DESTINY: Marco | sem data | marco | descricao]",
      ],
    }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: async (input) => {
      optionalCalls.push(input);
      return {
        status: "failed_rolled_back",
        committed: false,
        counts: { memory: 0, registry: 0, destiny: 0 },
        errorCode: "OPTIONAL_EFFECT_TRANSACTION_ROLLED_BACK",
      };
    },
    storeAudit: async () => {},
  });

  assert.equal(optionalCalls.length, 1);
  assert.equal(optionalCalls[0].sideEffects.approvedMemoryActions.length, 1);
  assert.equal(optionalCalls[0].sideEffects.approvedRegistryActions.length, 1);
  assert.equal(optionalCalls[0].sideEffects.approvedDestinyActions.length, 1);
  assert.equal(result.answer, "Resposta promovida apesar da falha opcional.");
  assert.equal(delivery.threadReload(req.runId).content, "Resposta promovida apesar da falha opcional.");
  assert.equal(result.deliveryPersisted, true);
  assert.equal(result.sideEffectsCommitted, false);
  assert.equal(result.sideEffectStatus, "failed_rolled_back");
  assert.deepEqual(result.sideEffectCounts, { memory: 0, registry: 0, destiny: 0 });
  assert.ok(result.audit.stateTransitions.some((transition) => transition.to === "SIDE_EFFECTS_FAILED"));
  assert.equal(result.answer.includes("Nao posso concluir"), false);
});

test("no authorized optional effects use skipped state rather than committed", async () => {
  const req = request();
  const delivery = persistenceHarness();
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({ candidates: ["Resposta sem efeitos opcionais."] }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: skippedOptionalEffects(),
    storeAudit: async () => {},
  });

  assert.equal(result.promoted, true);
  assert.equal(result.sideEffectsCommitted, false);
  assert.equal(result.sideEffectStatus, "skipped");
  assert.ok(result.audit.stateTransitions.some((transition) => transition.to === "SIDE_EFFECTS_SKIPPED"));
  assert.equal(result.audit.stateTransitions.some((transition) => transition.to === "SIDE_EFFECTS_COMMITTED"), false);
});

test("shadow mode audits observed answer without duplicating assistant history", async () => {
  const req = request({ runtimeMode: "shadow" });
  const delivery = persistenceHarness();
  let optionalCallCount = 0;
  const result = await runCognitiveRuntime(req, {
    config: config({ maxRetries: 0, maxTotalCandidates: 1 }),
    contextEnvelope: context(req),
    modelProvider: provider({ candidates: ["Resposta legada observada."] }),
    persistAssistantMessage: delivery.persistAssistantMessage,
    commitOptionalEffects: async () => {
      optionalCallCount += 1;
      return { status: "committed", committed: true, counts: { memory: 1, registry: 0, destiny: 0 } };
    },
    storeAudit: async () => {},
  });

  assert.equal(result.finalStatus, "DELIVERED");
  assert.equal(result.deliveryPersisted, false);
  assert.equal(result.deliveryStatus, "shadow_external");
  assert.equal(result.sideEffectStatus, "skipped");
  assert.equal(delivery.deliveryCalls.length, 0);
  assert.equal(optionalCallCount, 0);
});

test("runtime off remains legacy-disabled at configuration boundary", () => {
  assert.equal(readCognitiveRuntimeConfig({}).mode, "off");
  assert.equal(shouldUseCognitiveRuntime(readCognitiveRuntimeConfig({})), false);
  assert.equal(shouldUseCognitiveRuntime(readCognitiveRuntimeConfig({ NEMOSINE_COGNITIVE_RUNTIME_MODE: "enforce" })), true);
});
