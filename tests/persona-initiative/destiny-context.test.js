require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  loadDestinyContextSource,
  selectDestinyContextFromEvents,
} = require("../../app/lib/nemosine/destiny_context.ts");
const { getPersonaBehaviorContract } = require("../../app/lib/nemosine/persona_behavior_contracts.ts");

const now = new Date("2026-06-26T12:00:00.000Z");

function destinyEvent(overrides) {
  return {
    id: overrides.id,
    title: overrides.title,
    eventDate: overrides.eventDate || null,
    eventDateLabel: overrides.eventDateLabel || null,
    category: overrides.category || "Outro",
    shortDescription: overrides.shortDescription || "Marco biografico registrado.",
    longDescription: overrides.longDescription || null,
    dominantEmotion: overrides.dominantEmotion || null,
    symbolicIntensity: overrides.symbolicIntensity ?? 3,
    associatedPersona: overrides.associatedPersona || null,
    associatedPlace: overrides.associatedPlace || null,
    lifePhase: overrides.lifePhase || null,
    visibility: overrides.visibility || "private",
    externalVisibility: overrides.externalVisibility || "private",
    cognitiveVisibility: overrides.cognitiveVisibility || "all-public-personas",
    cognitivePersonas: overrides.cognitivePersonas || [],
    source: overrides.source || "fixture",
    tags: overrides.tags || [],
    imageUrl: null,
    createdAt: overrides.createdAt || "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-01-01T00:00:00.000Z",
  };
}

test("Destiny context uses hybrid selection across foundational, active and recent milestones", () => {
  const contract = getPersonaBehaviorContract("Astronomo");
  const result = selectDestinyContextFromEvents({
    events: [
      destinyEvent({
        id: "childhood",
        title: "Mudanca de cidade na infancia",
        eventDate: "1992-04-10",
        category: "Familia",
        shortDescription: "A familia mudou de cidade e reorganizou vinculos, escola e pertencimento.",
        lifePhase: "Infancia",
        symbolicIntensity: 5,
      }),
      destinyEvent({
        id: "partnership",
        title: "Parceria profissional recorrente",
        eventDate: "2025-10-11",
        category: "Carreira",
        shortDescription: "Parceria profissional entrou em conflito repetido e abriu decisao de continuidade.",
        tags: ["parceria", "profissional", "conflito"],
      }),
      destinyEvent({
        id: "recent",
        title: "Sinal recente de virada",
        eventDate: "2026-06-25",
        category: "Outro",
        shortDescription: "Um sinal recente mudou a prioridade da semana.",
      }),
      destinyEvent({
        id: "blocked-sensitive",
        title: "Marco sensivel",
        eventDate: "2026-06-24",
        category: "Relacoes",
        shortDescription: "Conteudo privado excluido das personas.",
        visibility: "sensitive",
        cognitiveVisibility: "excluded-from-personas",
      }),
    ],
    personaId: "Astronomo",
    userText: "Bom dia, Astronomo.",
    contract,
    activeTopics: [{
      id: "topic-partnership",
      userId: "user-1",
      title: "Conflito em parceria profissional",
      summary: "Usuario avalia continuidade de parceria profissional por repeticao de conflito.",
      keywords: ["parceria", "profissional", "conflito"],
      salience: 0.93,
      status: "ACTIVE",
      privacyScope: "PUBLIC",
      sourceThreadId: "thread-1",
      sourcePersonaId: "Estrategista",
      firstObservedAt: now,
      lastObservedAt: now,
      resolvedAt: null,
      evidenceCount: 1,
      metadata: {},
    }],
    limit: 3,
    now,
  });

  assert.equal(result.status.destinySourceStatus, "OK");
  assert.equal(result.status.destinyEventsFound, 4);
  assert.equal(result.status.destinyEventsSelected, 3);
  assert.equal(result.blockedByCognitiveVisibility, 1);
  assert.deepEqual(
    result.selected.map((item) => item.event.id).sort(),
    ["childhood", "partnership", "recent"],
  );
  assert.ok(result.selected.find((item) => item.event.id === "childhood").categories.includes("FOUNDATIONAL"));
  assert.ok(result.selected.find((item) => item.event.id === "partnership").categories.includes("ACTIVE_RELEVANT"));
  assert.ok(result.selected.find((item) => item.event.id === "recent").categories.includes("RECENT"));
});

test("Destiny source status stays OK when events exist but cognitive visibility blocks all of them", () => {
  const contract = getPersonaBehaviorContract("Astronomo");
  const result = selectDestinyContextFromEvents({
    events: [
      destinyEvent({
        id: "private-only",
        title: "Marco fora das personas",
        category: "Relacoes",
        shortDescription: "Este evento existe, mas nao deve aparecer para personas publicas.",
        visibility: "sensitive",
        cognitiveVisibility: "excluded-from-personas",
      }),
    ],
    personaId: "Astronomo",
    userText: "Bom dia.",
    contract,
    limit: 3,
    now,
  });

  assert.equal(result.status.destinySourceStatus, "OK");
  assert.equal(result.status.destinyEventsFound, 1);
  assert.equal(result.status.destinyEventsSelected, 0);
  assert.equal(result.allVisibleCount, 0);
  assert.equal(result.blockedByCognitiveVisibility, 1);
});

test("Destiny loader reports query failure explicitly instead of silently returning an empty source", async () => {
  const contract = getPersonaBehaviorContract("Astronomo");
  const result = await loadDestinyContextSource({
    userId: "user-1",
    personaId: "Astronomo",
    userText: "Leia minha linha do destino para esta travessia.",
    contract,
    getEvents: async () => {
      throw Object.assign(new Error("boom"), { name: "FixtureDestinyError" });
    },
  });

  assert.equal(result.status.destinySourceStatus, "ERROR");
  assert.equal(result.status.destinyEventsFound, 0);
  assert.equal(result.status.destinyEventsSelected, 0);
  assert.equal(result.status.errorCode, "FixtureDestinyError");
  assert.match(result.retrievalExplanation.join("\n"), /destinySourceStatus=ERROR/);
});

test("Destiny loader is not triggered for unrelated messages", async () => {
  const contract = getPersonaBehaviorContract("Astronomo");
  const result = await loadDestinyContextSource({
    userId: "user-1",
    personaId: "Astronomo",
    userText: "Bom dia.",
    contract,
    getEvents: async () => {
      throw new Error("should not query destiny");
    },
  });

  assert.equal(result.status.destinySourceStatus, "NOT_TRIGGERED");
  assert.equal(result.status.destinyEventsFound, 0);
  assert.equal(result.status.destinyEventsSelected, 0);
  assert.match(result.retrievalExplanation.join("\n"), /destinySourceStatus=NOT_TRIGGERED/);
});
