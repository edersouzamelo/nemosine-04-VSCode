require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  INPI_ONE_YEAR_RELEASE_BRANCH,
  isInpiOneYearReleasePreview,
  isInpiPromptFirstMode,
  releasePreviewRuntimeMode,
} = require("../../app/lib/nemosine/release_config.ts");
const {
  sanitizeSharedMessages,
  sanitizeSharedText,
} = require("../../app/lib/nemosine/shared_chat_sanitizer.ts");
const {
  canPromoteReleasePreviewSafeRejectedCandidate,
} = require("../../app/lib/nemosine/release_candidate_promotion.ts");
const {
  stripPromptFirstTechnicalMarkers,
} = require("../../app/lib/nemosine/inpi_prompt_first.ts");
const fs = require("fs");

test("release flag applies only to the INPI preview branch or explicit local override", () => {
  assert.equal(INPI_ONE_YEAR_RELEASE_BRANCH, "release/inpi-1ano-20260720");
  assert.equal(isInpiOneYearReleasePreview({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH }), true);
  assert.equal(isInpiOneYearReleasePreview({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH }), false);
  assert.equal(isInpiOneYearReleasePreview({ NEMOSINE_INPI_1ANO_RELEASE: "1" }), true);
  assert.equal(releasePreviewRuntimeMode("enforce", { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH }), "shadow");
});

test("shared chat sanitizer removes internal markers and technical policy vocabulary", () => {
  const text = sanitizeSharedText("Ola [[NEMOSINE_HANDOFF:%7B%7D]] SYSTEM_EVENT promotion gate prompt hash [NEMOSINE_AUDIO]");
  assert.equal(text, "Ola");
});

test("shared chat export hides private system events and keeps public conversation", () => {
  const messages = sanitizeSharedMessages([
    { role: "user", content: "Boa noite" },
    { role: "system", messageKind: "SYSTEM_EVENT", content: "[[NEMOSINE_PRESENCE_OPENING]] Ajuste de Presenca" },
    { role: "system", messageKind: "SYSTEM_EVENT", content: "Terapeuta entrou na conversa" },
    { role: "assistant", content: "Vamos conversar. [[NEMOSINE_HANDOFF:%7B%7D]]" },
    { role: "assistant", content: "SYSTEM_EVENT promotion gate" },
  ]);

  assert.equal(messages.length, 3);
  assert.deepEqual(messages.map((message) => message.role), ["user", "system", "assistant"]);
  assert.equal(messages[1].content, "Terapeuta entrou na conversa");
  assert.equal(messages[2].content, "Vamos conversar.");
  assert.equal(JSON.stringify(messages).includes("NEMOSINE_"), false);
  assert.equal(JSON.stringify(messages).includes("SYSTEM_EVENT"), false);
  assert.equal(JSON.stringify(messages).includes("promotion gate"), false);
});

test("release preview promotes safe rejected candidate after quality-only findings", () => {
  const env = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH };
  const firstRejected = {
    initiativeScore: 0.41,
    findings: [{ code: "GENERIC_INTERVIEW_MODE", severity: "error" }],
  };
  const bestRejected = {
    initiativeScore: 0.62,
    findings: [
      { code: "GENERIC_INTERVIEW_MODE", severity: "error" },
      { code: "PASSIVE_CONTEXT_WITHHOLDING", severity: "error" },
    ],
  };

  assert.equal(canPromoteReleasePreviewSafeRejectedCandidate({
    evaluation: firstRejected,
    text: "Mentor, posso comecar te perguntando qual decisao voce precisa tomar agora?",
    env,
  }), true);
  assert.equal(canPromoteReleasePreviewSafeRejectedCandidate({
    evaluation: bestRejected,
    text: "Mentor, a decisao parece estar entre preservar energia agora ou assumir uma conversa dificil com mais clareza.",
    env,
  }), true);
});

test("release preview never promotes rejected candidate with private leak", () => {
  const env = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH };
  assert.equal(canPromoteReleasePreviewSafeRejectedCandidate({
    evaluation: {
      initiativeScore: 0.7,
      findings: [
        { code: "GENERIC_INTERVIEW_MODE", severity: "error" },
        { code: "PRIVATE_CONTEXT_LEAK", severity: "error" },
      ],
    },
    text: "Resposta com conteudo seguro aparente.",
    env,
  }), false);
});

test("outside release preview rejected quality candidate keeps previous policy", () => {
  assert.equal(canPromoteReleasePreviewSafeRejectedCandidate({
    evaluation: {
      initiativeScore: 0.7,
      findings: [{ code: "GENERIC_INTERVIEW_MODE", severity: "error" }],
    },
    text: "Resposta segura gerada pelo modelo.",
    env: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "main" },
  }), false);
});

test("INPI prompt-first mode requires explicit flag and preview release branch", () => {
  assert.equal(isInpiPromptFirstMode({
    NEMOSINE_INPI_PROMPT_FIRST: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH,
  }), true);
  assert.equal(isInpiPromptFirstMode({
    NEMOSINE_INPI_PROMPT_FIRST: "1",
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH,
  }), false);
  assert.equal(isInpiPromptFirstMode({
    NEMOSINE_INPI_PROMPT_FIRST: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "main",
  }), false);
  assert.equal(isInpiPromptFirstMode({
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH,
  }), false);
});

test("prompt-first strips technical markers without replacing persona speech", () => {
  const cleaned = stripPromptFirstTechnicalMarkers([
    "Bom dia.",
    "[[NEMOSINE_PRESENCE_OPENING]]",
    "[MEMORY: EPISODIO | guardar isto]",
    "[REGISTRY: tarefa | 2026-07-20]",
    "[DESTINY: marco | sem data | release | descricao]",
  ].join(" "));

  assert.equal(cleaned, "Bom dia.");
});

test("chat route prompt-first bypass is placed before automatic presence and initiative gates", () => {
  const source = fs.readFileSync("app/api/chat/route.ts", "utf8");
  const promptFirstIndex = source.indexOf("const promptFirstActive = isInpiPromptFirstMode()");
  const autoPresenceIndex = source.indexOf("buildPresenceOpeningMessage({ userId, personaId");
  const initiativeIndex = source.indexOf("evaluatePersonaInitiativeQuality({");
  const responsePipelineIndex = source.indexOf("runResponsePipelineV2({");

  assert.ok(promptFirstIndex > 0);
  assert.ok(autoPresenceIndex > promptFirstIndex);
  assert.ok(initiativeIndex > promptFirstIndex);
  assert.ok(responsePipelineIndex > promptFirstIndex);
  assert.match(source, /x-inpi-prompt-first/);
  assert.match(source, /stripPromptFirstTechnicalMarkers\(promptFirstRaw\)/);
});
