export const TECHNICAL_ASSISTANT_FALLBACK = "Nao foi possivel formular uma resposta adequada nesta tentativa.";

export function normalizeSocialText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isTechnicalAssistantFallback(text?: string | null) {
  return normalizeSocialText(text || "") === normalizeSocialText(TECHNICAL_ASSISTANT_FALLBACK);
}

export function isSocialContinuationInput(text: string) {
  const normalized = normalizeSocialText(text);
  if (!normalized) return false;
  return /\b(aleluia|deu certo|funcionou|funfou|boa|ufa|maravilha|gloria)\b/.test(normalized)
    || /\b(kkk+|haha+|rsrs+|hehe+)\b/.test(normalized)
    || /\b(deu errado|travou|morreu|bugou|volta|voolta|greve|vamos continuar|continuar a conversa)\b/.test(normalized);
}

export function buildSocialContinuationAnswer(input: {
  personaId: string;
  userText: string;
  latestAssistantText?: string | null;
  latestRawAssistantText?: string | null;
}) {
  const normalized = normalizeSocialText(input.userText);
  if (!isSocialContinuationInput(normalized)) return null;

  const latest = normalizeSocialText(input.latestAssistantText || "");
  const hadTechnicalFallback = isTechnicalAssistantFallback(input.latestRawAssistantText)
    || isTechnicalAssistantFallback(input.latestAssistantText);
  const justConfirmedRouting = /\b(nao consigo chamar|menu de personas|sem transformar esta conversa|convite coletivo)\b/.test(latest);
  const asksRecovery = hadTechnicalFallback
    || /\b(deu errado|travou|morreu|bugou|volta|voolta|greve|vamos continuar|continuar a conversa)\b/.test(normalized);

  if (asksRecovery) {
    const recoveryLine = justConfirmedRouting
      ? `A resposta certa aqui e retomar o fio: se voce pedir outro persona, eu explico o caminho pela interface e sigo como ${input.personaId}, sem conselho, sem cartao e sem travar a conversa.`
      : `A resposta certa aqui e retomar o fio como ${input.personaId}, sem cartao, sem conselho e sem transformar uma falha tecnica em assunto da conversa.`;
    return [
      "Voltei. Esse turno era so uma reacao de teste, nao uma nova tarefa.",
      recoveryLine,
      "Vamos continuar daqui, no modo simples da 1.0.",
    ].join("\n\n");
  }

  if (/\b(aleluia|deu certo|funcionou|funfou|boa|ufa|maravilha|gloria)\b/.test(normalized)) {
    return [
      "Deu certo.",
      justConfirmedRouting
        ? `O teste importante passou: eu orientei a troca de persona pela UI e permaneci como ${input.personaId}.`
        : `Eu continuo como ${input.personaId} e trato sua comemoração como comemoração, nao como uma exigencia nova.`,
      "Pode soltar uma risada no meio do teste: isso nao deve quebrar a conversa.",
    ].join("\n\n");
  }

  return [
    "Eu ri junto e sigo aqui.",
    `O fio continua simples: eu respondo como ${input.personaId}; se voce quiser outro persona, eu explico o caminho pela interface em vez de abrir uma conversa colegiada.`,
  ].join("\n\n");
}
