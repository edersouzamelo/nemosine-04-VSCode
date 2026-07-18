const test = require("node:test");
const assert = require("node:assert/strict");
require("../cognitive-runtime/load-ts.cjs");

const {
  selectResponseDepthProfile,
} = require("../../app/lib/nemosine/response_depth.ts");

test("simple persona greeting selects GREETING depth", () => {
  const profile = selectResponseDepthProfile({
    userText: "Bom dia, Vidente",
    personaId: "Vidente",
    priorHistory: [],
  });

  assert.equal(profile.id, "GREETING");
});

test("common message selects STANDARD depth", () => {
  const profile = selectResponseDepthProfile({
    userText: "Quero conversar sobre uma ideia que tive hoje.",
    personaId: "Mentor",
    priorHistory: [],
  });

  assert.equal(profile.id, "STANDARD");
});

test("presence deep preference selects DEEP depth", () => {
  const profile = selectResponseDepthProfile({
    userText: "Quero conversar sobre uma ideia que tive hoje.",
    personaId: "Mentor",
    priorHistory: [],
    presenceContract: {
      userId: "user-1",
      personaId: "Mentor",
      scope: "PERSONA",
      responseDepth: "DEEP",
      genericHelpOfferPolicy: "BLOCK",
      genericContextRequestPolicy: "BLOCK_UNLESS_CRITICAL",
      finalQuestionPolicy: "ALLOW",
      symbolicLanguagePolicy: "NORMAL",
      repetitionPolicy: "STRICT",
      directnessLevel: "BALANCED",
      customConstraints: [],
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    },
  });

  assert.equal(profile.id, "DEEP");
});

test("substantive Nemosine weariness selects DEEP depth", () => {
  const profile = selectResponseDepthProfile({
    userText: "Muito desgastado com o Nemosine. Inumeras correcoes do codigo e nao fica bom. Parece que piora em vez de melhorar. Quero desabafar.",
    personaId: "Mentor",
    priorHistory: [],
  });

  assert.equal(profile.id, "DEEP");
});

test("explicit long rich request selects EXTENSIVE depth", () => {
  const profile = selectResponseDepthProfile({
    userText: "Responda de forma longa e extensa",
    personaId: "Mentor",
    priorHistory: [],
  });

  assert.equal(profile.id, "EXTENSIVE");
});

test("isolated Nemosine mention does not force DEEP depth", () => {
  const profile = selectResponseDepthProfile({
    userText: "Nemosine",
    personaId: "Mentor",
    priorHistory: [],
  });

  assert.equal(profile.id, "STANDARD");
});
