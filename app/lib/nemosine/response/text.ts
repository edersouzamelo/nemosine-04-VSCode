export const RESPONSE_STOPWORDS = new Set([
  "a", "o", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
  "e", "em", "para", "por", "com", "que", "como", "qual", "quais", "me", "meu",
  "minha", "meus", "minhas", "voce", "vc", "eu", "tu", "nos", "isso", "esse",
  "essa", "este", "esta", "aquele", "aquela", "agora", "hoje", "ontem", "amanha",
  "bom", "dia", "boa", "noite", "tarde", "ola", "oi", "sobre", "algo", "ser",
  "ter", "foi", "era", "esta", "estao",
]);

export function normalizeResponseText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function uniqueTerms(text: string, minLength = 3) {
  return Array.from(new Set(
    normalizeResponseText(text)
      .split(" ")
      .filter((term) => term.length >= minLength && !RESPONSE_STOPWORDS.has(term)),
  ));
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function overlapScore(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0;
  const leftSet = new Set(left);
  const hits = right.filter((term) => leftSet.has(term)).length;
  return clamp01(hits / Math.min(Math.max(left.length, 1), Math.max(right.length, 1), 12));
}

export function countTermHits(text: string, terms: string[]) {
  const normalized = normalizeResponseText(text);
  return terms.filter((term) => normalized.includes(normalizeResponseText(term))).length;
}

export function compactText(text: string, limit = 240) {
  const compacted = text.replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, Math.max(0, limit - 3)).trim()}...` : compacted;
}

export function textSimilarity(left: string, right: string) {
  const leftTerms = uniqueTerms(left);
  const rightTerms = uniqueTerms(right);
  if (leftTerms.length === 0 || rightTerms.length === 0) return 0;
  const intersection = leftTerms.filter((term) => rightTerms.includes(term)).length;
  const union = new Set([...leftTerms, ...rightTerms]).size;
  return union === 0 ? 0 : intersection / union;
}

export function timestampMs(value?: Date | string | number | null) {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function recencyDecay(value?: Date | string | number | null, halfLifeHours = 24 * 30, now = new Date()) {
  const time = timestampMs(value);
  if (time === null) return 0.35;
  const ageHours = Math.max(0, (now.getTime() - time) / 3_600_000);
  return clamp01(Math.exp(-ageHours / Math.max(halfLifeHours, 1)));
}
