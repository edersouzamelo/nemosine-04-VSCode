const test = require("node:test");
const assert = require("node:assert/strict");
require("../cognitive-runtime/load-ts.cjs");

const {
  MAX_ACTIVE_GUEST_PERSONAS,
  assertParticipantLimit,
  assertPersonaCanParticipate,
  detectAddressedParticipantIds,
  getThreadHostAndPlace,
  selectSpeakingParticipantsForRound,
} = require("../../app/lib/nemosine/conversation_participants.ts");

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
