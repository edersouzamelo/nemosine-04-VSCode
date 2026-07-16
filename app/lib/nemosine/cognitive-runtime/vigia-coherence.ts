import { CognitiveRuntimeConfig } from "./config";
import { classifyFinding, isInfrastructureDegradationFinding } from "./finding-classification";
import {
  PrivacyEvaluation,
  ScientistEvaluation,
  VigiaCoherenceResult,
  VocationalEvaluation,
} from "./types";

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

const notApplicableReasons: Record<string, string> = {
  factualSupport: "Sem alegacao factual verificavel nesta candidata.",
  honestUncertainty: "Sem incerteza factual relevante nesta candidata.",
  biographicalSafety: "Sem afirmacao biografica nesta candidata.",
  accessClaimSafety: "Sem alegacao de acesso externo ou verificacao nesta candidata.",
};

export function calculateVigiaCoherence(input: {
  scientist: ScientistEvaluation;
  privacy: PrivacyEvaluation;
  vocation: VocationalEvaluation;
  config: CognitiveRuntimeConfig;
  profile?: "light" | "standard" | "full";
}): VigiaCoherenceResult {
  const weights = input.config.coherenceWeights;
  const dimensionScores: Record<string, number> = {
    logicalConsistency: input.scientist.logicalConsistency,
    factualSupport: input.scientist.factualSupport,
    contradictionSafety: 1 - input.scientist.contradictionRisk,
    honestUncertainty: input.scientist.honestUncertainty,
    biographicalSafety: input.scientist.biographicalSafety,
    accessClaimSafety: input.scientist.accessClaimSafety,
    internalConsistency: input.scientist.internalConsistency,
    responseRelevance: input.scientist.responseRelevance,
  };

  const dimensions = Object.entries(weights).map(([name, weight]) => {
    const status = input.scientist.dimensionApplicability?.[name] === "not_applicable"
      ? "NOT_APPLICABLE" as const
      : "SCORED" as const;
    return {
      name,
      score: status === "NOT_APPLICABLE" ? null : clampScore(dimensionScores[name] ?? 0),
      weight,
      status,
      reason: status === "NOT_APPLICABLE" ? notApplicableReasons[name] || "Dimensao nao aplicavel a este turno." : null,
    };
  });

  const scoredDimensions = dimensions.filter((dimension) => dimension.status === "SCORED" && typeof dimension.score === "number");
  const weightTotal = scoredDimensions.reduce((total, dimension) => total + dimension.weight, 0) || 1;
  const weightedTotal = scoredDimensions.reduce((total, dimension) => total + (dimension.score || 0) * dimension.weight, 0) / weightTotal;
  const vocationalHardFindings = input.vocation.findings.filter((finding) =>
    (finding.severity === "error" || finding.severity === "critical")
    && classifyFinding(finding) === "vocational_failure"
  );

  const hardFailures = [
    ...(!input.privacy.hardPass ? ["privacy"] : []),
    ...(vocationalHardFindings.length > 0 ? vocationalHardFindings.map((finding) => `vocation:${finding.code}`) : []),
    ...(!input.scientist.approved ? ["scientist:approved_false"] : []),
    ...input.scientist.findings
      .filter((finding) => !isInfrastructureDegradationFinding(finding) && (finding.severity === "error" || finding.severity === "critical"))
      .map((finding) => `scientist:${finding.code}`),
  ];

  const totalCoherence = Number(weightedTotal.toFixed(4));
  const passed = hardFailures.length === 0 && totalCoherence >= input.config.coherenceThreshold;

  return {
    totalCoherence,
    dimensions,
    weights: { ...weights },
    hardFailures,
    threshold: input.config.coherenceThreshold,
    passed,
    recommendedNextTransition: passed ? "OCV_CONVERGED" : "OCV_RETRY_REQUESTED",
    formula: "C(m)=sum(score_i*weight_i)/sum(weight_i); operational promotion-coherence index; hard failures override weighted average.",
    profile: input.profile || "standard",
  };
}
