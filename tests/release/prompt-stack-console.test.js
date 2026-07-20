require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  buildCodexPersonaDirectory,
  buildV1StablePromptStack,
  isPromptStackInterceptorEnabled,
  normalizePromptStackPreset,
  V1_STABLE_PROMPT_STACK_PRESET,
} = require("../../app/lib/nemosine/prompt_stack.ts");
const {
  buildAprovisionadorDiagnostic,
  getPromptConsoleRuntime,
} = require("../../app/lib/nemosine/prompt_console_store.ts");
const {
  selectResponseDepthProfile,
} = require("../../app/lib/nemosine/response_depth.ts");

function baseInput(overrides = {}) {
  const userText = overrides.userText || "Preciso ajustar dieta e treino; qual persona deveria cuidar de cada parte?";
  return {
    userId: "test-user",
    personaId: "Aprovisionador",
    memoryScope: "Aprovisionador",
    userText,
    language: "pt-BR",
    priorHistory: [],
    activeThreadId: "thread-test",
    presenceContract: null,
    depthProfile: selectResponseDepthProfile({
      userText,
      priorHistory: [],
      personaId: "Aprovisionador",
      presenceContract: null,
    }),
    memories: [],
    episodes: [],
    topics: [],
    ...overrides,
  };
}

test("prompt stack keeps safety enabled and current user message last", () => {
  const preset = normalizePromptStackPreset({
    ...V1_STABLE_PROMPT_STACK_PRESET,
    modules: V1_STABLE_PROMPT_STACK_PRESET.modules.map((module) => ({
      ...module,
      enabled: module.id === "security_truth" ? false : module.enabled,
      order: module.id === "current_user_message" ? 1 : module.order,
    })),
  });

  const safety = preset.modules.find((module) => module.id === "security_truth");
  const current = preset.modules.find((module) => module.id === "current_user_message");

  assert.equal(safety.enabled, true);
  assert.equal(current.order, 9999);
});

test("reordered prompt stack changes real resolved prompt order", () => {
  const moved = normalizePromptStackPreset({
    ...V1_STABLE_PROMPT_STACK_PRESET,
    modules: V1_STABLE_PROMPT_STACK_PRESET.modules.map((module) => {
      if (module.id === "codex_persona_directory") return { ...module, order: 25 };
      if (module.id === "persona_soul") return { ...module, order: 60 };
      return module;
    }),
  });
  const stack = buildV1StablePromptStack(baseInput({ preset: moved }));

  assert.ok(stack.systemPrompt.indexOf("DIRETORIO CODEX DE PERSONAS") < stack.systemPrompt.indexOf("PROMPT VIVO DA PERSONA"));
});

test("disabled module leaves the real prompt and tokenBudget truncates real content", () => {
  const disabledCodex = normalizePromptStackPreset({
    ...V1_STABLE_PROMPT_STACK_PRESET,
    modules: V1_STABLE_PROMPT_STACK_PRESET.modules.map((module) =>
      module.id === "codex_persona_directory" ? { ...module, enabled: false } : module,
    ),
  });
  const withoutCodex = buildV1StablePromptStack(baseInput({ preset: disabledCodex }));
  assert.equal(withoutCodex.codexDirectoryInserted, false);
  assert.doesNotMatch(withoutCodex.systemPrompt, /DIRETORIO CODEX DE PERSONAS/);

  const tinyCodex = normalizePromptStackPreset({
    ...V1_STABLE_PROMPT_STACK_PRESET,
    modules: V1_STABLE_PROMPT_STACK_PRESET.modules.map((module) =>
      module.id === "codex_persona_directory" ? { ...module, tokenBudget: 40 } : module,
    ),
  });
  const truncated = buildV1StablePromptStack(baseInput({ preset: tinyCodex }));
  const codex = truncated.modules.find((module) => module.id === "codex_persona_directory");
  assert.match(codex.resolvedText, /TRUNCATED_BY_PROMPT_STACK_TOKEN_BUDGET:40/);
  assert.ok(codex.tokensUsed <= 45);
});

test("presence module enters prompt only after explicit confirmation", () => {
  const noContract = buildV1StablePromptStack(baseInput());
  assert.equal(noContract.presence.moduleInserted, false);
  assert.match(noContract.presence.reasonWhenNotInserted, /Nenhuma opcao confirmada/);

  const withContract = buildV1StablePromptStack(baseInput({
    presenceContract: {
      userId: "test-user",
      personaId: "Aprovisionador",
      conversationId: "thread-test",
      scope: "CONVERSATION",
      currentGoal: "organizar um plano alimentar",
      responseDepth: "BALANCED",
      genericHelpOfferPolicy: "ALLOW",
      genericContextRequestPolicy: "ALLOW",
      finalQuestionPolicy: "ALLOW",
      symbolicLanguagePolicy: "NORMAL",
      repetitionPolicy: "NORMAL",
      directnessLevel: "BALANCED",
      customConstraints: ["nao repetir o que eu ja disse"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }));
  assert.equal(withContract.presence.moduleInserted, true);
  assert.match(withContract.systemPrompt, /PRESENCE CONTRACT/);
});

test("Codex directory tells Aprovisionador that Treinador exists without handoff", () => {
  const directory = buildCodexPersonaDirectory();
  assert.match(directory, /Treinador existe e e a persona adequada/);
  assert.match(directory, /Abra o menu Personas, selecione a persona adequada/);
  assert.match(directory, /\/agents\/Treinador/);
  assert.match(directory, /nao inicie conversa coletiva/i);
  assert.match(directory, /nao responda em nome de outra persona/i);
});

test("V1 Stable interceptors are off or limited by default", () => {
  assert.equal(isPromptStackInterceptorEnabled(V1_STABLE_PROMPT_STACK_PRESET, "social_continuation"), false);
  assert.equal(isPromptStackInterceptorEnabled(V1_STABLE_PROMPT_STACK_PRESET, "response_pipeline_v2"), false);
  assert.equal(isPromptStackInterceptorEnabled(V1_STABLE_PROMPT_STACK_PRESET, "ocv"), false);
  assert.equal(isPromptStackInterceptorEnabled(V1_STABLE_PROMPT_STACK_PRESET, "stylistic_regeneration"), false);
});

test("prompt console runtime is dev-account only and API is server-side protected", () => {
  assert.equal(getPromptConsoleRuntime({
    userEmail: "edersouzamelo@gmail.com",
    env: { NODE_ENV: "development" },
  }).enabled, true);
  assert.equal(getPromptConsoleRuntime({
    userEmail: "regular@example.com",
    env: { NODE_ENV: "development" },
  }).enabled, false);
  assert.equal(getPromptConsoleRuntime({
    userEmail: "edersouzamelo@gmail.com",
    env: { VERCEL_ENV: "production" },
  }).enabled, false);

  const apiSource = fs.readFileSync("app/api/developer/prompt-console/route.ts", "utf8");
  assert.match(apiSource, /isAdminEmail/);
  assert.match(apiSource, /status: 403/);
  assert.match(apiSource, /action === "restore"/);
  assert.match(apiSource, /action === "save-copy"/);
});

test("Aprovisionador diagnostic identifies deterministic social continuation source", () => {
  const diagnostic = buildAprovisionadorDiagnostic();
  assert.ok(diagnostic.codeConfirmed.some((line) => line.includes("buildSocialContinuationAnswer")));
  assert.ok(diagnostic.codeConfirmed.some((line) => line.includes("social_continuation.ts")));
  assert.ok(diagnostic.inference.some((line) => line.includes("prompt-first")));
});
