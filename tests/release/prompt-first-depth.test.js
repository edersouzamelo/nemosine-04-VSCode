const test = require("node:test");
const assert = require("node:assert/strict");
require("../cognitive-runtime/load-ts.cjs");

const {
  selectResponseDepthProfile,
} = require("../../app/lib/nemosine/response_depth.ts");

test("bom dia mentor selects GREETING depth", () => {
  const profile = selectResponseDepthProfile({
    userText: "bom dia mentor",
    personaId: "Mentor",
    priorHistory: [],
  });

  assert.equal(profile.id, "GREETING");
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
    userText: "quero uma resposta prolongada, rica, longa e extensa",
    personaId: "Mentor",
    priorHistory: [],
  });

  assert.equal(profile.id, "EXTENSIVE");
});
