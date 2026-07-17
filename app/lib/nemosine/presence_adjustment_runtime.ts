export * from "./presence_adjustment";

import type { ConversationPresenceContract, PresenceAdjustmentMode } from "./presence_adjustment";
import {
  renderPresenceAnchoredUserText as renderBaseAnchoredUserText,
  renderPresenceContractForRuntime as renderBasePresenceContract,
} from "./presence_adjustment";

function normalize(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderGoalDirective(goal?: string | null) {
  const normalized = normalize(goal);
  if (!normalized) return "";
  if (/\b(?:confront|criticar|critica|desafiar|sem suavizar)\b/.test(normalized)) {
    return [
      "GOAL EXECUTION DIRECTIVE:",
      "Confront the user's premise directly from the active persona's vocation.",
      "Identify at least one responsibility, inconsistency, avoidance or uncomfortable trade-off grounded in the supplied context.",
      "Do not replace confrontation with encouragement, reassurance, motivational language or generic validation.",
    ].join(" ");
  }
  if (/\b(?:desabafar|desabafo)\b/.test(normalized)) {
    return [
      "GOAL EXECUTION DIRECTIVE:",
      "Let the user express the experience and respond from the active persona's own lens.",
      "Do not automatically diagnose, reroute or convert the turn into a plan unless the user asks for that operation.",
    ].join(" ");
  }
  return "";
}

export function renderPresenceContractForRuntime(
  contract?: ConversationPresenceContract | null,
  mode: PresenceAdjustmentMode = "enforce",
) {
  const base = renderBasePresenceContract(contract, mode);
  const directive = renderGoalDirective(contract?.currentGoal);
  return [base, directive].filter(Boolean).join("\n");
}

export function renderPresenceAnchoredUserText(
  userText: string,
  contract?: ConversationPresenceContract | null,
) {
  const base = renderBaseAnchoredUserText(userText, contract);
  const directive = renderGoalDirective(contract?.currentGoal);
  if (!directive || base === userText) return base;
  return `${base}\n${directive}`;
}
