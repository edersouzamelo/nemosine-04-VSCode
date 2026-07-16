const test = require("node:test");
const assert = require("node:assert/strict");
require("../cognitive-runtime/load-ts.cjs");

const {
  buildDeterministicThreadTitle,
  classifyTitlePayloadKind,
  shouldRepairThreadTitle,
} = require("../../app/lib/nemosine/thread_title.ts");

test("thread title ignores presence adjustment payload", () => {
  const payload = [
    "[[NEMOSINE_PRESENCE_OPENING]]",
    "Ajuste de Presenca confirmado. Produza agora a primeira leitura.",
    "Persona ativa: Vigia.",
  ].join("\n");
  assert.equal(classifyTitlePayloadKind(payload), "presence-system");
  assert.equal(buildDeterministicThreadTitle(payload), "Nova conversa");
});

test("thread title ignores handoff boilerplate and repairs from human prompt", () => {
  assert.equal(classifyTitlePayloadKind("Vim encaminhado pelo Vigia para conversar sobre sono."), "handoff-boilerplate");
  assert.equal(buildDeterministicThreadTitle("Vim encaminhado pelo Vigia para conversar sobre sono."), "Nova conversa");
  const prompt = "Estou perdendo muitas horas de sono desenvolvendo o Nemosine e preciso organizar uma estrategia.";
  assert.equal(buildDeterministicThreadTitle(prompt), "Estou perdendo muitas horas de sono desenvolv...");
  assert.equal(shouldRepairThreadTitle("Ajuste de Presenca", prompt), true);
});
