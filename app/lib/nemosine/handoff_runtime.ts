export * from "./handoff";

import { ENTITIES } from "@/app/data/entities";
import {
  inferHandoffTarget as inferBaseHandoffTarget,
  isHandoffSelectionRequest as isBaseHandoffSelectionRequest,
} from "./handoff";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function personaNames() {
  return Object.values(ENTITIES)
    .filter((entity) => entity.type === "persona")
    .map((entity) => entity.name);
}

function lastPersonaReference(text?: string | null) {
  const normalizedText = normalize(text || "");
  if (!normalizedText) return null;
  return personaNames()
    .map((persona) => ({ persona, index: normalizedText.lastIndexOf(normalize(persona)) }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => right.index - left.index)[0]?.persona || null;
}

function isPronounHandoffRequest(text: string) {
  const normalized = normalize(text);
  return /\b(?:consegue|pode|da para|tem como)\s+(?:me\s+)?(?:chamar|trazer|convidar|encaminhar)\s+(?:ele|ela)\b/.test(normalized)
    || /\b(?:chame|chama|traga|traz|convide|encaminhe)\s+(?:ele|ela)\b/.test(normalized);
}

export function isHandoffSelectionRequest(text: string) {
  const normalized = normalize(text);
  const recommendationRequest = /\b(?:outra persona|outro persona|alguma persona|algum persona|qual persona|quem voce recomenda|quem seria melhor|quem pode ajudar melhor)\b/.test(normalized);
  const explicitInvite = /\b(?:chame|chamar|convide|convidar|traga|trazer)\b/.test(normalized);
  return isBaseHandoffSelectionRequest(text) || recommendationRequest || explicitInvite || isPronounHandoffRequest(text);
}

export function inferHandoffTarget(input: {
  sourcePersona: string;
  userText: string;
  priorAssistantText?: string | null;
}) {
  const baseTarget = inferBaseHandoffTarget(input);
  if (baseTarget) return baseTarget;
  if (!isPronounHandoffRequest(input.userText)) return null;
  const priorTarget = lastPersonaReference(input.priorAssistantText);
  if (!priorTarget || normalize(priorTarget) === normalize(input.sourcePersona)) return null;
  return priorTarget;
}
