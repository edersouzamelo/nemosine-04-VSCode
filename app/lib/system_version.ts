export const SYSTEM_VERSION_NAME = process.env.NEXT_PUBLIC_APP_VERSION || "Nemosine Nous v1.0";
export const SYSTEM_VERSION_UPDATED_AT = process.env.NEXT_PUBLIC_BUILD_DATE || "18/07/2026";

export function getSystemBuildId() {
  return (
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    || process.env.VERCEL_GIT_COMMIT_SHA
    || "local"
  ).slice(0, 7);
}
