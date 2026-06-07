const fs = require("fs");

const contractsSource = fs.readFileSync("app/lib/nemosine/persona_behavior_contracts.ts", "utf8");
const assemblerSource = fs.readFileSync("app/lib/nemosine/persona_context_assembler.ts", "utf8");
const llmSource = fs.readFileSync("app/lib/nemosine/llm_client.ts", "utf8");
const chatRouteSource = fs.readFileSync("app/api/chat/route.ts", "utf8");
const payloadHygieneSource = fs.readFileSync("app/lib/nemosine/payload_hygiene.ts", "utf8");

const checks = [
  {
    name: "Bobo da Corte",
    source: contractsSource,
    required: [
      "humor personalizado",
      "formula imagine que voce",
      "emoji como substituto de punchline",
    ],
  },
  {
    name: "Mentor",
    source: contractsSource,
    required: [
      "direcao, sintese existencial",
      "coach generico",
      "cabecalhos repetidos",
      "atendente",
      "perguntar o que o usuario quer testar",
      "usar vamos como muleta",
    ],
  },
  {
    name: "Inimigo",
    source: contractsSource,
    required: [
      "fato disponivel, inferencia provavel, risco exploravel",
      "Nao tenho municao suficiente para um ataque preciso",
      "pedir ao usuario que liste fraquezas",
    ],
  },
  {
    name: "Cientista",
    source: contractsSource,
    required: [
      "evidencia observavel",
      "hipotese tecnica",
      "dado faltante",
      "teste necessario",
      "certeza sem evidencia",
      "fingir que auditou o que nao auditou",
    ],
  },
  {
    name: "Engenheiro",
    source: contractsSource,
    required: [
      "estrutura, fluxo, causa provavel",
      "correcao operacional",
      "Sem telemetria suficiente",
    ],
  },
  {
    name: "Regra anti-SAC",
    source: assemblerSource,
    required: [
      "PROIBICAO DE MODO ASSISTENTE GENERICO",
      "Voce nao e um assistente de atendimento",
      "Como posso ajudar",
      "Como posso auxiliar",
      "Quando o usuario reclamar que a persona esta rasa",
      "Perguntas so sao permitidas",
    ],
  },
  {
    name: "Trava de historico contaminado",
    source: `${chatRouteSource}\n${payloadHygieneSource}`,
    required: [
      "SUSPICIOUS_PAYLOAD_PHRASES",
      "Resposta anterior do assistant suprimida",
      "Controle final de persona ativa",
      "Historico anterior com tom de atendente",
    ],
  },
  {
    name: "Regra anti-template",
    source: assemblerSource,
    required: [
      "PROIBICAO DE FORMULARIO VISIVEL PADRAO",
      "Auditoria Logica",
      "Por padrao, a resposta deve soar como presenca viva",
      "REGRA FINAL DE SAIDA VISIVEL",
      "Nao imite a estrutura deste system prompt",
      "sem relatorio, sem cabecalhos, sem lista numerada",
      "Profundidade aqui significa leitura",
      "PROIBICAO DE FECHAMENTO SINTETICO GENERICO",
      "EXECUCAO VOCACIONAL ATE O FIM",
      "A resposta deve terminar com entrega substantiva",
    ],
  },
  {
    name: "Contrato como raciocinio interno",
    source: contractsSource,
    required: [
      "Use este contrato como lente interna de raciocinio",
      "nao como formato visivel de resposta",
      "sem enumera-los como checklist",
    ],
  },
  {
    name: "Regra anti-simulacao",
    source: assemblerSource,
    required: [
      "PROIBICAO DE SIMULACAO DE ACESSO OU VERIFICACAO",
      "Nao tenho acesso direto ao payload/logs nesta conversa",
      "verifiquei",
    ],
  },
  {
    name: "Parametros do modelo",
    source: llmSource,
    required: [
      "DEFAULT_CHAT_MODEL = \"gpt-4o\"",
      "DEFAULT_CHAT_TEMPERATURE = 0.45",
      "DEFAULT_CHAT_MAX_OUTPUT_TOKENS = 2200",
    ],
  },
];

const failures = checks.flatMap((check) =>
  check.required
    .filter((needle) => !check.source.includes(needle))
    .map((needle) => `${check.name}: missing "${needle}"`)
);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Persona context contract checks passed: ${checks.length}`);
