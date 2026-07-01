import {
  PersonaBehaviorContract,
  PersonaFunctionalFamily,
} from "@/app/lib/nemosine/persona_behavior_contracts";
import {
  isConversationNavigationRequest,
  normalizeInitiativeText,
} from "./input-richness";
import {
  ActiveFront,
  ActiveFrontSnapshot,
  ActiveFrontSource,
  ConversationInputRichness,
  VocationalLens,
} from "./types";

const familyLens: Record<PersonaFunctionalFamily, VocationalLens> = {
  strategic: {
    family: "strategic",
    familyLabel: "Estrategicas",
    seeks: ["objetivo", "decisao", "prazo", "risco", "prioridade", "recurso", "conflito", "flanco", "trade off"],
    verbs: ["hierarquizar", "priorizar", "cortar", "decidir", "proteger", "mover"],
    interventionNoun: "direcao",
  },
  operational: {
    family: "operational",
    familyLabel: "Operacionais",
    seeks: ["falha", "gargalo", "tarefa", "dependencia", "recurso", "erro", "rotina", "execucao", "teste"],
    verbs: ["isolar", "corrigir", "verificar", "sequenciar", "executar", "reparar"],
    interventionNoun: "reparo",
  },
  emotional: {
    family: "emotional",
    familyLabel: "Emocionais/Psicodinamicas",
    seeks: ["afeto", "relacao", "defesa", "necessidade", "medo", "desejo", "limite", "tensao", "repeticao"],
    verbs: ["nomear", "regular", "diferenciar", "elaborar", "conter", "aproximar"],
    interventionNoun: "elaboracao",
  },
  symbolic: {
    family: "symbolic",
    familyLabel: "Simbolicas",
    seeks: ["imagem", "narrativa", "simbolo", "fase", "contradicao", "sentido", "expressao", "identidade"],
    verbs: ["figurar", "narrar", "contrastar", "simbolizar", "recompor", "revelar"],
    interventionNoun: "imagem",
  },
};

const urgencyWords = [
  "urgente", "hoje", "amanha", "prazo", "deadline", "risco", "falha", "erro", "bug",
  "bloqueado", "travado", "pendente", "atrasado", "crise", "grave", "decisao",
];

const unresolvedWords = [
  "pendente", "nao resolvido", "bloqueado", "travado", "falha", "erro", "bug",
  "precisa", "falta", "proximo", "a fazer", "em aberto", "risco", "gargalo",
];

const highSalienceHumanWords = [
  "divorcio", "separacao", "casamento", "conjuge", "partilha", "guarda",
  "pensao", "filho", "filha", "familia", "relacao", "relacionamento",
  "juridico", "processo", "audiencia", "saude", "crise", "ansiedade",
  "moradia", "trabalho", "demissao", "financeiro", "divida",
];

const lowSalienceOperationalWords = [
  "development", "desenvolvimento", "sovereign", "modulo", "registro",
  "registros", "nemosine", "app", "runtime", "deploy", "build",
  "castelo vivo", "age of origins", "travessia", "banco de dados",
  "github", "vercel",
];

const metaContextNoisePatterns = [
  /\b(concordo com a resposta|resposta em si|resposta de ambos|do rastro recente|sem bastidor)\b/,
  /\b(minha leitura pratica|pedido atual vem antes de qualquer memoria|memoria so ajuda quando melhora)\b/,
  /\b(respondendo|respondeu|falando|falou|resposta|respostas)\b.{0,90}\b(confus\w*|grogue|besta|idiota|ras[ao]s?|inuteis|inutil|ruim|deterministic\w*|igual|mesma coisa|loop|looping|repeti\w*|pessim\w*|horriv\w*|perdid\w*)\b/,
  /\b(testando|teste local|rodando local|server error|erro de configuracao|localhost)\b/,
  /\b(delay|convidei|convidar persona|menu do chat|memorias recentes|titulo dos chats|visualizacao)\b/,
];

const statusPatterns: Array<[ActiveFront["status"], RegExp]> = [
  ["blocked", /\b(bloquead|travado|impasse|falha|erro|bug|quebrad|colaps)/i],
  ["pending", /\b(pendente|prazo|falta|a fazer|precisa|aguard|proximo passo)/i],
  ["active", /\b(em andamento|ativo|frente|projeto|implement|revis|corrig|discut)/i],
  ["recent", /\b(recente|ontem|hoje|agora|voltei|ultima conversa)/i],
];

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function countMatches(normalized: string, words: string[]) {
  return words.reduce((total, word) => total + (normalized.includes(normalizeInitiativeText(word)) ? 1 : 0), 0);
}

function scoreByHints(text: string, hints: string[]) {
  const normalized = normalizeInitiativeText(text);
  if (!normalized) return 0;
  const normalizedHints = hints
    .flatMap((hint) => normalizeInitiativeText(hint).split(" "))
    .filter((term) => term.length > 3);
  const uniqueHints = Array.from(new Set(normalizedHints));
  if (uniqueHints.length === 0) return 0;
  const matches = uniqueHints.filter((hint) => normalized.includes(hint)).length;
  return clamp(matches / Math.min(uniqueHints.length, 8));
}

function extractFirstSentence(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  const sentence = compact.split(/(?<=[.!?])\s+/u)[0] || compact;
  return sentence.slice(0, 180).trim();
}

function cleanTheme(text: string, fallback: string) {
  const first = extractFirstSentence(text)
    .replace(/^\[[^\]]+\]\s*/g, "")
    .replace(/^EPISODIO COM [^|]+\|\s*/i, "")
    .replace(/^O usuario escreveu:\s*/i, "")
    .replace(/^Usuario:\s*/i, "")
    .trim();

  if (!first) return fallback;
  return first.length > 90 ? `${first.slice(0, 87).trim()}...` : first;
}

function isLowValueContextSource(source: ActiveFrontSource) {
  if (source.type === "registry" || source.type === "agenda") return false;
  const normalized = normalizeInitiativeText(source.text || "");
  if (!normalized) return true;
  const hasHumanSignal = countMatches(normalized, highSalienceHumanWords) > 0;
  if (hasHumanSignal) return false;
  if (isConversationNavigationRequest(normalized)) return true;
  return metaContextNoisePatterns.some((pattern) => pattern.test(normalized));
}

function inferStatus(text: string, index: number): ActiveFront["status"] {
  for (const [status, pattern] of statusPatterns) {
    if (pattern.test(text)) return status;
  }
  return index < 2 ? "recent" : "uncertain";
}

function nextMoveForFamily(family: PersonaFunctionalFamily, status: ActiveFront["status"]) {
  if (family === "strategic") {
    return status === "blocked"
      ? "isolar o bloqueio, escolher uma prioridade e cortar dispersao lateral"
      : "hierarquizar a frente e emitir uma direcao provisoria";
  }
  if (family === "operational") {
    return status === "blocked"
      ? "identificar o gargalo e propor um teste de reparo verificavel"
      : "transformar a frente em sequencia curta de execucao";
  }
  if (family === "emotional") {
    return "nomear a tensao provavel e oferecer uma intervencao concreta sem diagnosticar";
  }
  return "converter a frente em imagem, narrativa ou gesto simbolico com consequencia";
}

function scoreFrontForSelection(input: {
  front: ActiveFront;
  userText: string;
  richness: ConversationInputRichness;
  index: number;
}) {
  const normalizedFront = normalizeInitiativeText(`${input.front.theme} ${input.front.summary}`);
  const humanSignalHits = countMatches(normalizedFront, highSalienceHumanWords);
  const operationalSignalHits = countMatches(normalizedFront, lowSalienceOperationalWords);
  const humanSalienceBoost = clamp(humanSignalHits * 0.08);
  const operationalDrag = humanSignalHits > 0
    ? 0
    : clamp(operationalSignalHits * 0.04 + (input.front.provenance.includes("AGENDA_AND_REGISTRY_CONTEXT") ? 0.08 : 0));
  const lexical = scoreByHints(
    `${input.front.theme} ${input.front.summary}`,
    normalizeInitiativeText(input.userText).split(" "),
  );

  if (input.richness.richness === "high") {
    return (
      lexical * 0.44
      + input.front.vocationalRelevance * 0.18
      + input.front.urgency * 0.14
      + input.front.unresolvedness * 0.12
      + input.front.recency * 0.08
      + input.front.confidence * 0.04
      + humanSalienceBoost
      - operationalDrag
    );
  }

  return (
    input.front.recency * 0.24
    + input.front.unresolvedness * 0.22
    + input.front.urgency * 0.22
    + input.front.vocationalRelevance * 0.2
    + input.front.confidence * 0.1
    + lexical * 0.02
    - input.index * 0.005
    + humanSalienceBoost
    - operationalDrag
  );
}

export function getVocationalLens(family: PersonaFunctionalFamily) {
  return familyLens[family] || familyLens.symbolic;
}

export function buildActiveFrontSnapshot(input: {
  personaId: string;
  userText: string;
  richness: ConversationInputRichness;
  contract: PersonaBehaviorContract;
  sources: ActiveFrontSource[];
  allowPrivateContext?: boolean;
  limit?: number;
}): ActiveFrontSnapshot {
  const limit = input.limit ?? 4;
  const lens = getVocationalLens(input.contract.family);
  const allowedSources = input.sources.filter((source) => {
    const text = source.text?.trim();
    if (!text) return false;
    const privateLike = source.visibility === "private" || source.visibility === "confessor";
    if (isLowValueContextSource(source)) return false;
    return input.allowPrivateContext || !privateLike;
  });

  const fronts = allowedSources.map((source, index) => {
    const normalized = normalizeInitiativeText(source.text);
    const status = inferStatus(source.text, index);
    const urgency = clamp(0.15 + countMatches(normalized, urgencyWords) * 0.18);
    const unresolvedness = clamp(0.1 + countMatches(normalized, unresolvedWords) * 0.2 + (status === "blocked" ? 0.25 : 0));
    const recency = clamp(source.recency ?? (1 - index / Math.max(allowedSources.length, 1)));
    const vocationalRelevance = clamp(Math.max(
      scoreByHints(source.text, lens.seeks),
      scoreByHints(source.text, input.contract.contextToSeek),
      scoreByHints(source.text, input.contract.lexicalHints),
    ));
    const confidence = clamp(
      0.42
      + Math.min(source.text.length, 600) / 2000
      + (source.type === "registry" || source.type === "agenda" ? 0.18 : 0)
      + (source.type === "episode" || source.type === "memory" ? 0.08 : 0),
    );

    return {
      id: source.id,
      theme: cleanTheme(source.text, `${source.type}:${index + 1}`),
      summary: extractFirstSentence(source.text),
      status,
      urgency,
      recency,
      unresolvedness,
      vocationalRelevance,
      confidence,
      provenance: [source.provenance],
      visibility: source.visibility === "private" || source.visibility === "confessor" ? "private" : "internal",
      scope: source.scope,
      possibleNextMove: nextMoveForFamily(input.contract.family, status),
    } satisfies ActiveFront;
  });

  const selectedFronts = fronts
    .map((front, index) => ({
      front,
      score: scoreFrontForSelection({
        front,
        userText: input.userText,
        richness: input.richness,
        index,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((entry) => entry.score > 0.12 || input.richness.requiresContextExpansion)
    .map((entry) => entry.front);

  const hasSubstantiveContext = selectedFronts.some((front) =>
    front.confidence >= 0.45
    && front.summary.length >= 16
    && front.visibility === "internal"
  ) || Boolean(input.allowPrivateContext && selectedFronts.length > 0);

  const selectionReason = [
    `inputRichness=${input.richness.richness}`,
    `openingType=${input.richness.openingType}`,
    `candidateFronts=${fronts.length}`,
    `selectedFronts=${selectedFronts.length}`,
    `vocationalFamily=${input.contract.family}`,
    input.richness.richness === "low"
      ? "low-information input weighted by recency, urgency, unresolvedness and vocational relevance"
      : "substantive input weighted by lexical match plus vocational relevance",
  ];

  return {
    fronts,
    selectedFronts,
    hasSubstantiveContext,
    selectionReason,
  };
}
