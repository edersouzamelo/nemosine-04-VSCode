require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  readCognitiveFoundationConfig,
  hasAnyCognitiveFoundationRuntime,
} = require("../../app/lib/nemosine/cognitive-foundation/config.ts");
const {
  extractMemoryCandidates,
} = require("../../app/lib/nemosine/cognitive-foundation/memory_candidate_extractor.ts");
const {
  buildPersonaContextProjection,
} = require("../../app/lib/nemosine/cognitive-foundation/persona_context_projection.ts");
const {
  evaluateDepthGate,
  classifyDemand,
} = require("../../app/lib/nemosine/cognitive-foundation/depth_gate.ts");
const {
  buildOnboardingV2Mirror,
} = require("../../app/lib/nemosine/cognitive-foundation/onboarding_v2.ts");
const {
  buildPublicEnrichmentPlan,
} = require("../../app/lib/nemosine/cognitive-foundation/public_enrichment.ts");

function node(overrides) {
  return {
    id: overrides.id || `node-${Math.random()}`,
    userId: "user-1",
    normalizedContent: overrides.shortSummary || "conteudo",
    shortSummary: overrides.shortSummary || "conteudo",
    category: overrides.category || "goal",
    subtype: overrides.subtype || null,
    epistemicType: overrides.epistemicType || "DECLARED_FACT",
    sourceType: "conversation",
    sourceReference: overrides.sourceReference || null,
    sourceDate: null,
    capturedAt: null,
    confidence: overrides.confidence ?? 0.8,
    sensitivity: overrides.sensitivity || "NORMAL",
    scopeType: overrides.scopeType || "GLOBAL",
    authorizedPersonas: overrides.authorizedPersonas || null,
    status: overrides.status || "CONFIRMED",
    validFrom: null,
    validUntil: null,
    createdBy: "test",
    updatedAt: "2026-06-28T00:00:00.000Z",
    removedAt: null,
    ...overrides,
  };
}

test("foundation flags default to off and activate only explicit modes", () => {
  const off = readCognitiveFoundationConfig({});
  assert.equal(off.userGraphMode, "off");
  assert.equal(off.memoryExtractorMode, "off");
  assert.equal(off.depthGateMode, "off");
  assert.equal(off.personaProjectionMode, "off");
  assert.equal(off.onboardingV2Mode, "off");
  assert.equal(off.webEnrichmentMode, "off");
  assert.equal(hasAnyCognitiveFoundationRuntime(off), false);

  const active = readCognitiveFoundationConfig({
    USER_GRAPH_MODE: "shadow",
    DEPTH_GATE_MODE: "enforce",
    ONBOARDING_V2_MODE: "internal",
    WEB_ENRICHMENT_MODE: "opt_in",
  });
  assert.equal(active.userGraphMode, "shadow");
  assert.equal(active.depthGateMode, "enforce");
  assert.equal(active.onboardingV2Mode, "internal");
  assert.equal(active.webEnrichmentMode, "opt_in");
  assert.equal(hasAnyCognitiveFoundationRuntime(active), true);
});

test("memory extractor creates candidates but never auto-persists facts", () => {
  const result = extractMemoryCandidates({
    userText: "Meu objetivo e terminar o User Graph do Nemosine sem quebrar as personas.",
    personaId: "Mentor",
    memoryScope: "Mentor",
    sourceId: "thread-1",
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].epistemicType, "GOAL");
  assert.equal(result.candidates[0].status, "CANDIDATE");
  assert.equal(result.candidates[0].shouldPersistAutomatically, false);
  assert.equal(result.candidates[0].requiresConfirmation, true);
});

test("memory extractor skips Confessor scope and secret-like input", () => {
  const confessor = extractMemoryCandidates({
    userText: "Meu objetivo e privado.",
    personaId: "Confessor 2.0",
    memoryScope: "Confessor 2.0",
  });
  assert.equal(confessor.skipped, true);
  assert.ok(confessor.findingCodes.includes("CONFESSOR_SCOPE_SKIPPED"));

  const secret = extractMemoryCandidates({
    userText: "Minha senha e abc e meu token sk-secretsecretsecret.",
    personaId: "Mentor",
    memoryScope: "Mentor",
  });
  assert.equal(secret.skipped, true);
  assert.ok(secret.findingCodes.includes("SECRET_PATTERN_SKIPPED"));
});

test("sensitive and speculative inputs stay candidates requiring confirmation", () => {
  const result = extractMemoryCandidates({
    userText: "Talvez meu objetivo de saude seja resolver essa dor com um medico.",
    personaId: "Medico",
    memoryScope: "Medico",
  });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].epistemicType, "HYPOTHESIS");
  assert.equal(result.candidates[0].sensitivity, "SENSITIVE");
  assert.ok(result.findingCodes.includes("HYPOTHESIS_NOT_FACT"));
  assert.ok(result.findingCodes.includes("SENSITIVE_CANDIDATE_REQUIRES_CONFIRMATION"));
});

test("persona projections differ and block Confessor-only records outside Confessor", () => {
  const nodes = [
    node({ id: "goal", category: "goal", shortSummary: "Terminar o runtime cognitivo." }),
    node({ id: "constraint", category: "constraint", shortSummary: "Pouco tempo ate o prazo." }),
    node({ id: "risk", category: "risk", shortSummary: "Risco de dispersao por excesso de frentes." }),
    node({ id: "contradiction", category: "contradiction", epistemicType: "HYPOTHESIS", shortSummary: "Hipotese: evita publicar quando esta perto de concluir." }),
    node({ id: "confessor", category: "relationship", sensitivity: "CONFESSOR_ONLY", scopeType: "CONFESSOR", shortSummary: "Segredo do Confessor." }),
  ];

  const mentor = buildPersonaContextProjection({ personaId: "Mentor", memoryScope: "Mentor", nodes });
  const estrategista = buildPersonaContextProjection({ personaId: "Estrategista", memoryScope: "Estrategista", nodes });
  const sombra = buildPersonaContextProjection({ personaId: "Sombra", memoryScope: "Sombra", nodes });

  assert.equal(mentor.blockedCount, 1);
  assert.ok(mentor.blockedReasons.includes("confessor-only"));
  assert.ok([...mentor.core, ...mentor.vocational].some((item) => item.id === "goal"));
  assert.ok(estrategista.vocational.some((item) => item.id === "risk"));
  assert.ok(sombra.vocational.some((item) => item.id === "contradiction"));
  assert.notDeepEqual(
    estrategista.vocational.map((item) => item.id),
    sombra.vocational.map((item) => item.id),
  );
});

test("depth gate classifies demand and rejects lazy closure for deep answers", () => {
  assert.equal(classifyDemand({ userText: "Mentor, preciso de direcao para essa decisao de carreira." }), "MENTORIAL");

  const shallow = evaluateDepthGate({
    userText: "Mentor, preciso de direcao para essa decisao de carreira.",
    responseText: "Pense com calma. Se quiser, podemos explorar melhor depois.",
    personaId: "Mentor",
  });
  assert.equal(shallow.passed, false);
  assert.equal(shallow.lazyClosingDetected, true);
  assert.ok(shallow.findingCodes.includes("LAZY_CLOSING"));

  const direct = evaluateDepthGate({
    userText: "Traduza: hello",
    responseText: "Ola.",
    personaId: "Mestre",
  });
  assert.equal(direct.demandClass, "DIRECT");
  assert.equal(direct.shouldRegenerate, false);
});

test("onboarding v2 builds review mirror without automatic persistence", () => {
  const mirror = buildOnboardingV2Mirror({
    userId: "user-1",
    entryReason: "projeto",
    timelineEvents: ["Comecei o Nemosine", "Publiquei um artigo", "Precisei reorganizar a rotina"],
    choicesUnderTension: ["Cortar dispersao ou aceitar mais convites"],
    freeReport: "Meu objetivo e terminar a fundacao cognitiva sem inventar perfil.",
    personaAccess: ["Mentor", "Estrategista"],
  });

  assert.equal(mirror.progress.skippedAllowed, true);
  assert.ok(mirror.understoodSoFar.length >= 3);
  assert.ok(mirror.reviewActions.includes("correct"));
  assert.ok(mirror.candidates.every((candidate) => candidate.shouldPersistAutomatically === false));
});

test("public enrichment requires opt-in and never performs network search in foundation mode", () => {
  const blocked = buildPublicEnrichmentPlan({
    consent: false,
    links: ["https://example.com/profile"],
    authorizedDomains: ["example.com"],
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.searchPerformed, false);

  const allowed = buildPublicEnrichmentPlan({
    consent: true,
    links: ["https://example.com/profile", "https://notallowed.test/x"],
    authorizedDomains: ["example.com"],
  });
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.searchPerformed, false);
  assert.equal(allowed.candidates.length, 1);
  assert.equal(allowed.candidates[0].epistemicType, "PUBLIC_SOURCE_CANDIDATE");
  assert.equal(allowed.candidates[0].shouldPersistAutomatically, false);
  assert.ok(allowed.warnings.some((warning) => warning.includes("domain-not-authorized")));
});
