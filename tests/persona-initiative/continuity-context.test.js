require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildConversationContextPacket,
  classifyInvocationMode,
  extractActiveTopicCandidates,
} = require("../../app/lib/nemosine/conversation_continuity.ts");
const {
  buildActiveFrontSnapshot,
  buildPersonaInitiativeBrief,
  classifyConversationInputRichness,
  evaluatePersonaInitiativeQuality,
} = require("../../app/lib/nemosine/persona-initiative/index.ts");
const { getPersonaBehaviorContract } = require("../../app/lib/nemosine/persona_behavior_contracts.ts");

const now = new Date("2026-06-26T12:00:00.000Z");

function memory(id, content, createdAt) {
  return { id, content, createdAt: new Date(createdAt), personaId: "Estrategista" };
}

test("Astronomo has a specific strategic longitudinal contract", () => {
  const contract = getPersonaBehaviorContract("Astronomo");
  assert.equal(contract.id, "astronomo");
  assert.equal(contract.family, "strategic");
  assert.match(contract.operationalMission, /padroes internos e externos ao longo do tempo/i);
  assert.ok(contract.lexicalHints.includes("trajetoria"));
  assert.ok(contract.prohibitions.some((item) => /pedir pauta/i.test(item)));
});

test("short invocation ranks recent memories D and C before old A and B", () => {
  const contract = getPersonaBehaviorContract("Astronomo");
  const packet = buildConversationContextPacket({
    userText: "Bom dia, Astronomo.",
    personaId: "Astronomo",
    memoryScope: "Astronomo",
    contract,
    memories: [
      memory("D", "D: decisao profissional recente ainda em aberto.", "2026-06-26T11:00:00.000Z"),
      memory("C", "C: conflito recorrente em projeto discutido ontem.", "2026-06-25T10:00:00.000Z"),
      memory("B", "B: anotacao antiga sobre organizacao bibliografica.", "2026-03-01T10:00:00.000Z"),
      memory("A", "A: anotacao muito antiga sobre rotina sem urgencia.", "2026-01-01T10:00:00.000Z"),
    ],
    now,
  });

  assert.equal(packet.invocationMode, "GREETING");
  assert.deepEqual(
    packet.relevantDurableMemories.map((item) => item.id),
    ["memory:D", "memory:C"],
  );
  assert.equal(packet.relevantDurableMemories.some((item) => /A:|B:/.test(item.text)), false);
});

test("public active topic crosses personas on greeting continuity", () => {
  const contract = getPersonaBehaviorContract("Astronomo");
  const packet = buildConversationContextPacket({
    userText: "Bom dia.",
    personaId: "Astronomo",
    memoryScope: "Astronomo",
    contract,
    activeTopics: [{
      id: "topic-public-partnership",
      userId: "user-1",
      title: "Possivel encerramento de parceria profissional",
      summary: "Usuario considera encerrar parceria profissional porque o conflito se repete ha meses.",
      keywords: ["parceria", "profissional", "conflito", "repete"],
      salience: 0.94,
      status: "ACTIVE",
      privacyScope: "PUBLIC",
      sourceThreadId: "thread-estrategista",
      sourcePersonaId: "Estrategista",
      firstObservedAt: new Date("2026-06-25T12:00:00.000Z"),
      lastObservedAt: new Date("2026-06-25T12:00:00.000Z"),
      resolvedAt: null,
      evidenceCount: 1,
      metadata: { scope: "Estrategista" },
    }],
    now,
  });

  assert.equal(packet.hasSubstantiveContext, true);
  assert.equal(packet.activeTopics[0].id, "active-topic:topic-public-partnership");
  assert.equal(packet.metrics.crossPersonaContinuityUsed, true);
  assert.match(packet.selectedItems[0].text, /parceria profissional/i);
});

test("active topic extraction ignores greetings and extracts substantive public topics", () => {
  assert.deepEqual(extractActiveTopicCandidates({ userText: "Bom dia.", memoryScope: "Astronomo" }), []);
  const topics = extractActiveTopicCandidates({
    userText: "Estou considerando encerrar uma parceria profissional porque o conflito se repete ha meses.",
    memoryScope: "Estrategista",
  });
  assert.equal(topics.length, 1);
  assert.equal(topics[0].privacyScope, "PUBLIC");
  assert.ok(topics[0].salience > 0.7);
  assert.match(topics[0].summary, /parceria profissional/i);
});

test("private active topic candidates stay private", () => {
  const topics = extractActiveTopicCandidates({
    userText: "Estou considerando encerrar uma relacao importante porque o conflito se repete ha meses.",
    memoryScope: "Confessor 2.0",
  });
  assert.equal(topics.length, 1);
  assert.equal(topics[0].privacyScope, "PRIVATE");
});

test("Astronomo quality gate rejects false context denial and accepts longitudinal initiative", () => {
  const contract = getPersonaBehaviorContract("Astronomo");
  const richness = classifyConversationInputRichness("Bom dia, Astronomo.");
  const snapshot = buildActiveFrontSnapshot({
    personaId: "Astronomo",
    userText: "Bom dia, Astronomo.",
    richness,
    contract,
    sources: [{
      id: "active-topic:life-change",
      type: "active_topic",
      text: "Mudanca importante de vida discutida recentemente; ha repeticao de sinais e decisao ainda em aberto.",
      provenance: "ACTIVE_TOPICS",
      visibility: "internal",
      scope: "Estrategista",
      recency: 0.96,
    }],
  });
  const brief = buildPersonaInitiativeBrief({
    personaId: "Astronomo",
    userText: "Bom dia, Astronomo.",
    richness,
    snapshot,
    contract,
  });

  const rejected = evaluatePersonaInitiativeQuality({
    responseText: "Bom dia. Nao tenho informacoes especificas sobre voce. Sobre qual assunto voce quer falar?",
    personaId: "Astronomo",
    userText: "Bom dia, Astronomo.",
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });
  assert.equal(rejected.finalPass, false);
  assert.ok(rejected.findings.some((finding) => finding.code === "FALSE_CONTEXT_DENIAL"));

  const interrogatory = evaluatePersonaInitiativeQuality({
    responseText: "Bom dia. Se puder fornecer mais detalhes sobre essa mudanca importante de vida, posso compreender melhor antes de seguir.",
    personaId: "Astronomo",
    userText: "Bom dia, Astronomo.",
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });
  assert.equal(interrogatory.finalPass, false);
  assert.equal(interrogatory.explicitDetailRequest, true);
  assert.equal(interrogatory.elicitationMode, "INTERROGATIVE");
  assert.ok(interrogatory.findings.some((finding) => finding.code === "INTERROGATIVE_ELICITATION"));

  const accepted = evaluatePersonaInitiativeQuality({
    responseText: [
      "Bom dia. A frente recente parece ser uma mudanca importante de vida que ja nao aparece como impulso isolado, mas como ciclo em observacao.",
      "O fato disponivel e que ha repeticao de sinais e decisao em aberto; minha inferencia e que a fase atual mede a distancia entre intencao e continuidade real.",
      "O primeiro insight e temporal: quando um conflito reaparece, ele deixa de ser episodio e vira trajetoria.",
      "O segundo e de transicao: antes de escolher movimento, vale distinguir se o padrao ainda evolui ou apenas se repete.",
    ].join(" "),
    personaId: "Astronomo",
    userText: "Bom dia, Astronomo.",
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });
  assert.equal(accepted.finalPass, true);
  assert.equal(accepted.elicitationMode, "RESONANT");
  assert.ok(accepted.resonantInferenceCount > 0);
  assert.ok(accepted.contextualConnectionsCount > 0);
});

test("classifies short greetings as continuity-bearing invocation", () => {
  assert.equal(classifyInvocationMode("Bom dia, Astronomo."), "GREETING");
  assert.equal(classifyInvocationMode("Continue."), "FOLLOW_UP");
  assert.equal(classifyInvocationMode("Estou considerando encerrar uma parceria profissional."), "DIRECT_REQUEST");
});
