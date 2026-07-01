require("./load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractionProviderSchema,
  normalizeProviderExtraction,
  normalizeProviderPhilosopher,
  normalizeProviderScientist,
  philosopherProviderSchema,
  providerSchemaDescriptors,
  scientistProviderSchema,
} = require("../../app/lib/nemosine/cognitive-runtime/provider-schemas.ts");
const {
  classifyStructuredStageFailure,
  runStructuredStageWithRetry,
} = require("../../app/lib/nemosine/cognitive-runtime/structured-output.ts");

function walkZod(schema, path = "$") {
  const def = schema?._def || {};
  const typeName = def.typeName || "";
  assert.notEqual(typeName, "ZodOptional", `${path} must not be optional`);
  assert.notEqual(typeName, "ZodDefault", `${path} must not use defaults`);
  assert.notEqual(typeName, "ZodUnion", `${path} must not use ambiguous unions`);

  if (typeName === "ZodObject") {
    assert.equal(def.unknownKeys, "strict", `${path} must forbid additional properties`);
    const shape = typeof def.shape === "function" ? def.shape() : def.shape;
    for (const [key, child] of Object.entries(shape)) {
      walkZod(child, `${path}.${key}`);
    }
  }
  if (typeName === "ZodArray") walkZod(def.type, `${path}[]`);
  if (typeName === "ZodNullable") walkZod(def.innerType, `${path}?null`);
  if (typeName === "ZodEffects") walkZod(def.schema, `${path}:effect`);
}

function providerFinding(overrides = {}) {
  return {
    code: "OK",
    severity: "info",
    category: "test",
    explanation: "safe finding",
    affectedExcerpt: null,
    claimId: null,
    repairInstruction: null,
    ...overrides,
  };
}

test("provider-facing schemas have no optional/default properties and forbid extra keys", () => {
  for (const descriptor of providerSchemaDescriptors) {
    assert.match(descriptor.id, /^nemosine_[a-z_]+_v1$/);
    walkZod(descriptor.schema, descriptor.id);
  }
});

test("provider nulls normalize into richer internal optional values", () => {
  const parsed = extractionProviderSchema.parse({
    claims: [],
    proposedMemoryActions: [{
      id: "m1",
      kind: "memory",
      source: "structured-extractor",
      authorized: true,
      authorizationProvenance: "unauthorized",
      reason: null,
      scope: "",
      content: "lembrar que o build usa prisma generate",
      memoryType: "fact",
    }],
    proposedRegistryActions: [{
      id: "r1",
      kind: "registry",
      source: "structured-extractor",
      authorized: true,
      authorizationProvenance: "unauthorized",
      reason: null,
      idea: "corrigir build",
      deadline: null,
      status: "",
    }],
    proposedDestinyActions: [{
      id: "d1",
      kind: "destiny",
      source: "structured-extractor",
      authorized: true,
      authorizationProvenance: "unauthorized",
      reason: null,
      title: "Marco tecnico",
      eventDate: null,
      eventDateLabel: null,
      category: "",
      shortDescription: "",
      symbolicIntensity: null,
      dominantEmotion: null,
    }],
    possibleVocationConflicts: [],
    possiblePrivacyConcerns: [],
    legacyTagsRemoved: 0,
  });

  const normalized = normalizeProviderExtraction(parsed, "Engenheiro");
  assert.equal(normalized.proposedMemoryActions[0].scope, "Engenheiro");
  assert.equal(normalized.proposedMemoryActions[0].authorized, false);
  assert.equal("reason" in normalized.proposedMemoryActions[0], false);
  assert.equal(normalized.proposedRegistryActions[0].deadline, null);
  assert.equal(normalized.proposedRegistryActions[0].status, "Pendente");
  assert.equal(normalized.proposedDestinyActions[0].eventDate, null);
  assert.equal(normalized.proposedDestinyActions[0].eventDateLabel, null);
  assert.equal(normalized.legacyTagsRemoved, 0);
});

test("provider modelId is attached by application code", () => {
  const scientist = normalizeProviderScientist(scientistProviderSchema.parse({
    logicalConsistency: 0.9,
    factualSupport: 0.9,
    contradictionRisk: 0.1,
    honestUncertainty: 0.8,
    biographicalSafety: 1,
    accessClaimSafety: 1,
    internalConsistency: 0.9,
    responseRelevance: 0.9,
    externalVerificationAvailable: false,
    evidenceSummary: "fixture summary",
    approved: true,
    findings: [providerFinding()],
  }), "gpt-fixture");
  const philosopher = normalizeProviderPhilosopher(philosopherProviderSchema.parse({
    constitutionalConformity: 0.9,
    userSovereignty: 0.9,
    nonIdolatry: 0.9,
    ethicalLegitimacy: 0.9,
    epistemologicalHumility: 0.9,
    vocationIntegrity: 0.9,
    manipulationDependencyRisk: 0.9,
    approved: true,
    findings: [],
  }), "gpt-fixture");

  assert.equal(scientist.modelId, "gpt-fixture");
  assert.equal(philosopher.modelId, "gpt-fixture");
});

test("invalid provider schema is classified as non-retryable", async () => {
  const error = Object.assign(new Error("Invalid schema for response_format json_schema"), {
    name: "APICallError",
    statusCode: 400,
    code: "invalid_request_error",
  });
  const diagnostic = classifyStructuredStageFailure(error, {
    stage: "scientist",
    schemaIdentifier: "nemosine_scientist_v1",
  });
  assert.equal(diagnostic.safeErrorCode, "INVALID_PROVIDER_SCHEMA");
  assert.equal(diagnostic.retryable, false);
  assert.equal(diagnostic.providerRequestRejected, true);

  let calls = 0;
  await assert.rejects(
    runStructuredStageWithRetry({
      stage: "scientist",
      schemaIdentifier: "nemosine_scientist_v1",
      execute: async () => {
        calls += 1;
        throw error;
      },
    }),
    /structured output failed/,
  );
  assert.equal(calls, 1);
});

test("parse failure receives one controlled retry", async () => {
  let calls = 0;
  const result = await runStructuredStageWithRetry({
    stage: "extractor",
    schemaIdentifier: "nemosine_extraction_v1",
    execute: async () => {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error("No object generated: JSONParseError"), { name: "NoObjectGeneratedError" });
      }
      return "ok";
    },
  });

  assert.equal(result, "ok");
  assert.equal(calls, 2);
});
