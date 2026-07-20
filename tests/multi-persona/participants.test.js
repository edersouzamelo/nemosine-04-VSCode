const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
require("../cognitive-runtime/load-ts.cjs");

const {
  MAX_ACTIVE_GUEST_PERSONAS,
  assertParticipantLimit,
  assertPersonaCanParticipate,
  decideSpeakersForRound,
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

test("inviting a persona does not make the invited persona answer automatically", () => {
  const participants = [
    { personaId: "Inimigo", role: "HOST", active: true, muted: false },
    { personaId: "Autor", role: "GUEST", active: true, muted: false },
  ];

  assert.deepEqual(detectAddressedParticipantIds("chamei o Autor, e agora?", participants), []);
  assert.deepEqual(
    selectSpeakingParticipantsForRound(participants, "chamei o Autor, e agora?").map((participant) => participant.personaId),
    ["Inimigo"],
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

test("speaker decision sends direct vocational address only to Estrategista", () => {
  const participants = [
    { personaId: "Vigia", role: "HOST", active: true, muted: false },
    { personaId: "Estrategista", role: "GUEST", active: true, muted: false },
  ];
  const decision = decideSpeakersForRound(participants, "fala Estrategista, o que voce pode ajudar nesta questao?");
  assert.deepEqual(decision, {
    mode: "single_target",
    targetPersonaIds: ["Estrategista"],
    reason: "direct_persona_addressing",
    confidence: 0.92,
  });
  assert.deepEqual(
    selectSpeakingParticipantsForRound(participants, "Vigia, deixe so o Estrategista falar").map((participant) => participant.personaId),
    ["Estrategista"],
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

  assert.match(source, /const multiPersonaDevOnly = isAdmin/);
  assert.match(source, /multiPersonaDevOnly && multiPersonaEnabled/);
  assert.match(source, /canInvite=\{multiPersonaDevOnly && multiPersonaEnabled/);
  assert.match(source, /devOnly/);
  assert.match(source, /optimisticGuestCount > 0/);
  assert.match(source, /entrou na conversa/);
  assert.match(collective, /COLLECTIVE_DUPLICATE_DETECTED/);
  assert.match(collective, /COLLECTIVE_RESPONSE_REGENERATED/);
  assert.match(collective, /COLLECTIVE_RESPONSE_SUPPRESSED/);
  assert.doesNotMatch(collective, /buildComplementaryCollectiveFallback/);
  assert.doesNotMatch(collective, /minha obrigacao e acrescentar|Se essa leitura nao acrescentar/);
});

test("multi-persona routes are server-side dev-only", () => {
  const participantsRoute = fs.readFileSync("app/api/chat/participants/route.ts", "utf8");
  const collectiveRoute = fs.readFileSync("app/api/chat/collective/route.ts", "utf8");
  const handoffRoute = fs.readFileSync("app/api/chat/handoff/route.ts", "utf8");
  const handoffContextRoute = fs.readFileSync("app/api/chat/handoff/context/route.ts", "utf8");

  assert.match(participantsRoute, /isAdminEmail\(user\.email\)/);
  assert.match(participantsRoute, /error: "DEV_ONLY"/);
  assert.match(collectiveRoute, /isAdminEmail\(user\.email\)/);
  assert.match(collectiveRoute, /error: "DEV_ONLY"/);
  assert.match(handoffRoute, /isAdminEmail\(session\.user\.email\)/);
  assert.match(handoffRoute, /error: "DEV_ONLY"/);
  assert.match(handoffContextRoute, /isAdminEmail\(session\.user\.email\)/);
  assert.match(handoffContextRoute, /error: "DEV_ONLY"/);
});

test("public chat UI hides handoff and collective residue outside dev account", () => {
  const chat = fs.readFileSync("app/components/MedievalChat.tsx", "utf8");
  const history = fs.readFileSync("app/components/ChatHistoryList.tsx", "utf8");
  const chatRoute = fs.readFileSync("app/api/chat/route.ts", "utf8");

  assert.match(chat, /if \(!multiPersonaDevOnly && msg\.role === "assistant" && msg\.speakerPersonaId/);
  assert.match(chat, /if \(!multiPersonaDevOnly && \(msg\.role === "system" \|\| msg\.messageKind === "SYSTEM_EVENT"\) && isMultiPersonaSystemEventText/);
  assert.match(chat, /const handoffOffers = multiPersonaDevOnly && msg\.role === "assistant"/);
  assert.match(history, /isAdmin && thread\.participants && thread\.participants\.length > 1/);
  assert.match(chatRoute, /const rawHandoffOffers = multiPersonaDevOnly \? requestedHandoffOffers : \[\]/);
  assert.match(chatRoute, /x-nemosine-public-persona-route/);
});
