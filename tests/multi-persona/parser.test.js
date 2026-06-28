const test = require("node:test");
const assert = require("node:assert/strict");
require("../cognitive-runtime/load-ts.cjs");

const {
  parsePersonaPresenceCommands,
  hasPersonaPresenceCommand,
  normalizePersonaCommandText,
} = require("../../app/lib/nemosine/persona_command_parser.ts");

test("normalizes accents and case", () => {
  assert.equal(normalizePersonaCommandText("Convide o Cientísta"), "convide o cientista");
});

test("parses explicit slash invite", () => {
  const parsed = parsePersonaPresenceCommands("/convidar Cientista");
  assert.deepEqual(parsed.commands, [{
    action: "invite",
    personaIds: ["Cientista"],
    raw: "/convidar Cientista",
  }]);
  assert.equal(parsed.semanticText, "");
});

test("parses natural invite with semantic remainder", () => {
  const parsed = parsePersonaPresenceCommands("Engenheiro, chame o Cientista e analisem isto");
  assert.equal(parsed.commands.length, 1);
  assert.equal(parsed.commands[0].action, "invite");
  assert.deepEqual(parsed.commands[0].personaIds, ["Cientista"]);
  assert.equal(parsed.semanticText, "analisem isto");
});

test("parses multiple invite names", () => {
  const parsed = parsePersonaPresenceCommands("convide Cientista e Vidente");
  assert.equal(parsed.commands.length, 1);
  assert.deepEqual(parsed.commands[0].personaIds, ["Cientista", "Vidente"]);
});

test("parses deterministic removal commands", () => {
  const parsed = parsePersonaPresenceCommands("remova Cientista e Vidente");
  assert.equal(parsed.commands.length, 1);
  assert.equal(parsed.commands[0].action, "remove");
  assert.deepEqual(parsed.commands[0].personaIds, ["Cientista", "Vidente"]);
});

test("parses direct persona can leave command", () => {
  const parsed = parsePersonaPresenceCommands("Cientista, pode sair");
  assert.equal(parsed.commands.length, 1);
  assert.deepEqual(parsed.commands[0].personaIds, ["Cientista"]);
  assert.equal(parsed.commands[0].action, "remove");
});

test("avoids narrative false positives", () => {
  const parsed = parsePersonaPresenceCommands("ontem conversei com o Cientista sobre isso");
  assert.deepEqual(parsed.commands, []);
  assert.equal(hasPersonaPresenceCommand("ontem conversei com o Cientista"), false);
});

test("rejects places as participants", () => {
  const parsed = parsePersonaPresenceCommands("convide Biblioteca");
  assert.deepEqual(parsed.commands, []);
});

test("operates on voice transcript", () => {
  const parsed = parsePersonaPresenceCommands("vamos seguir", "chame o Vidente");
  assert.equal(parsed.commands.length, 1);
  assert.equal(parsed.commands[0].action, "invite");
  assert.deepEqual(parsed.commands[0].personaIds, ["Vidente"]);
});
