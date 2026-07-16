const GENERIC_TITLE_PATTERNS = [
  /^nova conversa/i,
  /^ajuste de presenca/i,
  /^ajuste de presença/i,
  /^vim encaminhado/i,
];

const TECHNICAL_LINE_PATTERN =
  /^(Ajuste de Presenca|Ajuste de Presença|Persona ativa|Profundidade solicitada|Restricoes aplicadas|Restrições aplicadas|Escopo do ajuste|Politica de|Política de|Validade do ajuste|Nao mencione|Não mencione|Abra pela vocacao|Abra pela vocação|NEMOSINE_PRESENCE_OPENING)/i;

export type ThreadTitlePayloadKind = "user-authored" | "presence-system" | "handoff-boilerplate";

function normalizeTitleText(text: string) {
  return text
    .replace(/\[\[NEMOSINE_[^\]]+\]\]/g, " ")
    .replace(/\[NEMOSINE_FILE:[^\]]+\]/g, " arquivo anexado ")
    .replace(/\[NEMOSINE_AUDIO\]/g, " audio anexado ")
    .replace(/\[CONTEUDO DO ARQUIVO ANEXADO[\s\S]*$/i, " arquivo anexado ")
    .replace(/\[TRANSCRICAO DE AUDIO ANEXADO[\s\S]*$/i, " audio anexado ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !TECHNICAL_LINE_PATTERN.test(line))
    .map((line) => line.replace(/^(Contexto recente autorizado|Objetivo atual|Entidades importantes):\s*/i, ""))
    .join(" ")
    .replace(/\b(Vim encaminhado pelo|Vim encaminhado pela)\s+[^.]{1,80}\.?\s*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyTitlePayloadKind(text: string): ThreadTitlePayloadKind {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "presence-system";
  if (/\[\[NEMOSINE_PRESENCE_OPENING\]\]|Ajuste de Presen[cç]a/i.test(normalized)) return "presence-system";
  if (/^Vim encaminhado/i.test(normalized)) return "handoff-boilerplate";
  return "user-authored";
}

export function isGenericThreadTitle(title?: string | null) {
  const value = (title || "").trim();
  return !value || GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(value));
}

export function buildDeterministicThreadTitle(text: string) {
  if (classifyTitlePayloadKind(text) !== "user-authored") return "Nova conversa";
  const cleaned = normalizeTitleText(text);
  if (!cleaned || cleaned.length < 12) return "Nova conversa";

  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  let title = words.join(" ");
  if (title.length > 48) title = `${title.slice(0, 45).trim()}...`;
  if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title))) return "Nova conversa";
  return title || "Nova conversa";
}

export function shouldRepairThreadTitle(currentTitle: string | null | undefined, sourceText: string) {
  return isGenericThreadTitle(currentTitle) && buildDeterministicThreadTitle(sourceText) !== "Nova conversa";
}
