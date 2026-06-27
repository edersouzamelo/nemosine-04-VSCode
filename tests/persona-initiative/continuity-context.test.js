require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildConversationContextPacket,
  contextPacketToActiveFrontSources,
  classifyInvocationMode,
  extractActiveTopicCandidates,
} = require("../../app/lib/nemosine/conversation_continuity.ts");
const {
  buildActiveFrontSnapshot,
  buildDeterministicInitiativeFallback,
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

test("recent episode context strips deterministic assistant fallback echoes", () => {
  const contract = getPersonaBehaviorContract("Guru");
  const packet = buildConversationContextPacket({
    userText: "o que vc pensa sobre isso?",
    personaId: "Guru",
    memoryScope: "Guru",
    contract,
    episodes: [
      [
        "[Conversa com Guru]",
        "Usuario: Bom dia guru",
        "Guru: Minha leitura provisoria e que a frente mais viva agora e esta: criar age of origins em travessia.",
        "Guru: Pela minha funcao, o primeiro movimento nao e abrir outra entrevista; e converter a frente autorizada em imagem.",
        "Usuario: o que vc pensa sobre isso?",
      ].join("\n"),
    ],
    now,
  });

  assert.equal(packet.recentPublicEpisodes.length, 1);
  assert.match(packet.recentPublicEpisodes[0].text, /Bom dia guru/i);
  assert.match(packet.recentPublicEpisodes[0].text, /o que vc pensa/i);
  assert.doesNotMatch(packet.recentPublicEpisodes[0].text, /Minha leitura provisoria/i);
  assert.doesNotMatch(packet.recentPublicEpisodes[0].text, /abrir outra entrevista/i);
});

function guruInitiative(userText) {
  const contract = getPersonaBehaviorContract("Guru");
  const richness = classifyConversationInputRichness(userText);
  const snapshot = buildActiveFrontSnapshot({
    personaId: "Guru",
    userText,
    richness,
    contract,
    sources: [{
      id: "active-topic:age-origins",
      type: "active_topic",
      text: "Criar Age of Origins em travessia no app Nemosine; pendencia de converter a frente autorizada em imagem, cena, contraste ou gesto simbolico com utilidade real.",
      provenance: "ACTIVE_TOPICS",
      visibility: "internal",
      scope: "Guru",
      recency: 0.97,
    }],
  });
  const brief = buildPersonaInitiativeBrief({
    personaId: "Guru",
    userText,
    richness,
    snapshot,
    contract,
  });
  return { contract, richness, snapshot, brief };
}

test("Guru deterministic fallback answers opinion and loop critique without repeating the same frame", () => {
  const opinionState = guruInitiative("o que vc pensa sobre isso?");
  const opinion = buildDeterministicInitiativeFallback({
    personaId: "Guru",
    userText: "o que vc pensa sobre isso?",
    ...opinionState,
  });
  const loopState = guruInitiative("ue vc esta respondendo em looping?");
  const loop = buildDeterministicInitiativeFallback({
    personaId: "Guru",
    userText: "ue vc esta respondendo em looping?",
    ...loopState,
  });

  assert.notEqual(loop, opinion);
  assert.match(opinion, /Minha leitura sobre isso/i);
  assert.match(loop, /eco mecanico|repetir/i);
  assert.doesNotMatch(loop, /Minha leitura provisoria e que a frente mais viva agora/i);
});

test("quality gate rejects near-duplicate persona responses as looping", () => {
  const { contract, richness, snapshot, brief } = guruInitiative("o que vc pensa sobre isso?");
  const previous = [
    "Minha leitura provisoria e que a frente mais viva agora e esta: criar age of origins em travessia.",
    "O dado autorizado aponta continuidade recente: criar age of origins em travessia no app Nemosine.",
    "Pela minha funcao, o primeiro movimento nao e abrir outra entrevista; e converter a frente autorizada em imagem.",
  ].join(" ");
  const evaluation = evaluatePersonaInitiativeQuality({
    responseText: previous,
    personaId: "Guru",
    userText: "o que vc pensa sobre isso?",
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
    recentAssistantTexts: [previous],
  });

  assert.equal(evaluation.finalPass, false);
  assert.equal(evaluation.repetitionPenalty > 0, true);
  assert.ok(evaluation.findings.some((finding) => finding.code === "REPETITIVE_LOOP"));
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

test("Psicologo opens shallow greeting with contextual reading on first answer", () => {
  const contract = getPersonaBehaviorContract("Psicologo");
  const userText = "Psicologo boa noite";
  const richness = classifyConversationInputRichness(userText);
  const snapshot = buildActiveFrontSnapshot({
    personaId: "Psicologo",
    userText,
    richness,
    contract,
    sources: [{
      id: "episode:looping-emocional",
      type: "episode",
      text: "EPISODIO COM Psicologo | Usuario relatou tensao recorrente entre sentimentos de rejeicao e frustracao em areas pessoais e profissionais. Mencionou looping emocional, desejo de mudanca, dificuldade de romper ciclos antigos e busca por respostas mais diretas.",
      provenance: "Thread.messages",
      visibility: "internal",
      scope: "Psicologo",
      recency: 0.98,
    }],
  });
  const brief = buildPersonaInitiativeBrief({
    personaId: "Psicologo",
    userText,
    richness,
    snapshot,
    contract,
  });

  assert.equal(richness.openingType, "greeting");
  assert.equal(snapshot.hasSubstantiveContext, true);
  assert.equal(brief.questionNecessary, false);

  const receptionist = evaluatePersonaInitiativeQuality({
    responseText: "Boa noite. O que voce gostaria de explorar hoje?",
    personaId: "Psicologo",
    userText,
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });
  assert.equal(receptionist.finalPass, false);
  assert.ok(receptionist.findings.some((finding) => finding.code === "GENERIC_INTERVIEW_MODE"));
  assert.ok(receptionist.findings.some((finding) => finding.code === "PASSIVE_CONTEXT_WITHHOLDING"));

  const withheld = evaluatePersonaInitiativeQuality({
    responseText: "Boa noite. Percebo uma tensao emocional recente, mas podemos olhar isso com calma.",
    personaId: "Psicologo",
    userText,
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });
  assert.equal(withheld.finalPass, false);
  assert.ok(withheld.findings.some((finding) => finding.code === "PASSIVE_CONTEXT_WITHHOLDING"));

  const opened = evaluatePersonaInitiativeQuality({
    responseText: [
      "Boa noite. Pelo que aparece nas conversas recentes, a frente emocional mais viva e a repeticao entre rejeicao, frustracao e tentativa de recuperar controle pela clareza.",
      "Minha leitura provisoria: o ponto psicologico nao e falta de assunto; e o looping.",
      "Quando a mente procura uma resposta definitiva, talvez esteja tentando aliviar uma ferida antiga sem encostar nela por inteiro.",
      "O gesto de agora e separar fato, hipotese e necessidade: o que aconteceu, o que voce esta inferindo, e qual perda ou limite a ansiedade esta tentando evitar.",
    ].join(" "),
    personaId: "Psicologo",
    userText,
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });
  assert.equal(opened.finalPass, true);
  assert.equal(opened.elicitationMode, "RESONANT");
  assert.ok(opened.resonantInferenceCount > 0);
  assert.ok(opened.contextualConnectionsCount > 0);
});

test("quality gate rejects Destiny Line denial and pedantic data elicitation", () => {
  const contract = getPersonaBehaviorContract("Orquestrador-Arquiteto");
  const richness = classifyConversationInputRichness("O que tem na minha Linha do Destino?");
  const snapshot = buildActiveFrontSnapshot({
    personaId: "Orquestrador-Arquiteto",
    userText: "O que tem na minha Linha do Destino?",
    richness,
    contract,
    sources: [{
      id: "destiny:travessia",
      type: "destiny",
      text: "[FOUNDATIONAL] 2021: Travessia familiar (Familia) - mudanca estrutural que reorganizou casa, vinculos e prioridade.",
      provenance: "DESTINY_CONTEXT",
      visibility: "internal",
      scope: "destiny-line",
      recency: 0.8,
    }],
  });
  const brief = buildPersonaInitiativeBrief({
    personaId: "Orquestrador-Arquiteto",
    userText: "O que tem na minha Linha do Destino?",
    richness,
    snapshot,
    contract,
  });

  const denial = evaluatePersonaInitiativeQuality({
    responseText: "Nao tenho acesso a sua Linha do Destino nesta conversa. Se vc puder compartilhar detalhes, posso montar uma analise.",
    personaId: "Orquestrador-Arquiteto",
    userText: "O que tem na minha Linha do Destino?",
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });
  assert.equal(denial.finalPass, false);
  assert.equal(denial.explicitDetailRequest, true);
  assert.ok(denial.findings.some((finding) => finding.code === "FALSE_CONTEXT_DENIAL"));
  assert.ok(denial.findings.some((finding) => finding.code === "INTERROGATIVE_ELICITATION"));
  assert.ok(denial.findings.some((finding) => finding.code === "GENERIC_ASSISTANT_MODE"));

  const genericClosing = evaluatePersonaInitiativeQuality({
    responseText: "A Linha do Destino indica uma travessia familiar que precisa ser coordenada como modulo biografico central. Se precisar de uma analise mais detalhada, estou a disposicao.",
    personaId: "Orquestrador-Arquiteto",
    userText: "O que tem na minha Linha do Destino?",
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });
  assert.equal(genericClosing.finalPass, false);
  assert.ok(genericClosing.findings.some((finding) => finding.code === "GENERIC_CLOSING"));
});

test("Destiny context remains an active-front source even when not in the global top slice", () => {
  const contract = getPersonaBehaviorContract("Orquestrador-Arquiteto");
  const packet = buildConversationContextPacket({
    userText: "O que tem na minha Linha do Destino?",
    personaId: "Orquestrador-Arquiteto",
    memoryScope: "Orquestrador-Arquiteto",
    contract,
    memories: Array.from({ length: 12 }, (_, index) => memory(
      `m-${index}`,
      `Memoria operacional ${index}: tarefa recente com urgencia, dependencia e decisao pendente.`,
      `2026-06-${String(25 - Math.min(index, 20)).padStart(2, "0")}T10:00:00.000Z`,
    )),
    destiny: [
      "[FOUNDATIONAL] 2021: Travessia familiar (Familia) - mudanca estrutural que reorganizou casa, vinculos e prioridade.",
    ],
    now,
  });
  const frontSources = contextPacketToActiveFrontSources(packet);
  assert.equal(packet.destinyContext.length, 1);
  assert.ok(frontSources.some((source) => source.type === "destiny" && /Travessia familiar/i.test(source.text)));
});

test("classifies short greetings as continuity-bearing invocation", () => {
  assert.equal(classifyInvocationMode("Bom dia, Astronomo."), "GREETING");
  assert.equal(classifyInvocationMode("Continue."), "FOLLOW_UP");
  assert.equal(classifyInvocationMode("Estou considerando encerrar uma parceria profissional."), "DIRECT_REQUEST");
});
