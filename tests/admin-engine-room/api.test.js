require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  handleCognitiveRunsListRequest,
  handleCognitiveRunDetailRequest,
} = require("../../app/lib/admin/cognitiveRuns.ts");

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
    deliveryStatus: overrides.deliveryStatus || "persisted",
    sideEffectStatus: overrides.sideEffectStatus || "blocked",
    memoryEffectCount: overrides.memoryEffectCount ?? 0,
    registryEffectCount: overrides.registryEffectCount ?? 0,
    destinyEffectCount: overrides.destinyEffectCount ?? 0,
    assistantMessagePersisted: overrides.assistantMessagePersisted ?? true,
    auditPersisted: overrides.auditPersisted ?? true,
    iterationCount: overrides.iterationCount ?? 1,
    coherence: overrides.coherence ?? 0.91,
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
        const avg = (field) => result.length === 0 ? null : result.reduce((sum, row) => sum + row[field], 0) / result.length;
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
