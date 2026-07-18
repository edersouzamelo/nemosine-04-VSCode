import { isInpiOneYearReleasePreview } from "./release_config";

type PersonaQualityFinding = {
  code: string;
  severity?: "info" | "warning" | "error" | "critical" | string;
};

type PersonaQualityEvaluation = {
  findings?: PersonaQualityFinding[];
  initiativeScore?: number;
};

const releasePreviewPromotableQualityCodes = new Set([
  "GENERIC_ASSISTANT_MODE",
  "GENERIC_INTERVIEW_MODE",
  "INTERROGATIVE_ELICITATION",
  "EMPTY_FINAL_QUESTION",
  "GENERIC_CLOSING",
  "PASSIVE_CONTEXT_WITHHOLDING",
  "NO_CONTEXT_USE_WHEN_AVAILABLE",
  "REPETITIVE_LOOP",
  "THIN_RESPONSE",
]);

const releasePreviewHardBlockCodes = new Set([
  "PRIVATE_CONTEXT_LEAK",
  "INTERNAL_CONTROL_LEAK",
  "UNSUPPORTED_BIOGRAPHICAL_ASSERTION",
  "FALSE_CONTEXT_DENIAL",
]);

export function releasePreviewOriginalFindingCodes(evaluation: PersonaQualityEvaluation) {
  return (evaluation.findings || []).map((finding) => finding.code).filter(Boolean);
}

export function canPromoteReleasePreviewSafeRejectedCandidate(input: {
  evaluation: PersonaQualityEvaluation;
  text: string;
  env?: NodeJS.ProcessEnv;
}) {
  if (!isInpiOneYearReleasePreview(input.env)) return false;
  if (!input.text.trim()) return false;

  const findings = input.evaluation.findings || [];
  if (findings.length === 0) return false;

  return findings.every((finding) => {
    if (finding.severity === "critical") return false;
    if (releasePreviewHardBlockCodes.has(finding.code)) return false;
    return releasePreviewPromotableQualityCodes.has(finding.code);
  });
}
