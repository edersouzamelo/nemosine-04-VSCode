require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildActiveFrontSnapshot,
  buildPersonaInitiativeBrief,
  classifyConversationInputRichness,
  evaluatePersonaInitiativeQuality,
  isConversationNavigationRequest,
  isSourceReferenceRequest,
} = require("../../app/lib/nemosine/persona-initiative/index.ts");
const { getPersonaBehaviorContract } = require("../../app/lib/nemosine/persona_behavior_contracts.ts");
const { buildUserSourceProfileMemory } = require("../../app/lib/sourceStore.ts");

function commanderSnapshot() {
  const richness = classifyConversationInputRichness("bom dia");
  const contract = getPersonaBehaviorContract("Comandante");
  const snapshot = buildActiveFrontSnapshot({
    personaId: "Comandante",
    userText: "bom dia",
    richness,
    contract,
    sources: [
      {
        id: "episode-old",
        type: "episode",
        text: "Conversa antiga sobre reorganizar referencias bibliograficas sem prazo imediato.",
        provenance: "Thread.messages",
        visibility: "internal",
        scope: "Mestre",
        recency: 0.2,
      },
      {
        id: "episode-runtime",
        type: "episode",
        text: "Frente tecnica ativa: o runtime cognitivo perde iniciativa nas personas e ainda ha pendencia de quality gate antes da entrega.",
        provenance: "Thread.messages",
        visibility: "internal",
        scope: "Engenheiro",
        recency: 0.95,
      },
    ],
  });
  const brief = buildPersonaInitiativeBrief({
    personaId: "Comandante",
    userText: "bom dia",
    richness,
    snapshot,
    contract,
  });
  return { richness, contract, snapshot, brief };
}

test("classifies low-information openings without treating short substantive input as empty", () => {
  const greeting = classifyConversationInputRichness("bom dia");
  assert.equal(greeting.richness, "low");
  assert.equal(greeting.openingType, "greeting");
  assert.equal(greeting.requiresContextExpansion, true);
  assert.equal(greeting.questionBudget, 0);

  const namedGreeting = classifyConversationInputRichness("Psicologo boa noite");
  assert.equal(namedGreeting.richness, "low");
  assert.equal(namedGreeting.openingType, "greeting");
  assert.equal(namedGreeting.requiresContextExpansion, true);
  assert.equal(namedGreeting.questionBudget, 0);

  const substantive = classifyConversationInputRichness("Estou me separando");
  assert.equal(substantive.richness, "high");
  assert.equal(substantive.openingType, "substantive_request");
  assert.equal(substantive.requiresContextExpansion, false);
});

test("classifies recent-conversation navigation as explicit metacontext", () => {
  const question = classifyConversationInputRichness("Cientista boa noite. Com quem acabei de falar?");
  assert.equal(question.richness, "high");
  assert.equal(question.requiresContextExpansion, false);
  assert.ok(question.signals.includes("conversation-navigation"));
  assert.equal(isConversationNavigationRequest("acho que vc errou. Estava falando com o treinador"), true);
});

test("classifies uploaded-source questions as source references", () => {
  const sourceQuestion = classifyConversationInputRichness("olá, viu o que o filósofo original do Nemosine em Chat GPT te ensinou sobre mim?");
  assert.equal(sourceQuestion.richness, "high");
  assert.equal(sourceQuestion.requiresContextExpansion, false);
  assert.ok(sourceQuestion.signals.includes("source-reference"));
  assert.equal(isSourceReferenceRequest("o dossiê que subi te ensina algo sobre meu perfil?"), true);
});

test("builds a non-literal general profile memory from persona source uploads", () => {
  const memory = buildUserSourceProfileMemory({
    personaId: "Filósofo",
    filename: "Dossie_de_Continuidade_Filosofica.docx",
    content: [
      "NEMOSINE NOUS DOSSIÊ DE CONTINUIDADE FILOSÓFICA.",
      "O perfil descreve Edwardo como criador que pensa por sistemas simbólicos, exige profundidade, rejeita respostas burocráticas e precisa de personas com alma própria.",
      "Esse usuário valoriza continuidade cognitiva e não quer que cada persona recomece como atendente genérico.",
    ].join(" "),
  });

  assert.ok(memory);
  assert.match(memory, /PERFIL GERAL DO USUARIO/);
  assert.match(memory, /Sintese nao literal/);
  assert.match(memory, /fonte bruta permanece restrita ao persona de origem/);
  assert.doesNotMatch(memory, /Dossie_de_Continuidade_Filosofica/);
  assert.ok(memory.length < 900);
});

test("low-information input selects active fronts by continuity rather than lexical greeting match", () => {
  const { snapshot } = commanderSnapshot();
  assert.equal(snapshot.hasSubstantiveContext, true);
  assert.equal(snapshot.selectedFronts[0].id, "episode-runtime");
  assert.match(snapshot.selectedFronts[0].theme, /runtime cognitivo/i);
});

test("quality gate rejects Comandante generic interview mode with context available", () => {
  const { richness, contract, snapshot, brief } = commanderSnapshot();
  const evaluation = evaluatePersonaInitiativeQuality({
    responseText: "Bom dia. Qual e a missao que precisa de foco agora?",
    personaId: "Comandante",
    userText: "bom dia",
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });

  assert.equal(evaluation.finalPass, false);
  assert.ok(evaluation.findings.some((finding) => finding.code === "GENERIC_INTERVIEW_MODE"));
});

test("quality gate accepts contextual Commander initiative before any correction question", () => {
  const { richness, contract, snapshot, brief } = commanderSnapshot();
  const evaluation = evaluatePersonaInitiativeQuality({
    responseText: [
      "Bom dia. A frente tecnica mais viva e o runtime cognitivo que perde iniciativa nas personas antes da entrega.",
      "Minha ordem provisoria e tratar essa pendencia como prioridade: fechar o quality gate, cortar dispersao lateral e testar o Comandante como sentinela.",
      "Se essa frente ja foi resolvida, ajusto a ordem; ate la, a direcao e disciplina sobre esse reparo.",
    ].join(" "),
    personaId: "Comandante",
    userText: "bom dia",
    richness,
    snapshot,
    contract,
    brief,
    privateRun: false,
  });

  assert.equal(evaluation.finalPass, true);
  assert.equal(evaluation.findings.length, 0);
});

test("privacy filter prevents private-only source from becoming public active front", () => {
  const richness = classifyConversationInputRichness("bom dia");
  const contract = getPersonaBehaviorContract("Comandante");
  const snapshot = buildActiveFrontSnapshot({
    personaId: "Comandante",
    userText: "bom dia",
    richness,
    contract,
    allowPrivateContext: false,
    sources: [
      {
        id: "confessor-only",
        type: "memory",
        text: "Conteudo sensivel tratado somente no Confessor 2.0.",
        provenance: "UserMemory",
        visibility: "private",
        scope: "Confessor 2.0",
        recency: 1,
      },
    ],
  });

  assert.equal(snapshot.fronts.length, 0);
  assert.equal(snapshot.selectedFronts.length, 0);
});
