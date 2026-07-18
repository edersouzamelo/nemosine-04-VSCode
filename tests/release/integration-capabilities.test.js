const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
require("../cognitive-runtime/load-ts.cjs");

const {
  canViewIntegrationCapability,
  getIntegrationCapability,
} = require("../../app/lib/integration_capabilities.ts");

test("regular user does not see dev-only integrations", () => {
  const linkedin = getIntegrationCapability("linkedin");
  const googleFit = getIntegrationCapability("google-fit");

  assert.equal(canViewIntegrationCapability(linkedin, "user@example.com"), false);
  assert.equal(canViewIntegrationCapability(googleFit, "user@example.com"), false);
});

test("creator account sees dev-only integrations in blue UI", () => {
  const linkedin = getIntegrationCapability("linkedin");
  const panel = fs.readFileSync("app/components/ExternalConnectionsPanel.tsx", "utf8");
  const badge = fs.readFileSync("app/components/DevOnlyIntegrationBadge.tsx", "utf8");

  assert.equal(canViewIntegrationCapability(linkedin, "edersouzamelo@gmail.com"), true);
  assert.match(panel, /#4169e1/);
  assert.match(panel, /DevOnlyIntegrationBadge/);
  assert.match(badge, /DEV ONLY/);
});

test("functional integration remains visible to authorized users", () => {
  const calendar = getIntegrationCapability("google-calendar");

  assert.equal(calendar.state, "functional");
  assert.equal(canViewIntegrationCapability(calendar, "user@example.com"), true);
});

test("nonfunctional public enrichment route is server-side dev-only", () => {
  const route = fs.readFileSync("app/api/public-enrichment/route.ts", "utf8");

  assert.match(route, /isIntegrationOwner\(session\.user\.email\)/);
  assert.match(route, /WEB_ENRICHMENT_DEV_ONLY/);
});
