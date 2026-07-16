const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");
require("./load-ts.cjs");
const {
  resolveVocationalTargets,
  buildPersonaHandoffOffer,
  buildHostStyledHandoffAnswer,
} = require("../../app/lib/nemosine/handoff.ts");

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

test("vocational resolver returns concrete ranked personas for boss conflict", () => {
  const resolution = resolveVocationalTargets({
    currentPersona: "Cientista",
    userText: "Meu chefe nao sabe o que quer e pede dados diferentes em cada reuniao. Como lidar com isso?",
    maxTargets: 3,
  });
  const targets = [resolution.primaryTargetPersonaId, ...resolution.alternativeTargetPersonaIds].filter(Boolean);

  assert.equal(resolution.primaryTargetPersonaId, "Estrategista");
  assert.ok(targets.includes("Estrategista"));
  assert.ok(targets.some((target) => ["Comandante", "Adjunto", "Mentor"].includes(target)));
  assert.ok(resolution.confidence >= 0.55);
  assert.equal(targets.includes("uma persona mais adequada"), false);
  assert.match(resolution.rationaleByPersona.Estrategista, /prioridade|plano|opcoes|riscos/i);
});

test("current persona fit protects competent emotional personas from aggressive handoff", () => {
  const resolution = resolveVocationalTargets({
    currentPersona: "Psicólogo",
    userText: "Estou muito estressado no trabalho, dormindo mal e com inseguranca corporal antes da competicao.",
    maxTargets: 3,
  });
  const targets = [resolution.primaryTargetPersonaId, ...resolution.alternativeTargetPersonaIds].filter(Boolean);

  assert.match(resolution.currentPersonaFit, /primary|valid/);
  assert.equal(resolution.currentPersonaCanContinue, true);
  assert.equal(targets.includes("Autor"), false);
});

test("handoff answer names a concrete target and never exposes vocational placeholders", () => {
  const offer = buildPersonaHandoffOffer({
    sourcePersona: "Cientista",
    targetPersona: "Estrategista",
    userText: "Meu chefe muda as demandas em toda reuniao.",
    reasonOverride: "Para organizar opcoes, prioridades e um plano de abordagem.",
  });

  assert.match(offer.answer, /Estrategista/);
  assert.doesNotMatch(offer.answer, /uma persona mais adequada|Pelo meu campo|aplicar essa missao|preservando diferenca de voz/i);
});

test("host styled handoff keeps persona voice instead of bureaucratic template", () => {
  const inimigo = buildHostStyledHandoffAnswer({
    sourcePersona: "Inimigo",
    targetPersona: "Autor",
    reason: "Para transformar o material vivido em forma narrativa.",
  });
  const mentor = buildHostStyledHandoffAnswer({
    sourcePersona: "Mentor",
    targetPersona: "Estrategista",
    reason: "Para organizar prioridade e plano.",
  });
  const cientista = buildHostStyledHandoffAnswer({
    sourcePersona: "Cientista",
    targetPersona: "Estrategista",
    reason: "Para organizar prioridade e plano.",
  });

  assert.match(inimigo, /mordendo|flanco|faca|corte/i);
  assert.match(mentor, /eixo|sentido|companhia/i);
  assert.match(cientista, /fatos|hipoteses|criterios observaveis/i);
  assert.doesNotMatch(inimigo + mentor + cientista, /Pelo meu campo|rota vocacional mais direta|texto burocratico/i);
  assert.notEqual(inimigo, mentor);
  assert.notEqual(mentor, cientista);
});

test("chat route reuses persisted handoff options and blocks duplicate fallback loops", () => {
  const chatRoute = source("app/api/chat/route.ts");
  const orchestrator = source("app/lib/nemosine/cognitive-runtime/orchestrator.ts");

  assert.match(chatRoute, /HANDOFF_REUSED_FROM_HISTORY/);
  assert.match(chatRoute, /persistHandoffEvents:\s*false/);
  assert.match(chatRoute, /VOCATIONAL_TARGET_RESOLVED/);
  assert.match(chatRoute, /HOST_STYLED_HANDOFF_COMPOSED/);
  assert.match(chatRoute, /HANDOFF_OPTIONS_PRESENTED/);
  assert.match(chatRoute, /buildHandoffOffersFromResolution/);
  assert.doesNotMatch(chatRoute, /chefe\|superior\|lider\|reuniao\|demanda\|profissional\|trabalho/);
  assert.doesNotMatch(chatRoute, /candidateOverride:\s*handoff\.answer/);
  assert.doesNotMatch(chatRoute, /candidateOverride:\s*buildVocationalAnswer/);
  assert.doesNotMatch(orchestrator, /uma persona mais adequada/);
});
