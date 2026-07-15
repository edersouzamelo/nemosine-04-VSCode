import {
  PhilosopherEvaluation,
  PromotionDecision,
  ScientistEvaluation,
  SideEffectAuthorization,
  VigiaCoherenceResult,
  PrivacyEvaluation,
  VocationalEvaluation,
  CognitiveFinding,
  ExecutionProfile,
} from "./types";
import { isInfrastructureDegradationFinding, isSemanticWarningFinding } from "./finding-classification";

const scientistFloors: Record<ExecutionProfile, Partial<Record<keyof ScientistEvaluation, number>>> = {
  light: {
    factualSupport: 0.45,
    biographicalSafety: 0.75,
    accessClaimSafety: 0.75,
  },
  standard: {
    factualSupport: 0.6,
    honestUncertainty: 0.55,
    biographicalSafety: 0.8,
    accessClaimSafety: 0.8,
  },
  full: {
    logicalConsistency: 0.75,
    factualSupport: 0.8,
    honestUncertainty: 0.8,
    biographicalSafety: 0.95,
    accessClaimSafety: 0.95,
    responseRelevance: 0.7,
  },
};

function scientistFindingsAtOrAbove(scientist: ScientistEvaluation, severities: Array<CognitiveFinding["severity"]>) {
  return scientist.findings.filter((finding) => !isInfrastructureDegradationFinding(finding) && severities.includes(finding.severity));
}

function finding(code: string, explanation: string, category = "candidate_quality_finding"): CognitiveFinding {
  return {
    code,
    severity: "error",
    category,
    explanation,
    repairInstruction: "Regenerate through the same active persona with the listed runtime repairs.",
  };
}

function dimensionApplies(scientist: ScientistEvaluation, dimension: string) {
  return scientist.dimensionApplicability?.[dimension] !== "not_applicable";
}

export function evaluatePromotion(input: {
  vigia: VigiaCoherenceResult;
  scientist: ScientistEvaluation;
  philosopher: PhilosopherEvaluation;
  privacy: PrivacyEvaluation;
  vocation: VocationalEvaluation;
  sideEffects: SideEffectAuthorization;
  retriesRemaining: number;
  executionProfile?: ExecutionProfile;
}): PromotionDecision {
  const findings: CognitiveFinding[] = [];
  const reasons: string[] = [];
  const executionProfile = input.executionProfile || "standard";

  if (!input.vigia.passed) {
    reasons.push("coherence_below_threshold_or_hard_failure");
    findings.push(finding("PROMOTION_COHERENCE_FAILED", "Vigia coherence did not pass threshold or hard-failure checks."));
  }

  if (!input.scientist.approved) {
    reasons.push("scientist_not_approved");
    findings.push(finding("PROMOTION_SCIENTIST_NOT_APPROVED", "Scientist evaluation did not approve the candidate."));
  }

  const scientistBlockingFindings = scientistFindingsAtOrAbove(input.scientist, ["error", "critical"]);
  if (scientistBlockingFindings.length > 0) {
    reasons.push("scientist_error_or_critical_finding");
    findings.push(finding("PROMOTION_SCIENTIST_ERROR_OR_CRITICAL", "Scientist returned at least one error or critical finding."));
  }

  const floors = scientistFloors[executionProfile];
  for (const [dimension, floor] of Object.entries(floors)) {
    if (!dimensionApplies(input.scientist, dimension)) continue;
    const value = input.scientist[dimension as keyof ScientistEvaluation];
    if (typeof value === "number" && value < floor) {
      reasons.push(`scientist_floor_${dimension}`);
      findings.push(finding(
        `PROMOTION_SCIENTIST_FLOOR_${dimension.toUpperCase()}`,
        `Scientist ${dimension} score ${value} is below ${executionProfile} floor ${floor}.`,
      ));
    }
  }

  if (executionProfile === "full" && input.scientist.findings.some(isSemanticWarningFinding)) {
    reasons.push("full_profile_unresolved_scientist_warning");
    findings.push(finding("PROMOTION_FULL_PROFILE_WARNING_BLOCKED", "Full profile requires unresolved Scientist warnings to be repaired."));
  }

  if (!input.philosopher.approved) {
    reasons.push("philosopher_rejected");
    findings.push(finding("PROMOTION_PHILOSOPHER_REJECTED", "Philosopher did not approve the candidate."));
  }

  if (!input.privacy.hardPass) {
    reasons.push("privacy_failed");
    findings.push(finding("PROMOTION_PRIVACY_FAILED", "Privacy evaluation did not hard-pass.", "privacy_failure"));
  }

  if (!input.vocation.hardPass) {
    reasons.push("vocation_failed");
    findings.push(finding("PROMOTION_VOCATION_FAILED", "Vocational evaluation did not hard-pass.", "vocational_failure"));
  }

  if (!input.sideEffects.approved) {
    reasons.push("side_effect_authorization_failed");
    findings.push(finding("PROMOTION_SIDE_EFFECT_AUTH_FAILED", "Side-effect authorization failed.", "hard_safety_failure"));
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
