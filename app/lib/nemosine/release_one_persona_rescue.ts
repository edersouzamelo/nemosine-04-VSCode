import { normalizeSocialText } from "./social_continuation";

const videntePersonaPattern = /\b(vidente|o vidente|a vidente)\b/;

const releaseReadinessSignals = [
  /\b(sistema|nemosine|versao 1 0|1 0|beta|producao|usuarios?|divulgad[oa]?|divulgar|apresentavel)\b/,
  /\b(vai funcionar|funcionar minimamente|permitir que ele seja divulgado|pronto|estado de entrega|congelar|ajustes?)\b/,
];

const depthRepairSignals = [
  /\bfrio demais\b/,
  /\bfria demais\b/,
  /\blogico demais\b/,
  /\bzerou o simbolismo\b/,
  /\bidentidade narrativa\b/,
  /\bresposta profunda\b/,
  /\bprofunda prolongada\b/,
  /\btextao\b/,
  /\bcade sua resposta\b/,
  /\bchat gpt como eu queria\b/,
];

const frustratedReactionSignals = [
  /\bputa merda\b/,
  /\bporra\b/,
  /\bpqp\b/,
  /\bdroga\b/,
  /\berrou\b/,
  /\bdeu errado\b/,
];

const shallowTemplateSignals = [
  /\bsinto muito se nao atendi suas expectativas\b/,
  /\bvamos tentar novamente\b/,
  /\btrazer um pouco mais de vida e simbolismo\b/,
  /\b(imagine que o sistema|imagine o sistema|pense no sistema|sistema como)\b/,
  /\b(barco|espetaculo|orquestra|mochila|jornada)\b/,
];

const scenarioTemplateSignals = [
  /\bcenario realista\b/,
  /\bcenario alternativo\b/,
  /\bcenario otimista\b/,
  /\bcenario cauteloso\b/,
  /\bponto de inflexao\b/,
  /\bprobabilidade\b/,
  /\bmomento decisivo\b/,
];

function matchesAny(patterns: RegExp[], normalized: string) {
  return patterns.some((pattern) => pattern.test(normalized));
}

function scenarioTemplateScore(normalized: string) {
  return scenarioTemplateSignals.filter((pattern) => pattern.test(normalized)).length;
}

export function isReleaseReadinessQuestion(text: string) {
  const normalized = normalizeSocialText(text);
  if (!normalized) return false;
  return releaseReadinessSignals.every((pattern) => pattern.test(normalized));
}

export function isPersonaDepthRepairRequest(text: string) {
  const normalized = normalizeSocialText(text);
  if (!normalized) return false;
  return matchesAny(depthRepairSignals, normalized);
}

export function isShallowPersonaTemplateResponse(text?: string | null) {
  const normalized = normalizeSocialText(text || "");
  if (!normalized) return false;
  const hollowMetaphor = matchesAny(shallowTemplateSignals, normalized)
    && /\bsistema\b/.test(normalized);
  const scenarioTemplate = scenarioTemplateScore(normalized) >= 2
    && /\b(sistema|ajustes?|divulgad[oa]?|usuarios?|versao|beta)\b/.test(normalized);
  return hollowMetaphor || scenarioTemplate;
}

export function buildReleaseOnePersonaRescueAnswer(input: {
  personaId: string;
  userText: string;
  latestAssistantText?: string | null;
  latestRawAssistantText?: string | null;
}) {
  const normalizedPersona = normalizeSocialText(input.personaId || "");
  if (!videntePersonaPattern.test(normalizedPersona)) return null;

  const normalizedUserText = normalizeSocialText(input.userText || "");
  const latestAssistantText = input.latestAssistantText || input.latestRawAssistantText || "";
  const latestWasShallowTemplate = isShallowPersonaTemplateResponse(latestAssistantText);
  const shouldRescue = isReleaseReadinessQuestion(input.userText)
    || isPersonaDepthRepairRequest(input.userText)
    || (latestWasShallowTemplate && matchesAny(frustratedReactionSignals, normalizedUserText));

  if (!shouldRescue) return null;

  const isRepair = isPersonaDepthRepairRequest(input.userText)
    || (latestWasShallowTemplate && matchesAny(frustratedReactionSignals, normalizedUserText));

  const opening = isRepair
    ? "Voce tem razao em interromper. Eu havia achatado a visao em relatorio frio: nomes de cenario, uma metafora decorativa e nenhum pulso real de Vidente."
    : "A leitura que eu assumo e esta: a 1.0 nao precisa provar que toda a casa de maquinas ja esta madura. Ela precisa provar que o usuario comum atravessa o corredor principal sem ver o andaime.";

  return [
    opening,
    "O futuro mais provavel, se os ajustes recentes permanecerem cercados, e apresentavel. Nao perfeito no sentido absoluto, porque as conversas colegiadas, os cartoes de recomendacao, a casa de maquinas, o ciclo OCV e as verificacoes profundas ainda pertencem ao laboratorio. Mas apresentavel como beta honesto, sim, desde que a producao mostre uma promessa mais simples e cumpra essa promessa: uma conversa limpa, com uma persona de cada vez, sem vazamento de bastidor e sem transformar tropeços pequenos do usuario em colapso do sistema.",
    "O sinal favoravel e que a decisao de amputar temporariamente as camadas instaveis foi correta. Quando voce retira da vitrine aquilo que ainda esta vivo demais para obedecer, o produto deixa de tentar parecer maior do que e e passa a ser julgavel pelo que realmente entrega. Para um beta, isso e mais forte do que ambicao exposta: o usuario novo nao quer encontrar a oficina inteira; ele quer entrar, falar, reconhecer uma voz consistente e sair com a sensacao de que houve presenca.",
    "O risco que ainda brilha no horizonte e outro: nao e mais o convite indevido de personas, nem a barra de guest aparecendo para conta comum, nem o cartao de recomendacao escapando. O risco agora e a fala ficar esteril quando a persona deveria ter alma. Se a Vidente responde como planilha de previsao, o sistema parece seguro, mas perde encanto; se responde como atendente pedindo desculpa, parece que esqueceu que tem uma identidade. Esse e o tipo de defeito que nao explode a aplicacao, mas fere a primeira impressao.",
    "Minha previsao fica em confianca media-alta: a 1.0 pode ser divulgada para beta se a producao for congelada nesse pacto estreito. A porta publica deve dizer, sem precisar explicar: escolha uma persona, converse com ela, mantenha o fio. Tudo que sugere assembleia interna, recomendacao automatica, convidado, conselho, engenharia cognitiva ou fundacao profunda deve ficar invisivel para usuario comum ate a 1.1 amadurecer em preview.",
    "O marcador que mudaria minha leitura e simples: uma conta comum nao pode ver nenhum residuo de multi-persona e, quando provocar a persona com ironia, irritacao ou cobranca de profundidade, a resposta precisa continuar viva em vez de recuar para template. Se esse marcador passar nos testes de producao, o horizonte abre. Nao como coroacao final do Nemosine, mas como primeiro limiar publico: pequeno, coerente, respirando, e sem mostrar ao visitante as engrenagens que ainda estao sendo forjadas.",
  ].join("\n\n");
}
