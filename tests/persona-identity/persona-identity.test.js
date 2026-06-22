require("../cognitive-runtime/load-ts.cjs");

const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const { getNativePersonaPromptRecord } = require("../../app/data/nativePersonaPrompts.ts");
const { getPersonaBehaviorContract } = require("../../app/lib/nemosine/persona_behavior_contracts.ts");

const personas = [
  "Mentor",
  "Mestre",
  "Cientista",
  "Engenheiro",
  "Estrategista",
  "Narrador",
  "Inimigo",
  "Psicologo",
  "Confessor 2.0",
  "Bobo da Corte",
];

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

test("native prompt manifest matches prompts.json byte content", () => {
  const prompts = JSON.parse(fs.readFileSync("prompts.json", "utf8"));
  const manifest = JSON.parse(fs.readFileSync("app/data/nativePersonaPromptManifest.json", "utf8"));
  assert.equal(manifest.promptCount, Object.keys(prompts).length);

  for (const [key, prompt] of Object.entries(prompts)) {
    assert.equal(manifest.entries[key].sha256, sha256(String(prompt)), `prompt checksum mismatch: ${key}`);
    assert.equal(manifest.entries[key].length, String(prompt).length, `prompt length mismatch: ${key}`);
  }
});

test("requested persona identity harness resolves native prompts and contracts", () => {
  for (const persona of personas) {
    const record = getNativePersonaPromptRecord(persona);
    assert.ok(record, `${persona} native prompt not resolved`);
    assert.ok(record.prompt.length > 500, `${persona} native prompt is unexpectedly short`);

    const contract = getPersonaBehaviorContract(persona);
    assert.ok(contract.label, `${persona} contract missing label`);
    assert.ok(contract.operationalMission.length > 20, `${persona} contract mission too small`);
    assert.ok(contract.goodResponseCriteria.length > 0, `${persona} criteria missing`);
  }
});

test("identity protections are present without flattening personas into generic families", () => {
  const runtimeSource = [
    fs.readFileSync("app/lib/nemosine/cognitive-runtime/persona-generator.ts", "utf8"),
    fs.readFileSync("app/lib/nemosine/cognitive-runtime/vocational-policy.ts", "utf8"),
    fs.readFileSync("app/lib/nemosine/cognitive-runtime/context-envelope.ts", "utf8"),
  ].join("\n");

  assert.ok(runtimeSource.includes("Preserve the complete native identity"));
  assert.ok(runtimeSource.includes("nativePrompt.prompt"));
  assert.ok(runtimeSource.includes("personaOverrides"));
  assert.ok(runtimeSource.includes("Do not claim tool access"));
  assert.ok(runtimeSource.includes("authorizedContext"));
  assert.ok(runtimeSource.includes("current user input is supplied separately"));
});
