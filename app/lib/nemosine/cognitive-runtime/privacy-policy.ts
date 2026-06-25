import { isPrivateMemorySpace } from "@/app/lib/nemosine/privacy";
import {
  CognitiveContextItem,
  CognitiveFinding,
  CognitiveRequest,
  ExtractionResult,
  PrivacyEvaluation,
} from "./types";

function isConfessorLike(value: string | undefined | null) {
  if (!value) return false;
  return isPrivateMemorySpace(value);
}

export function isPrivateCognitiveRun(personaId: string, placeId?: string | null) {
  return isConfessorLike(personaId) || isConfessorLike(placeId);
}

export function markContextHashOnly(item: CognitiveContextItem): CognitiveContextItem {
  return {
    ...item,
    text: item.visibility === "metadata-only" ? "" : item.text,
  };
}

export function authorizeContextItems(request: CognitiveRequest, items: CognitiveContextItem[]) {
  const blocked: CognitiveContextItem[] = [];
  const authorized: CognitiveContextItem[] = [];

  for (const item of items) {
    const itemIsPrivate = item.visibility === "private" || item.visibility === "confessor";
    const samePrivateScope = request.privateRun && (
      item.scope === request.memoryScope
      || item.scope === request.personaId
      || item.scope === request.placeId
    );

    if (itemIsPrivate && !samePrivateScope) {
      blocked.push(item);
      continue;
    }

    authorized.push(item);
  }

  return { authorized, blocked };
}

export function evaluatePrivacy(input: {
  request: CognitiveRequest;
  blockedContextIds: string[];
  extraction: ExtractionResult;
  candidateText: string;
}): PrivacyEvaluation {
  const findings: CognitiveFinding[] = [];

  if (input.blockedContextIds.length > 0) {
    findings.push({
      code: "PRIVACY_CONTEXT_BLOCKED",
      severity: "info",
      category: "privacy",
      explanation: "Private context items were blocked by the centralized privacy policy.",
      repairInstruction: "Proceed only with authorized context.",
    });
  }

  for (const concern of input.extraction.possiblePrivacyConcerns) {
    findings.push({
      code: "PRIVACY_EXTRACTOR_CONCERN",
      severity: "error",
      category: "privacy",
      explanation: concern,
      repairInstruction: "Remove or generalize the sensitive material and do not claim private access.",
    });
  }

  if (!input.request.privateRun && /\b(confessor|porao|por[aã]o)\b/i.test(input.candidateText)) {
    findings.push({
      code: "PRIVACY_PRIVATE_SPACE_MENTION",
      severity: "warning",
      category: "privacy",
      explanation: "Candidate mentions a private space in a non-private run.",
      repairInstruction: "Do not reveal, summarize or imply content from private spaces.",
    });
  }

  const hardPass = !findings.some((finding) => finding.severity === "error" || finding.severity === "critical");

  return {
    hardPass,
    privateRun: input.request.privateRun,
    metadataOnlyAudit: input.request.privateRun,
    blockedContextIds: input.blockedContextIds,
    findings,
  };
}
