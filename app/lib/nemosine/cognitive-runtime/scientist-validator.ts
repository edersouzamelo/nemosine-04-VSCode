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

function textLooksBiographical(text: string) {
  return genericUnsupportedBioPatterns.some((pattern) => pattern.test(text))
    || /\b(biografia|historia pessoal|carreira|infancia|familia|passado)\b/i.test(text);
}

function buildDimensionApplicability(input: {
  candidate: CandidateResponse;
  extraction: ExtractionResult;
}) {
  const text = input.candidate.visibleText;
  const hasFactualClaim = input.extraction.claims.some((claim) => claim.type === "factual");
  const hasUncertaintyClaim = input.extraction.claims.some((claim) =>
    claim.type === "uncertainty"
    || claim.support === "unknown"
    || claim.support === "externally_unverifiable"
    || claim.support === "candidate_only"
  );
  const hasBiographyClaim = textLooksBiographical(text)
    || input.extraction.claims.some((claim) => textLooksBiographical(claim.text));
  const hasAccessClaim = simulatedAccessPatterns.some((pattern) => pattern.test(text))
    || input.extraction.claims.some((claim) => claim.type === "access_or_verification");

  return {
    factualSupport: hasFactualClaim ? "scored" : "not_applicable",
    honestUncertainty: hasUncertaintyClaim ? "scored" : "not_applicable",
    biographicalSafety: hasBiographyClaim ? "scored" : "not_applicable",
    accessClaimSafety: hasAccessClaim ? "scored" : "not_applicable",
  } as const;
}

export function deterministicScientistEvaluation(input: {
  candidate: CandidateResponse;
  extraction: ExtractionResult;
}): ScientistEvaluation {
  const findings: CognitiveFinding[] = [];
  const text = input.candidate.visibleText;
  const dimensionApplicability = buildDimensionApplicability(input);

  findings.push(...input.extraction.extractorFindings);

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

  if (input.extraction.claims.some((claim) => claim.support === "contradicted")) {
    findings.push(finding(
      "SCIENTIST_CONTRADICTED_BY_AVAILABLE_EVIDENCE",
      "error",
      "A claim is contradicted by the current user message or authorized context.",
      "Remove or correct the contradicted claim.",
    ));
  }

  const hasCritical = findings.some((item) => item.severity === "critical");
  const hasError = findings.some((item) => item.severity === "error");
  const hasWarning = findings.some((item) => item.severity === "warning");

  return {
    logicalConsistency: hasCritical ? 0.45 : 0.9,
    factualSupport: hasError ? 0.42 : hasWarning ? 0.72 : 0.88,
    contradictionRisk: hasCritical ? 0.85 : 0.1,
    honestUncertainty: hasWarning ? 0.72 : 0.88,
    biographicalSafety: genericUnsupportedBioPatterns.some((pattern) => pattern.test(text)) ? 0 : 1,
    accessClaimSafety: simulatedAccessPatterns.some((pattern) => pattern.test(text)) ? 0 : 1,
    internalConsistency: hasCritical ? 0.55 : 0.9,
    responseRelevance: text.trim().length > 0 ? 0.86 : 0,
    externalVerificationAvailable: false,
    evidenceSummary: "Deterministic hard checks only; no external verification was performed.",
    approved: !hasCritical && !hasError,
    findings,
    dimensionApplicability,
    modelId: "deterministic-scientist-v1",
  };
}

export function scientistHasCriticalFailure(scientist: ScientistEvaluation) {
  return scientist.findings.some((finding) => finding.severity === "critical");
}

export function mergeScientistEvaluations(
  deterministic: ScientistEvaluation,
  structured?: ScientistEvaluation,
): ScientistEvaluation {
  if (!structured) return deterministic;

  const findings = [...deterministic.findings, ...structured.findings];
  const hasBlockingFinding = findings.some((finding) => finding.severity === "error" || finding.severity === "critical");

  return {
    logicalConsistency: Math.min(deterministic.logicalConsistency, structured.logicalConsistency),
    factualSupport: Math.min(deterministic.factualSupport, structured.factualSupport),
    contradictionRisk: Math.max(deterministic.contradictionRisk, structured.contradictionRisk),
    honestUncertainty: Math.min(deterministic.honestUncertainty, structured.honestUncertainty),
    biographicalSafety: Math.min(deterministic.biographicalSafety, structured.biographicalSafety),
    accessClaimSafety: Math.min(deterministic.accessClaimSafety, structured.accessClaimSafety),
    internalConsistency: Math.min(deterministic.internalConsistency, structured.internalConsistency),
    responseRelevance: Math.min(deterministic.responseRelevance, structured.responseRelevance),
    externalVerificationAvailable: deterministic.externalVerificationAvailable || structured.externalVerificationAvailable,
    evidenceSummary: structured.evidenceSummary || deterministic.evidenceSummary,
    approved: deterministic.approved && structured.approved && !hasBlockingFinding,
    findings,
    dimensionApplicability: {
      ...(structured.dimensionApplicability || {}),
      ...(deterministic.dimensionApplicability || {}),
    },
    modelId: [deterministic.modelId, structured.modelId].filter(Boolean).join("+"),
  };
}
