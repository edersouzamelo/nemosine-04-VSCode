import { ENTITIES } from "@/app/data/entities";
import { getPersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";

export type PersonaHandoffOffer = {
  sourcePersona: string;
  targetPersona: string;
  targetSlug: string;
  title: string;
  reason: string;
  summary: string;
  draft: string;
  requiresConfirmation: boolean;
};

const HANDOFF_MARKER_PATTERN = /\[\[NEMOSINE_HANDOFF:([^\]]+)\]\]/g;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function personaSlug(personaName: string) {
  const entity = Object.entries(ENTITIES).find(([, item]) => item.type === "persona" && item.name === personaName);
  return entity?.[0] || normalize(personaName).replace(/\s+/g, "-");
}

function personaExists(personaName: string) {
  return Object.values(ENTITIES).some((item) => item.type === "persona" && item.name === personaName);
}

export function sanitizeHandoffSummary(text: string, maxLength = 180) {
  const cleaned = text
    .replace(/\[\[NEMOSINE_[^\]]+\]\]/g, " ")
    .replace(/\[NEMOSINE_FILE:[^\]]+\]/g, "arquivo anexado")
    .replace(/\[NEMOSINE_AUDIO\]/g, "audio anexado")
    .replace(/\[CONTEUDO DO ARQUIVO ANEXADO[\s\S]*$/i, "arquivo anexado")
    .replace(/\[TRANSCRICAO DE AUDIO ANEXADO[\s\S]*$/i, "audio anexado")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "um tema encaminhado pela conversa anterior";
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3).trim()}...` : cleaned;
}

function mentionedPersona(text: string) {
  const normalized = normalize(text);
  return Object.values(ENTITIES)
    .filter((item) => item.type === "persona")
    .find((item) => normalized.includes(normalize(item.name)))?.name || null;
}

export function isHandoffSelectionRequest(text: string) {
  const normalized = normalize(text);
  return /\b(encaminha|encaminhar|encaminhe|abre|abrir|quero falar|falar com|como voce encaminharia|como encaminharia)\b/.test(normalized);
}

export function inferHandoffTarget(input: {
  sourcePersona: string;
  userText: string;
  priorAssistantText?: string | null;
}) {
  const directMention = mentionedPersona(input.userText) || mentionedPersona(input.priorAssistantText || "");
  if (directMention && personaExists(directMention) && directMention !== input.sourcePersona) return directMention;

  const normalized = normalize(input.userText);
  const source = normalize(input.sourcePersona);
  if (source === "vidente" && /\b(reconstru|acontec|sequencia|o que aconteceu|relato|historia|narrar|narrativa)\b/.test(normalized)) {
    return "Narrador";
  }
  if (/\b(diagnostico|remedio|dose|sintoma|dor no peito|exame)\b/.test(normalized)) return "Medico";
  if (/\b(contrato|processo|lei|juridico|advogado|defesa)\b/.test(normalized)) return "Advogado";
  if (/\b(bug|codigo|build|deploy|api|banco|erro tecnico)\b/.test(normalized)) return "Engenheiro";
  if (/\b(estrategia|plano|prioridade|risco|decisao)\b/.test(normalized)) return "Estrategista";
  if (/\b(historia|narrativa|relato|cena|acontecimentos)\b/.test(normalized)) return "Narrador";
  return null;
}

function sourceCapability(sourcePersona: string) {
  const contract = getPersonaBehaviorContract(sourcePersona);
  return contract.operationalMission.replace(/\.$/, "").toLowerCase();
}

export function buildPersonaHandoffOffer(input: {
  sourcePersona: string;
  targetPersona: string;
  userText: string;
  privateRun?: boolean;
}) {
  const targetContract = getPersonaBehaviorContract(input.targetPersona);
  const sensitive = Boolean(input.privateRun || /confessor|porao|porão|privad|segred|anexo|arquivo|historico|histórico/i.test(input.userText));
  const summary = sensitive
    ? "um tema sensivel que deve ser revisado antes de qualquer compartilhamento"
    : sanitizeHandoffSummary(input.userText);
  const reason = targetContract.operationalMission.replace(/\.$/, "");
  const sourceWork = sourceCapability(input.sourcePersona);
  const draft = sensitive
    ? `Vim encaminhado pelo ${input.sourcePersona}. Quero decidir com cuidado o que compartilhar sobre este tema.`
    : `Vim encaminhado pelo ${input.sourcePersona} para conversar sobre: ${summary}`;

  return {
    sourcePersona: input.sourcePersona,
    targetPersona: input.targetPersona,
    targetSlug: personaSlug(input.targetPersona),
    title: `Continuar com ${input.targetPersona}`,
    reason,
    summary,
    draft,
    requiresConfirmation: sensitive,
    answer: [
      `Posso olhar para isso dentro do meu campo: ${sourceWork}.`,
      `O que eu nao consigo fazer com a precisao necessaria e reconstruir a sequencia dos acontecimentos como eixo principal.`,
      `${input.targetPersona} e mais adequado porque ${reason.toLowerCase()}.`,
      `Para continuar, abra a conversa com ${input.targetPersona}. Eu levo apenas um resumo minimo para voce revisar antes de enviar.`,
    ].join("\n\n"),
  };
}

export function buildHandoffUrl(offer: PersonaHandoffOffer) {
  const params = new URLSearchParams();
  params.set("handoffFrom", offer.sourcePersona);
  params.set("handoffDraft", offer.draft);
  params.set("handoffSummary", offer.summary);
  return `/agents/${encodeURIComponent(offer.targetSlug)}?${params.toString()}`;
}

export function encodeHandoffMarker(offer: PersonaHandoffOffer) {
  return `[[NEMOSINE_HANDOFF:${encodeURIComponent(JSON.stringify(offer))}]]`;
}

export function stripHandoffMarkers(text: string) {
  return text.replace(HANDOFF_MARKER_PATTERN, "").trim();
}

export function extractHandoffOffers(text: string): PersonaHandoffOffer[] {
  const offers: PersonaHandoffOffer[] = [];
  for (const match of text.matchAll(HANDOFF_MARKER_PATTERN)) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1])) as PersonaHandoffOffer;
      if (parsed?.targetPersona && parsed?.targetSlug) offers.push(parsed);
    } catch {
      // Ignore malformed client-only metadata.
    }
  }
  return offers;
}
