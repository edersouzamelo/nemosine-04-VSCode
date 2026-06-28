require("../cognitive-runtime/load-ts.cjs");

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  rankAndSelectContextCandidates,
  CONTEXT_SCORE_WEIGHTS,
} = require("../../app/lib/nemosine/response/context_broker.ts");
const {
  determineResponseDepth,
  shouldUseResponseDirector,
} = require("../../app/lib/nemosine/response/depth_policy.ts");
const {
  decideQuestionPolicy,
  questionLooksGeneric,
  countVisibleQuestions,
} = require("../../app/lib/nemosine/response/question_policy.ts");
const {
  buildFallbackResponsePlan,
  responsePlanSchema,
} = require("../../app/lib/nemosine/response/response_director.ts");
const {
  validatePersonaResponse,
} = require("../../app/lib/nemosine/response/vocational_validator.ts");
const {
  extractMemoryAfterResponse,
  stripInternalActionTags,
} = require("../../app/lib/nemosine/response/memory_extractor.ts");
const {
  readResponsePipelineConfig,
  shouldUseResponsePipeline,
} = require("../../app/lib/nemosine/response/config.ts");
const { getPersonaBehaviorContract } = require("../../app/lib/nemosine/persona_behavior_contracts.ts");

function candidate(id, sourceType, text, finalScore, overrides = {}) {
  return {
    id,
    sourceType,
    text,
    timestamp: null,
    scope: "Mentor",
    isPrivate: false,
    lexicalScore: finalScore,
    recencyScore: finalScore,
    continuityScore: finalScore,
    importanceScore: finalScore,
    personaRelevanceScore: finalScore,
    semanticScore: null,
    finalScore,
    selectionReason: "test",
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    runId: "rpv2-test",
    userId: "user-1",
    threadId: "thread-1",
    personaId: "Mentor",
    placeId: null,
    language: "pt-BR",
    userText: "A resposta esta rasa; quero profundidade sobre a arquitetura das personas.",
    displayUserText: "A resposta esta rasa; quero profundidade sobre a arquitetura das personas.",
    memoryScope: "Mentor",
    privateRun: false,
    priorHistory: [],
    ...overrides,
  };
}

function context(overrides = {}) {
  return {
    candidates: [],
    selected: [],
    selectedForPrompt: [],
    retrievalExplanation: [],
    metrics: {
      candidateCount: 0,
      selectedCount: 0,
      selectedForPromptCount: 0,
      privateCandidateCount: 0,
      privateItemsExcluded: 0,
      sourceTypeCounts: {},
      topSourceTypes: [],
      topScores: [],
      semanticReady: true,
    },
    ...overrides,
  };
}

test("config defaults off and enables shadow/enforce explicitly", () => {
  assert.equal(readResponsePipelineConfig({}).mode, "off");
  assert.equal(shouldUseResponsePipeline(readResponsePipelineConfig({})), false);
  assert.equal(shouldUseResponsePipeline(readResponsePipelineConfig({ NEMOSINE_RESPONSE_PIPELINE_V2: "shadow" })), true);
  assert.equal(readResponsePipelineConfig({ NEMOSINE_RESPONSE_PIPELINE_V2: "enforce", NEMOSINE_RESPONSE_PIPELINE_V2_MAX_REGENERATIONS: "5" }).maxRegenerations, 1);
});

test("context ranking uses hybrid weights, deduplicates current message, and applies category budgets", () => {
  assert.deepEqual(Object.keys(CONTEXT_SCORE_WEIGHTS), [
    "lexicalScore",
    "recencyScore",
    "continuityScore",
    "importanceScore",
    "personaRelevanceScore",
  ]);

  const selected = rankAndSelectContextCandidates({
    currentUserText: "quero decidir o projeto principal",
    candidates: [
      candidate("current", "current-message", "quero decidir o projeto principal", 1),
      candidate("m1", "memory", "Projeto principal e Nemosine", 0.92),
      candidate("m1-dupe", "memory", "Projeto principal e Nemosine", 0.91),
      candidate("m2", "memory", "Memoria relevante sobre decisao de carreira", 0.82),
      candidate("m3", "memory", "Memoria relevante sobre prazo financeiro", 0.81),
      candidate("m4", "memory", "Memoria relevante sobre energia e saude", 0.80),
      candidate("m5", "memory", "Memoria excedente que deve sair pelo budget", 0.79),
      candidate("e1", "episode", "Episodio recente com trade-off de projeto", 0.83),
    ],
  });

  assert.equal(selected.some((item) => item.id === "m1-dupe"), false);
  assert.equal(selected.filter((item) => item.sourceType === "memory").length, 4);
  assert.equal(selected.some((item) => item.id === "m5"), false);
  assert.equal(selected[0].sourceType, "current-message");
});

test("depth and director policy distinguish greeting from deep critique", () => {
  assert.equal(determineResponseDepth({ userText: "Oi" }), "brief");
  assert.equal(determineResponseDepth({ userText: "A resposta esta rasa e preciso de uma analise profunda do conflito entre memoria, persona e validacao." }), "deep");
  assert.equal(shouldUseResponseDirector({ userText: "Oi" }).shouldUse, false);
  assert.equal(shouldUseResponseDirector({ userText: "A resposta esta rasa e sem profundidade." }).shouldUse, true);
});

test("question policy rejects generic elicitation and defaults to zero questions", () => {
  assert.equal(questionLooksGeneric("Como posso ajudar?"), true);
  assert.equal(countVisibleQuestions("Uma? Duas?"), 2);
  assert.equal(decideQuestionPolicy({ userText: "Ambiguo A ou B", selectedContextCount: 0 }).required, false);
  assert.equal(decideQuestionPolicy({ userText: "Quero pensar isso", selectedContextCount: 2 }).required, false);
});

test("fallback director plan is structured and keeps question default off", () => {
  const contract = getPersonaBehaviorContract("Mentor");
  const plan = buildFallbackResponsePlan({
    request: request(),
    context: context({
      selectedForPrompt: [candidate("memory-1", "memory", "O usuario critica respostas rasas de personas.", 0.8)],
    }),
    contract,
  });
  const parsed = responsePlanSchema.parse(plan);
  assert.equal(parsed.recommendedDepth, "deep");
  assert.equal(parsed.questionDecision.required, false);
  assert.match(parsed.vocationalContribution, /direcao|contexto|prioridade|risco|movimento/i);
});

test("validator detects generic closing, internal leaks, tags and deep response brevity", () => {
  const contract = getPersonaBehaviorContract("Engenheiro");
  const plan = {
    ...buildFallbackResponsePlan({
      request: request({ personaId: "Engenheiro", userText: "A arquitetura esta falhando e a resposta esta rasa." }),
      context: context(),
      contract,
    }),
    recommendedDepth: "deep",
  };
  const validation = validatePersonaResponse({
    responseText: "Plano interno: posso ajudar? [MEMORY: algo]",
    userText: "A arquitetura esta falhando e a resposta esta rasa.",
    personaId: "Engenheiro",
    plan,
    context: context(),
    contract,
    privateRun: false,
  });

  assert.equal(validation.shouldRegenerate, true);
  assert.ok(validation.criticalFailures.includes("INTERNAL_CONTROL_LEAK"));
  assert.ok(validation.findings.includes("GENERIC_QUESTION"));
  assert.ok(validation.criticalFailures.includes("TOO_SHORT_FOR_DEEP_RESPONSE"));
});

test("validator accepts developed vocational answer with substantive closing", () => {
  const contract = getPersonaBehaviorContract("Engenheiro");
  const plan = buildFallbackResponsePlan({
    request: request({ personaId: "Engenheiro", userText: "A resposta esta rasa porque a arquitetura mistura contexto e fala." }),
    context: context({
      selectedForPrompt: [candidate("ctx", "memory", "O gargalo atual e misturar recuperacao, estilo e memoria no mesmo prompt.", 0.8)],
    }),
    contract,
  });
  const response = [
    "O gargalo nao e falta de frases fortes; e acoplamento. Quando recuperacao de contexto, controle de estilo e memoria saem da mesma boca, a persona passa a se defender em vez de operar.",
    "O fato disponivel e este: a arquitetura mistura tarefas que deveriam estar separadas. Minha leitura e que a fala final ficou sobrecarregada por guardas que pertencem a validadores e extratores.",
    "O reparo verificavel e separar broker, plano, renderizacao e validacao, mantendo o pedido atual como payload de usuario. O proximo teste e simples: uma saudacao com contexto deve produzir leitura curta, nao entrevista.",
  ].join("\n\n");
  const validation = validatePersonaResponse({
    responseText: response,
    userText: "A resposta esta rasa porque a arquitetura mistura contexto e fala.",
    personaId: "Engenheiro",
    plan,
    context: context({
      selectedForPrompt: [candidate("ctx", "memory", "O gargalo atual e misturar recuperacao, estilo e memoria no mesmo prompt.", 0.8)],
    }),
    contract,
    privateRun: false,
  });

  assert.equal(validation.criticalFailures.length, 0);
  assert.equal(validation.shouldRegenerate, false);
  assert.ok(validation.overallScore >= 3);
});

test("memory extractor strips legacy tags and persists only explicit authorizations", () => {
  assert.equal(stripInternalActionTags("Resposta.\n[MEMORY: segredo]\n[REGISTRY: tarefa]"), "Resposta.");

  const noAuth = extractMemoryAfterResponse({
    request: request({ userText: "Minha preferencia e X." }),
    rawAnswer: "Resposta sem tag.",
    visibleAnswer: "Resposta sem tag.",
  });
  assert.equal(noAuth.memories.length, 0);
  assert.equal(noAuth.registrySuggestion, null);
  assert.equal(noAuth.destinySuggestion, null);

  const auth = extractMemoryAfterResponse({
    request: request({ userText: "Lembre disso: minha prioridade e terminar o runtime. Registre essa tarefa: revisar testes 2026-07-01" }),
    rawAnswer: "Feito. [MEMORY: prioridade]",
    visibleAnswer: "Feito.",
  });
  assert.equal(auth.memories.length >= 1, true);
  assert.equal(auth.memories[0].shouldPersist, true);
  assert.equal(auth.registrySuggestion.idea.includes("revisar testes"), true);
  assert.equal(auth.legacyTagsRemoved, 1);
});

test("eval fixture dataset covers required personas without golden responses", () => {
  const fixturePath = path.join(process.cwd(), "tests/fixtures/persona-response-evals/cases.json");
  const cases = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const personas = new Set(cases.map((item) => item.personaId));
  for (const persona of ["Mentor", "Psicologo", "Narrador", "Engenheiro", "Cientista", "Estrategista", "Inimigo", "Bobo da Corte", "Burgues"]) {
    assert.equal(personas.has(persona), true, persona);
  }
  assert.ok(cases.every((item) => Array.isArray(item.expectedVocationalMoves)));
  assert.ok(cases.every((item) => !("goldenResponse" in item)));
});
