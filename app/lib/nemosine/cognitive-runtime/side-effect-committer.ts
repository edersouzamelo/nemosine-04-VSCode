import { addMessageToThread, addUserMemory, retainConversationEpisode } from "@/app/lib/nemosine/session_store";
import { createDestinyEvent, logPersonaManuscriptEvent } from "@/app/lib/sovereignStore";
import { createUserRegistry } from "@/app/lib/userFeatureStore";
import {
  CognitiveFinding,
  CognitiveRequest,
  ExtractionResult,
  ProposedDestinyAction,
  ProposedMemoryAction,
  ProposedRegistryAction,
  SideEffectAuthorization,
} from "./types";

function normalizeForAuth(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function hasExplicitDestinyAuthorization(text: string) {
  const normalized = normalizeForAuth(text);
  return [
    "registre na linha do destino",
    "registrar na linha do destino",
    "inclua na linha do destino",
    "incluir na linha do destino",
    "grave na linha do destino",
    "gravar na linha do destino",
    "pode incluir",
    "pode registrar",
    "pode gravar",
    "sim, registre",
    "sim registre",
    "sim, grave",
    "sim grave",
  ].some((phrase) => normalized.includes(phrase));
}

function authFinding(code: string, severity: CognitiveFinding["severity"], explanation: string): CognitiveFinding {
  return {
    code,
    severity,
    category: "side-effect-authorization",
    explanation,
    repairInstruction: "Only commit side effects that pass runtime authorization.",
  };
}

export function authorizeProposedSideEffects(input: {
  request: CognitiveRequest;
  extraction: ExtractionResult;
}): SideEffectAuthorization {
  const findings: CognitiveFinding[] = [];
  const approvedMemoryActions: ProposedMemoryAction[] = [];
  const approvedRegistryActions: ProposedRegistryAction[] = [];
  const approvedDestinyActions: ProposedDestinyAction[] = [];
  const discardedActions: SideEffectAuthorization["discardedActions"] = [];
  const destinyAuthorized = hasExplicitDestinyAuthorization(input.request.userText);

  for (const action of input.extraction.proposedMemoryActions) {
    if (action.scope !== input.request.memoryScope) {
      discardedActions.push(action);
      findings.push(authFinding("SIDE_EFFECT_MEMORY_SCOPE_MISMATCH", "error", "Memory action tried to write outside the authorized memory scope."));
      continue;
    }
    approvedMemoryActions.push({ ...action, authorized: true });
  }

  for (const action of input.extraction.proposedRegistryActions) {
    if (!action.idea.trim()) {
      discardedActions.push(action);
      findings.push(authFinding("SIDE_EFFECT_REGISTRY_INVALID", "warning", "Registry action had no idea text."));
      continue;
    }
    approvedRegistryActions.push({ ...action, authorized: true });
  }

  for (const action of input.extraction.proposedDestinyActions) {
    if (!destinyAuthorized) {
      discardedActions.push(action);
      findings.push(authFinding("SIDE_EFFECT_DESTINY_UNAUTHORIZED_DISCARDED", "warning", "Destiny Line action was discarded because the user did not explicitly authorize it."));
      continue;
    }
    approvedDestinyActions.push({ ...action, authorized: true });
  }

  return {
    approved: !findings.some((finding) => finding.severity === "error" || finding.severity === "critical"),
    approvedMemoryActions,
    approvedRegistryActions,
    approvedDestinyActions,
    discardedActions,
    findings,
  };
}

export type CommitSideEffectsInput = {
  request: CognitiveRequest;
  answer: string;
  sideEffects: SideEffectAuthorization;
};

export type CommitSideEffectsResult = {
  committed: boolean;
  memoryCount: number;
  registryCount: number;
  destinyCount: number;
};

export async function commitApprovedSideEffects(input: CommitSideEffectsInput): Promise<CommitSideEffectsResult> {
  let memoryCount = 0;
  let registryCount = 0;
  let destinyCount = 0;

  await addMessageToThread(input.request.userId, input.request.threadId, "assistant", input.answer);

  await retainConversationEpisode(input.request.userId, input.request.memoryScope, input.request.userText);

  for (const action of input.sideEffects.approvedMemoryActions) {
    await addUserMemory(input.request.userId, action.content, input.request.memoryScope);
    memoryCount += 1;
  }

  for (const action of input.sideEffects.approvedRegistryActions) {
    await createUserRegistry(input.request.userId, {
      id: crypto.randomUUID(),
      idea: action.idea,
      chat_origin_id: input.request.threadId,
      persona: input.request.personaId,
      status: action.status || "Pendente",
      last_interaction: new Date().toISOString().split("T")[0],
      next_deadline: action.deadline || null,
      external_links: "",
      custom_columns: "{}",
    });
    registryCount += 1;
  }

  for (const action of input.sideEffects.approvedDestinyActions) {
    await createDestinyEvent(input.request.userId, {
      title: action.title,
      eventDate: action.eventDate || null,
      eventDateLabel: action.eventDateLabel || null,
      category: action.category,
      shortDescription: action.shortDescription,
      symbolicIntensity: action.symbolicIntensity || null,
      dominantEmotion: action.dominantEmotion || null,
      associatedPersona: input.request.personaId,
      visibility: "private",
      source: `persona:${input.request.personaId};thread:${input.request.threadId};runtime:${input.request.runId}`,
      tags: ["sugerido-por-persona", input.request.personaId, "cognitive-runtime-v1"],
    });
    destinyCount += 1;
  }

  const normalizedPersona = normalizeForAuth(input.request.personaId);
  const significantInteraction = input.request.userText.trim().length >= 160
    || input.answer.trim().length >= 400
    || registryCount > 0
    || destinyCount > 0;

  if (significantInteraction && !normalizedPersona.includes("confessor")) {
    await logPersonaManuscriptEvent(input.request.userId, {
      type: "persona_interaction_significant",
      sourceModule: "persona-chat",
      sourceEntityType: "thread",
      sourceEntityId: input.request.threadId,
      factualSummary: `Houve uma interacao significativa com a persona ${input.request.personaId}.`,
      metadata: {
        personaId: input.request.personaId,
        placeId: input.request.placeId || null,
        registryMarkers: registryCount,
        destinyMarkers: destinyCount,
        cognitiveRunId: input.request.runId,
      },
      sensitivity: "internal",
      importanceScore: destinyCount > 0 || registryCount > 0 ? 64 : 42,
    });
  }

  return {
    committed: true,
    memoryCount,
    registryCount,
    destinyCount,
  };
}
