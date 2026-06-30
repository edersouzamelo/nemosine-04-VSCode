import { isPrivateMemorySpace } from "@/app/lib/nemosine/privacy";
import type { UserProfileNodeRecord } from "./types";

function normalize(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isConfessorLikeScope(value: string | null | undefined) {
  const normalized = normalize(value);
  return isPrivateMemorySpace(value || "")
    || normalized.includes("confessor")
    || normalized.includes("porao");
}

export function isProjectableStatus(status: string) {
  return status === "CONFIRMED" || status === "CANDIDATE";
}

export function canProjectUserProfileNode(input: {
  node: UserProfileNodeRecord;
  personaId: string;
  memoryScope: string;
}) {
  const { node, personaId, memoryScope } = input;
  const personaIsConfessor = isConfessorLikeScope(personaId) || isConfessorLikeScope(memoryScope);

  if (!isProjectableStatus(node.status)) {
    return { allowed: false, reason: "status-not-projectable" };
  }

  if (node.removedAt) {
    return { allowed: false, reason: "deleted" };
  }

  if (node.sensitivity === "CONFESSOR_ONLY") {
    return personaIsConfessor
      ? { allowed: true, reason: "same-confessor-scope" }
      : { allowed: false, reason: "confessor-only" };
  }

  if (node.scopeType === "CONFESSOR") {
    return personaIsConfessor
      ? { allowed: true, reason: "same-confessor-scope" }
      : { allowed: false, reason: "confessor-scope" };
  }

  if (node.scopeType === "NON_PROJECTABLE") {
    return { allowed: false, reason: "non-projectable" };
  }

  if (node.scopeType === "SYSTEM") {
    return { allowed: false, reason: "system-only" };
  }

  if (node.scopeType === "PERSONA_SPECIFIC") {
    const allowed = normalize(node.subtype) === normalize(personaId)
      || (node.authorizedPersonas || []).some((item) => normalize(item) === normalize(personaId));
    return allowed
      ? { allowed: true, reason: "persona-specific" }
      : { allowed: false, reason: "persona-specific-other" };
  }

  if (node.scopeType === "AUTHORIZED_PERSONAS") {
    const allowed = (node.authorizedPersonas || []).some((item) => normalize(item) === normalize(personaId));
    return allowed
      ? { allowed: true, reason: "authorized-persona" }
      : { allowed: false, reason: "persona-not-authorized" };
  }

  if (isConfessorLikeScope(node.sourceReference) && !personaIsConfessor) {
    return { allowed: false, reason: "confessor-source-reference" };
  }

  return { allowed: true, reason: "global" };
}
