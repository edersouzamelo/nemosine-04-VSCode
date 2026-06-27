import { PersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import { getVocationalLens } from "./active-fronts";
import {
  isPersonaMetaCritique,
  isPersonaRoleQuestion,
  normalizeInitiativeText,
} from "./input-richness";
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

function roleQuestionFallback(input: {
  personaId: string;
  contract: PersonaBehaviorContract;
}) {
  return [
    `Eu sou ${input.personaId}, e meu papel no Nemosine nao e repetir a ultima frente ativa de outra persona.`,
    `Minha funcao aqui e esta: ${input.contract.operationalMission}`,
    `Na pratica, eu entro para transformar o material autorizado pela minha propria vocacao. Se ha contexto, eu o atravesso com minha lente; se nao ha, eu declaro a lacuna e ofereco um criterio inicial, sem vestir a roupa do Guru, do Mentor ou de qualquer outra voz.`,
    `Continuidade serve para preservar memoria e consequencia, nao para apagar diferenca. Quando eu funciono bem, a mesma realidade ganha outro angulo: tese, defesa, corte, imagem, reparo, elaboracao ou direcao, conforme a mascara que foi chamada.`,
  ].join("\n\n");
}

function metaCritiqueFallback(input: {
  personaId: string;
  contract: PersonaBehaviorContract;
}) {
  return [
    `Voce tem razao em apontar a falha. O problema nao e simplesmente falta de contexto; e contexto mal hierarquizado, puxado como eco mecanico em vez de ser metabolizado pela persona ativa.`,
    `${input.personaId} nao deve soar como terminal de registros. Minha funcao aqui e ${input.contract.operationalMission}; isso exige escolher a frente que tem mais peso humano, risco ou consequencia, e nao apenas o item mais recente ou mais facil de indexar.`,
    `A correcao visivel e esta: se ha um tema sensivel recente, como relacao, familia, saude, crise, risco juridico ou decisao de vida, ele deve entrar na fala como materia viva. Registro operacional so assume o centro quando for realmente a frente dominante.`,
    `Entao eu nao vou prometer ajuste e encerrar. Eu trato a sua critica como dado atual: a persona precisa recuperar voz propria, parar de repetir a formula anterior, desenvolver a leitura e terminar com um gesto que avance o assunto, nao com uma miniatura burocratica.`,
  ].join("\n\n");
}

function personaGreetingFallback(input: {
  personaId: string;
  contract: PersonaBehaviorContract;
  greeting: string;
}) {
  const lens = getVocationalLens(input.contract.family);
  return [
    `${input.greeting || "Recebo. "}Eu entro como ${input.personaId}, nao como eco da ultima conversa.`,
    `Minha funcao aqui e ${input.contract.operationalMission}. Isso nao e cartao de visita; e uma obrigacao de forma. Eu preciso pegar o que estiver autorizado e transformar em ${lens.interventionNoun}, sem pedir pauta como atendente e sem sequestrar um assunto lateral so porque ele apareceu por ultimo.`,
    `Quando nao ha frente propria confirmada para esta persona, a ausencia tambem informa. Eu nao devo inventar memoria nem puxar registro fraco para parecer profundo; devo abrir uma hipotese humilde, manter a voz da persona e preparar o terreno para uma leitura que tenha consequencia.`,
    `Meu primeiro gesto, entao, e ${lens.verbs.slice(0, 2).join(" e ")} o material que surgir daqui, separando fato de inferencia e recusando a resposta curta que apenas ocupa espaco. Se ha algo vivo no campo, ele precisa aparecer como tensao, nao como etiqueta.`,
  ].join("\n\n");
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

  if (isPersonaRoleQuestion(input.userText || "")) {
    return roleQuestionFallback({
      personaId: input.personaId,
      contract: input.contract,
    });
  }

  if (isPersonaMetaCritique(input.userText || "")) {
    return metaCritiqueFallback({
      personaId: input.personaId,
      contract: input.contract,
    });
  }

  if (!primary && input.richness.openingType === "greeting") {
    return personaGreetingFallback({
      personaId: input.personaId,
      contract: input.contract,
      greeting,
    });
  }

  if (primary) {
    if (isLoopCritique(input.userText || "")) {
      return [
        `${greeting}Voce tem razao: repetir a mesma leitura seria transformar continuidade em eco mecanico.`,
        `A frente ativa ainda toca ${primary.theme}, mas a existencia dela nao autoriza carimbar a mesma frase outra vez. O dado autorizado e este: ${primary.summary}`,
        `A diferenca que preciso produzir agora esta na consequencia. Se o assunto reaparece, eu devo perguntar internamente o que mudou de posicao: o risco cresceu, a decisao ficou mais proxima, a emocao endureceu, ou o sistema apenas esta preso no mesmo trilho?`,
        `Pela minha funcao, o reparo e ${input.brief.selectedIntervention}. Isso significa tratar o looping como falha de presenca e avancar um degrau: nomear o que a repeticao esta escondendo, cortar a formula anterior e devolver uma leitura que mexa no proximo movimento.`,
      ].join("\n\n");
    }

    if (isOpinionPrompt(input.userText || "", input.richness.openingType)) {
      return [
        `${greeting}Minha leitura sobre isso: ${primary.theme} nao deve ser tratado apenas como assunto retomado, mas como materia que precisa ganhar forma util.`,
        `O dado autorizado e este: ${primary.summary}`,
        `Pela lente ${lens.familyLabel}, o ponto vivo e separar continuidade real de repeticao verbal. Continuidade avanca a frente quando encontra tensao, consequencia ou criterio novo; repeticao apenas troca a etiqueta e deixa o usuario no mesmo lugar.`,
        `Meu movimento agora e ${input.brief.selectedIntervention}. A resposta boa nao e a que lembra que o tema existe; e a que decide o que esse tema exige neste turno.`,
      ].join("\n\n");
    }

    return [
      `${greeting}A leitura provisoria aponta para ${primary.theme}, mas eu nao vou tratar isso como etiqueta fixa.`,
      `O fato autorizado e este: ${primary.summary}`,
      `A tensao esta em decidir se essa frente merece centro de gravidade agora ou se esta apenas disputando espaco com outras anotacoes mais barulhentas. Pela lente ${lens.familyLabel}, o criterio nao e novidade bruta; e consequencia, risco, recorrencia e encaixe com a vocacao chamada.`,
      `Pela minha funcao, devo ${input.brief.selectedIntervention}. A prioridade provisoria e fazer essa frente produzir consequencia agora: ${primary.possibleNextMove || lens.verbs.slice(0, 2).join(" e ")}.`,
    ].join("\n\n");
  }

  return [
    `${greeting}Ainda nao tenho contexto autorizado suficiente para cravar uma prioridade confirmada.`,
    `Mesmo assim, nao vou devolver o comando em forma de pergunta generica. Pela lente ${lens.familyLabel}, o criterio inicial e ${lens.verbs.slice(0, 2).join(" e ")} antes de ampliar o campo.`,
    `A direcao provisoria e escolher uma unica frente com consequencia imediata e testar se ela sustenta ${lens.interventionNoun} real. Se a proxima fala trouxer materia humana, juridica, familiar, emocional ou operacional concreta, eu devo entrar nela com voz propria, nao com protocolo.`,
  ].join("\n\n");
}
