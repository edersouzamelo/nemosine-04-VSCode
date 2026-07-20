function messageText(message: any) {
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.parts)) {
    return message.parts
      .filter((part: any) => part?.type === "text")
      .map((part: any) => part.text || "")
      .join("");
  }
  return "";
}

const COLLECTIVE_PERSONA_SYSTEM_FAILURE = "Nao foi possivel formular uma resposta adequada nesta tentativa.";
const PRESENCE_OPENING_MARKER = "[[NEMOSINE_PRESENCE_OPENING]]";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeSharedText(value: string) {
  return value
    .replace(/\[\[NEMOSINE_[^\]]+\]\]/gi, " ")
    .replace(/\[NEMOSINE_FILE:[^\]]+\]/gi, " ")
    .replace(/\[NEMOSINE_AUDIO\]/gi, " ")
    .replace(/\b(SYSTEM_EVENT|promotion gate|runtime id|prompt hash|policy hash|dupla vigilancia|classificacao operacional)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isTechnicalFailureText(text: string) {
  const normalized = normalize(text);
  return normalized === normalize(COLLECTIVE_PERSONA_SYSTEM_FAILURE)
    || /^parece que houve um problema vamos tentar novamente\b/.test(normalized)
    || /^nao foi possivel obter resposta agora\b/.test(normalized);
}

function isPresenceAdjustmentEnvelope(message: any) {
  const rawText = messageText(message).trim();
  return rawText.startsWith(PRESENCE_OPENING_MARKER)
    || (
      /\bAjuste de Presen[cç]a confirmado\b/i.test(rawText)
      && /\b(Profundidade solicitada|Escopo do ajuste|Politica de|Pol[ií]tica de)\b/i.test(rawText)
    );
}

export function isPublicSystemEvent(message: any) {
  const text = sanitizeSharedText(messageText(message)).trim();
  if (!text) return false;
  return false;
}

function isSharedDevOnlyMessage(message: any, primaryPersonaId?: string | null) {
  const text = sanitizeSharedText(messageText(message)).trim();
  if (isPresenceAdjustmentEnvelope(message)) return true;
  if (message?.role === "system" || message?.messageKind === "SYSTEM_EVENT") return true;
  if (message?.role === "assistant" && isTechnicalFailureText(text)) return true;
  if (
    message?.role === "assistant"
    && primaryPersonaId
    && message?.speakerPersonaId
    && message.speakerPersonaId !== primaryPersonaId
  ) return true;
  return false;
}

export function sanitizeSharedTitle(value: string, personaId?: string | null) {
  const cleaned = sanitizeSharedText(value || "").trim();
  const normalized = normalize(cleaned);
  if (
    !cleaned
    || /^vim encaminhado\b/.test(normalized)
    || /\b(chame|chama|chamar|convide|convidar|traga|trazer|qual persona|quem voce recomenda|abre o|abrir o|quero falar com)\b/.test(normalized)
  ) {
    return personaId ? `Conversa com ${personaId}` : "Conversa compartilhada";
  }
  return cleaned;
}

export function sanitizeSharedMessages(messages: any[], options: { primaryPersonaId?: string | null } = {}) {
  const sanitized = messages
    .filter((message) => {
      if (isSharedDevOnlyMessage(message, options.primaryPersonaId)) return false;
      if (message?.role === "system" || message?.messageKind === "SYSTEM_EVENT") {
        return isPublicSystemEvent(message);
      }
      return true;
    })
    .map((message) => {
      const { metadata, messageKind, generationStatus, ...publicMessage } = message || {};
      if (typeof publicMessage.content === "string") {
        publicMessage.content = sanitizeSharedText(publicMessage.content);
      }
      if (Array.isArray(publicMessage.parts)) {
        publicMessage.parts = publicMessage.parts
          .map((part: any) => part?.type === "text"
            ? { ...part, text: sanitizeSharedText(part.text || "") }
            : part)
          .filter((part: any) => part?.type !== "text" || String(part.text || "").trim());
      }
      return publicMessage;
    })
    .filter((message) => messageText(message).trim() || message?.role !== "assistant");
  const lastAssistantIndex = sanitized.map((message) => message?.role).lastIndexOf("assistant");
  return lastAssistantIndex >= 0 ? sanitized.slice(0, lastAssistantIndex + 1) : sanitized;
}
