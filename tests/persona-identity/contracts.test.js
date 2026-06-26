require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const { PERSONAS } = require("../../app/data/entities.ts");
const { getPersonaBehaviorContract } = require("../../app/lib/nemosine/persona_behavior_contracts.ts");

test("all official personas resolve a vocational initiative contract", () => {
  assert.equal(PERSONAS.length, 56);

  for (const persona of PERSONAS) {
    const contract = getPersonaBehaviorContract(persona);
    assert.match(contract.label, /Contrato especifico/i, persona);
    assert.ok(contract.operationalMission.length > 20, persona);
    assert.ok(contract.contextToSeek.length >= 3, persona);
    assert.ok(contract.expectedInference.length > 20, persona);
    assert.ok(contract.initialIntervention.length > 20, persona);
    assert.ok(contract.allowedQuestion.length > 20, persona);
    assert.ok(contract.forbiddenQuestion.length > 10, persona);
    assert.ok(contract.honestFailureMode.length > 20, persona);
    assert.ok(contract.goodResponseCriteria.length >= 4, persona);
    assert.ok(contract.genericResponseSignals.length >= 3, persona);
    assert.ok(contract.vocationalClosing.length > 20, persona);
  }
});

test("Comandante has a specific anti-receptionist command contract", () => {
  const contract = getPersonaBehaviorContract("Comandante");
  assert.equal(contract.id, "comandante");
  assert.match(contract.initialIntervention, /ordem inicial/i);
  assert.match(contract.forbiddenQuestion, /missao/i);
  assert.ok(contract.prohibitions.some((item) => /qual missao/i.test(item)));
});
