import { isAdminEmail } from "@/app/lib/accessControl";
import { readCognitiveRuntimeConfig } from "@/app/lib/nemosine/cognitive-runtime/config";
import { DEFAULT_CHAT_MODEL, DEFAULT_CHAT_TEMPERATURE } from "@/app/lib/nemosine/llm_client";

type AdminSession = {
  user?: {
    email?: string | null;
  } | null;
} | null | undefined;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function firstPresentEnv(env: NodeJS.ProcessEnv, names: string[]) {
  const name = names.find((candidate) => Boolean(env[candidate]?.trim()));
  return name ? env[name]?.trim() : undefined;
}

function safeDeployVersion(env: NodeJS.ProcessEnv) {
  return firstPresentEnv(env, [
    "VERCEL_GIT_COMMIT_SHA",
    "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
    "RAILWAY_GIT_COMMIT_SHA",
    "RENDER_GIT_COMMIT",
    "SOURCE_VERSION",
  ]) || null;
}

export function getSafeCognitiveRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const runtime = readCognitiveRuntimeConfig(env);
  const generationModel = firstPresentEnv(env, ["OPENAI_CHAT_MODEL", "CHAT_MODEL"]) || DEFAULT_CHAT_MODEL;

  return {
    runtimeMode: runtime.mode,
    defaultProfile: runtime.defaultProfile,
    coherenceThreshold: runtime.coherenceThreshold,
    maxRetries: runtime.maxRetries,
    maxTotalCandidates: runtime.maxTotalCandidates,
    doubleVigilance: runtime.doubleVigilance,
    auditEnabled: runtime.auditEnabled,
    generationModel,
    generationTemperature: DEFAULT_CHAT_TEMPERATURE,
    structuredEvaluatorTemperature: 0,
    coherenceWeights: runtime.coherenceWeights,
    runtimeVersion: "cognitive-runtime-v1",
    deployVersion: safeDeployVersion(env),
    sources: {
      runtimeMode: "NEMOSINE_COGNITIVE_RUNTIME_MODE",
      defaultProfile: "NEMOSINE_COGNITIVE_EXECUTION_PROFILE",
      coherenceThreshold: "NEMOSINE_COHERENCE_THRESHOLD",
      maxRetries: "NEMOSINE_COGNITIVE_MAX_RETRIES",
      doubleVigilance: "NEMOSINE_DOUBLE_VIGILANCE",
      auditEnabled: "NEMOSINE_COGNITIVE_AUDIT",
      generationModel: "OPENAI_CHAT_MODEL | CHAT_MODEL | DEFAULT_CHAT_MODEL",
      generationTemperature: "DEFAULT_CHAT_TEMPERATURE",
      structuredEvaluatorTemperature: "generateObject temperature fixed at 0",
      coherenceWeights: "DEFAULT_WEIGHTS in cognitive-runtime/config.ts",
      deployVersion: "provider deploy metadata when available",
    },
    limitations: [
      "Theta, pesos e temperaturas atuais explicam a configuracao vigente, nao valores historicos por execucao.",
      "O schema V1 de CognitiveRunAudit nao preserva theta, pesos, temperaturas nem avaliacoes completas por iteracao.",
      "Nenhuma chave, token, prompt bruto, conteudo de usuario ou candidata e retornado.",
    ],
  };
}

export async function handleCognitiveRuntimeConfigRequest(deps: { session: AdminSession; env?: NodeJS.ProcessEnv }) {
  if (!isAdminEmail(deps.session?.user?.email)) {
    return jsonResponse({ error: "Acesso negado" }, 403);
  }

  return jsonResponse(getSafeCognitiveRuntimeConfig(deps.env || process.env));
}
