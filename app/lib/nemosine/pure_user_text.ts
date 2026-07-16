export const PRESENCE_OPENING_MARKER = "[[NEMOSINE_PRESENCE_OPENING]]";

export type PureUserTextExtraction = {
  pureUserText: string;
  source: "plain" | "presence_opening";
  presenceObjective: string | null;
  presenceQuestion: string | null;
  presenceContext: string | null;
};

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function fieldFromPresenceEnvelope(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return match ? cleanLine(match[1]) : "";
}

export function extractPureUserText(text?: string | null): PureUserTextExtraction {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) {
    return {
      pureUserText: "",
      source: "plain",
      presenceObjective: null,
      presenceQuestion: null,
      presenceContext: null,
    };
  }

  const isPresenceOpening = raw.startsWith(PRESENCE_OPENING_MARKER) || /\bAjuste de Presen[cç]a confirmado\b/i.test(raw);
  if (!isPresenceOpening) {
    return {
      pureUserText: raw,
      source: "plain",
      presenceObjective: null,
      presenceQuestion: null,
      presenceContext: null,
    };
  }

  const presenceContext = fieldFromPresenceEnvelope(raw, "Contexto recente autorizado");
  const presenceObjective = fieldFromPresenceEnvelope(raw, "Objetivo atual");
  const presenceQuestion = fieldFromPresenceEnvelope(raw, "Pergunta principal");
  const objectiveAlreadyIncluded = presenceObjective && normalizeLoose(presenceContext).includes(normalizeLoose(presenceObjective));
  const pureUserText = [
    presenceContext,
    presenceObjective && !objectiveAlreadyIncluded ? `Quero ${presenceObjective.replace(/\.$/, "")}.` : "",
  ].filter(Boolean).join(" ").trim();

  return {
    pureUserText: pureUserText || raw
      .replace(PRESENCE_OPENING_MARKER, " ")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^(Ajuste de Presen[cç]a|Persona ativa|Profundidade solicitada|Restricoes aplicadas|Restri[cç][oõ]es aplicadas|Escopo do ajuste|Politica de|Pol[ií]tica de|Validade do ajuste|Nao mencione|N[aã]o mencione|Abra pela voca[cç][aã]o)/i.test(line))
      .map((line) => line.replace(/^(Contexto recente autorizado|Objetivo atual|Entidades importantes):\s*/i, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
    source: "presence_opening",
    presenceObjective: presenceObjective || null,
    presenceQuestion: presenceQuestion || null,
    presenceContext: presenceContext || null,
  };
}

function normalizeLoose(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
