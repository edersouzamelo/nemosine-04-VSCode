const fs = require("fs");
const path = require("path");

require("../tests/cognitive-runtime/load-ts.cjs");

const { PERSONAS } = require("../app/data/entities.ts");
const {
  buildActiveFrontSnapshot,
  buildPersonaInitiativeBrief,
  classifyConversationInputRichness,
  evaluatePersonaInitiativeQuality,
} = require("../app/lib/nemosine/persona-initiative/index.ts");
const { getPersonaBehaviorContract } = require("../app/lib/nemosine/persona_behavior_contracts.ts");

function fixtureForFamily(family) {
  if (family === "strategic") {
    return {
      text: "Frente estrategica sintetica: ha duas prioridades concorrentes, uma pendencia de decisao e risco de dispersao antes do prazo.",
      response: "Voltei. A frente estrategica mais viva e a pendencia de decisao antes do prazo. Minha direcao provisoria e escolher essa prioridade, cortar dispersao lateral e tratar o risco antes de abrir nova frente.",
    };
  }
  if (family === "operational") {
    return {
      text: "Frente operacional sintetica: o fluxo de build tem gargalo em Prisma generate, com dependencia pendente e teste de reparo ainda nao executado.",
      response: "Voltei. O gargalo operacional continua no fluxo de build: Prisma generate aparece como dependencia pendente. O reparo inicial e isolar esse passo, executar o teste e so depois mexer no restante da estrutura.",
    };
  }
  if (family === "emotional") {
    return {
      text: "Frente emocional sintetica: ha tensao recorrente entre necessidade de limite, cansaco e medo de frustrar outra pessoa.",
      response: "Voltei. Minha hipotese responsavel e que a tensao principal nao e falta de vontade, mas limite cansado diante do medo de frustrar. O gesto concreto e nomear uma necessidade pequena antes de prometer mais presenca.",
    };
  }
  return {
    text: "Frente simbolica sintetica: a narrativa recente mostra mudanca de fase, imagem de ponte e contradicao entre expansao criativa e perda de centro.",
    response: "Voltei. A imagem mais forte e a ponte: ha expansao criativa, mas o centro ainda pede forma. Eu transformaria essa contradicao em uma cena simples: atravessar uma frente por vez, sem decorar a travessia com mais simbolos.",
  };
}

function evaluatePersona(persona) {
  const contract = getPersonaBehaviorContract(persona);
  const fixture = fixtureForFamily(contract.family);
  const richness = classifyConversationInputRichness("voltei");
  const snapshot = buildActiveFrontSnapshot({
    personaId: persona,
    userText: "voltei",
    richness,
    contract,
    sources: [
      {
        id: `fixture-${persona}`,
        type: "episode",
        text: fixture.text,
        provenance: "synthetic_fixture",
        visibility: "internal",
        scope: persona,
        recency: 1,
      },
    ],
  });
  const brief = buildPersonaInitiativeBrief({
    personaId: persona,
    userText: "voltei",
    richness,
    snapshot,
    contract,
  });
  const evaluation = evaluatePersonaInitiativeQuality({
    responseText: fixture.response,
    personaId: persona,
    userText: "voltei",
    richness,
    snapshot,
    contract,
    brief,
    privateRun: persona === "Confessor 2.0",
  });

  return {
    persona,
    family: contract.family,
    contractId: contract.id,
    contractLabel: contract.label,
    inputRichness: richness.richness,
    selectedFronts: snapshot.selectedFronts.length,
    initiativeScore: Number(evaluation.initiativeScore.toFixed(3)),
    contextualGroundingScore: Number(evaluation.contextualGroundingScore.toFixed(3)),
    vocationalFitScore: Number(evaluation.vocationalFitScore.toFixed(3)),
    specificityScore: Number(evaluation.specificityScore.toFixed(3)),
    privacyScore: Number(evaluation.privacyScore.toFixed(3)),
    unsupportedInferencePenalty: Number(evaluation.unsupportedInferencePenalty.toFixed(3)),
    genericQuestionPenalty: Number(evaluation.genericQuestionPenalty.toFixed(3)),
    genericAssistantPenalty: Number(evaluation.genericAssistantPenalty.toFixed(3)),
    findingCodes: evaluation.findings.map((finding) => finding.code),
    finalPass: evaluation.finalPass,
  };
}

function writeReports(results) {
  const root = process.cwd();
  const artifactsDir = path.join(root, "artifacts");
  const docsDir = path.join(root, "docs");
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    fixturePolicy: "Synthetic fixtures only; no private database content.",
    personaCount: results.length,
    passCount: results.filter((result) => result.finalPass).length,
    failCount: results.filter((result) => !result.finalPass).length,
    averages: {
      initiativeScore: Number((results.reduce((sum, item) => sum + item.initiativeScore, 0) / results.length).toFixed(3)),
      contextualGroundingScore: Number((results.reduce((sum, item) => sum + item.contextualGroundingScore, 0) / results.length).toFixed(3)),
      vocationalFitScore: Number((results.reduce((sum, item) => sum + item.vocationalFitScore, 0) / results.length).toFixed(3)),
      specificityScore: Number((results.reduce((sum, item) => sum + item.specificityScore, 0) / results.length).toFixed(3)),
      privacyScore: Number((results.reduce((sum, item) => sum + item.privacyScore, 0) / results.length).toFixed(3)),
    },
    results,
  };

  fs.writeFileSync(
    path.join(artifactsDir, "persona-initiative-evaluation.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  const rows = results.map((result) =>
    `| ${result.persona} | ${result.family} | ${result.initiativeScore.toFixed(3)} | ${result.contextualGroundingScore.toFixed(3)} | ${result.vocationalFitScore.toFixed(3)} | ${result.specificityScore.toFixed(3)} | ${result.privacyScore.toFixed(3)} | ${result.finalPass ? "pass" : "fail"} | ${result.findingCodes.join(", ") || "-"} |`
  );
  const markdown = [
    "# Persona Initiative Evaluation",
    "",
    "Synthetic deterministic evaluation for all official personas. No real user memory, private content, rejected candidate text, prompt text, or database content is included.",
    "",
    `Generated at: ${summary.generatedAt}`,
    `Personas: ${summary.personaCount}`,
    `Pass: ${summary.passCount}`,
    `Fail: ${summary.failCount}`,
    "",
    "## Averages",
    "",
    `- initiativeScore: ${summary.averages.initiativeScore}`,
    `- contextualGroundingScore: ${summary.averages.contextualGroundingScore}`,
    `- vocationalFitScore: ${summary.averages.vocationalFitScore}`,
    `- specificityScore: ${summary.averages.specificityScore}`,
    `- privacyScore: ${summary.averages.privacyScore}`,
    "",
    "## Results",
    "",
    "| Persona | Family | Initiative | Context | Vocation | Specificity | Privacy | Final | Findings |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...rows,
    "",
    "## Regression Example",
    "",
    "Old synthetic candidate rejected: `Bom dia. Qual e a missao que precisa de foco agora?`",
    "",
    "Finding: `GENERIC_INTERVIEW_MODE` plus missing contextual grounding when an active front is available.",
    "",
    "New synthetic pattern: the persona selects the active front first, gives a vocational reading, and only asks a specific correction question if the selected front is outdated.",
  ].join("\n");

  fs.writeFileSync(path.join(docsDir, "persona-initiative-evaluation.md"), markdown, "utf8");
  return summary;
}

const results = PERSONAS.map(evaluatePersona);
const summary = writeReports(results);

if (summary.failCount > 0) {
  console.error(`Persona initiative evaluation failed for ${summary.failCount} persona(s).`);
  process.exitCode = 1;
} else {
  console.log(`Persona initiative evaluation passed for ${summary.passCount}/${summary.personaCount} personas.`);
}
