export const cognitiveFoundationModes = ["off", "shadow", "enforce"] as const;
export type CognitiveFoundationMode = typeof cognitiveFoundationModes[number];

export const onboardingV2Modes = ["off", "internal", "opt_in", "public"] as const;
export type OnboardingV2Mode = typeof onboardingV2Modes[number];

export const webEnrichmentModes = ["off", "internal", "opt_in"] as const;
export type WebEnrichmentMode = typeof webEnrichmentModes[number];

export type CognitiveFoundationConfig = {
  userGraphMode: CognitiveFoundationMode;
  memoryExtractorMode: CognitiveFoundationMode;
  depthGateMode: CognitiveFoundationMode;
  personaProjectionMode: CognitiveFoundationMode;
  onboardingV2Mode: OnboardingV2Mode;
  webEnrichmentMode: WebEnrichmentMode;
  sources: Record<keyof Omit<CognitiveFoundationConfig, "sources">, string>;
};

function parseFoundationMode(value?: string): CognitiveFoundationMode {
  return cognitiveFoundationModes.includes(value as CognitiveFoundationMode)
    ? value as CognitiveFoundationMode
    : "off";
}

function parseOnboardingMode(value?: string): OnboardingV2Mode {
  return onboardingV2Modes.includes(value as OnboardingV2Mode)
    ? value as OnboardingV2Mode
    : "off";
}

function parseWebEnrichmentMode(value?: string): WebEnrichmentMode {
  return webEnrichmentModes.includes(value as WebEnrichmentMode)
    ? value as WebEnrichmentMode
    : "off";
}

export function readCognitiveFoundationConfig(env: NodeJS.ProcessEnv = process.env): CognitiveFoundationConfig {
  return {
    userGraphMode: parseFoundationMode(env.USER_GRAPH_MODE),
    memoryExtractorMode: parseFoundationMode(env.MEMORY_EXTRACTOR_MODE),
    depthGateMode: parseFoundationMode(env.DEPTH_GATE_MODE),
    personaProjectionMode: parseFoundationMode(env.PERSONA_PROJECTION_MODE),
    onboardingV2Mode: parseOnboardingMode(env.ONBOARDING_V2_MODE),
    webEnrichmentMode: parseWebEnrichmentMode(env.WEB_ENRICHMENT_MODE),
    sources: {
      userGraphMode: "USER_GRAPH_MODE",
      memoryExtractorMode: "MEMORY_EXTRACTOR_MODE",
      depthGateMode: "DEPTH_GATE_MODE",
      personaProjectionMode: "PERSONA_PROJECTION_MODE",
      onboardingV2Mode: "ONBOARDING_V2_MODE",
      webEnrichmentMode: "WEB_ENRICHMENT_MODE",
    },
  };
}

export function isFoundationModeActive(mode: CognitiveFoundationMode) {
  return mode === "shadow" || mode === "enforce";
}

export function isOnboardingV2Active(mode: OnboardingV2Mode) {
  return mode === "internal" || mode === "opt_in" || mode === "public";
}

export function isWebEnrichmentActive(mode: WebEnrichmentMode) {
  return mode === "internal" || mode === "opt_in";
}

export function hasAnyCognitiveFoundationRuntime(config: CognitiveFoundationConfig) {
  return [
    config.userGraphMode,
    config.memoryExtractorMode,
    config.depthGateMode,
    config.personaProjectionMode,
  ].some(isFoundationModeActive);
}
