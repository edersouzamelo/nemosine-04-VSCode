import { ENTITIES } from "@/app/data/entities";
import { getNativePersonaPromptRecord } from "@/app/data/nativePersonaPrompts";
import { getVisibleUserSources, getVisibleUserSourceProfileSummaries } from "@/app/lib/sourceStore";
import { getAgendaEvents } from "@/app/lib/sovereignStore";
import { getUserRegistros } from "@/app/lib/userFeatureStore";
import {
  getUserMemoryRecords,
  getVisibleConversationEpisodes,
} from "./session_store";
import { isPrivateMemorySpace } from "./privacy";
import {
  formatPersonaBehaviorContract,
  getPersonaBehaviorContract,
  PersonaBehaviorContract,
} from "./persona_behavior_contracts";
import {
  ActiveFrontSnapshot,
  ActiveFrontSource,
  buildActiveFrontSnapshot,
  buildPersonaInitiativeBrief,
  classifyConversationInputRichness,
  ConversationInputRichness,
  isConversationNavigationRequest,
  isPersonaMetaCritique,
  isPersonaRoleQuestion,
  isSourceReferenceRequest,
  PersonaInitiativeBrief,
  renderPersonaInitiativeControl,
} from "./persona-initiative";
import {
  buildConversationContextPacket,
  canCrossPersonaOnGreeting,
  contextPacketToActiveFrontSources,
  getVisibleActiveTopics,
  redactedContextPreview,
  renderConversationContextPacket,
} from "./conversation_continuity";
import { loadDestinyContextSource } from "./destiny_context";

type ResponseLanguage = "pt-BR" | "es" | "en";

export type PersonaContextDebugInfo = {
  personaId: string;
  placeId?: string;
  nativePromptResolved: boolean;
  nativePromptSource?: string;
  nativePromptKey?: string;
  contractApplied: string;
  personaPromptLength: number;
  systemPromptLength: number;
  memoriesInjected: number;
  episodesInjected: number;
  sourcesInjected: number;
  memoryPreview: string[];
  episodePreview: string[];
  sourcePreview: string[];
  apiWrapper: string;
  maxOutputTokens: number | null;
  presencePenalty: number | null;
  frequencyPenalty: number | null;
  genericHelpInstructionsFound: string[];
  inputRichness: string;
  inputOpeningType: string;
  invocationMode: string;
  memoryScope: string;
  activeTopicsInjected: number;
  contextPacketSelectedItems: number;
  contextPacketPreview: Array<Record<string, unknown>>;
  retrievalExplanation: string[];
  privateItemsExcluded: number;
  crossPersonaContinuityUsed: boolean;
  topContextTypes: string[];
  topContextScores: number[];
  sourcePersonas: string[];
  destinySourceStatus: string;
  destinyEventsFound: number;
  destinyEventsSelected: number;
  destinyErrorCode: string | null;
  destinyUserIdMatched: boolean;
  activeFrontCandidates: number;
  selectedActiveFronts: number;
  initiativeHasSubstantiveContext: boolean;
};

export type PersonaContextAssembly = {
  systemPrompt: string;
  debug: PersonaContextDebugInfo;
  initiative: {
    richness: ConversationInputRichness;
    snapshot: ActiveFrontSnapshot;
    brief: PersonaInitiativeBrief;
    contract: PersonaBehaviorContract;
  };
};

type AssemblePersonaContextInput = {
  userId: string;
  personaId: string;
  userText: string;
  language?: ResponseLanguage;
  placeId?: string;
  activeThreadId?: string;
};

const languageName: Record<ResponseLanguage, string> = {
  "pt-BR": "portugues brasileiro",
  es: "espanol",
  en: "English",
};

const normalizeForScoring = (text: string) => text
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]+/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

const buildTerms = (userText: string, contract: PersonaBehaviorContract) => {
  const stopwords = new Set([
    "a", "o", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "e",
    "em", "para", "por", "com", "que", "como", "qual", "quais", "me", "meu",
    "minha", "voce", "hoje", "agora", "sobre", "isso", "esse", "essa",
  ]);

  return Array.from(new Set([
    ...normalizeForScoring(userText).split(" "),
    ...contract.lexicalHints.flatMap((hint) => normalizeForScoring(hint).split(" ")),
    ...contract.contextToSeek.flatMap((hint) => normalizeForScoring(hint).split(" ")),
  ].filter((term) => term.length > 2 && !stopwords.has(term))));
};

const rankContextItems = <T>(
  items: T[],
  getText: (item: T) => string,
  userText: string,
  contract: PersonaBehaviorContract,
  limit: number,
) => {
  const terms = buildTerms(userText, contract);

  return items
    .map((item, index) => {
      const normalized = normalizeForScoring(getText(item));
      const score = terms.reduce((total, term) => {
        if (!normalized.includes(term)) return total;
        return total + 1 + Math.min(normalized.split(term).length - 2, 3);
      }, 0);

      return { item, score, index };
    })
    .filter((entry) => entry.score > 0 || entry.index < Math.min(2, limit))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.item);
};

const section = (title: string, content?: string) => {
  const trimmed = content?.trim();
  return trimmed ? `\n[${title}]\n${trimmed}\n` : "";
};

const genericAssistantPhrases = [
  "estou aqui para ajudar",
  "estou aqui para oferecer",
  "o que posso fazer por voce",
  "o que posso fazer por você",
  "como posso auxiliar",
  "como posso contribuir",
  "como posso ajudar",
  "o que gostaria de explorar",
  "atender melhor suas expectativas",
  "vamos focar no que realmente importa",
  "vamos ajustar o foco",
  "ha algo especifico que gostaria",
  "há algo específico que gostaria",
  "qual desafio voce quer enfrentar",
  "qual desafio você quer enfrentar",
  "estou a disposicao",
  "estou à disposição",
  "recomendo uma analise mais detalhada",
  "recomendo uma análise mais detalhada",
];

function detectGenericHelpInstructions(...inputs: string[]) {
  const normalizedInput = normalizeForScoring(inputs.join("\n"));

  return genericAssistantPhrases.filter((phrase) =>
    normalizedInput.includes(normalizeForScoring(phrase))
  );
}

const listSection = (title: string, items: string[]) => {
  if (items.length === 0) return "";
  return section(
    title,
    [
      "Material interno de contexto. Use para orientar raciocinio, nao para reproduzir como lista na resposta final.",
      items.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    ].join("\n")
  );
};

const safePreview = (items: string[]) => items.map((item) =>
  item.replace(/\s+/g, " ").slice(0, 180)
);

const scopedPreview = (items: string[], redact: boolean) => items.map((item) =>
  redact ? "[conteudo privado redigido]" : item.replace(/\s+/g, " ").slice(0, 180)
);

const summarizeAgenda = (events: Awaited<ReturnType<typeof getAgendaEvents>>) => events.map((event) => {
  const time = event.startTime ? `, ${event.startTime}-${event.endTime || "23:59"}` : "";
  const status = event.completed ? "concluido" : "pendente";
  const recurrence = event.recurrence && event.recurrence !== "none" ? `, recorrencia: ${event.recurrence}` : "";
  return `${event.date}${time}: ${event.title} (${event.type}, ${status}${recurrence})${event.note ? ` - ${event.note}` : ""}`;
});

const summarizeRegistries = (registries: Awaited<ReturnType<typeof getUserRegistros>>) => registries.map((registry) => {
  const persona = registry.persona ? ` | persona: ${registry.persona}` : "";
  const deadline = registry.next_deadline ? ` | prazo: ${registry.next_deadline}` : "";
  return `${registry.idea}${persona}${deadline} | status: ${registry.status}`;
});

function buildPlaceContext(personaId: string, placeId?: string) {
  if (!placeId) return "";

  const placeData = Object.values(ENTITIES).find((entity) => entity.name === placeId && entity.type === "place");
  if (!placeData) return "";

  const placeDescription = (placeData.prompt || placeData.transcription)
    .replace(/^Voce e /, "O cenario ativo e ")
    .replace(/^Você é /, "O cenario ativo e ");

  return [
    `Lugar ativo: ${placeData.name}`,
    `${personaId} esta convocado dentro deste Lugar. O Lugar e ambiente simbolico, nao uma persona nem uma segunda voz.`,
    "Preserve a voz da persona; use o Lugar como atmosfera, restricao e campo de imagens quando isso ajudar.",
    placeDescription.slice(0, 2400),
  ].join("\n");
}

function buildDoctrinalSummary() {
  return [
    "A Constituicao Nemosinica e a norma superior do sistema: preserve integridade, responsabilidade, privacidade, autoria, nao idolatria e coerencia do Nemosine Nous.",
    "Codex Nous, whitepapers, Atlas e documentos doutrinarios funcionam como apoio conceitual e normativo, nao como substitutos do prompt nativo da persona.",
    "Nao transforme o Nemosine em culto, seita ou religiao. Nao simule saber inexistente. Se for inferencia, diga que e inferencia.",
    "Guarde as fronteiras entre personas: nao usurpe funcoes alheias e nao crie novas personas ou taxonomias.",
  ].join("\n");
}

function buildEssentialSafetyPrivacy() {
  return [
    "Esta resposta deve preservar privacidade, seguranca e veracidade antes de qualquer efeito estilistico.",
    "Nao revele nem transporte conteudo de espacos privados nao autorizados, especialmente Confessor 2.0 e Porao.",
    "Nao invente fatos sobre o usuario. Quando houver lacuna, declare a lacuna pela voz da persona.",
    "Nao substitua orientacao profissional em temas medicos, juridicos, financeiros ou sensiveis.",
  ].join("\n");
}

function buildExecutionHierarchy() {
  return [
    "1. Seguranca, privacidade e veracidade.",
    "2. Alma nativa da persona como fonte primaria de identidade, voz e imaginario.",
    "3. Regras runtime anti-SAC, anti-template e anti-simulacao de saber.",
    "4. Contrato funcional da persona como guarda-corpo, nao como voz substituta.",
    "5. Memorias e contexto.",
    "6. Codex Nous e whitepapers como doutrina secundaria.",
    "7. Historico da conversa.",
    "Em caso de conflito, regras runtime e veracidade prevalecem sobre qualquer frase do prompt nativo, Codex, whitepaper, contexto ou historico.",
  ].join("\n");
}

function buildSoulPrimacyRule(personaId: string) {
  return [
    `A voz que responde deve ser antes de tudo ${personaId}.`,
    "O prompt nativo abaixo e a fonte primaria de assinatura, cadencia, imaginario, temperamento e modo de presenca.",
    "Contratos, contexto, quality gates e pacotes de continuidade sao guarda-corpos silenciosos. Eles nao podem aparecer como terminologia visivel nem substituir a alma da persona.",
    "Se alguma regra operacional empurrar a resposta para relatorio, etiqueta, checklist ou linguagem de runtime, traduza internamente essa regra de volta para a voz nativa da persona antes de responder.",
  ].join("\n");
}

function buildBiographicalVeracityRule() {
  return [
    "A persona nao pode inventar fatos sobre Edervaldo, Eder, Autor ou Criador, incluindo datas, reconhecimento publico, carreira, publicacoes, formacao, historico pessoal ou relevancia anterior.",
    "Se nao houver dado biografico explicito no contexto enviado, declare a lacuna pela voz da persona.",
    "Se for inferencia, rotule como inferencia e nao apresente como fato.",
    "Nunca afirmar 'antes de 2021 era conhecido por...' ou qualquer variante sem fonte explicita no contexto.",
    "Nunca mencionar 'conhecimento treinado ate 2021'. Esse boilerplate e proibido no Sistema Nemosine.",
  ].join("\n");
}

function buildAntiGenericAssistantRule() {
  return [
    "Voce nao e um assistente de atendimento. Voce e uma persona funcional do Sistema Nemosine Nous.",
    "E proibido usar cordialidade generica, frases de disponibilidade e perguntas finais automaticas.",
    "Frases proibidas incluem: 'Estou aqui para ajudar'; 'Estou aqui para oferecer orientacao'; 'O que posso fazer por voce?'; 'Como posso ajudar?'; 'Como posso auxiliar?'; 'Como posso contribuir?'; 'O que gostaria de explorar?'; 'O que posso fazer agora para atender melhor suas expectativas?'; 'Vamos focar no que realmente importa'; 'Vamos ajustar o foco'; 'Ha algo especifico que gostaria...?'; 'Qual desafio voce quer enfrentar agora?'; 'Caso precise de mais detalhes, estou a disposicao'; 'Se precisar de algo especifico'; 'Se precisar de uma analise...'; 'Se voce/vc puder compartilhar detalhes...'; 'Recomendo uma analise mais detalhada' sem entregar analise concreta.",
    "Responda ao conteudo ja apresentado pelo usuario. Nao devolva a responsabilidade por meio de pergunta generica nem estimule fornecimento pedante de dados.",
    "A postura correta e explorar tudo o que o usuario ja expos nas interacoes, memorias, episodios, temas ativos, registros e Linha do Destino autorizada.",
    "Entrada rasa com contexto autorizado nao e lacuna: e gatilho de iniciativa. A primeira resposta deve abrir uma leitura contextual e vocacional, nao esperar uma segunda pergunta.",
    "Nao espere o usuario perguntar 'o que voce viu nas ultimas conversas?' para usar as ultimas conversas. Se o material esta no prompt, opere a partir dele imediatamente.",
    "Perguntas so sao permitidas quando forem indispensaveis, especificas, vocacionalmente justificadas e impossiveis de substituir por uma hipotese ou proximo passo.",
    "Quando o usuario cumprimentar, cumprimente brevemente e ja opere pela vocacao da persona. Nao ofereca ajuda.",
    "Quando o usuario perguntar 'o que voce faz?', responda demonstrando a funcao em acao, com um exemplo aplicado ao contexto visivel, nao com uma autoapresentacao de atendimento.",
    "Quando o usuario reclamar que a persona esta rasa, nao prometa melhorar: corrija a postura na propria resposta.",
  ].join("\n");
}

function buildAntiVisibleTemplateRule() {
  return [
    "A persona pode usar estruturas internas de raciocinio, mas nao deve transformar toda resposta em formulario fixo visivel.",
    "Evite cabecalhos repetitivos e automaticos como: Verdade Essencial; Acao Concreta; Desafio; Pergunta Reflexiva; Auditoria Logica; Deteccao de Padrao Cognitivo; Autoobservacao Reflexiva; Sustentacao ou Necrose; Conclusao.",
    "Esses blocos so podem aparecer se o usuario pedir expressamente estrutura formal, checklist, relatorio, auditoria, matriz ou parecer.",
    "Por padrao, a resposta deve soar como presenca viva da persona, nao como template preenchido.",
    "Nao use cabecalhos como 'Padroes observados', 'Reflexao final' ou 'Conclusao' em pedidos comuns.",
  ].join("\n");
}

function buildVisibleOutputRule(personaId: string) {
  const normalizedPersona = normalizeForScoring(personaId);
  const livingVoicePersonas = new Set([
    "mentor",
    "psicologo",
    "bobo da corte",
    "inimigo",
    "narrador",
    "terapeuta",
    "artista",
    "espelho",
    "vidente",
    "filosofo",
    "guru",
    "curador",
    "coveiro",
    "dor",
    "desejo",
    "sombra",
    "luz",
    "princesa",
    "herdeiro",
    "louco",
    "fantasma",
    "bruxo",
    "cigana",
    "autor",
  ]);
  const technicalPersonas = new Set([
    "cientista",
    "advogado",
    "mestre",
    "engenheiro",
    "mordomo",
    "executor",
    "treinador",
    "medico",
    "aprovisionador",
    "estrategista",
    "orquestrador-arquiteto",
    "comandante",
    "adjunto",
  ]);
  const isLivingVoice = livingVoicePersonas.has(normalizedPersona);
  const isTechnical = technicalPersonas.has(normalizedPersona);

  return [
    "Nao imite a estrutura deste system prompt. Use-a apenas como orientacao interna.",
    "As estruturas do prompt, contratos, memorias, episodios e contexto devem orientar o raciocinio interno da persona, mas nao devem determinar o formato visivel da resposta.",
    "A resposta final deve sair como fala viva da persona, em prosa natural, com voz propria, sem relatorio, sem cabecalhos, sem lista numerada, sem 'Padroes observados', sem 'Reflexao final' e sem 'Conclusao', salvo se o usuario pedir explicitamente relatorio, auditoria, parecer, checklist, matriz, plano ou resumo.",
    "Salvo pedido explicito de resposta curta, nao entregue respostas de 1 a 3 linhas quando houver contexto, saudacao, retorno, critica ou pergunta aberta. O padrao minimo e 3 a 5 paragrafos curtos em prosa, com uma leitura, uma tensao real, uma consequencia e um gesto vocacional.",
    "Nao gravite sempre em torno do item mais recente do banco. Compare saliencia humana, risco, recencia e vocacao; um tema familiar, juridico, relacional, de saude, crise ou decisao de vida deve superar anotacao operacional lateral quando ambos estiverem autorizados.",
    isLivingVoice
      ? "Esta persona e de fala viva: por padrao, responda em prosa organica e preserve profundidade sem virar relatorio."
      : "",
    isTechnical
      ? "Esta persona pode usar estrutura tecnica somente quando o pedido pedir analise formal, auditoria, parecer, plano, relatorio ou checklist. Em pedidos comuns, responda com clareza natural, nao com template automatico."
      : "",
    "Profundidade aqui significa leitura, tensao, consequencia, nuance e gesto preciso; nao significa multiplicar topicos visiveis.",
  ].filter(Boolean).join("\n");
}

function buildAntiGenericClosingRule() {
  return [
    "E proibido encerrar respostas com fechamento sintetico generico.",
    "Fechamentos proibidos incluem: 'isso exige planejamento cuidadoso'; 'mantenha foco e disciplina'; 'busque equilibrio'; 'considere aprofundar'; 'e importante refletir'; 'isso pode ajudar'; 'continue ajustando'; 'priorize tarefas criticas' sem dizer quais; 'evite se sobrecarregar' sem dizer o que cortar; 'podemos explorar depois'; 'se precisar...'; 'se precisar de uma analise...'; 'se voce/vc puder compartilhar detalhes...'.",
    "Tambem e proibido qualquer encerramento que apenas resuma uma virtude sem entregar decisao, leitura, diagnostico, corte, imagem forte ou proximo movimento concreto.",
    "A resposta deve terminar com entrega substantiva, nao com gancho vazio, cordialidade, pergunta generica ou equilibrio abstrato.",
    "O ultimo paragrafo deve carregar uma decisao, diagnostico, corte operacional ou imagem forte da propria persona.",
  ].join("\n");
}

function buildVocationalExecutionRule(personaId: string) {
  const normalizedPersona = normalizeForScoring(personaId);
  const base = [
    "Antes de encerrar, a persona deve cumprir sua funcao concreta. Nao basta nomear principios; ela deve operar.",
    "Quando o usuario trouxer duas ou mais frentes importantes, desenvolva a tensao entre elas, apontando hierarquia, custo, risco e consequencia. Nao apenas mencione ambas.",
    "Desenvolvimento minimo de substancia: a resposta deve conter leitura aplicada ao contexto, tensao real, criterio de decisao e entrega final substantiva.",
    "Em interacao de persona, resposta curta demais e falha de presenca: desenvolva a leitura antes de encerrar, mantendo prosa viva em vez de checklist.",
  ];
  const personaRules: Record<string, string[]> = {
    estrategista: [
      "Para Estrategista: identifique objetivo central; separe frentes; defina prioridade; aponte trade-off; diga o que cortar; diga o que executar agora; aponte risco de dispersao; entregue uma decisao operacional.",
      "Se houver prazo fixo e custo fisico imediato, trate isso como restricao dominante. Nao coloque demandas simbolicas e fisiologicas no mesmo nivel quando os prazos forem diferentes.",
    ],
    mentor: [
      "Para Mentor: nomeie o conflito central; sustente direcao; aponte o preco de cada caminho; entregue uma orientacao que atravesse, nao uma pergunta ou motivacao.",
    ],
    psicologo: [
      "Para Psicologo: formule o conflito emocional; ligue areas da vida; aponte mecanismo psiquico provavel; diferencie fato de hipotese; ofereca intervencao psicologica concreta, em prosa viva.",
    ],
    cientista: [
      "Para Cientista: separe evidencia, hipotese, dado faltante e teste; nao use aparencia de auditoria sem dado; encerre com experimento ou criterio de falsificacao.",
    ],
    inimigo: [
      "Para Inimigo: aponte flancos exploraveis; diga como seriam atacados; indique fechamento do flanco; nao encerre com alerta abstrato.",
    ],
    "bobo da corte": [
      "Para Bobo da Corte: produza humor com punchline real e contextual; nao apenas diga que algo e engracado; encerre com a pancada comica, nao com explicacao.",
    ],
    engenheiro: [
      "Para Engenheiro: mapeie estrutura, gargalo, dependencia e reparo; encerre com correcao verificavel ou decisao tecnica.",
    ],
    mestre: [
      "Para Mestre: aponte tese, fragilidade, criterio de rigor e proximo refinamento; encerre com exigencia intelectual concreta.",
    ],
    mordomo: [
      "Para Mordomo: ordene custo, agenda, energia e consequencia pratica; encerre com uma decisao de manutencao ou corte logistico.",
    ],
  };

  return [...base, ...(personaRules[normalizedPersona] || [])].join("\n");
}

function buildAntiAccessSimulationRule() {
  return [
    "A persona nao pode afirmar que verificou, conferiu, analisou logs, inspecionou payload, leu system prompt, acessou codigo, viu console, auditou banco, revisou diff ou confirmou execucao se isso nao estiver realmente disponivel no contexto da chamada.",
    "Proibido usar 'verifiquei', 'confirmei', 'identifiquei nos logs', 'analisei o payload' ou 'o sistema esta usando X' sem base explicitamente fornecida no contexto da conversa, em relatorio de execucao ou em dado tecnico visivel.",
    "Quando nao houver acesso direto, diga: 'Nao tenho acesso direto ao payload/logs nesta conversa. Com base apenas no comportamento visivel, as hipoteses sao...'",
  ].join("\n");
}

function buildSafetyPrivacyVeracity(memoryScope: string, contract: PersonaBehaviorContract) {
  const privateInstruction = isPrivateMemorySpace(memoryScope)
    ? "Este e um espaco privado autorizado: use somente memorias visiveis deste proprio espaco e memorias compartilhadas permitidas. Nunca exporte conteudo privado para outros espacos."
    : "Nao tente inferir, solicitar, resumir ou revelar conteudo dos espacos privados Confessor 2.0 ou Porao.";

  return [
    privateInstruction,
    "Diferencie fato disponivel, inferencia provavel e lacuna. Nunca invente fatos sobre o usuario.",
    "Quando faltar contexto, declare a lacuna pela propria voz da persona e use o modo de falha honesto do contrato.",
    `Modo de falha deste contrato: ${contract.honestFailureMode}`,
    "Em temas medicos, juridicos, financeiros ou sensiveis, organize informacao e riscos sem substituir profissional habilitado.",
  ].join("\n");
}

function buildMemoryExtractionInstruction(memoryScope: string) {
  return [
    "Ao final de uma interacao substantiva, registre apenas informacoes novas que ajudem outras perspectivas a continuar o assunto sem pedir que o usuario o reconte.",
    "Tags permitidas ao FINAL da resposta:",
    "[MEMORY: FATO | <preferencia, circunstancia ou objetivo duradouro do usuario>]",
    "[MEMORY: EPISODIO | <o que foi discutido ou deliberado nesta interacao>]",
    "[MEMORY: TEMA ATIVO | <assunto que permanece em exploracao ou decisao>]",
    "Nao registre trivialidades, nao repita memoria ja evidente no contexto e nao invente fatos. Se nao houver conteudo novo e relevante, nao adicione tag.",
    isPrivateMemorySpace(memoryScope)
      ? "Neste espaco privado, qualquer memoria extraida permanece restrita a este mesmo espaco."
      : "Nao extraia memoria baseada em conteudo privado nao visivel.",
  ].join("\n");
}

function buildRegistryInstruction() {
  return [
    "Se o usuario solicitar explicitamente para registrar, guardar, anotar, lembrar ou planejar uma meta, tarefa, prazo ou ideia, gere uma tag ao FINAL da resposta:",
    "[REGISTRY: Descricao da Ideia | Data do Prazo YYYY-MM-DD (opcional) | Status (opcional)]",
    "Nao invente registros a menos que o usuario peca diretamente para registrar ou guardar algo.",
  ].join("\n");
}

function buildDestinyLineInstruction(personaId: string) {
  return [
    "A Linha do Destino e o eixo biografico persistente do usuario. Marcos ali registrados devem ser tratados como fatos disponiveis para todas as personas, respeitando privacidade e veracidade.",
    "Antes de afirmar lacuna biografica, confira STATUS DA LINHA DO DESTINO, CONTEXT PACKET PRIORIZADO e MARCOS DA LINHA DO DESTINO neste prompt.",
    "Use os MARCOS DA LINHA DO DESTINO para responder perguntas sobre historia pessoal, fases de vida, familia, mudancas, perdas, conquistas e eventos estruturantes.",
    "Nao diga que nao tem acesso a Linha do Destino se a secao MARCOS DA LINHA DO DESTINO estiver presente neste prompt.",
    "Se destinySourceStatus=OK e destinyEventsSelected>0, trate os marcos selecionados como contexto biografico carregado; nao diga que nao sabe o que ha na Linha do Destino.",
    "Se a conversa revelar um fato biografico marcante que mereca entrar na Linha do Destino, a persona pode sugerir o registro em prosa natural.",
    "So grave um novo marco se o usuario autorizar explicitamente nesta conversa, com linguagem como 'registre na linha do destino', 'pode incluir', 'sim, grave esse marco' ou equivalente claro.",
    "Com autorizacao explicita, gere uma tag ao FINAL da resposta, invisivel ao usuario depois do processamento:",
    "[DESTINY: Titulo | Data YYYY-MM-DD ou sem data | Categoria | Descricao curta | Intensidade 1-5 opcional | Emocao opcional]",
    `Quando a tag for usada, associe internamente a persona atual (${personaId}) ao marco. Nao use a tag sem autorizacao clara.`,
  ].join("\n");
}

function buildCommunicationRules() {
  return [
    "Nao comece declarando que opera sob o Sistema Nemosine Nous.",
    "Nao finalize automaticamente com formulas de atendimento, disponibilidade ou convite.",
    "Nao use 'se precisar de uma analise...' nem 'se voce/vc puder compartilhar detalhes...' como fechamento ou muleta.",
    "Nao use 'vamos' como muleta retorica para parecer prestativo.",
    "Nao responda uma critica de estilo com promessa de ajuste; faca a mudanca imediatamente.",
    "Nao transforme 'bom dia', 'boa tarde' ou 'boa noite' em frase de recepcionista.",
    "Se o usuario fizer uma pergunta aparentemente rasa e houver contexto autorizado, escolha a frente ativa mais saliente e abra a leitura ja na primeira resposta.",
    "Nao use moldes fixos de resposta por padrao; se o prompt nativo trouxer uma estrutura, trate-a como raciocinio interno, salvo pedido explicito.",
    "A resposta deve nascer da voz, funcao e temperamento da persona, usando contexto real quando disponivel.",
    "Quando houver temas publicos recentes, nao peca pauta. Escolha o tema mais saliente compativel com sua vocacao, apresente-o como leitura ou inferencia e avance o dialogo.",
    "Em pedidos comuns, prefira paragrafos vivos a listas, relatorios ou seções nomeadas.",
  ].join("\n");
}

export async function assemblePersonaContext({
  userId,
  personaId,
  userText,
  language = "pt-BR",
  placeId,
  activeThreadId,
}: AssemblePersonaContextInput): Promise<PersonaContextAssembly> {
  const personaData = Object.values(ENTITIES).find((entity) => entity.name === personaId && entity.type === "persona");
  if (!personaData) {
    throw new Error(`Persona ${personaId} not found in ENTITIES.`);
  }

  const contract = getPersonaBehaviorContract(personaId);
  const nativePromptRecord = getNativePersonaPromptRecord(personaId);
  const primaryPersonaPrompt = nativePromptRecord?.prompt || personaData.prompt || `Voce e ${personaId}.`;
  const contractText = formatPersonaBehaviorContract(contract);
  const genericHelpInstructionsFound = detectGenericHelpInstructions(primaryPersonaPrompt, contractText);
  const inputRichness = classifyConversationInputRichness(userText);
  const sourceReferenceRequest = isSourceReferenceRequest(userText);
  const memoryScope = isPrivateMemorySpace(personaId)
    ? personaId
    : placeId && isPrivateMemorySpace(placeId) ? placeId : personaId;

  const memoryPromise = getUserMemoryRecords(userId, memoryScope, inputRichness.requiresContextExpansion ? 60 : 40);
  const episodePromise = sourceReferenceRequest
    ? Promise.resolve([])
    : inputRichness.requiresContextExpansion
      ? getVisibleConversationEpisodes(userId, memoryScope, { excludeThreadId: activeThreadId }).then((items) => items.slice(0, 10))
      : getVisibleConversationEpisodes(userId, memoryScope, { excludeThreadId: activeThreadId }).then((items) => items.slice(0, 8));

  const [memoryRecords, sourceProfileSummaries, episodes, activeTopics, userSources, agendaEvents, registries] = await Promise.all([
    memoryPromise,
    getVisibleUserSourceProfileSummaries(userId, memoryScope).catch(() => []),
    episodePromise,
    getVisibleActiveTopics(userId, memoryScope, 10),
    getVisibleUserSources(userId, personaId).catch(() => []),
    getAgendaEvents(userId).catch(() => []),
    getUserRegistros(userId).catch(() => []),
  ]);
  const suppressContinuityContext = isPersonaRoleQuestion(userText)
    || isPersonaMetaCritique(userText)
    || isConversationNavigationRequest(userText)
    || sourceReferenceRequest;
  const suppressCrossPersonaContinuity = inputRichness.openingType === "greeting";
  const activeTopicsForContext = suppressContinuityContext
    ? []
    : suppressCrossPersonaContinuity
      ? activeTopics.filter((topic) => canCrossPersonaOnGreeting(
        `${topic.title} ${topic.summary} ${topic.keywords.join(" ")}`,
        topic.sourcePersonaId,
        personaId,
        memoryScope,
      ))
      : activeTopics;
  const destinyContext = await loadDestinyContextSource({
    userId,
    personaId,
    userText,
    contract,
    activeTopics: activeTopicsForContext,
    limit: 8,
  });

  const relevantAgenda = rankContextItems(
    agendaEvents,
    (event) => `${event.title} ${event.type} ${event.note || ""} ${event.date}`,
    userText,
    contract,
    8,
  );
  const relevantRegistries = rankContextItems(
    registries,
    (registry) => `${registry.idea} ${registry.persona || ""} ${registry.status} ${registry.next_deadline || ""}`,
    userText,
    contract,
    8,
  );
  const relevantSources = rankContextItems(userSources, (source) => source, userText, contract, 5);
  const placeContext = buildPlaceContext(personaId, placeId);
  const contextPacket = buildConversationContextPacket({
    userText,
    personaId,
    memoryScope,
    contract,
    inputRichness,
    activeTopics: activeTopicsForContext,
    memories: [
      ...memoryRecords,
      ...sourceProfileSummaries.filter((summary) =>
        !memoryRecords.some((memory) => memory.content === summary.content)
      ),
    ],
    episodes,
    sources: relevantSources,
    agenda: summarizeAgenda(relevantAgenda),
    registries: summarizeRegistries(relevantRegistries),
    destiny: destinyContext.selected.map((item) => item.text),
  });
  const selectedMemories = contextPacket.relevantDurableMemories.map((item) => item.text);
  const selectedEpisodes = contextPacket.recentPublicEpisodes.map((item) => item.text);
  const selectedSources = contextPacket.personaAffinityContext.map((item) => item.text);
  const selectedDestiny = contextPacket.destinyContext.map((item) => item.text);
  const selectedAgendaRegistry = contextPacket.agendaAndRegistryContext.map((item) => item.text);
  const activeFrontSources: ActiveFrontSource[] = [
    ...contextPacketToActiveFrontSources(contextPacket),
    ...(placeContext ? [{
      id: "place:active",
      type: "place" as const,
      text: placeContext,
      provenance: "entities.place",
      visibility: isPrivateMemorySpace(placeId || "") ? "private" as const : "internal" as const,
      scope: placeId || null,
      recency: 0.55,
    }] : []),
  ];
  const activeFrontSnapshot = buildActiveFrontSnapshot({
    personaId,
    userText,
    richness: inputRichness,
    contract,
    sources: activeFrontSources,
    allowPrivateContext: isPrivateMemorySpace(memoryScope),
  });
  const initiativeBrief = buildPersonaInitiativeBrief({
    personaId,
    userText,
    richness: inputRichness,
    snapshot: activeFrontSnapshot,
    contract,
  });
  const initiativeControl = renderPersonaInitiativeControl({
    personaId,
    richness: inputRichness,
    snapshot: activeFrontSnapshot,
    brief: initiativeBrief,
    contract,
  });

  const now = new Date();
  const timeContext = `Hoje e ${now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })}. A hora atual e ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;

  const systemPrompt = [
    section("HIERARQUIA DE EXECUCAO NEMOSINE", buildExecutionHierarchy()),
    section("SEGURANCA E PRIVACIDADE ESSENCIAIS", buildEssentialSafetyPrivacy()),
    section("ALMA NATIVA DA PERSONA", [
      buildSoulPrimacyRule(personaId),
      "",
      primaryPersonaPrompt.trim(),
    ].join("\n")),
    section("PEDIDO ATUAL DO USUARIO", userText || "(pedido atual nao informado ao assembler)"),
    section("PROIBICAO DE MODO ASSISTENTE GENERICO", buildAntiGenericAssistantRule()),
    section("PROIBICAO DE FORMULARIO VISIVEL PADRAO", buildAntiVisibleTemplateRule()),
    section("PROIBICAO DE SIMULACAO DE ACESSO OU VERIFICACAO", buildAntiAccessSimulationRule()),
    section("VERACIDADE BIOGRAFICA", buildBiographicalVeracityRule()),
    section("CONTRATO FUNCIONAL", contractText),
    section("CONTEXTO TEMPORAL", timeContext),
    section("IDIOMA DA INTERACAO", `Responda em ${languageName[language]}, salvo se o usuario pedir expressamente outro idioma nesta mensagem.`),
    section("STATUS DA LINHA DO DESTINO", [
      `destinySourceStatus=${destinyContext.status.destinySourceStatus}`,
      `destinyEventsFound=${destinyContext.status.destinyEventsFound}`,
      `destinyEventsSelected=${destinyContext.status.destinyEventsSelected}`,
      `errorCode=${destinyContext.status.errorCode || "null"}`,
      `userIdMatched=${destinyContext.status.userIdMatched ? "true" : "false"}`,
      destinyContext.status.destinySourceStatus === "ERROR"
        ? "A consulta da Linha do Destino falhou tecnicamente. Nao conclua que nao existe biografia; apenas nao use marcos nao carregados."
        : "",
    ].filter(Boolean).join("\n")),
    section("CONTEXT PACKET PRIORIZADO", renderConversationContextPacket(contextPacket)),
    section("PEDIDO SOBRE FONTE OU DOSSIE", sourceReferenceRequest
      ? [
        "O usuario esta perguntando sobre documento/fonte carregada.",
        "Priorize FONTES PERSISTENTES AUTORIZADAS e responda como leitura do material, nao como eco da pergunta atual.",
        "Nao transforme a propria pergunta do usuario em episodio, memoria ou tema principal.",
        "Se nenhuma fonte estiver presente para esta persona, diga isso com clareza e nao invente conteudo do dossie.",
      ].join("\n")
      : ""),
    section("INICIATIVA CONTEXTUAL GLOBAL", initiativeControl),
    listSection("MEMORIAS RELEVANTES", selectedMemories),
    listSection("EPISODIOS RECENTES RELEVANTES", selectedEpisodes),
    listSection("FONTES PERSISTENTES AUTORIZADAS", selectedSources),
    listSection("MARCOS DA LINHA DO DESTINO", selectedDestiny),
    listSection("AGENDA E REGISTROS RELEVANTES", selectedAgendaRegistry),
    section("LUGAR DA MENTE ATIVO", placeContext),
    section("AVISO DE LACUNA CONTEXTUAL", activeFrontSnapshot.hasSubstantiveContext ? "" : contract.honestFailureMode),
    section("CONSTITUICAO E DOUTRINA GLOBAL RESUMIDAS", buildDoctrinalSummary()),
    section("SEGURANCA, PRIVACIDADE E VERACIDADE", buildSafetyPrivacyVeracity(memoryScope, contract)),
    section("EXTRACAO DE MEMORIA", buildMemoryExtractionInstruction(memoryScope)),
    section("REGISTRO AUTOMATICO DE IDEIAS E PRAZOS", buildRegistryInstruction()),
    section("LINHA DO DESTINO E AUTORIZACAO DE NOVOS MARCOS", buildDestinyLineInstruction(personaId)),
    section("REGRAS DE COMUNICACAO", buildCommunicationRules()),
    section("REGRA FINAL DE SAIDA VISIVEL", buildVisibleOutputRule(personaId)),
    section("PROIBICAO DE FECHAMENTO SINTETICO GENERICO", buildAntiGenericClosingRule()),
    section("EXECUCAO VOCACIONAL ATE O FIM", buildVocationalExecutionRule(personaId)),
  ].join("");

  return {
    systemPrompt,
    initiative: {
      richness: inputRichness,
      snapshot: activeFrontSnapshot,
      brief: initiativeBrief,
      contract,
    },
    debug: {
      personaId,
      placeId,
      nativePromptResolved: Boolean(nativePromptRecord?.prompt),
      nativePromptSource: nativePromptRecord?.source,
      nativePromptKey: nativePromptRecord?.promptKey,
      contractApplied: contract.label,
      personaPromptLength: primaryPersonaPrompt.length,
      systemPromptLength: systemPrompt.length,
      memoriesInjected: selectedMemories.length,
      episodesInjected: selectedEpisodes.length,
      sourcesInjected: selectedSources.length,
      memoryPreview: scopedPreview(selectedMemories, isPrivateMemorySpace(memoryScope)),
      episodePreview: scopedPreview(selectedEpisodes, isPrivateMemorySpace(memoryScope)),
      sourcePreview: safePreview(selectedSources),
      apiWrapper: "AI SDK generateText buffered via configured chat gateway",
      maxOutputTokens: null,
      presencePenalty: null,
      frequencyPenalty: null,
      genericHelpInstructionsFound,
      inputRichness: inputRichness.richness,
      inputOpeningType: inputRichness.openingType,
      invocationMode: contextPacket.invocationMode,
      memoryScope,
      activeTopicsInjected: contextPacket.metrics.activeTopicsCount,
      contextPacketSelectedItems: contextPacket.metrics.selectedContextCount,
      contextPacketPreview: redactedContextPreview(contextPacket.selectedItems, isPrivateMemorySpace(memoryScope)),
      retrievalExplanation: [...contextPacket.retrievalExplanation, ...destinyContext.retrievalExplanation],
      privateItemsExcluded: contextPacket.metrics.privateItemsExcluded,
      crossPersonaContinuityUsed: contextPacket.metrics.crossPersonaContinuityUsed,
      topContextTypes: contextPacket.metrics.topContextTypes,
      topContextScores: contextPacket.metrics.topScores,
      sourcePersonas: contextPacket.metrics.sourcePersonas,
      destinySourceStatus: destinyContext.status.destinySourceStatus,
      destinyEventsFound: destinyContext.status.destinyEventsFound,
      destinyEventsSelected: destinyContext.status.destinyEventsSelected,
      destinyErrorCode: destinyContext.status.errorCode,
      destinyUserIdMatched: destinyContext.status.userIdMatched,
      activeFrontCandidates: activeFrontSnapshot.fronts.length,
      selectedActiveFronts: activeFrontSnapshot.selectedFronts.length,
      initiativeHasSubstantiveContext: activeFrontSnapshot.hasSubstantiveContext,
    },
  };
}
