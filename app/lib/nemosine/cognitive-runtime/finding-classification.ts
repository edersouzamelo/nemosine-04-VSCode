import { CognitiveFinding } from "./types";

export type RuntimeFindingClass =
  | "infrastructure_degradation"
  | "candidate_quality_finding"
  | "hard_safety_failure"
  | "privacy_failure"
  | "vocational_failure";

const infrastructureDegradationCodes = new Set([
  "CLAIM_EXTRACTOR_STRUCTURED_DEGRADED",
  "SCIENTIST_STRUCTURED_DEGRADED",
  "PHILOSOPHER_STRUCTURED_DEGRADED",
]);

const vocationalCodes = new Set([
  "GENERIC_ASSISTANT_MODE",
  "GENERIC_INTERVIEW_MODE",
  "INTERROGATIVE_ELICITATION",
  "PASSIVE_CONTEXT_WITHHOLDING",
  "NO_CONTEXT_USE_WHEN_AVAILABLE",
  "VOCATIONAL_INERTIA",
  "SELF_DESCRIPTION_INSTEAD_OF_ACTION",
  "EMPTY_FINAL_QUESTION",
  "GENERIC_CLOSING",
  "REPETITIVE_LOOP",
  "THIN_RESPONSE",
  "INTERNAL_CONTROL_LEAK",
]);

const hardSafetyCodes = new Set([
  "SCIENTIST_SIMULATED_ACCESS",
  "SCIENTIST_UNSUPPORTED_BIOGRAPHY",
  "UNSUPPORTED_BIOGRAPHICAL_ASSERTION",
  "PHILOSOPHER_IDOLATRY_RISK",
  "PHILOSOPHER_DEPENDENCY_RISK",
]);

export function isInfrastructureDegradationCode(code: string) {
  return infrastructureDegradationCodes.has(code) || /_STRUCTURED_DEGRADED$/.test(code);
}

export function classifyFindingCode(code: string, severity?: CognitiveFinding["severity"], category?: string): RuntimeFindingClass {
  if (isInfrastructureDegradationCode(code) || category === "infrastructure_degradation") {
    return "infrastructure_degradation";
  }
  if (code === "VOCATION_SECONDARY_FIT" || category === "vocation_audit") {
    return "candidate_quality_finding";
  }
  if (/PRIVACY|PRIVATE_CONTEXT_LEAK|SCOPE|CONTEXT_BLOCKED/i.test(code) || category === "privacy_failure") {
    return "privacy_failure";
  }
  if (/VOCATION|VOCATIONAL/i.test(code) || vocationalCodes.has(code) || category === "vocational_failure") {
    return "vocational_failure";
  }
  if (hardSafetyCodes.has(code) || severity === "critical" || category === "hard_safety_failure") {
    return "hard_safety_failure";
  }
  return "candidate_quality_finding";
}

export function classifyFinding(finding: CognitiveFinding): RuntimeFindingClass {
  return classifyFindingCode(finding.code, finding.severity, finding.category);
}

export function isInfrastructureDegradationFinding(finding: CognitiveFinding) {
  return classifyFinding(finding) === "infrastructure_degradation";
}

export function isSemanticWarningFinding(finding: CognitiveFinding) {
  return finding.severity === "warning" && !isInfrastructureDegradationFinding(finding);
}

export function classLabel(value: RuntimeFindingClass | string | null | undefined) {
  const labels: Record<string, string> = {
    infrastructure_degradation: "Degradacao de infraestrutura",
    candidate_quality_finding: "Finding de qualidade da candidata",
    hard_safety_failure: "Bloqueio de seguranca",
    privacy_failure: "Falha de privacidade",
    vocational_failure: "Falha vocacional",
  };
  return labels[value || ""] || "Categoria indeterminada";
}
