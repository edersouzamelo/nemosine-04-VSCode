const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
require("../cognitive-runtime/load-ts.cjs");

const {
  MAX_ACTIVE_GUEST_PERSONAS,
  assertParticipantLimit,
  assertPersonaCanParticipate,
  detectAddressedParticipantIds,
  detectSpeakerFocusCommand,
  getThreadHostAndPlace,
  selectSpeakingParticipantsForRound,
} = require("../../app/lib/nemosine/conversation_participants.ts");
const {
  detectCollectiveDuplicateResponse,
} = require("../../app/lib/nemosine/collective_chat_orchestrator.ts");

test("validates persona entities", () => {
  assert.equal(assertPersonaCanParticipate("Cientista").name, "Cientista");
  assert.throws(() => assertPersonaCanParticipate("Biblioteca"), /INVALID_PERSONA/);
});

test("enforces guest limit without unique historical restriction", () => {
  const active = [
    { role: "HOST", active: true },
    ...Array.from({ length: MAX_ACTIVE_GUEST_PERSONAS }, () => ({ role: "GUEST", active: true })),
    { role: "GUEST", active: false },
  ];
  assert.doesNotThrow(() => assertParticipantLimit(active));
  assert.throws(() => assertParticipantLimit([...active, { role: "GUEST", active: true }]), /PARTICIPANT_LIMIT_EXCEEDED/);
});

test("keeps compatibility with legacy Persona @ Lugar threads", () => {
  assert.deepEqual(getThreadHostAndPlace({ personaId: "Engenheiro @ Biblioteca" }), {
    hostPersonaId: "Engenheiro",
    placeId: "Biblioteca",
  });
  assert.deepEqual(getThreadHostAndPlace({ personaId: "Engenheiro", placeId: "Biblioteca" }), {
    hostPersonaId: "Engenheiro",
    placeId: "Biblioteca",
  });
});

test("selects only addressed unmuted participants for directed turns", () => {
  const participants = [
    { personaId: "Juiz", role: "HOST", active: true, muted: false },
    { personaId: "Mentor", role: "GUEST", active: true, muted: false },
    { personaId: "Vigia", role: "GUEST", active: true, muted: true },
  ];

  assert.deepEqual(detectAddressedParticipantIds("Mentor, responda isso", participants), ["Mentor"]);
  assert.deepEqual(
    selectSpeakingParticipantsForRound(participants, "Mentor, responda isso").map((participant) => participant.personaId),
    ["Mentor"],
  );
  assert.deepEqual(
    selectSpeakingParticipantsForRound(participants, "Vigia, responda isso").map((participant) => participant.personaId),
    [],
  );
});

test("recognizes first turn after invitation as addressed to the invited persona", () => {
  const participants = [
    { personaId: "Inimigo", role: "HOST", active: true, muted: false },
    { personaId: "Autor", role: "GUEST", active: true, muted: false },
  ];

  assert.deepEqual(detectAddressedParticipantIds("chamei o Autor, e agora?", participants), ["Autor"]);
  assert.deepEqual(
    selectSpeakingParticipantsForRound(participants, "chamei o Autor, e agora?").map((participant) => participant.personaId),
    ["Autor"],
  );
});

test("exclusive speaker focus overrides incidental persona mentions", () => {
  const participants = [
    { personaId: "Vidente", role: "HOST", active: true, muted: false },
    { personaId: "Estrategista", role: "GUEST", active: true, muted: false },
  ];

  assert.deepEqual(detectSpeakerFocusCommand("Vidente, deixa eu falar so com o Estrategista.", participants), {
    action: "set",
    personaId: "Estrategista",
  });
  assert.deepEqual(
    selectSpeakingParticipantsForRound(participants, "Vidente, deixa eu falar so com o Estrategista.").map((participant) => participant.personaId),
    ["Estrategista"],
  );
  assert.deepEqual(
    selectSpeakingParticipantsForRound(participants, "Agora quero ouvir os dois sobre isso.").map((participant) => participant.personaId),
    ["Vidente", "Estrategista"],
  );
});

test("collective duplicate detector catches near-identical persona answers", () => {
  const duplicate = detectCollectiveDuplicateResponse(
    "O sistema esta instavel. Esta persona nao conseguiu concluir a resposta agora.",
    [{ personaId: "Inimigo", role: "HOST", content: "O sistema esta instavel. Esta persona nao conseguiu concluir a resposta agora." }],
  );
  const distinct = detectCollectiveDuplicateResponse(
    "Eu entro como Autor: dou forma narrativa ao que ainda aparece como confusao.",
    [{ personaId: "Inimigo", role: "HOST", content: "Eu ja apontei a ferida e o flanco vulneravel." }],
  );

  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.matchedPersonaId, "Inimigo");
  assert.equal(distinct.duplicate, false);
});

test("chat UI sends first post-invite message through collective route", () => {
  const source = fs.readFileSync("app/components/MedievalChat.tsx", "utf8");
  const collective = fs.readFileSync("app/lib/nemosine/collective_chat_orchestrator.ts", "utf8");

  assert.match(source, /optimisticGuestCount > 0/);
  assert.match(source, /entrou na conversa/);
  assert.match(collective, /COLLECTIVE_DUPLICATE_DETECTED/);
  assert.match(collective, /COLLECTIVE_RESPONSE_REGENERATED/);
  assert.match(collective, /COLLECTIVE_RESPONSE_SUPPRESSED/);
  assert.doesNotMatch(collective, /buildComplementaryCollectiveFallback/);
  assert.doesNotMatch(collective, /minha obrigacao e acrescentar|Se essa leitura nao acrescentar/);
});
