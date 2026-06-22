import { CognitiveRuntimeConfig } from "./config";
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

export function calculateVigiaCoherence(input: {
  scientist: ScientistEvaluation;
  privacy: PrivacyEvaluation;
  vocation: VocationalEvaluation;
  config: CognitiveRuntimeConfig;
}): VigiaCoherenceResult {
  const weights = input.config.coherenceWeights;
  const dimensionScores: Record<string, number> = {
    logicalConsistency: input.scientist.logicalConsistency,
    factualSupport: input.scientist.factualSupport,
    contradictionSafety: 1 - input.scientist.contradictionRisk,
    honestUncertainty: input.scientist.honestUncertainty,
    biographicalSafety: input.scientist.unsupportedBiographicalClaims,
    accessClaimSafety: input.scientist.simulatedAccessClaims,
    internalConsistency: input.scientist.internalConsistency,
    responseRelevance: input.scientist.responseRelevance,
  };

  const dimensions = Object.entries(weights).map(([name, weight]) => ({
    name,
    score: clampScore(dimensionScores[name] ?? 0),
    weight,
  }));

  const weightTotal = dimensions.reduce((total, dimension) => total + dimension.weight, 0) || 1;
  const weightedTotal = dimensions.reduce((total, dimension) => total + dimension.score * dimension.weight, 0) / weightTotal;

  const hardFailures = [
    ...(!input.privacy.hardPass ? ["privacy"] : []),
    ...(!input.vocation.hardPass ? ["vocation"] : []),
    ...input.scientist.findings
      .filter((finding) => finding.severity === "critical")
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
    formula: "C(m)=sum(score_i*weight_i)/sum(weight_i); hard failures override weighted average.",
  };
}
