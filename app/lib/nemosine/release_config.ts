export const INPI_ONE_YEAR_RELEASE_BRANCH = "release/inpi-1ano-20260720";

export function isInpiOneYearReleasePreview(env: NodeJS.ProcessEnv = process.env) {
  if (env.NEMOSINE_INPI_1ANO_RELEASE === "1") return true;
  return env.VERCEL_ENV === "preview" && env.VERCEL_GIT_COMMIT_REF === INPI_ONE_YEAR_RELEASE_BRANCH;
}

export function releasePreviewRuntimeMode<T extends string>(mode: T, env: NodeJS.ProcessEnv = process.env): T | "shadow" {
  return isInpiOneYearReleasePreview(env) ? "shadow" : mode;
}

export function releaseOneProductionRuntimeMode<T extends string>(mode: T, env: NodeJS.ProcessEnv = process.env): T | "off" {
  if (env.NEMOSINE_ALLOW_COGNITIVE_RUNTIME_IN_PRODUCTION === "1") return mode;
  return env.VERCEL_ENV === "production" ? "off" : mode;
}

export function shouldDisableCognitiveFoundationForInpiRelease(env: NodeJS.ProcessEnv = process.env) {
  return isInpiOneYearReleasePreview(env);
}

export function isInpiPromptFirstMode(env: NodeJS.ProcessEnv = process.env) {
  if (env.VERCEL_ENV === "production" && env.NEMOSINE_DISABLE_NATIVE_PROMPT_FIRST_PRODUCTION !== "1") {
    return true;
  }
  if (env.NEMOSINE_NATIVE_PROMPT_FIRST === "1") return true;
  return env.NEMOSINE_INPI_PROMPT_FIRST === "1"
    && env.VERCEL_ENV === "preview"
    && env.VERCEL_GIT_COMMIT_REF === INPI_ONE_YEAR_RELEASE_BRANCH;
}
