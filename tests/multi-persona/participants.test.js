const test = require("node:test");
const assert = require("node:assert/strict");
require("../cognitive-runtime/load-ts.cjs");

const {
  MAX_ACTIVE_GUEST_PERSONAS,
  assertParticipantLimit,
  assertPersonaCanParticipate,
  getThreadHostAndPlace,
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
