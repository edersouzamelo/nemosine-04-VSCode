import { addMessageToThread, addUserMemory, retainConversationEpisode } from "@/app/lib/nemosine/session_store";
import { createDestinyEvent } from "@/app/lib/sovereignStore";
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

export function hasExplicitMemoryAuthorization(text: string) {
  const normalized = normalizeForAuth(text);
  return [
    "lembre disso",
    "registre na memoria",
    "guardar na memoria",
    "guarde na memoria",
    "pode lembrar",
    "pode guardar",
    "memorize",
  ].some((phrase) => normalized.includes(phrase));
}

export function hasExplicitRegistryAuthorization(text: string) {
  const normalized = normalizeForAuth(text);
  return [
    "registre essa tarefa",
    "registre esta tarefa",
    "crie um registro",
    "criar um registro",
    "guarde nos registros",
    "adicione aos registros",
    "pode registrar isso como tarefa",
    "pode criar o registro",
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
  const memoryAuthorized = hasExplicitMemoryAuthorization(input.request.userText);
  const registryAuthorized = hasExplicitRegistryAuthorization(input.request.userText);

  for (const action of input.extraction.proposedMemoryActions) {
    if (action.scope !== input.request.memoryScope) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_MEMORY_SCOPE_MISMATCH", "warning", "Memory action tried to write outside the authorized memory scope and was discarded."));
      continue;
    }
    if (!memoryAuthorized) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_MEMORY_UNAUTHORIZED_DISCARDED", "warning", "Long-term memory action was discarded because the current message did not explicitly authorize memory persistence."));
      continue;
    }
    approvedMemoryActions.push({ ...action, authorized: true, authorizationProvenance: "explicit-current-message" });
  }

  for (const action of input.extraction.proposedRegistryActions) {
    if (input.request.privateRun) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "discarded-private-scope" });
      findings.push(authFinding("SIDE_EFFECT_REGISTRY_PRIVATE_SCOPE_DISCARDED", "warning", "Registry action was discarded because private runs cannot create global registry entries."));
      continue;
    }
    if (!action.idea.trim()) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_REGISTRY_INVALID", "warning", "Registry action had no idea text."));
      continue;
    }
    if (!registryAuthorized) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_REGISTRY_UNAUTHORIZED_DISCARDED", "warning", "Registry action was discarded because the current message did not explicitly authorize registry persistence."));
      continue;
    }
    approvedRegistryActions.push({ ...action, authorized: true, authorizationProvenance: "explicit-current-message" });
  }

  for (const action of input.extraction.proposedDestinyActions) {
    if (input.request.privateRun) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "discarded-private-scope" });
      findings.push(authFinding("SIDE_EFFECT_DESTINY_PRIVATE_SCOPE_DISCARDED", "warning", "Destiny Line action was discarded because private runs cannot export content to global biographical persistence."));
      continue;
    }
    if (!destinyAuthorized) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_DESTINY_UNAUTHORIZED_DISCARDED", "warning", "Destiny Line action was discarded because the user did not explicitly authorize it."));
      continue;
    }
    approvedDestinyActions.push({ ...action, authorized: true, authorizationProvenance: "explicit-current-message" });
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

  return {
    committed: true,
    memoryCount,
    registryCount,
    destinyCount,
  };
}
