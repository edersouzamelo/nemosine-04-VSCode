require("../cognitive-runtime/load-ts.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  INPI_ONE_YEAR_RELEASE_BRANCH,
  isInpiOneYearReleasePreview,
  isInpiPromptFirstMode,
  releaseOneProductionRuntimeMode,
  releasePreviewRuntimeMode,
} = require("../../app/lib/nemosine/release_config.ts");
const {
  sanitizeSharedMessages,
  sanitizeSharedText,
  sanitizeSharedTitle,
} = require("../../app/lib/nemosine/shared_chat_sanitizer.ts");
const {
  canPromoteReleasePreviewSafeRejectedCandidate,
} = require("../../app/lib/nemosine/release_candidate_promotion.ts");
const {
  buildPromptFirstNarrativeRepairInstruction,
  evaluatePromptFirstNarrativeStyle,
  stripPromptFirstTechnicalMarkers,
} = require("../../app/lib/nemosine/inpi_prompt_first.ts");
const {
  buildNativePersonaPromptPayload,
} = require("../../app/data/nativePersonaPrompts.ts");
const {
  buildSocialContinuationAnswer,
  isSocialContinuationInput,
} = require("../../app/lib/nemosine/social_continuation.ts");
const {
  buildReleaseOnePersonaRescueAnswer,
  isPersonaDepthRepairRequest,
  isReleaseReadinessQuestion,
  isShallowPersonaTemplateResponse,
} = require("../../app/lib/nemosine/release_one_persona_rescue.ts");
const {
  buildFantasmaReleaseAnswer,
} = require("../../app/lib/nemosine/fantasma_release_rescue.ts");
const fs = require("fs");

test("release flag applies only to the INPI preview branch or explicit local override", () => {
  assert.equal(INPI_ONE_YEAR_RELEASE_BRANCH, "release/inpi-1ano-20260720");
  assert.equal(isInpiOneYearReleasePreview({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH }), true);
  assert.equal(isInpiOneYearReleasePreview({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH }), false);
  assert.equal(isInpiOneYearReleasePreview({ NEMOSINE_INPI_1ANO_RELEASE: "1" }), true);
  assert.equal(releasePreviewRuntimeMode("enforce", { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH }), "shadow");
  assert.equal(releaseOneProductionRuntimeMode("enforce", { VERCEL_ENV: "production" }), "off");
  assert.equal(releaseOneProductionRuntimeMode("enforce", { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feature/runtime" }), "enforce");
  assert.equal(releaseOneProductionRuntimeMode("enforce", { VERCEL_ENV: "production", NEMOSINE_ALLOW_COGNITIVE_RUNTIME_IN_PRODUCTION: "1" }), "enforce");
  assert.equal(isInpiPromptFirstMode({ VERCEL_ENV: "production" }), true);
  assert.equal(isInpiPromptFirstMode({ VERCEL_ENV: "production", NEMOSINE_DISABLE_NATIVE_PROMPT_FIRST_PRODUCTION: "1" }), false);
});

test("shared chat sanitizer removes internal markers and technical policy vocabulary", () => {
  const text = sanitizeSharedText("Ola [[NEMOSINE_HANDOFF:%7B%7D]] SYSTEM_EVENT promotion gate prompt hash [NEMOSINE_AUDIO]");
  assert.equal(text, "Ola");
});

test("shared chat export hides private system events and keeps public conversation", () => {
  const messages = sanitizeSharedMessages([
    { role: "user", content: "Boa noite" },
    { role: "system", messageKind: "SYSTEM_EVENT", content: "[[NEMOSINE_PRESENCE_OPENING]] Ajuste de Presenca" },
    { role: "user", content: "[[NEMOSINE_PRESENCE_OPENING]]\nAjuste de Presenca confirmado.\nProfundidade solicitada: DEEP." },
    { role: "system", messageKind: "SYSTEM_EVENT", content: "Terapeuta entrou na conversa" },
    { role: "assistant", content: "Vamos conversar. [[NEMOSINE_HANDOFF:%7B%7D]]" },
    { role: "assistant", speakerPersonaId: "Terapeuta", content: "Entrei como convidado." },
    { role: "assistant", content: "Nao foi possivel formular uma resposta adequada nesta tentativa." },
    { role: "assistant", content: "Parece que houve um problema. Vamos tentar novamente. Se quiser explorar um aspecto especifico, descreva melhor." },
    { role: "user", content: "ue porque voce ficou quieto" },
    { role: "assistant", content: "SYSTEM_EVENT promotion gate" },
  ], { primaryPersonaId: "Mentor" });

  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map((message) => message.role), ["user", "assistant"]);
  assert.equal(messages[1].content, "Vamos conversar.");
  assert.equal(JSON.stringify(messages).includes("NEMOSINE_"), false);
  assert.equal(JSON.stringify(messages).includes("SYSTEM_EVENT"), false);
  assert.equal(JSON.stringify(messages).includes("promotion gate"), false);
  assert.equal(JSON.stringify(messages).includes("convidado"), false);
  assert.equal(JSON.stringify(messages).includes("Parece que houve"), false);
  assert.equal(JSON.stringify(messages).includes("ficou quieto"), false);
});

test("shared chat title hides public handoff command residue", () => {
  assert.equal(
    sanitizeSharedTitle("chama o estrategista pra eu ver se isso e verdade", "Inimigo"),
    "Conversa com Inimigo",
  );
  assert.equal(sanitizeSharedTitle("Boa noite no Mentor", "Mentor"), "Boa noite no Mentor");
});

test("social continuation keeps ironic celebration from entering technical fallback loop", () => {
  assert.equal(isSocialContinuationInput("ALELUIA SURICANTADEBANEIA DEU CERTO"), true);
  assert.equal(isSocialContinuationInput("kkkk"), true);
  assert.equal(isSocialContinuationInput("oxe morreu"), true);

  const celebration = buildSocialContinuationAnswer({
    personaId: "Bruxo",
    userText: "ALELUIA SURICANTADEBANEIA DEU CERTO",
    latestAssistantText: "Eu nao consigo chamar Mestre dentro desta conversa nesta versao. O caminho limpo e: abra o menu de personas.",
  });
  assert.match(celebration, /Deu certo/);
  assert.match(celebration, /Bruxo/);
  assert.doesNotMatch(celebration, /Nao foi possivel formular/i);

  const recovery = buildSocialContinuationAnswer({
    personaId: "Bruxo",
    userText: "Vamos continuar a conversa.",
    latestRawAssistantText: "Nao foi possivel formular uma resposta adequada nesta tentativa.",
  });
  assert.match(recovery, /Voltei/);
  assert.match(recovery, /modo simples da 1.0/);
});

test("Vidente release rescue blocks cold template mode for 1.0 readiness", () => {
  const userText = "quero saber se desta vez, depois de todos os ajustes que fizemos, o sistema vai funcionar minimamente pra permitir que ele seja divulgado";

  assert.equal(isReleaseReadinessQuestion(userText), true);

  const answer = buildReleaseOnePersonaRescueAnswer({
    personaId: "Vidente",
    userText,
  });

  assert.match(answer, /A leitura que eu assumo e esta/);
  assert.match(answer, /uma conversa limpa, com uma persona de cada vez/);
  assert.match(answer, /confianca media-alta/);
  assert.doesNotMatch(answer, /Imagine que o sistema/i);
  assert.doesNotMatch(answer, /Sinto muito se nao atendi/i);
  assert.doesNotMatch(answer, /barco|espetaculo|orquestra|mochila/i);
});

test("Vidente depth repair replaces shallow apology after persona critique", () => {
  const critique = "ta, cade sua resposta profunda prolongada? voce zerou o simbolismo e a identidade narrativa";
  assert.equal(isPersonaDepthRepairRequest(critique), true);

  const shallow = "Imagine que o sistema e como uma orquestra prestes a se apresentar. Cenario Otimista: tudo flui. Momento Decisivo: ajuste os instrumentos.";
  assert.equal(isShallowPersonaTemplateResponse(shallow), true);

  const answer = buildReleaseOnePersonaRescueAnswer({
    personaId: "Vidente",
    userText: "puta merda heim",
    latestAssistantText: shallow,
  });

  assert.match(answer, /Voce tem razao em interromper/);
  assert.match(answer, /fala ficar esteril/);
  assert.doesNotMatch(answer, /Vamos tentar novamente/i);
});

test("Fantasma release mode answers absence and first-person evocation without technical fallback", () => {
  const absence = buildFantasmaReleaseAnswer({
    personaId: "Fantasma",
    userText: "ausente tipo o quew",
    latestAssistantText: "Eu sou o Fantasma: a persona que trabalha com vozes ausentes.",
  });

  assert.match(absence, /Ausente e o que nao esta aqui/);
  assert.match(absence, /nao viro Leonardo verdadeiro/);
  assert.doesNotMatch(absence, /Nao foi possivel formular/i);

  const evocation = buildFantasmaReleaseAnswer({
    personaId: "Fantasma",
    userText: "e como ele falaria isso?",
    latestAssistantText: "Eu chamaria Leonardo da Vinci.",
  });

  assert.match(evocation, /Como simulacao narrativa/);
  assert.match(evocation, /Observa antes de concluir/);
  assert.doesNotMatch(evocation, /provavelmente falaria/i);

  const correction = buildFantasmaReleaseAnswer({
    personaId: "Fantasma",
    userText: "porque que vc nao o incorpora em 1 pessoa, se seu prompt base determina isso?",
    latestAssistantText: "Leonardo da Vinci provavelmente falaria com curiosidade.",
  });

  assert.match(correction, /Voce tem razao/);
  assert.match(correction, /A forma correta/);
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

test("INPI prompt-first mode is production default and preview-gated", () => {
  assert.equal(isInpiPromptFirstMode({
    NEMOSINE_INPI_PROMPT_FIRST: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH,
  }), true);
  assert.equal(isInpiPromptFirstMode({
    NEMOSINE_INPI_PROMPT_FIRST: "1",
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_REF: INPI_ONE_YEAR_RELEASE_BRANCH,
  }), true);
  assert.equal(isInpiPromptFirstMode({
    VERCEL_ENV: "production",
    NEMOSINE_DISABLE_NATIVE_PROMPT_FIRST_PRODUCTION: "1",
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

test("prompt-first sanitizer preserves paragraphs while removing technical markers", () => {
  const cleaned = stripPromptFirstTechnicalMarkers("Primeiro paragrafo.\n\n[[NEMOSINE_INTERNAL]]\n\nSegundo paragrafo.");

  assert.equal(cleaned, "Primeiro paragrafo.\n\nSegundo paragrafo.");
});

test("prompt-first sanitizer preserves markdown lists while removing technical markers", () => {
  const cleaned = stripPromptFirstTechnicalMarkers("- item um\n- item dois [NEMOSINE_AUDIO]\n- item tres");

  assert.equal(cleaned, "- item um\n- item dois\n- item tres");
});

test("prompt-first narrative style gate repairs unrequested report bullets", () => {
  const badCiganaAnswer = [
    "Ah, o fascinante mundo do desenvolvimento de IA e sistemas multiagentes! Vamos explorar algumas possibilidades.",
    "### Crescimento e Impacto",
    "1. **Probabilidade Alta**: a area deve crescer.",
    "- **Avancos Tecnologicos**: modelos melhores.",
    "- **Investimento**: empresas e governos.",
    "### Conclusao",
    "Se quiser explorar mais alguma faceta especifica, estou aqui para ajudar!",
  ].join("\n");

  const evaluation = evaluatePromptFirstNarrativeStyle({
    answer: badCiganaAnswer,
    userText: "o desenvolvimento da IA e de sistemas multiagentes vai crescer muito. Quero compreender uma situacao.",
  });

  assert.equal(evaluation.shouldRepair, true);
  assert.ok(evaluation.findings.includes("VISIBLE_REPORT_HEADING"));
  assert.ok(evaluation.findings.includes("VISIBLE_LIST_STRUCTURE"));
  assert.ok(evaluation.findings.includes("GENERIC_ASSISTANT_OPENING"));
  assert.ok(evaluation.findings.includes("GENERIC_ASSISTANT_CLOSING"));

  const instruction = buildPromptFirstNarrativeRepairInstruction({
    personaId: "Cigana",
    userText: "quero compreender uma situacao",
    findings: evaluation.findings,
    minWords: 350,
  });
  assert.match(instruction, /prosa viva/);
  assert.match(instruction, /Proibido neste reparo: markdown, titulos, subtitulos, bullets/);
});

test("prompt-first narrative style gate allows explicit structured requests", () => {
  const listedAnswer = [
    "### Pontos principais",
    "- Um sinal.",
    "- Outro sinal.",
    "- Uma consequencia.",
  ].join("\n");

  const evaluation = evaluatePromptFirstNarrativeStyle({
    answer: listedAnswer,
    userText: "liste em bullets os pontos principais",
  });

  assert.equal(evaluation.shouldRepair, false);
  assert.ok(evaluation.findings.includes("VISIBLE_REPORT_HEADING"));
  assert.ok(evaluation.findings.includes("VISIBLE_LIST_STRUCTURE"));
});

test("native prompt-first uses long original persona payload instead of compact soul card", () => {
  const payload = buildNativePersonaPromptPayload("Fantasma");
  const normalized = payload.prompt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  assert.equal(payload.source, "google-drive-native-prompt");
  assert.ok(payload.prompt.length > 3000);
  assert.match(normalized, /resposta encarnada simulada/);
  assert.match(normalized, /ferramenta de escuta invertida/);
  assert.doesNotMatch(payload.prompt, /alma nativa compactada/);
});

test("chat route prompt-first bypass remains before initiative gates without automatic presence events", () => {
  const source = fs.readFileSync("app/api/chat/route.ts", "utf8");
  const promptFirstIndex = source.indexOf("const promptFirstActive = isInpiPromptFirstMode()");
  const initiativeIndex = source.indexOf("evaluatePersonaInitiativeQuality({");
  const responsePipelineIndex = source.indexOf("runResponsePipelineV2({");
  const socialContinuationIndex = source.indexOf("const socialContinuationAnswer = buildSocialContinuationAnswer");
  const fantasmaReleaseIndex = source.indexOf("const fantasmaReleaseAnswer = buildFantasmaReleaseAnswer");
  const personaRescueIndex = source.indexOf("const releaseOnePersonaRescueAnswer = buildReleaseOnePersonaRescueAnswer");
  const enforcedRuntimeIndex = source.indexOf('if (runtimeConfig.mode === "enforce")');

  assert.ok(promptFirstIndex > 0);
  assert.doesNotMatch(source, /buildPresenceOpeningMessage/);
  assert.doesNotMatch(source, /automatic first-turn card/);
  assert.match(source, /presenceContractConfirmed/);
  assert.ok(initiativeIndex > promptFirstIndex);
  assert.ok(responsePipelineIndex > promptFirstIndex);
  assert.ok(socialContinuationIndex > promptFirstIndex);
  assert.ok(fantasmaReleaseIndex > socialContinuationIndex);
  assert.ok(personaRescueIndex > fantasmaReleaseIndex);
  assert.ok(personaRescueIndex < responsePipelineIndex);
  assert.ok(socialContinuationIndex < enforcedRuntimeIndex);
  assert.match(source, /x-inpi-prompt-first/);
  assert.match(source, /x-nemosine-social-continuation/);
  assert.match(source, /x-nemosine-fantasma-release-answer/);
  assert.match(source, /x-nemosine-release-one-persona-rescue/);
  assert.match(source, /evaluatePromptFirstNarrativeStyle\(\{/);
  assert.match(source, /buildPromptFirstNarrativeRepairInstruction\(\{/);
  assert.match(source, /x-prompt-first-style-repair/);
  assert.match(source, /stripPromptFirstTechnicalMarkers\(promptFirstRaw\)/);
  assert.match(source, /promptFirstAssembly\.depthProfile\.id !== "GREETING"/);
  assert.doesNotMatch(source, /finalResponse\s*=\s*"Nao foi possivel formular uma resposta adequada nesta tentativa\."/);

  const promptFirstSource = fs.readFileSync("app/lib/nemosine/inpi_prompt_first.ts", "utf8");
  assert.match(promptFirstSource, /prompt original e a principal autoridade de estilo, vocacao, cadencia, simbolismo e comportamento/);
  assert.match(promptFirstSource, /A producao 1\.0 e conversa individual/);
});
