import { CognitiveRuntimeMode, ExecutionProfile, cognitiveRuntimeModes, executionProfiles } from "./types";

export type CognitiveRuntimeConfig = {
  mode: CognitiveRuntimeMode;
  coherenceThreshold: number;
  maxRetries: number;
  maxTotalCandidates: number;
  doubleVigilance: boolean;
  auditEnabled: boolean;
  defaultProfile: ExecutionProfile;
  coherenceWeights: Record<string, number>;
};

const DEFAULT_WEIGHTS: Record<string, number> = {
  logicalConsistency: 0.16,
  factualSupport: 0.16,
  contradictionSafety: 0.13,
  honestUncertainty: 0.1,
  biographicalSafety: 0.12,
  accessClaimSafety: 0.12,
  internalConsistency: 0.1,
  responseRelevance: 0.11,
};

function parseMode(value?: string): CognitiveRuntimeMode {
  return cognitiveRuntimeModes.includes(value as CognitiveRuntimeMode)
    ? value as CognitiveRuntimeMode
    : "off";
}

function parseProfile(value?: string): ExecutionProfile {
  return executionProfiles.includes(value as ExecutionProfile)
    ? value as ExecutionProfile
    : "standard";
}

function parseNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function readCognitiveRuntimeConfig(env: NodeJS.ProcessEnv = process.env): CognitiveRuntimeConfig {
  const maxRetries = Math.floor(parseNumber(env.NEMOSINE_COGNITIVE_MAX_RETRIES, 2, 0, 5));

  return {
    mode: parseMode(env.NEMOSINE_COGNITIVE_RUNTIME_MODE),
    coherenceThreshold: parseNumber(env.NEMOSINE_COHERENCE_THRESHOLD, 0.8, 0, 1),
    maxRetries,
    maxTotalCandidates: maxRetries + 1,
    doubleVigilance: parseBoolean(env.NEMOSINE_DOUBLE_VIGILANCE, true),
    auditEnabled: parseBoolean(env.NEMOSINE_COGNITIVE_AUDIT, true),
    defaultProfile: parseProfile(env.NEMOSINE_COGNITIVE_EXECUTION_PROFILE),
    coherenceWeights: { ...DEFAULT_WEIGHTS },
  };
}

export function normalizeRuntimeMode(value: string | undefined): CognitiveRuntimeMode {
  return parseMode(value);
}

export function shouldUseCognitiveRuntime(config: CognitiveRuntimeConfig) {
  return config.mode === "shadow" || config.mode === "enforce";
}
