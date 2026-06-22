import {
  PhilosopherEvaluation,
  PromotionDecision,
  ScientistEvaluation,
  SideEffectAuthorization,
  VigiaCoherenceResult,
  PrivacyEvaluation,
  VocationalEvaluation,
  CognitiveFinding,
} from "./types";

function hasCriticalScientistFinding(scientist: ScientistEvaluation) {
  return scientist.findings.some((finding) => finding.severity === "critical");
}

function finding(code: string, explanation: string): CognitiveFinding {
  return {
    code,
    severity: "error",
    category: "promotion",
    explanation,
    repairInstruction: "Regenerate through the same active persona with the listed runtime repairs.",
  };
}

export function evaluatePromotion(input: {
  vigia: VigiaCoherenceResult;
  scientist: ScientistEvaluation;
  philosopher: PhilosopherEvaluation;
  privacy: PrivacyEvaluation;
  vocation: VocationalEvaluation;
  sideEffects: SideEffectAuthorization;
  retriesRemaining: number;
}): PromotionDecision {
  const findings: CognitiveFinding[] = [];
  const reasons: string[] = [];

  if (!input.vigia.passed) {
    reasons.push("coherence_below_threshold_or_hard_failure");
    findings.push(finding("PROMOTION_COHERENCE_FAILED", "Vigia coherence did not pass threshold or hard-failure checks."));
  }

  if (hasCriticalScientistFinding(input.scientist)) {
    reasons.push("critical_scientist_finding");
    findings.push(finding("PROMOTION_SCIENTIST_CRITICAL", "Scientist returned at least one critical finding."));
  }

  if (!input.philosopher.approved) {
    reasons.push("philosopher_rejected");
    findings.push(finding("PROMOTION_PHILOSOPHER_REJECTED", "Philosopher did not approve the candidate."));
  }

  if (!input.privacy.hardPass) {
    reasons.push("privacy_failed");
    findings.push(finding("PROMOTION_PRIVACY_FAILED", "Privacy evaluation did not hard-pass."));
  }

  if (!input.vocation.hardPass) {
    reasons.push("vocation_failed");
    findings.push(finding("PROMOTION_VOCATION_FAILED", "Vocational evaluation did not hard-pass."));
  }

  if (!input.sideEffects.approved) {
    reasons.push("side_effect_authorization_failed");
    findings.push(finding("PROMOTION_SIDE_EFFECT_AUTH_FAILED", "Side-effect authorization failed."));
  }

  const promoted = reasons.length === 0;

  return {
    promoted,
    status: promoted ? "promoted" : input.retriesRemaining > 0 ? "retry" : "rejected",
    reasons,
    retriable: !promoted && input.retriesRemaining > 0,
    findings,
  };
}
