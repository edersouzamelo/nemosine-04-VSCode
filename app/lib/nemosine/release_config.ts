export const INPI_ONE_YEAR_RELEASE_BRANCH = "release/inpi-1ano-20260720";

export function isInpiOneYearReleasePreview(env: NodeJS.ProcessEnv = process.env) {
  if (env.NEMOSINE_INPI_1ANO_RELEASE === "1") return true;
  return env.VERCEL_ENV === "preview" && env.VERCEL_GIT_COMMIT_REF === INPI_ONE_YEAR_RELEASE_BRANCH;
}

export function releasePreviewRuntimeMode<T extends string>(mode: T, env: NodeJS.ProcessEnv = process.env): T | "shadow" {
  return isInpiOneYearReleasePreview(env) ? "shadow" : mode;
}

export function shouldDisableCognitiveFoundationForInpiRelease(env: NodeJS.ProcessEnv = process.env) {
  return isInpiOneYearReleasePreview(env);
}
