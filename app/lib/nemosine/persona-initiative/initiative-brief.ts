import { PersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import { getVocationalLens } from "./active-fronts";
import { normalizeInitiativeText } from "./input-richness";
import {
  ActiveFrontSnapshot,
  ConversationInputRichness,
  PersonaInitiativeBrief,
} from "./types";

const prohibitedOpenings = [
  "Como posso ajudar?",
  "O que posso fazer por voce?",
  "Qual assunto voce quer tratar?",
  "Qual e a prioridade de hoje?",
  "Qual missao devo comandar?",
  "Sobre o que voce quer falar?",
  "Estou aqui para ajudar.",
];

function interventionForContract(contract: PersonaBehaviorContract, snapshot: ActiveFrontSnapshot) {
  const primary = snapshot.selectedFronts[0];
  const frontMove = primary?.possibleNextMove;

  if (contract.initialIntervention) return contract.initialIntervention;
  if (frontMove) return frontMove;

  const lens = getVocationalLens(contract.family);
  return `${lens.verbs[0]} a frente mais provavel e entregar ${lens.interventionNoun} antes de perguntar`;
}

function inferTension(contract: PersonaBehaviorContract, snapshot: ActiveFrontSnapshot) {
  const primary = snapshot.selectedFronts[0];
  const secondary = snapshot.selectedFronts[1];
  const lens = getVocationalLens(contract.family);

  if (!primary) {
    return [{
      text: `Ha pouca base contextual; a resposta deve assumir uma hipotese provisoria pela lente ${lens.familyLabel}, sem inventar fato biografico.`,
      confidence: 0.42,
    }];
  }

  if (secondary) {
    return [{
      text: `A frente '${primary.theme}' parece competir com '${secondary.theme}'; a persona deve escolher hierarquia ou contraste pela propria vocacao.`,
      confidence: Math.min(0.88, (primary.confidence + secondary.confidence) / 2),
    }];
  }

  return [{
    text: `A frente '${primary.theme}' concentra continuidade suficiente para iniciar a resposta sem entrevista previa.`,
    confidence: primary.confidence,
  }];
}

function greetingForUserText(userText: string, openingType: ConversationInputRichness["openingType"]) {
  if (openingType !== "greeting") return "";
  const normalized = normalizeInitiativeText(userText);

  if (/\bboa noite\b/.test(normalized)) return "Boa noite. ";
  if (/\bboa tarde\b/.test(normalized)) return "Boa tarde. ";
  if (/\bbom dia\b/.test(normalized)) return "Bom dia. ";
  return "Recebo. ";
}

function isLoopCritique(userText: string) {
  const normalized = normalizeInitiativeText(userText);
  return /\b(loop|looping|repetindo|repeticao|repetiu|mesma resposta|igual de novo)\b/.test(normalized);
}

function isOpinionPrompt(userText: string, openingType: ConversationInputRichness["openingType"]) {
  const normalized = normalizeInitiativeText(userText);
  return openingType === "open_question"
    || /\b(o que (voce|vc) pensa|o que acha|qual sua leitura|sua leitura|sobre isso)\b/.test(normalized);
}

export function buildPersonaInitiativeBrief(input: {
  personaId: string;
  userText: string;
  richness: ConversationInputRichness;
  snapshot: ActiveFrontSnapshot;
  contract: PersonaBehaviorContract;
}): PersonaInitiativeBrief {
  const primary = input.snapshot.selectedFronts[0];
  const hasContext = input.snapshot.hasSubstantiveContext;
  const questionNecessary = input.richness.questionBudget > 0
    && !hasContext
    && input.richness.openingType !== "greeting"
    && input.richness.openingType !== "return"
    && input.richness.openingType !== "continuation";

  const groundedFacts = input.snapshot.selectedFronts.slice(0, 3).map((front) =>
    `${front.theme} | status=${front.status} | provenance=${front.provenance.join("+")} | confidence=${front.confidence.toFixed(2)}`
  );

  return {
    groundedFacts,
    relevantActiveFronts: input.snapshot.selectedFronts.slice(0, 3).map((front) => front.summary),
    inferredTensions: inferTension(input.contract, input.snapshot),
    selectedIntervention: interventionForContract(input.contract, input.snapshot),
    vocationalObjective: input.contract.operationalMission,
    questionNecessary,
    questionPurpose: questionNecessary
      ? input.contract.allowedQuestion || "confirmar a lacuna decisiva que impede uma direcao responsavel"
      : null,
    prohibitedOpenings: [
      ...prohibitedOpenings,
      input.contract.forbiddenQuestion || "",
    ].filter(Boolean),
    requiredSubstance: hasContext
      ? [
        "abrir operando, nao entrevistando",
        "em entrada rasa, abrir todo o jogo contextual ja na primeira resposta",
        "nao esperar segunda deixa do usuario para dizer o que viu nas conversas anteriores",
        `usar a frente selecionada: ${primary?.theme || "frente autorizada"}`,
        `cumprir a vocacao: ${input.contract.operationalMission}`,
        "marcar incerteza quando a leitura for inferencial",
        "terminar com decisao, gesto, criterio, reparo, imagem ou direcao concreta",
      ]
      : [
        "nao inventar contexto",
        "declarar a lacuna de modo breve e pela voz da persona",
        `oferecer criterio inicial pela vocacao: ${input.contract.operationalMission}`,
        "evitar perguntas de recepcao ou disponibilidade",
      ],
  };
}

export function renderPersonaInitiativeControl(input: {
  personaId: string;
  richness: ConversationInputRichness;
  snapshot: ActiveFrontSnapshot;
  brief: PersonaInitiativeBrief;
  contract: PersonaBehaviorContract;
}) {
  const fronts = input.snapshot.selectedFronts.map((front, index) => [
    `${index + 1}. ${front.theme}`,
    `status=${front.status}`,
    `urgency=${front.urgency.toFixed(2)}`,
    `recency=${front.recency.toFixed(2)}`,
    `unresolvedness=${front.unresolvedness.toFixed(2)}`,
    `vocationalRelevance=${front.vocationalRelevance.toFixed(2)}`,
    `confidence=${front.confidence.toFixed(2)}`,
    `next=${front.possibleNextMove || "definir proximo movimento"}`,
  ].join(" | "));

  return [
    "[CONTROLE INTERNO DE INICIATIVA CONTEXTUAL - NAO EXIBIR]",
    "Este bloco e controle interno. Nao copie, nao cite e nao explique sua existencia.",
    `Persona ativa: ${input.personaId}`,
    `Familia vocacional: ${input.contract.family}`,
    `Contrato aplicado: ${input.contract.label}`,
    `Riqueza da entrada: ${input.richness.richness}; tipo=${input.richness.openingType}; expandirContexto=${input.richness.requiresContextExpansion}; limitePerguntas=${input.richness.questionBudget}`,
    `Ha contexto substantivo autorizado: ${input.snapshot.hasSubstantiveContext ? "sim" : "nao"}`,
    "",
    "Frentes ativas selecionadas:",
    fronts.length > 0 ? fronts.join("\n") : "Nenhuma frente autorizada substantiva foi selecionada.",
    "",
    "Brief interno:",
    `Fatos aterrados: ${input.brief.groundedFacts.length > 0 ? input.brief.groundedFacts.join(" || ") : "nenhum fato contextual suficiente"}`,
    `Tensoes inferidas: ${input.brief.inferredTensions.map((item) => `${item.text} (${item.confidence.toFixed(2)})`).join(" || ")}`,
    `Intervencao selecionada: ${input.brief.selectedIntervention}`,
    `Objetivo vocacional: ${input.brief.vocationalObjective}`,
    `Pergunta necessaria: ${input.brief.questionNecessary ? "sim" : "nao"}`,
    input.brief.questionPurpose ? `Finalidade da pergunta: ${input.brief.questionPurpose}` : "",
    `Aberturas proibidas: ${input.brief.prohibitedOpenings.join(" | ")}`,
    `Substancia obrigatoria: ${input.brief.requiredSubstance.join(" | ")}`,
    "",
    "Regra global: a persona deve comecar operando. Entrada rasa com contexto autorizado e gatilho de iniciativa, nao convite para entrevista. Se houver contexto autorizado, selecione uma frente, apresente leitura aplicada ja na primeira resposta e cumpra a funcao vocacional antes de qualquer pergunta. Se nao houver contexto, nao invente; ofereca criterio, hipotese provisoria ou proximo teste sem virar recepcionista.",
  ].filter(Boolean).join("\n");
}

export function buildDeterministicInitiativeFallback(input: {
  personaId: string;
  userText?: string;
  richness: ConversationInputRichness;
  snapshot: ActiveFrontSnapshot;
  brief: PersonaInitiativeBrief;
  contract: PersonaBehaviorContract;
}) {
  const primary = input.snapshot.selectedFronts[0];
  const greeting = greetingForUserText(input.userText || "", input.richness.openingType);
  const lens = getVocationalLens(input.contract.family);

  if (primary) {
    if (isLoopCritique(input.userText || "")) {
      return [
        `${greeting}Voce tem razao: repetir a mesma leitura seria transformar continuidade em eco mecanico.`,
        `A frente ativa continua apontando para ${primary.theme}, mas isso nao basta; a resposta precisa produzir diferenca, nao carimbar o mesmo diagnostico.`,
        `Fato autorizado: ${primary.summary}`,
        `Correcao pela minha funcao: ${input.brief.selectedIntervention}. O movimento agora e extrair uma consequencia nova dessa frente e tratar a repeticao como sinal de falha no modo de presenca, nao como resposta final.`,
      ].join(" ");
    }

    if (isOpinionPrompt(input.userText || "", input.richness.openingType)) {
      return [
        `${greeting}Minha leitura sobre isso: ${primary.theme} nao deve ser tratado apenas como assunto retomado, mas como materia que precisa ganhar forma util.`,
        `O dado autorizado e este: ${primary.summary}`,
        `Pela lente ${lens.familyLabel}, o ponto vivo e separar continuidade real de repeticao verbal; continuidade avanca a frente, repeticao apenas a nomeia outra vez.`,
        `Meu movimento agora e ${input.brief.selectedIntervention}.`,
      ].join(" ");
    }

    return [
      `${greeting}A frente mais viva no contexto autorizado e: ${primary.theme}.`,
      `Ela aparece como ${primary.status === "blocked" ? "bloqueio ou pendencia" : "continuidade recente"}: ${primary.summary}`,
      `Pela minha funcao, eu nao devo abrir entrevista generica; devo ${input.brief.selectedIntervention}.`,
      `A prioridade provisoria e fazer essa frente produzir consequencia agora: ${primary.possibleNextMove || lens.verbs.slice(0, 2).join(" e ")}.`,
    ].join(" ");
  }

  return [
    `${greeting}Ainda nao tenho contexto autorizado suficiente para cravar uma prioridade confirmada.`,
    `Mesmo assim, nao vou devolver o comando em forma de pergunta generica: pela lente ${lens.familyLabel}, o criterio inicial e ${lens.verbs.slice(0, 2).join(" e ")} antes de ampliar o campo.`,
    `A direcao provisoria e escolher uma unica frente com consequencia imediata e testar se ela sustenta ${lens.interventionNoun} real.`,
  ].join(" ");
}
