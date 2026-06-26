import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { DEFAULT_CHAT_MODEL } from "./llm_client";

export type LlmIncidentCode =
  | "LLM_AUTH"
  | "LLM_RATE_LIMIT"
  | "LLM_TIMEOUT"
  | "LLM_PROVIDER_UNAVAILABLE"
  | "LLM_STREAM_INTERRUPTED"
  | "LLM_CONFIGURATION"
  | "LLM_UNKNOWN";

export type ChatModelCandidate = {
  id: "primary" | "fallback";
  label: string;
  provider: "openai-compatible";
  model: string;
  apiKeyEnv: string;
  baseUrlEnv?: string;
  baseURL?: string;
  modelInstance: LanguageModel;
};

export type LlmIncident = {
  id: string;
  code: LlmIncidentCode;
  status: number;
  message: string;
  retryable: boolean;
  providerId?: string;
  providerLabel?: string;
  model?: string;
  raw: string;
};

function firstPresentEnv(names: string[]) {
  return names.find((name) => Boolean(process.env[name]?.trim()));
}

function envValue(name?: string) {
  return name ? process.env[name]?.trim() : undefined;
}

function createCandidate(config: Omit<ChatModelCandidate, "modelInstance">): ChatModelCandidate {
  const provider = createOpenAI({
    apiKey: envValue(config.apiKeyEnv),
    baseURL: config.baseURL,
  });

  return {
    ...config,
    modelInstance: provider(config.model) as LanguageModel,
  };
}

export function getChatModelCandidates(): ChatModelCandidate[] {
  const candidates: ChatModelCandidate[] = [];
  const primaryKeyEnv = firstPresentEnv(["OPENAI_API_KEY"]);
  const primaryBaseUrlEnv = firstPresentEnv(["OPENAI_BASE_URL", "LLM_PRIMARY_BASE_URL"]);
  const primaryModel = process.env.OPENAI_CHAT_MODEL?.trim()
    || process.env.CHAT_MODEL?.trim()
    || DEFAULT_CHAT_MODEL;

  if (primaryKeyEnv) {
    candidates.push(createCandidate({
      id: "primary",
      label: "OpenAI primária",
      provider: "openai-compatible",
      model: primaryModel,
      apiKeyEnv: primaryKeyEnv,
      baseUrlEnv: primaryBaseUrlEnv,
      baseURL: envValue(primaryBaseUrlEnv),
    }));
  }

  const fallbackKeyEnv = firstPresentEnv(["OPENAI_FALLBACK_API_KEY", "LLM_FALLBACK_API_KEY"]);
  const fallbackBaseUrlEnv = firstPresentEnv(["OPENAI_FALLBACK_BASE_URL", "LLM_FALLBACK_BASE_URL"]);
  const fallbackModel = process.env.OPENAI_FALLBACK_MODEL?.trim()
    || process.env.LLM_FALLBACK_MODEL?.trim()
    || primaryModel;

  if (fallbackKeyEnv) {
    candidates.push(createCandidate({
      id: "fallback",
      label: process.env.LLM_FALLBACK_PROVIDER?.trim() || "API subsidiária",
      provider: "openai-compatible",
      model: fallbackModel,
      apiKeyEnv: fallbackKeyEnv,
      baseUrlEnv: fallbackBaseUrlEnv,
      baseURL: envValue(fallbackBaseUrlEnv),
    }));
  }

  return candidates;
}

export function selectChatModelCandidate() {
  const candidates = getChatModelCandidates();
  const preferred = process.env.LLM_PREFERRED_PROVIDER?.trim().toLowerCase();
  const forceFallback = process.env.LLM_FORCE_FALLBACK === "true";

  if (forceFallback || preferred === "fallback") {
    return candidates.find((candidate) => candidate.id === "fallback") || candidates[0] || null;
  }

  return candidates[0] || null;
}

function errorText(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function readStatus(error: any) {
  const raw = error?.statusCode ?? error?.status ?? error?.response?.status;
  return typeof raw === "number" ? raw : 500;
}

function createIncidentId(code: LlmIncidentCode) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${code}-${stamp}-${suffix}`;
}

export function classifyLlmIncident(error: unknown, candidate?: ChatModelCandidate | null): LlmIncident {
  const raw = errorText(error);
  const lowered = raw.toLowerCase();
  const status = readStatus(error as any);
  let code: LlmIncidentCode = "LLM_UNKNOWN";
  let retryable = true;
  let message = "Falha desconhecida no provedor de IA.";

  if (status === 401 || status === 403 || lowered.includes("api key") || lowered.includes("unauthorized")) {
    code = "LLM_AUTH";
    retryable = false;
    message = "A API de IA recusou autenticação. A chave pode estar ausente, expirada ou inválida.";
  } else if (status === 429 || lowered.includes("rate limit") || lowered.includes("quota") || lowered.includes("insufficient_quota")) {
    code = "LLM_RATE_LIMIT";
    retryable = true;
    message = "A API de IA indicou limite, quota ou crédito insuficiente.";
  } else if (lowered.includes("timeout") || lowered.includes("timed out") || lowered.includes("abort")) {
    code = "LLM_TIMEOUT";
    retryable = true;
    message = "A API de IA demorou demais para responder.";
  } else if (status >= 500 && status <= 599) {
    code = "LLM_PROVIDER_UNAVAILABLE";
    retryable = true;
    message = "O provedor de IA parece indisponível ou instável.";
  } else if (lowered.includes("stream")) {
    code = "LLM_STREAM_INTERRUPTED";
    retryable = true;
    message = "O stream de resposta foi interrompido.";
  } else if (lowered.includes("missing") || lowered.includes("configuration")) {
    code = "LLM_CONFIGURATION";
    retryable = false;
    message = "A configuração da API de IA está incompleta.";
  }

  return {
    id: createIncidentId(code),
    code,
    status,
    message,
    retryable,
    providerId: candidate?.id,
    providerLabel: candidate?.label,
    model: candidate?.model,
    raw: raw.slice(0, 1000),
  };
}

export function buildUserFacingLlmError(incident: LlmIncident) {
  const retryText = incident.retryable
    ? "Você pode tentar novamente; se persistir, use o Observatório do Criador para baixar o diagnóstico."
    : "A correção exige ajuste de configuração no painel/ambiente.";

  return [
    `O persona não conseguiu responder por causa de uma falha técnica identificada.`,
    `Incidente: ${incident.id}`,
    `Causa provável: ${incident.message}`,
    `Provider: ${incident.providerLabel || "não identificado"}${incident.model ? ` (${incident.model})` : ""}.`,
    retryText,
  ].join("\n");
}
