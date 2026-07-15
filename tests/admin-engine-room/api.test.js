require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  handleCognitiveRunsListRequest,
  handleCognitiveRunDetailRequest,
} = require("../../app/lib/admin/cognitiveRuns.ts");
const {
  getSafeCognitiveRuntimeConfig,
  handleCognitiveRuntimeConfigRequest,
} = require("../../app/lib/admin/cognitiveRuntimeConfig.ts");
const {
  generateCognitiveRunDetailPdf,
  generateCognitiveRunsReportPdf,
} = require("../../app/lib/admin/cognitiveRunsPdf.ts");

const adminSession = { user: { email: "edersouzamelo@gmail.com" } };
const userSession = { user: { email: "not-admin@example.com" } };

function auditRow(overrides = {}) {
  return {
    id: overrides.id || "run-1",
    personaId: overrides.personaId || "Engenheiro",
    placeId: overrides.placeId ?? null,
    runtimeMode: overrides.runtimeMode || "enforce",
    executionProfile: overrides.executionProfile || "full",
    stateTransitions: overrides.stateTransitions || [
      { from: "RECEIVED", to: "AUTHORIZED", at: "2026-06-22T00:00:00.000Z", allowed: true },
      { from: "AUTHORIZED", to: "FINAL_ANSWER_SELECTED", at: "2026-06-22T00:00:01.000Z", allowed: true },
      { from: "FINAL_ANSWER_SELECTED", to: "DELIVERY_PERSISTED", at: "2026-06-22T00:00:02.000Z", allowed: true },
    ],
    auditEvents: overrides.auditEvents || [
      { code: "PROFILE_SELECTED", at: "2026-06-22T00:00:00.000Z", detail: { selectedProfile: "full" } },
      { code: "SIDE_EFFECTS_BLOCKED", at: "2026-06-22T00:00:03.000Z", detail: { reason: "audit_policy", candidateText: "SECRET CANDIDATE" } },
    ],
    deliveryStatus: "deliveryStatus" in overrides ? overrides.deliveryStatus : "persisted",
    sideEffectStatus: "sideEffectStatus" in overrides ? overrides.sideEffectStatus : "blocked",
    memoryEffectCount: overrides.memoryEffectCount ?? 0,
    registryEffectCount: overrides.registryEffectCount ?? 0,
    destinyEffectCount: overrides.destinyEffectCount ?? 0,
    assistantMessagePersisted: overrides.assistantMessagePersisted ?? true,
    auditPersisted: overrides.auditPersisted ?? true,
    iterationCount: "iterationCount" in overrides ? overrides.iterationCount : 1,
    coherence: "coherence" in overrides ? overrides.coherence : 0.91,
    coherenceThreshold: "coherenceThreshold" in overrides ? overrides.coherenceThreshold : 0.8,
    dimensionScores: overrides.dimensionScores || { factualSupport: 0.9, userSovereignty: 0.88 },
    findingCodes: overrides.findingCodes || ["SIDE_EFFECTS_BLOCKED"],
    promotionDecision: overrides.promotionDecision || "promoted",
    failureReason: overrides.failureReason || null,
    latencyPerStageMs: overrides.latencyPerStageMs || { "RECEIVED->AUTHORIZED": 8, "FINAL_ANSWER_SELECTED->DELIVERY_PERSISTED": 12 },
    modelIdentifiers: overrides.modelIdentifiers || ["mock-generator"],
    promptHashes: overrides.promptHashes || { nativePrompt: "SECRET NATIVE PROMPT" },
    contentHashes: overrides.contentHashes || { userText: "SECRET USER TEXT", finalCandidate: "SECRET CANDIDATE" },
    contentLengths: overrides.contentLengths || { userText: 17, finalCandidate: 16 },
    privateRun: overrides.privateRun ?? false,
    metadataOnly: overrides.metadataOnly ?? true,
    createdAt: overrides.createdAt || new Date("2026-06-22T00:00:00.000Z"),
    completedAt: overrides.completedAt || new Date("2026-06-22T00:00:02.000Z"),
    finalStatus: overrides.finalStatus || "DELIVERED",
  };
}

function matchesWhere(row, where = {}) {
  for (const [key, value] of Object.entries(where)) {
    if (key === "createdAt") {
      if (value.gte && row.createdAt < value.gte) return false;
      if (value.lte && row.createdAt > value.lte) return false;
      continue;
    }
    if (key === "coherence") {
      if ("not" in value && value.not === null && row.coherence === null) return false;
      if (typeof value.gte === "number" && row.coherence < value.gte) return false;
      if (typeof value.lte === "number" && row.coherence > value.lte) return false;
      continue;
    }
    if (key === "findingCodes") {
      const wanted = value.array_contains?.[0];
      if (wanted && !row.findingCodes.includes(wanted)) return false;
      continue;
    }
    if (row[key] !== value) return false;
  }
  return true;
}

function selectRow(row, select) {
  if (!select) return row;
  return Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]));
}

function mockPrisma(rows) {
  return {
    cognitiveRunAudit: {
      async count(input = {}) {
        return rows.filter((row) => matchesWhere(row, input.where || {})).length;
      },
      async findMany(input = {}) {
        let result = rows.filter((row) => matchesWhere(row, input.where || {}));
        const orderBy = input.orderBy || { createdAt: "desc" };
        const [field, direction] = Object.entries(orderBy)[0];
        result = [...result].sort((a, b) => {
          const av = a[field] instanceof Date ? a[field].getTime() : a[field];
          const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
          return direction === "asc" ? av - bv : bv - av;
        });
        if (typeof input.skip === "number") result = result.slice(input.skip);
        if (typeof input.take === "number") result = result.slice(0, input.take);
        return result.map((row) => selectRow(row, input.select));
      },
      async findUnique(input = {}) {
        const row = rows.find((item) => item.id === input.where?.id);
        return row ? selectRow(row, input.select) : null;
      },
      async aggregate(input = {}) {
        const result = rows.filter((row) => matchesWhere(row, input.where || {}));
        const avg = (field) => {
          const values = result.map((row) => row[field]).filter((value) => typeof value === "number" && Number.isFinite(value));
          return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
        };
        return { _avg: { coherence: avg("coherence"), iterationCount: avg("iterationCount") } };
      },
      async groupBy(input = {}) {
        const field = input.by[0];
        const result = rows.filter((row) => matchesWhere(row, input.where || {}));
        const counts = new Map();
        for (const row of result) counts.set(row[field], (counts.get(row[field]) || 0) + 1);
        return [...counts.entries()].map(([value, count]) => ({ [field]: value, _count: { _all: count } }));
      },
    },
  };
}

async function body(response) {
  return response.json();
}

test("unauthenticated request is denied", async () => {
  const response = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs"), {
    session: null,
    prisma: mockPrisma([auditRow()]),
  });
  assert.equal(response.status, 403);
});

test("authenticated non-admin request is denied", async () => {
  const response = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs"), {
    session: userSession,
    prisma: mockPrisma([auditRow()]),
  });
  assert.equal(response.status, 403);
});

test("admin request succeeds with safe summary and rows", async () => {
  const response = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs"), {
    session: adminSession,
    prisma: mockPrisma([auditRow()]),
  });
  const json = await body(response);
  assert.equal(response.status, 200);
  assert.equal(json.summary.totalRuns, 1);
  assert.equal(json.rows[0].runId, "run-1");
  assert.equal(json.rows[0].promotionDecision, "promoted");
});

test("private audits return metadata only and no raw content", async () => {
  const response = await handleCognitiveRunDetailRequest(new Request("https://local/detail"), {
    session: adminSession,
    prisma: mockPrisma([auditRow({ id: "private-run", privateRun: true })]),
    runId: "private-run",
  });
  const json = await body(response);
  const serialized = JSON.stringify(json);
  assert.equal(response.status, 200);
  assert.equal(json.privacy.privateRun, true);
  assert.equal(json.privacy.contentHashPresence.userText, true);
  assert.equal(serialized.includes("SECRET USER TEXT"), false);
  assert.equal(serialized.includes("SECRET CANDIDATE"), false);
  assert.equal(serialized.includes("SECRET NATIVE PROMPT"), false);
});

test("pagination works", async () => {
  const rows = [
    auditRow({ id: "old", createdAt: new Date("2026-06-20T00:00:00.000Z") }),
    auditRow({ id: "new", createdAt: new Date("2026-06-22T00:00:00.000Z") }),
  ];
  const response = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs?pageSize=1&page=2"), {
    session: adminSession,
    prisma: mockPrisma(rows),
  });
  const json = await body(response);
  assert.equal(json.rows.length, 1);
  assert.equal(json.rows[0].runId, "old");
  assert.equal(json.pagination.pageCount, 2);
});

test("filters work", async () => {
  const rows = [
    auditRow({ id: "promoted", promotionDecision: "promoted" }),
    auditRow({ id: "rejected", promotionDecision: "rejected" }),
  ];
  const response = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs?promotionDecision=rejected"), {
    session: adminSession,
    prisma: mockPrisma(rows),
  });
  const json = await body(response);
  assert.deepEqual(json.rows.map((row) => row.runId), ["rejected"]);
});

test("coherence range validation works", async () => {
  const response = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs?minCoherence=0.9&maxCoherence=0.2"), {
    session: adminSession,
    prisma: mockPrisma([auditRow()]),
  });
  assert.equal(response.status, 400);
});

test("malformed audit JSON does not crash endpoint", async () => {
  const response = await handleCognitiveRunDetailRequest(new Request("https://local/detail"), {
    session: adminSession,
    prisma: mockPrisma([auditRow({ id: "malformed", stateTransitions: "not json", auditEvents: "also not json" })]),
    runId: "malformed",
  });
  const json = await body(response);
  assert.equal(response.status, 200);
  assert.deepEqual(json.timeline, []);
  assert.deepEqual(json.auditEvents, []);
});

test("detail timeline preserves transition order", async () => {
  const response = await handleCognitiveRunDetailRequest(new Request("https://local/detail"), {
    session: adminSession,
    prisma: mockPrisma([auditRow()]),
    runId: "run-1",
  });
  const json = await body(response);
  assert.deepEqual(json.timeline.map((transition) => transition.to), [
    "AUTHORIZED",
    "FINAL_ANSWER_SELECTED",
    "DELIVERY_PERSISTED",
  ]);
});

test("shadow_only legacy observation is not counted as promotion or rejection", async () => {
  const rows = [
    auditRow({ id: "promoted", promotionDecision: "promoted" }),
    auditRow({ id: "rejected", promotionDecision: "rejected" }),
    auditRow({
      id: "shadow-legacy",
      runtimeMode: "shadow",
      promotionDecision: "shadow_only",
      deliveryStatus: "shadow_external",
      iterationCount: 0,
      coherence: null,
      coherenceThreshold: null,
      dimensionScores: {},
      findingCodes: [],
      stateTransitions: [],
    }),
  ];
  const response = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs"), {
    session: adminSession,
    prisma: mockPrisma(rows),
  });
  const json = await body(response);
  assert.equal(response.status, 200);
  assert.equal(json.summary.shadowOnlyCount, 1);
  assert.equal(json.summary.governedDecisionDenominator, 2);
  assert.equal(json.summary.promotionRate, 0.5);
  assert.equal(json.summary.rejectionRate, 0.5);
});

test("null coherence and null theta are represented as absence, not zero", async () => {
  const response = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs"), {
    session: adminSession,
    prisma: mockPrisma([
      auditRow({
        id: "shadow-legacy",
        runtimeMode: "shadow",
        promotionDecision: "shadow_only",
        deliveryStatus: "shadow_external",
        iterationCount: 0,
        coherence: null,
        coherenceThreshold: null,
        dimensionScores: {},
        findingCodes: [],
        stateTransitions: [],
      }),
    ]),
  });
  const json = await body(response);
  assert.equal(json.rows[0].coherence, null);
  assert.equal(json.rows[0].coherenceThreshold, null);
  assert.equal(json.summary.averageCoherence, null);
  assert.equal(json.summary.averageCoherenceValidCount, 0);
});

test("stored theta is returned for OCV runs", async () => {
  const row = auditRow({ id: "theta-run", coherence: 0.86, coherenceThreshold: 0.82 });
  const list = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs"), {
    session: adminSession,
    prisma: mockPrisma([row]),
  });
  const listJson = await body(list);
  assert.equal(listJson.rows[0].coherenceThreshold, 0.82);

  const detail = await handleCognitiveRunDetailRequest(new Request("https://local/detail"), {
    session: adminSession,
    prisma: mockPrisma([row]),
    runId: "theta-run",
  });
  const detailJson = await body(detail);
  assert.equal(detailJson.vigia.threshold, 0.82);
  assert.match(detailJson.vigia.formula, /Theta e preservado/);
});

test("recovery and NOT_APPLICABLE dimensions are exposed safely", async () => {
  const row = auditRow({
    id: "recovered",
    promotionDecision: "recovery_delivered",
    failureReason: "coherence_exhaustion",
    dimensionScores: {
      factualSupport: { score: null, status: "NOT_APPLICABLE", weight: 0.16, reason: "Sem alegacao factual verificavel." },
      responseRelevance: { score: 0.9, status: "SCORED", weight: 0.11 },
    },
    findingCodes: ["SCIENTIST_STRUCTURED_DEGRADED"],
    auditEvents: [
      { code: "STRUCTURED_VALIDATOR_DEGRADED", at: "2026-06-22T00:00:00.000Z", detail: { classification: "infrastructure_degradation" } },
      { code: "REJECTION_CLASSIFIED", at: "2026-06-22T00:00:01.000Z", detail: { dominantCause: "infrastructure" } },
      { code: "RECOVERY_DELIVERED", at: "2026-06-22T00:00:02.000Z", detail: { dominantCause: "infrastructure", recoveryDelivered: true } },
    ],
  });
  const list = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs"), {
    session: adminSession,
    prisma: mockPrisma([row]),
  });
  const listJson = await body(list);
  assert.equal(listJson.summary.recoveryRate, 1);
  assert.equal(listJson.rows[0].recoveryDelivered, true);
  assert.equal(listJson.rows[0].infrastructureDegraded, true);

  const detail = await handleCognitiveRunDetailRequest(new Request("https://local/detail"), {
    session: adminSession,
    prisma: mockPrisma([row]),
    runId: "recovered",
  });
  const detailJson = await body(detail);
  assert.equal(detailJson.vigia.dimensions[0].status, "NOT_APPLICABLE");
  assert.equal(detailJson.recovery.delivered, true);
  assert.equal(detailJson.recovery.dominantCause, "infrastructure");
});

test("detail does not claim complete Double Vigilance without telemetry", async () => {
  const response = await handleCognitiveRunDetailRequest(new Request("https://local/detail"), {
    session: adminSession,
    prisma: mockPrisma([
      auditRow({
        id: "shadow-legacy",
        runtimeMode: "shadow",
        promotionDecision: "shadow_only",
        deliveryStatus: "shadow_external",
        iterationCount: 0,
        coherence: null,
        coherenceThreshold: null,
        dimensionScores: {},
        findingCodes: [],
        stateTransitions: [],
      }),
    ]),
    runId: "shadow-legacy",
  });
  const json = await body(response);
  assert.equal(response.status, 200);
  assert.equal(json.doubleVigilance.telemetryStatus, "insufficient");
  assert.match(json.doubleVigilance.telemetryMessage, /Sem telemetria suficiente/);
  assert.match(json.narrative, /rota legada/);
});

test("safe runtime config endpoint exposes no secret environment values", async () => {
  const env = {
    OPENAI_API_KEY: "sk-secret-value",
    OPENAI_CHAT_MODEL: "gpt-test",
    NEMOSINE_COGNITIVE_RUNTIME_MODE: "enforce",
    NEMOSINE_COGNITIVE_EXECUTION_PROFILE: "full",
    NEMOSINE_COHERENCE_THRESHOLD: "0.77",
    NEMOSINE_COGNITIVE_MAX_RETRIES: "3",
    NEMOSINE_DOUBLE_VIGILANCE: "true",
    NEMOSINE_COGNITIVE_AUDIT: "true",
    VERCEL_GIT_COMMIT_SHA: "abc123",
  };
  const config = getSafeCognitiveRuntimeConfig(env);
  const serialized = JSON.stringify(config);
  assert.equal(config.runtimeMode, "enforce");
  assert.equal(config.generationModel, "gpt-test");
  assert.equal(config.coherenceThreshold, 0.77);
  assert.equal(serialized.includes("sk-secret-value"), false);
  assert.equal(serialized.includes("OPENAI_API_KEY"), false);

  const denied = await handleCognitiveRuntimeConfigRequest({ session: userSession, env });
  assert.equal(denied.status, 403);
  const allowed = await handleCognitiveRuntimeConfigRequest({ session: adminSession, env });
  assert.equal(allowed.status, 200);
});

test("PDF exports are real PDFs and exclude raw sensitive content", async () => {
  const row = auditRow({ id: "pdf-run", privateRun: true });
  const list = await handleCognitiveRunsListRequest(new Request("https://local/api/admin/cognitive-runs"), {
    session: adminSession,
    prisma: mockPrisma([row]),
  });
  const listJson = await body(list);
  const runtimeConfig = getSafeCognitiveRuntimeConfig({ VERCEL_GIT_COMMIT_SHA: "sha-pdf" });
  const reportPdf = generateCognitiveRunsReportPdf({
    data: { ...listJson, exportScope: "page", exportLimit: 25, exportTruncated: false },
    runtimeConfig,
    activeFilters: listJson.activeFilters,
    exportScope: "page",
    origin: "https://local",
  });
  assert.equal(reportPdf.subarray(0, 5).toString(), "%PDF-");
  assert.equal(reportPdf.includes(Buffer.from("SECRET USER TEXT")), false);
  assert.ok(reportPdf.includes(Buffer.from("Casa de Maquinas")));

  const detail = await handleCognitiveRunDetailRequest(new Request("https://local/detail"), {
    session: adminSession,
    prisma: mockPrisma([row]),
    runId: "pdf-run",
  });
  const detailJson = await body(detail);
  const detailPdf = generateCognitiveRunDetailPdf({ detail: detailJson, runtimeConfig, origin: "https://local" });
  assert.equal(detailPdf.subarray(0, 5).toString(), "%PDF-");
  assert.equal(detailPdf.includes(Buffer.from("SECRET CANDIDATE")), false);
});
