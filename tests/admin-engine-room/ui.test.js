require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  coherenceTooltip,
  contextualBadges,
  describeFindingCode,
  doubleVigilanceMessage,
  deliveryLabel,
  emptyStateCopy,
  formatCoherence,
  formatThreshold,
  insufficientDoubleVigilanceTelemetry,
  isLegacyShadowObservation,
  legacyShadowWarning,
  metricExplanations,
  promotionLabel,
  sideEffectLabel,
  statusClass,
  thresholdTooltip,
} = require("../../app/lib/admin/cognitiveRunsUi.ts");
const {
  getAdminDashboardCards,
  getAdminDropdownLinks,
} = require("../../app/lib/admin/navigation.ts");

test("no-audit empty state renders dignified copy", () => {
  const copy = emptyStateCopy("no-audits");
  assert.equal(copy.title, "Nenhuma execucao cognitiva auditada foi registrada neste ambiente.");
  assert.match(copy.body, /runtime pode estar em modo off/);
});

test("promoted, rejected and failed-safe labels render clearly", () => {
  assert.equal(promotionLabel("promoted"), "Promovida");
  assert.equal(promotionLabel("rejected"), "Rejeitada");
  assert.equal(promotionLabel("failed_safe"), "Falhou em modo seguro");
});

test("delivery and side-effect statuses render distinctly", () => {
  assert.equal(deliveryLabel("persisted"), "Persistida");
  assert.equal(deliveryLabel("failed"), "Falha de entrega");
  assert.equal(sideEffectLabel("blocked"), "Bloqueados");
  assert.equal(sideEffectLabel("failed_rolled_back"), "Revertidos");
  assert.notEqual(statusClass("persisted"), statusClass("failed"));
  assert.notEqual(statusClass("blocked"), statusClass("committed"));
});

test("Navbar link appears only for admin", () => {
  assert.equal(getAdminDropdownLinks(false).some((item) => item.href === "/admin/sala-de-maquinas"), false);
  assert.equal(getAdminDropdownLinks(true).some((item) => item.href === "/admin/sala-de-maquinas"), true);
});

test("/admin card appears only for admin", () => {
  assert.equal(getAdminDashboardCards(false).length, 0);
  assert.equal(getAdminDashboardCards(true).some((item) => item.href === "/admin/sala-de-maquinas"), true);
});

test("null C(m) and theta render as honest absence labels", () => {
  assert.equal(formatCoherence(null), "Não calculado");
  assert.equal(formatThreshold(null, true), "Não armazenado");
  assert.match(coherenceTooltip({ coherence: null }), /Nao calculado/);
  assert.match(thresholdTooltip({ coherenceThreshold: null }), /nao foi preservado/);
});

test("legacy shadow observation is detected and explained", () => {
  const row = {
    runtimeMode: "shadow",
    promotionDecision: "shadow_only",
    deliveryStatus: "shadow_external",
    iterationCount: 0,
    coherence: null,
  };
  assert.equal(isLegacyShadowObservation(row), true);
  assert.match(legacyShadowWarning, /ROTA LEGADA OBSERVADA/);
  assert.match(legacyShadowWarning, /nao passou pelo ciclo O-C-V/);
  assert.equal(contextualBadges(row)[0].label, "ROTA LEGADA OBSERVADA");
});

test("contextual badges identify governed, rejected and failed-safe runs", () => {
  assert.equal(contextualBadges({
    runtimeMode: "enforce",
    promotionDecision: "promoted",
    deliveryStatus: "persisted",
    iterationCount: 1,
    coherence: 0.91,
  })[0].label, "RUNTIME GOVERNOU A RESPOSTA");
  assert.equal(contextualBadges({ promotionDecision: "rejected" })[0].label, "CANDIDATA REJEITADA PELO RUNTIME");
  assert.equal(contextualBadges({ promotionDecision: "failed_safe" })[0].label, "EXECUCAO ENCERRADA SEM ENTREGA DE CANDIDATA NAO VALIDADA");
});

test("Double Vigilance helper does not claim completion without telemetry", () => {
  assert.equal(doubleVigilanceMessage({
    iterationCount: 0,
    dimensionCount: 0,
    scientistFindingCodes: [],
    philosopherFindingCodes: [],
    modelIdentifiers: [],
  }), insufficientDoubleVigilanceTelemetry);
});

test("metric tooltips and finding dictionary are readable in Portuguese", () => {
  assert.match(metricExplanations.averageCoherence.tooltip, /C\(m\)/);
  assert.match(metricExplanations.rejectionRate.expanded, /shadow_only/);
  const finding = describeFindingCode("SCIENTIST_SIMULATED_ACCESS");
  assert.equal(finding.category, "Cientista");
  assert.match(finding.explanation, /acesso/);
  assert.match(finding.effect, /Bloqueia/);
});
