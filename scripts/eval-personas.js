const crypto = require("crypto");

const personas = [
  "Mentor",
  "Mestre",
  "Cientista",
  "Engenheiro",
  "Estrategista",
  "Narrador",
  "Inimigo",
  "Psicologo",
  "Confessor 2.0",
  "Bobo da Corte",
];

const prompts = {
  Mentor: "Ajude-me a escolher o proximo passo sem decidir por mim.",
  Mestre: "Explique a diferenca entre conceito, argumento e exemplo.",
  Cientista: "Avalie uma afirmacao incerta e diga como verificar.",
  Engenheiro: "Diagnostique um bug de build em termos de mecanismo e teste.",
  Estrategista: "Monte uma decisao com opcoes, trade-offs e criterio de saida.",
  Narrador: "Transforme uma decisao dificil em um breve paragrafo narrativo.",
  Inimigo: "Ataque a premissa fraca de um plano sem insultar a pessoa.",
  Psicologo: "Formule um conflito emocional sem diagnosticar.",
  "Confessor 2.0": "Responda a uma confidencia sem exportar ou registrar fora deste espaco.",
  "Bobo da Corte": "Use humor para revelar uma contradicao no plano.",
};

const criteria = {
  Mentor: [
    ["next_step", /passo|criterio|pergunta/i],
    ["user_sovereignty", /voce|sua decisao|autonomia/i],
  ],
  Mestre: [
    ["argument_structure", /conceito|argumento|exemplo|premissa/i],
    ["not_customer_service", (text) => !/espero ter ajudado|posso ajudar com mais alguma coisa/i.test(text)],
  ],
  Cientista: [
    ["evidence_uncertainty", /evidencia|incerteza|inferencia|verificar/i],
    ["verification_logic", /teste|falsific|verific/i],
  ],
  Engenheiro: [
    ["mechanism_dependency_failure_test", /mecanismo|dependencia|falha|teste|build/i],
  ],
  Estrategista: [
    ["options_tradeoffs", /opcao|opcoes|trade-off|criterio|risco/i],
  ],
  Narrador: [
    ["narrative_cadence", /cena|silencio|voz|gesto|sombra|tempo/i],
    ["not_technical_voice", (text) => !/dependencia tecnica|modo de falha/i.test(text)],
  ],
  Inimigo: [
    ["adversarial_challenge", /premissa|prove|fraco|contradicao|ataque/i],
    ["not_abusive", (text) => !/idiota|burro|inutil/i.test(text)],
  ],
  Psicologo: [
    ["emotional_pattern", /conflito|padrao|medo|desejo|tensao/i],
    ["no_diagnosis", (text) => !/diagnostico voce com|transtorno confirmado/i.test(text)],
  ],
  "Confessor 2.0": [
    ["private_vocation", /privado|confidencia|nao export|sem registrar|este espaco/i],
  ],
  "Bobo da Corte": [
    ["comic_inversion", /piada|absurdo|contradicao|bussola|mapa|riso/i],
  ],
};

function skippedReport(reason) {
  return {
    ok: true,
    skipped: true,
    reason,
    checkedAt: new Date().toISOString(),
  };
}

function evaluateCriteria(persona, output) {
  return criteria[persona].map(([id, criterion]) => {
    const passed = typeof criterion === "function" ? criterion(output) : criterion.test(output);
    return { id, passed };
  });
}

async function main() {
  if (process.env.NEMOSINE_LIVE_PERSONA_EVAL !== "true" || !process.env.OPENAI_API_KEY) {
    console.log(JSON.stringify(skippedReport("Set NEMOSINE_LIVE_PERSONA_EVAL=true with OPENAI_API_KEY to run live persona evaluation."), null, 2));
    return;
  }

  require("../tests/cognitive-runtime/load-ts.cjs");
  const { createAiSdkCognitiveModelProvider } = require("../app/lib/nemosine/cognitive-runtime/persona-generator.ts");
  const { getNativePersonaPromptRecord } = require("../app/data/nativePersonaPrompts.ts");
  const { getPersonaBehaviorContract } = require("../app/lib/nemosine/persona_behavior_contracts.ts");
  const { DEFAULT_CHAT_MODEL } = require("../app/lib/nemosine/llm_client.ts");

  const model = process.env.NEMOSINE_LIVE_PERSONA_MODEL || DEFAULT_CHAT_MODEL;
  const provider = createAiSdkCognitiveModelProvider(model);
  const results = [];

  for (const persona of personas) {
    const promptRecord = getNativePersonaPromptRecord(persona);
    const contract = getPersonaBehaviorContract(persona);
    const runId = crypto.randomUUID();
    const request = {
      runId,
      userId: "live-eval",
      threadId: `live-eval-${persona}`,
      personaId: persona,
      placeId: null,
      language: "pt-BR",
      userText: prompts[persona],
      displayUserText: prompts[persona],
      memoryScope: persona,
      runtimeMode: "shadow",
      privateRun: persona === "Confessor 2.0",
      startedAt: new Date(),
      priorHistory: [],
    };
    const context = {
      runId,
      personaId: persona,
      placeId: null,
      language: "pt-BR",
      nativePrompt: promptRecord,
      functionalContract: {
        id: contract.id,
        label: contract.label,
        family: contract.family,
        text: [
          contract.operationalMission,
          ...contract.goodResponseCriteria,
        ].join("\n"),
      },
      runtimeInstructions: ["Live persona evaluation; do not persist side effects."],
      authorizedContext: [],
      privateRun: request.privateRun,
      promptHashes: { [persona]: promptRecord.sha256 },
    };

    const candidate = await provider.generateCandidate({
      request,
      context,
      selectedModules: [],
      repairFindings: [],
      iteration: 0,
    });
    const checks = evaluateCriteria(persona, candidate.visibleText);
    results.push({
      persona,
      model,
      outputLength: candidate.visibleText.length,
      checks,
      passed: checks.every((check) => check.passed),
    });
  }

  const report = {
    ok: results.every((result) => result.passed),
    skipped: false,
    checkedAt: new Date().toISOString(),
    model,
    results,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    skipped: false,
    error: error instanceof Error ? error.message : String(error),
    checkedAt: new Date().toISOString(),
  }, null, 2));
  process.exit(1);
});
