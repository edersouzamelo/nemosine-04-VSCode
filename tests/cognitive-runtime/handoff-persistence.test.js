const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

function source(path) {
  return fs.readFileSync(path, "utf8");
}

function prismaModel(sourceText, modelName) {
  const start = sourceText.indexOf(`model ${modelName} {`);
  assert.ok(start >= 0, `model ${modelName} not found`);
  const nextModel = sourceText.indexOf("\nmodel ", start + 1);
  return sourceText.slice(start, nextModel > start ? nextModel : undefined);
}

test("handoff offers are persisted as structured message events", () => {
  const schema = source("prisma/schema.prisma");
  const sessionStore = source("app/lib/nemosine/session_store.ts");
  const chatRoute = source("app/api/chat/route.ts");
  const messageModel = prismaModel(schema, "Message");

  assert.doesNotMatch(messageModel, /metadata\s+Json\?/);
  assert.match(sessionStore, /eventType:\s*'HANDOFF_OFFERED'/);
  assert.match(sessionStore, /upsertHandoffEventMessage/);
  assert.match(sessionStore, /HANDOFF_EVENT_CONTENT_PREFIX/);
  assert.match(sessionStore, /messageKind:\s*'SYSTEM_EVENT'/);
  assert.match(sessionStore, /originMessageId === originMessageId/);
  assert.match(chatRoute, /upsertHandoffEventMessage\(userId,\s*activeThreadId/);
  assert.match(chatRoute, /originMessageId:\s*runtimeResult\.assistantMessageId/);
});

test("handoff state updates are metadata-only and auditable", () => {
  const sessionStore = source("app/lib/nemosine/session_store.ts");
  const handoffRoute = source("app/api/chat/handoff/route.ts");

  assert.match(sessionStore, /updateHandoffEventState/);
  assert.match(sessionStore, /state:\s*input\.state/);
  assert.match(sessionStore, /openedAt:\s*input\.state === 'opened'/);
  assert.match(sessionStore, /invitedAt:\s*input\.state === 'invited'/);
  assert.match(handoffRoute, /HANDOFF_OPENED/);
  assert.match(handoffRoute, /HANDOFF_INVITED/);
  assert.match(handoffRoute, /contentStored:\s*false/);
});

test("chat history restores handoff cards without raw persona text", () => {
  const chat = source("app/components/MedievalChat.tsx");
  const handoff = source("app/lib/nemosine/handoff.ts");

  assert.match(chat, /metadata:\s*m\.metadata \?\? null/);
  assert.match(chat, /msg\.role === "system" && handoffOfferFromMessage\(msg\)/);
  assert.match(chat, /handoffOfferFromMessage/);
  assert.match(chat, /aria-expanded=\{expanded\}/);
  assert.match(chat, /nemosine-handoff-card-open/);
  assert.match(chat, /recordSelection\("opened"\)/);
  assert.match(chat, /recordSelection\("invited"\)/);
  assert.match(handoff, /personaSlug\(offer\.targetPersona\)/);
});
