require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  checkCriticalContextRequest,
  createPresenceContract,
  detectGenericClosingViolation,
  extractPresenceSignals,
  getPresenceQuestionForPersona,
  normalizePresenceMode,
  removeGenericClosingByContract,
  renderPresenceAnchoredUserText,
  renderPresenceContractForRuntime,
  resolveEffectivePresenceContract,
  sanitizePresenceTelemetry,
  shouldAnchorPresenceContractForTurn,
  shouldTriggerContinuityPulse,
  shouldTriggerFirstAgreement,
} = require("../../app/lib/nemosine/presence_adjustment/core.ts");

function contract(overrides = {}) {
  return createPresenceContract({
    userId: "user-1",
    personaId: "cigana",
    scope: "PERSONA",
    ...overrides,
  });
}

test("presence flag defaults to off and accepts only valid modes", () => {
  assert.equal(normalizePresenceMode(undefined), "off");
  assert.equal(normalizePresenceMode("internal"), "internal");
  assert.equal(normalizePresenceMode("shadow"), "shadow");
  assert.equal(normalizePresenceMode("enforce"), "enforce");
  assert.equal(normalizePresenceMode("surprise"), "off");
});

test("first agreement gating is per persona and respects skip/session/off", () => {
  assert.equal(shouldTriggerFirstAgreement({
    enabled: true,
    authenticated: true,
    personaId: "cigana",
    hasConfirmedContract: false,
    skippedForPersona: false,
    shownThisSession: false,
  }), true);
  assert.equal(shouldTriggerFirstAgreement({
    enabled: false,
    authenticated: true,
    personaId: "cigana",
    hasConfirmedContract: false,
    skippedForPersona: false,
    shownThisSession: false,
  }), false);
  assert.equal(shouldTriggerFirstAgreement({
    enabled: true,
    authenticated: true,
    personaId: "cigana",
    hasConfirmedContract: true,
    skippedForPersona: false,
    shownThisSession: false,
  }), false);
  assert.equal(shouldTriggerFirstAgreement({
    enabled: true,
    authenticated: true,
    personaId: "vidente",
    hasConfirmedContract: false,
    skippedForPersona: true,
    shownThisSession: false,
  }), false);
});

test("persona question map is deterministic and falls back to general question", () => {
  assert.match(getPresenceQuestionForPersona("Inimigo"), /risco, vulnerabilidade ou sabotagem/);
  assert.match(getPresenceQuestionForPersona("Pessoa Nova"), /O que tem acontecido/);
});

test("extraction prefills goal, depth and prohibitions without weak silent skip", () => {
  const extraction = extractPresenceSignals("Estou terminando um artigo e preciso decidir se publico hoje. Quero resposta profunda, sem se quiser e sem pergunta final.");
  assert.equal(extraction.currentGoal, "tomar uma decisao");
  assert.equal(extraction.preferredDepth, "DEEP");
  assert.ok(extraction.prohibitedPatterns.includes("nao usar se quiser"));
  assert.ok(extraction.prohibitedPatterns.includes("nao terminar com pergunta"));
  assert.ok(extraction.confidence > 0.58);
});

test("contract precedence merges field by field", () => {
  const defaultContract = contract({ scope: "GLOBAL", currentGoal: "conversar", responseDepth: "BALANCED" });
  const globalContract = { customConstraints: ["nao usar se quiser"], finalQuestionPolicy: "BLOCK" };
  const personaContract = { currentGoal: "decidir", responseDepth: "DEEP" };
  const sessionContract = { recentContext: "Hoje estou revisando um artigo" };
  const effective = resolveEffectivePresenceContract({
    defaultContract,
    globalContract,
    personaContract,
    sessionContract,
  });
  assert.equal(effective.currentGoal, "decidir");
  assert.equal(effective.responseDepth, "DEEP");
  assert.equal(effective.recentContext, "Hoje estou revisando um artigo");
  assert.equal(effective.finalQuestionPolicy, "BLOCK");
  assert.deepEqual(effective.customConstraints, ["nao usar se quiser"]);
});

test("presence runtime block is dynamic and does not replace persona identity", () => {
  const rendered = renderPresenceContractForRuntime(contract({
    currentGoal: "decidir publicar o artigo",
    recentContext: "O artigo esta pronto",
    responseDepth: "DEEP",
    prohibitedPatterns: ["nao usar se quiser"],
  }), "enforce");
  assert.match(rendered, /PRESENCE CONTRACT/);
  assert.match(rendered, /Current goal: decidir publicar o artigo/);
  assert.match(rendered, /must not alter the persona identity/);
  assert.match(rendered, /greeting or shallow opening/);
});

test("presence contract anchors vague openings but yields to explicit new matter", () => {
  const anchored = contract({
    recentContext: "Produzi um artigo academico em um dia por atraso na chamada de artigos.",
    currentGoal: "entender resistencia dos superiores em encaminhar a submissao",
    responseDepth: "DEEP",
  });
  assert.equal(shouldAnchorPresenceContractForTurn({
    userText: "ola astronomo",
    contract: anchored,
  }), true);
  assert.match(renderPresenceAnchoredUserText("ola astronomo", anchored), /artigo academico/);
  assert.match(renderPresenceAnchoredUserText("ola astronomo", anchored), /assunto principal/);
  assert.equal(shouldAnchorPresenceContractForTurn({
    userText: "preciso decidir sobre o desenvolvimento do Sovereign e o teste de notificacao",
    contract: anchored,
  }), false);
});

test("generic closing enforcement blocks empty continuation and final question", () => {
  const strict = contract({
    prohibitedPatterns: ["nao usar se quiser", "nao terminar com pergunta"],
  });
  const text = "O risco central e adiar uma decisao que ja esta madura. Se quiser, podemos aprofundar isso?";
  const violation = detectGenericClosingViolation({ responseText: text, contract: strict });
  assert.equal(violation.violation, true);
  assert.ok(violation.reasons.includes("GENERIC_HELP_OFFER"));
  assert.ok(violation.reasons.includes("FINAL_QUESTION_BLOCKED"));
  assert.equal(removeGenericClosingByContract(text, strict), "O risco central e adiar uma decisao que ja esta madura.");
});

test("critical context check blocks generic requests but allows exact missing fields", () => {
  const strict = contract({
    recentContext: "Estou terminando um artigo e decidindo se publico hoje.",
    currentGoal: "decidir publicar",
  });
  const generic = checkCriticalContextRequest({
    requestedText: "Pode fornecer mais detalhes sobre a situacao?",
    contract: strict,
    conversationText: "O usuario mencionou o artigo e a publicacao.",
  });
  assert.equal(generic.canAnswerWithoutIt, true);
  assert.equal(generic.exactMissingField, undefined);

  const specific = checkCriticalContextRequest({
    requestedText: "Qual e a data limite?",
    contract: contract({ recentContext: "", currentGoal: "" }),
  });
  assert.equal(specific.exactMissingField, "data limite");
});

test("continuity pulse appears only after configured absence and cooldown", () => {
  assert.equal(shouldTriggerContinuityPulse({
    enabled: true,
    hasContract: true,
    updatedAt: "2026-06-01T00:00:00.000Z",
    previousSeenAt: "2026-06-01T00:00:00.000Z",
    now: "2026-06-10T00:00:00.000Z",
    staleDays: 7,
    minDaysBetweenPulses: 7,
    shownThisSession: false,
  }), true);
  assert.equal(shouldTriggerContinuityPulse({
    enabled: true,
    hasContract: true,
    updatedAt: "2026-06-29T00:00:00.000Z",
    previousSeenAt: "2026-06-29T00:00:00.000Z",
    now: "2026-06-30T00:00:00.000Z",
    staleDays: 7,
    minDaysBetweenPulses: 7,
    shownThisSession: false,
  }), false);
  assert.equal(shouldTriggerContinuityPulse({
    enabled: true,
    hasContract: true,
    updatedAt: "2026-06-01T00:00:00.000Z",
    previousSeenAt: "2026-06-01T00:00:00.000Z",
    lastPulseAt: "2026-06-08T00:00:00.000Z",
    now: "2026-06-10T00:00:00.000Z",
    staleDays: 7,
    minDaysBetweenPulses: 7,
    shownThisSession: false,
  }), false);
});

test("same style contract can guide multipersona without changing participant identity", () => {
  const rendered = renderPresenceContractForRuntime(contract({
    personaId: "cigana",
    responseDepth: "DEEP",
    prohibitedPatterns: ["nao repetir o que eu ja disse"],
  }), "enforce");
  assert.match(rendered, /Response depth: DEEP/);
  assert.match(rendered, /controls form, depth and constraints only/);
});

test("telemetry sanitizer keeps metadata only", () => {
  const sanitized = sanitizePresenceTelemetry({
    flowType: "FIRST_AGREEMENT",
    personaId: "Confessor 2.0",
    triggerReason: "first",
    questionCount: 3,
    skippedQuestions: 0,
    durationMs: 999999999,
    outcome: "CONFIRMED",
    scope: "PERSONA",
    activePolicies: ["BLOCK", "BLOCK", "Resposta bruta secreta aqui"],
    genericClosingDetected: true,
    contextRequestBlocked: true,
    regenerationExecuted: false,
    contractApplied: true,
  });
  assert.equal(sanitized.durationMs, 30 * 60_000);
  assert.equal(sanitized.genericClosingDetected, true);
  assert.equal(Object.prototype.hasOwnProperty.call(sanitized, "recentContext"), false);
});

test("chat wiring keeps old primer manual and exposes presence overlay controls", () => {
  const root = path.resolve(__dirname, "..", "..");
  const chatSource = fs.readFileSync(path.join(root, "app", "components", "MedievalChat.tsx"), "utf8");
  const chatRouteSource = fs.readFileSync(path.join(root, "app", "api", "chat", "route.ts"), "utf8");
  const overlaySource = fs.readFileSync(path.join(root, "app", "components", "PresenceAdjustmentOverlay.tsx"), "utf8");
  assert.match(chatSource, /advancedSettingsOpen && !showThinkingIndicator && !primerDismissed/);
  assert.match(chatSource, /Configuracao avancada da conversa/);
  assert.match(chatSource, /PresenceAdjustmentOverlay/);
  assert.match(chatSource, /NEMOSINE_PRESENCE_OPENING/);
  assert.match(chatSource, /messagesRef\.current\.length === 0/);
  assert.match(chatSource, /MANUAL_RECONFIGURATION/);
  assert.match(chatSource, /nemosine-chat-action-menu/);
  assert.match(chatSource, /PersonaMessageFeedback/);
  assert.match(chatSource, /\/api\/persona-feedback/);
  assert.match(chatSource, /PresenceAdjustmentEventCard/);
  assert.match(chatSource, /Presenca ajustada/);
  assert.match(chatSource, /Reajustar presenca/);
  assert.match(chatSource, /Restricoes aplicadas/);
  assert.match(chatSource, /appendPresenceOpeningCard\(openingMessage\)/);
  assert.match(chatSource, /renderedPresenceOpeningTexts/);
  assert.match(chatSource, /presenceFlowType === "MANUAL_RECONFIGURATION"/);
  assert.match(chatRouteSource, /NEMOSINE_PRESENCE_OPENING/);
  assert.match(chatRouteSource, /!presenceAnchoredRouting/);
  assert.match(chatRouteSource, /renderPresenceAnchoredUserText/);
  assert.match(overlaySource, /nemosine-presence-step/);
  assert.match(overlaySource, /Entrar sem ajuste/);
  assert.match(overlaySource, /Entendi o seguinte/);
  assert.match(overlaySource, /step \+ 1/);
});
