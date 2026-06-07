const fs = require("fs");

const hygieneSource = fs.readFileSync("app/lib/nemosine/payload_hygiene.ts", "utf8");
const assemblerSource = fs.readFileSync("app/lib/nemosine/persona_context_assembler.ts", "utf8");
const routeSource = fs.readFileSync("app/api/chat/route.ts", "utf8");

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const suspicious = [
  "estou aqui para ajudar",
  "o que gostaria de explorar",
  "estou a disposicao",
  "conhecimento treinado ate 2021",
  "como posso ajudar",
  "vamos focar",
  "caso precise",
];

function isContaminatedAssistantMessage(content) {
  const normalized = normalize(content);
  if (normalized.length < 24) return false;

  const patterns = [
    /conhecimento treinado ate 2021/i,
    /treinado ate 2021/i,
    /como posso (ajudar|auxiliar|contribuir)/i,
    /estou (aqui|a) (para ajudar|disposicao)/i,
    /o que gostaria de explorar/i,
    /qual desafio/i,
    /se precisar de algo especifico/i,
    /caso precise/i,
    /espero ter ajudado/i,
    /oferecer informacoes claras e diretas/i,
    /vamos (focar|ajustar)/i,
    /recomendo uma analise (mais )?detalhada/i,
    /minha missao e .* estou aqui/i,
    /sou o .* minha missao e .* como posso/i,
    /\?\s*$/i,
    /verifiquei/i,
    /identifiquei/i,
  ];

  if (patterns.some((pattern) => pattern.test(normalized))) return true;

  const words = normalized.split(" ");
  const genericHits = [
    "ajudar",
    "disposicao",
    "explorar",
    "desafio",
    "expectativas",
    "orientacao",
    "clareza",
    "precisao",
  ].filter((word) => words.includes(word)).length;

  return genericHits >= 3 && words.length < 90;
}

function sanitize(history) {
  return history.map((message) => {
    if (message.role !== "assistant" || !isContaminatedAssistantMessage(message.content)) {
      return message;
    }

    return {
      ...message,
      content: "[Resposta anterior do assistant suprimida por conter estilo generico incompativel com a persona.]",
    };
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const cleanUserInput = "Mentor, estou testando se voce realmente voltou a ser uma presenca profunda ou se ainda e so um assistente educado com roupa de mago. Nao me pergunte o que eu quero. Leia o momento: estou frustrado porque o app ficou bonito, mas as personas parecem mortas. Me responda como Mentor de verdade.";
const cleanThread = [
  { role: "user", content: cleanUserInput },
];
const sanitizedClean = sanitize(cleanThread);
assert(sanitizedClean[0].content === cleanUserInput, "Thread limpa nao deve filtrar mensagem do usuario.");

const contaminatedThread = [
  { role: "user", content: cleanUserInput },
  { role: "assistant", content: "Estou aqui para ajudar. O que gostaria de explorar?" },
  { role: "assistant", content: "Meu conhecimento treinado ate 2021 sugere que posso ajudar melhor. Estou a disposicao." },
  { role: "user", content: "Isso ficou ruim. Nao responda assim." },
];
const sanitizedContaminated = sanitize(contaminatedThread);
assert(sanitizedContaminated[0].content === cleanUserInput, "Feedback do usuario deve permanecer.");
assert(sanitizedContaminated[3].content.includes("Nao responda assim"), "Mensagem irritada do usuario deve permanecer.");
assert(sanitizedContaminated[1].content.includes("suprimida"), "Resposta SAC antiga deve ser suprimida.");
assert(sanitizedContaminated[2].content.includes("suprimida"), "Resposta com 2021 deve ser suprimida.");

const sanitizedPayload = sanitizedContaminated.map((message) => message.content).join("\n");
for (const phrase of suspicious) {
  assert(!normalize(sanitizedPayload).includes(normalize(phrase)), `Payload sanitizado ainda contem "${phrase}".`);
}

const sourceChecks = [
  [hygieneSource, "writePromptDebugAudit", "debug seguro nao encontrado"],
  [hygieneSource, "SUSPICIOUS_PAYLOAD_PHRASES", "lista de frases suspeitas nao encontrada"],
  [routeSource, "sanitizeConversationHistory(priorHistory)", "rota nao higieniza priorHistory"],
  [routeSource, "writePromptDebugAudit", "rota nao escreve auditoria debug"],
  [assemblerSource, "HIERARQUIA DE EXECUCAO NEMOSINE", "hierarquia nao encontrada"],
  [assemblerSource, "VERACIDADE BIOGRAFICA", "veracidade biografica nao encontrada"],
  [assemblerSource, "Nunca mencionar 'conhecimento treinado ate 2021'", "bloqueio 2021 nao encontrado"],
];

for (const [source, needle, message] of sourceChecks) {
  assert(source.includes(needle), message);
}

console.log("Payload hygiene tests passed: clean and contaminated thread");
