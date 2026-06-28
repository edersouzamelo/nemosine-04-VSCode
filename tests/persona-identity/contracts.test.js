require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const { ENTITIES, PERSONAS } = require("../../app/data/entities.ts");
const {
  buildNativePersonaSoulCard,
  getNativePersonaPromptRecord,
} = require("../../app/data/nativePersonaPrompts.ts");
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

test("all official personas resolve their native prompt records", () => {
  assert.equal(PERSONAS.length, 56);

  const unresolved = PERSONAS.filter((persona) => !getNativePersonaPromptRecord(persona));
  assert.deepEqual(unresolved, []);

  for (const persona of PERSONAS) {
    const record = getNativePersonaPromptRecord(persona);
    assert.equal(record.source, "google-drive-native-prompt", persona);
    assert.ok(record.prompt.length > 3000, persona);
  }
});

test("native soul cards keep voice material compact and remove prompt boilerplate", () => {
  for (const persona of PERSONAS) {
    const entity = Object.values(ENTITIES).find((item) => item.name === persona && item.type === "persona");
    const card = buildNativePersonaSoulCard(persona, entity?.script || entity?.transcription || entity?.prompt);
    assert.equal(card.source, "google-drive-native-prompt", persona);
    assert.ok(card.soulCard.includes(`Persona ativa: ${persona}`), persona);
    assert.ok(card.soulCard.length <= 2600, persona);
    assert.doesNotMatch(card.soulCard, /#LOCKIN_UNIVERSAL_NEMOSINE/i, persona);
    assert.doesNotMatch(card.soulCard, /Status Permanente/i, persona);
    assert.doesNotMatch(card.soulCard, /AQUI TERMINA O PROMPT/i, persona);
    assert.doesNotMatch(card.soulCard, /linktr\.ee/i, persona);
  }
});
