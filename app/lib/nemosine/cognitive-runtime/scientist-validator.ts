import {
  CandidateResponse,
  CognitiveFinding,
  ExtractionResult,
  ScientistEvaluation,
} from "./types";

const simulatedAccessPatterns = [
  /\b(verifiquei|confirmei|analisei|inspecionei|auditei)\b.*\b(log|banco|codigo|payload|arquivo|sistema)\b/i,
  /\btenho acesso\b/i,
];

const genericUnsupportedBioPatterns = [
  /antes de 2021/i,
  /era conhecido por/i,
  /sua carreira publica/i,
];

function finding(code: string, severity: CognitiveFinding["severity"], explanation: string, repairInstruction: string): CognitiveFinding {
  return {
    code,
    severity,
    category: "scientist",
    explanation,
    repairInstruction,
  };
}

export function deterministicScientistEvaluation(input: {
  candidate: CandidateResponse;
  extraction: ExtractionResult;
}): ScientistEvaluation {
  const findings: CognitiveFinding[] = [];
  const text = input.candidate.visibleText;

  if (simulatedAccessPatterns.some((pattern) => pattern.test(text))) {
    findings.push(finding(
      "SCIENTIST_SIMULATED_ACCESS",
      "critical",
      "Candidate appears to claim verification or access not present in authorized context.",
      "Remove simulated access claims and state the limitation honestly.",
    ));
  }

  if (genericUnsupportedBioPatterns.some((pattern) => pattern.test(text))) {
    findings.push(finding(
      "SCIENTIST_UNSUPPORTED_BIOGRAPHY",
      "critical",
      "Candidate appears to make an unsupported biographical or training-date claim.",
      "Remove unsupported biography and distinguish fact, inference and uncertainty.",
    ));
  }

  if (input.extraction.claims.some((claim) => claim.support === "candidate_only" && claim.confidence > 0.7)) {
    findings.push(finding(
      "SCIENTIST_CANDIDATE_ONLY_CLAIM",
      "warning",
      "A claim is supported only by the candidate text.",
      "Mark the claim as inference or remove it unless supported by user or authorized context.",
    ));
  }

  const hasCritical = findings.some((item) => item.severity === "critical");
  const hasWarning = findings.some((item) => item.severity === "warning");

  return {
    logicalConsistency: hasCritical ? 0.45 : 0.9,
    factualSupport: hasWarning ? 0.72 : 0.88,
    contradictionRisk: hasCritical ? 0.85 : 0.1,
    honestUncertainty: hasWarning ? 0.72 : 0.88,
    unsupportedBiographicalClaims: genericUnsupportedBioPatterns.some((pattern) => pattern.test(text)) ? 0 : 1,
    simulatedAccessClaims: simulatedAccessPatterns.some((pattern) => pattern.test(text)) ? 0 : 1,
    internalConsistency: hasCritical ? 0.55 : 0.9,
    responseRelevance: text.trim().length > 0 ? 0.86 : 0,
    approved: !hasCritical,
    findings,
    modelId: "deterministic-scientist-v1",
  };
}

export function scientistHasCriticalFailure(scientist: ScientistEvaluation) {
  return scientist.findings.some((finding) => finding.severity === "critical");
}
