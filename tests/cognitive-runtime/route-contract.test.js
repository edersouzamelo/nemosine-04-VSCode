require("./load-ts.cjs");

const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

function source(path) {
  return fs.readFileSync(path, "utf8");
}

test("main chat route evaluates cognitive ENFORCE before response-pipeline delivery", () => {
  const chatRoute = source("app/api/chat/route.ts");
  const runtimeEnforce = chatRoute.indexOf('if (runtimeConfig.mode === "enforce")');
  const pipelineEnforce = chatRoute.indexOf('if (responsePipelineConfig.mode === "enforce")');

  assert.ok(runtimeEnforce > 0, "runtime ENFORCE branch missing");
  assert.ok(pipelineEnforce > 0, "response pipeline branch missing");
  assert.ok(runtimeEnforce < pipelineEnforce, "response pipeline can deliver before cognitive ENFORCE");
  assert.match(chatRoute, /conversationNavigationAnswer[\s\S]+deliverEnforcedCognitiveRuntime/);
  assert.match(chatRoute, /x-cognitive-delivery-contract['"]:\s*['"]ocv-promotion-gate/);
});

test("collective chat persists persona messages through cognitive runtime in ENFORCE", () => {
  const collective = source("app/lib/nemosine/collective_chat_orchestrator.ts");
  const runtimeEnforce = collective.indexOf('if (runtimeConfig.mode === "enforce")');
  const legacyEffects = collective.indexOf("commitPersonaLegacyEffects");

  assert.ok(runtimeEnforce > 0, "collective runtime ENFORCE branch missing");
  assert.ok(legacyEffects > 0, "legacy collective effects path missing");
  assert.ok(runtimeEnforce < legacyEffects || collective.indexOf("commitPersonaLegacyEffects({", runtimeEnforce) > runtimeEnforce);
  assert.match(collective, /persistAssistantMessage:\s*async \(\{ answer \}\)/);
  assert.match(collective, /updatePersonaMessageGeneration\(input\.round\.userId, input\.messageId, answer, "COMPLETED"\)/);
  assert.match(collective, /cognitivePromotionDecision/);
});

test("pure sovereign chat buffers generation before basal safety delivery", () => {
  const pureChat = source("app/api/sovereign/pure-chat/route.ts");

  assert.equal(pureChat.includes("streamText"), false);
  assert.match(pureChat, /generateText/);
  assert.match(pureChat, /evaluateBasalPureChatSafety\(result\.text \|\| ""\)/);
  assert.match(pureChat, /createPromotedUIMessageStreamResponse/);
  assert.match(pureChat, /SAFE_PURE_CHAT_FAILURE/);
});
