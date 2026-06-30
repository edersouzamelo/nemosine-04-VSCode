const test = require("node:test");
const assert = require("node:assert/strict");
require("../cognitive-runtime/load-ts.cjs");

const {
  getThreadHostAndPlace,
  selectSpeakingParticipantsForRound,
} = require("../../app/lib/nemosine/conversation_participants.ts");
const {
  parsePersonaPresenceCommands,
} = require("../../app/lib/nemosine/persona_command_parser.ts");

function participant(personaId, role, muted = false) {
  return {
    id: `presence-${personaId}`,
    threadId: "thread-1",
    personaId,
    role,
    joinedAt: new Date("2026-06-28T00:00:00.000Z"),
    leftAt: null,
    active: true,
    muted,
  };
}

test("canonical B keeps host and invited guests distinct in a debate round", () => {
  const invite = parsePersonaPresenceCommands("Convide Luz e Sombra para debater comigo.");
  assert.equal(invite.commands.length, 1);
  assert.equal(invite.commands[0].action, "invite");
  assert.deepEqual([...invite.commands[0].personaIds].sort(), ["Luz", "Sombra"]);

  const participants = [
    participant("Inimigo", "HOST"),
    participant("Luz", "GUEST"),
    participant("Sombra", "GUEST"),
  ];
  const speakers = selectSpeakingParticipantsForRound(participants, "Quero um debate real entre voces.");

  assert.deepEqual(speakers.map((item) => item.personaId), ["Inimigo", "Luz", "Sombra"]);
  assert.deepEqual(speakers.map((item) => item.role), ["HOST", "GUEST", "GUEST"]);
});

test("canonical C silences one participant while host and others continue", () => {
  const mute = parsePersonaPresenceCommands("silencie Sombra por enquanto.");
  assert.equal(mute.commands.length, 1);
  assert.equal(mute.commands[0].action, "mute");
  assert.deepEqual(mute.commands[0].personaIds, ["Sombra"]);

  const participants = [
    participant("Inimigo", "HOST"),
    participant("Luz", "GUEST"),
    participant("Sombra", "GUEST", true),
  ];
  const speakers = selectSpeakingParticipantsForRound(participants, "Continuem a rodada.");

  assert.deepEqual(speakers.map((item) => item.personaId), ["Inimigo", "Luz"]);
  assert.equal(speakers.some((item) => item.personaId === "Sombra"), false);
});

test("canonical D preserves host/place and does not recreate guests on directed turns", () => {
  assert.deepEqual(getThreadHostAndPlace({ personaId: "Inimigo", placeId: "Biblioteca" }), {
    hostPersonaId: "Inimigo",
    placeId: "Biblioteca",
  });

  const participants = [
    participant("Inimigo", "HOST"),
    participant("Luz", "GUEST"),
    participant("Sombra", "GUEST"),
  ];
  const directed = selectSpeakingParticipantsForRound(participants, "Luz, responda primeiro.");

  assert.deepEqual(directed.map((item) => item.personaId), ["Luz"]);
  assert.equal(participants.filter((item) => item.role === "HOST").length, 1);
  assert.equal(new Set(participants.map((item) => item.personaId)).size, participants.length);
});
