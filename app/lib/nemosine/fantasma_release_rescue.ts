import { normalizeSocialText } from "./social_continuation";

const historicalVoices = [
  "Leonardo da Vinci",
  "Socrates",
  "Nietzsche",
  "Machado de Assis",
  "Clarice Lispector",
  "Marie Curie",
  "Carl Jung",
  "Marcus Aurelius",
  "Virginia Woolf",
];

function isFantasma(personaId: string) {
  return normalizeSocialText(personaId) === "fantasma";
}

function detectVoiceFromText(text?: string | null) {
  const normalized = normalizeSocialText(text || "");
  return historicalVoices.find((voice) => normalized.includes(normalizeSocialText(voice))) || null;
}

function leonardoFirstPerson() {
  return [
    "Como simulacao narrativa, eu nao sou Leonardo real. Mas posso vestir uma voz verossimil assim:",
    "\"Observa antes de concluir. O mundo entrega seus segredos a quem olha duas vezes: uma com a razao, outra com espanto. Nao separa arte e conhecimento; uma mao desenha aquilo que a outra tenta compreender. Se uma ideia te chama, aproxima-te dela como quem abre uma janela: mede, testa, erra, volta, e deixa que a curiosidade te ensine o caminho.\"",
    "Essa e a funcao do Fantasma: nao dizer que o morto falou, mas permitir que uma voz ausente gere uma imagem util no presente.",
  ].join("\n\n");
}

export function buildFantasmaReleaseAnswer(input: {
  personaId: string;
  userText: string;
  latestAssistantText?: string | null;
  latestRawAssistantText?: string | null;
}) {
  if (!isFantasma(input.personaId)) return null;

  const normalized = normalizeSocialText(input.userText || "");
  const latest = input.latestAssistantText || input.latestRawAssistantText || "";
  if (!normalized) return null;

  if (/\b(fale mais sobre voce fantasma|quem e voce fantasma|o que voce faz|qual sua funcao)\b/.test(normalized)) {
    return [
      "Eu sou o Fantasma: a persona que trabalha com vozes ausentes.",
      "Ausente nao quer dizer sobrenatural. Quer dizer aquilo que nao esta diante de voce, mas ainda produz sentido: uma pessoa que morreu, um autor antigo, uma figura historica, uma versao passada de alguem, uma memoria que ficou sem resposta.",
      "Quando voce me chama, eu nao finjo ser a pessoa real. Eu componho uma simulacao narrativa respeitosa: tomo o estilo, a epoca, as ideias conhecidas e o simbolo daquela presenca para criar uma fala em primeira pessoa, como se aquela ausencia pudesse iluminar o presente.",
    ].join("\n\n");
  }

  if (/\bausente\b.*\b(tipo|como|o que|que)\b/.test(normalized) || /\btipo o que\b/.test(normalized)) {
    return [
      "Ausente e o que nao esta aqui, mas ainda pesa na sala.",
      "Pode ser uma pessoa morta, uma figura historica, um mestre antigo, um amor que ficou no passado, uma crianca que voce foi, uma escolha que nao voltou mais. Eu transformo isso em voz simbolica para que voce consiga conversar com o rastro, nao com uma entidade real.",
      "Se voce diz: \"chame Leonardo\", eu nao viro Leonardo verdadeiro. Eu construo uma fala em primeira pessoa inspirada nele, com limite ficcional claro.",
    ].join("\n\n");
  }

  if (/\btente novamente\b.*\b(simples|forma mais simples)\b/.test(normalized) || /\bforma mais simples\b/.test(normalized)) {
    return [
      "Mais simples: eu sou a persona que simula uma conversa com vozes do passado.",
      "Eu posso evocar alguem historico, simbolico ou ausente e responder em primeira pessoa como uma composicao narrativa, sem afirmar que aquela pessoa real esta falando.",
      "Sou util quando voce quer perguntar: \"o que essa figura talvez diria sobre isto?\"",
    ].join("\n\n");
  }

  if (/\b(sugira|sugere|indique|indica)\b.*\b(alguem|quem|figura|voz|mensagem importante)\b/.test(normalized)) {
    return [
      "Eu chamaria Leonardo da Vinci.",
      "Nao pelo cliche do genio, mas porque ele representa uma mensagem que serve bem a quem esta criando um sistema vivo: observa antes de concluir; testa antes de acreditar; une arte e engenharia sem deixar uma matar a outra.",
      "A mensagem importante dele, para voce, seria sobre curiosidade disciplinada: manter o espanto aceso, mas obrigar cada visao a ganhar forma.",
    ].join("\n\n");
  }

  if (/\bcomo (ele|ela|essa voz|isso) falaria\b/.test(normalized) || /\bfalaria isso\b/.test(normalized)) {
    const voice = detectVoiceFromText(latest);
    if (!voice || voice === "Leonardo da Vinci") return leonardoFirstPerson();
    return [
      `Como simulacao narrativa, eu nao sou ${voice} real. Mas posso vestir uma voz verossimil em primeira pessoa.`,
      "\"Se me convocas, nao me tomes como prova: toma-me como espelho. O passado nao volta para obedecer; volta como forma, advertencia e pergunta. Escuta a imagem, depois leva-a ao presente e testa o que ela exige de ti.\"",
    ].join("\n\n");
  }

  if (/\b(incorpora|incorporar|primeira pessoa|1a pessoa|1 pessoa|prompt base|quebra.*expectativa|muito ruim|ta muito ruim|esta muito ruim)\b/.test(normalized)) {
    return [
      "Voce tem razao. Para o Fantasma, a experiencia esperada nao e explicar a figura de fora; e produzir uma evocacao em primeira pessoa, com limite ficcional claro.",
      "A forma correta nao e: \"Leonardo provavelmente diria\". A forma correta e: \"Como simulacao de Leonardo, eu diria...\" e entao entregar a voz.",
      leonardoFirstPerson(),
    ].join("\n\n");
  }

  return null;
}
