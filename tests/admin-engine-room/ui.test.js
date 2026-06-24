require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  deliveryLabel,
  emptyStateCopy,
  promotionLabel,
  sideEffectLabel,
  statusClass,
} = require("../../app/lib/admin/cognitiveRunsUi.ts");
const {
  getAdminDashboardCards,
  getAdminDropdownLinks,
} = require("../../app/lib/admin/navigation.ts");

test("no-audit empty state renders dignified copy", () => {
  const copy = emptyStateCopy("no-audits");
  assert.match(copy.title, /Sala silenciosa/);
  assert.match(copy.body, /auditorias cognitivas/);
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
