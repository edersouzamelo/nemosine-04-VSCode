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

export function sanitizeSharedText(value: string) {
  return value
    .replace(/\[\[NEMOSINE_[^\]]+\]\]/gi, " ")
    .replace(/\[NEMOSINE_FILE:[^\]]+\]/gi, " ")
    .replace(/\[NEMOSINE_AUDIO\]/gi, " ")
    .replace(/\b(SYSTEM_EVENT|promotion gate|runtime id|prompt hash|policy hash|dupla vigilancia|classificacao operacional)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isPublicSystemEvent(message: any) {
  const text = sanitizeSharedText(messageText(message)).trim();
  if (!text) return false;
  return /\b(entrou na conversa|deixou a conversa|foi silenciad[oa]|voltou a falar|falando apenas com|foco exclusivo removido)\b/i.test(text);
}

export function sanitizeSharedMessages(messages: any[]) {
  return messages
    .filter((message) => {
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
}
