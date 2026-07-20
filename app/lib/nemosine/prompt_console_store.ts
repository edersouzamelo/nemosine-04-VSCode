import { isAdminEmail } from "../accessControl";
import {
  normalizePromptStackPreset,
  V1_STABLE_PROMPT_STACK_PRESET,
  type PresencePromptStackStatus,
  type PromptStackInterceptorConfig,
  type PromptStackPreset,
  type PromptStackResolvedModule,
} from "./prompt_stack";

export type PromptConsoleRuntime = {
  enabled: boolean;
  reason: string;
  preset: PromptStackPreset;
};

export type PromptTurnTrace = {
  requestId: string;
  createdAt: string;
  persona: string;
  thread: string;
  model: string;
  preset: string;
  modulesUsed: string[];
  order: Array<{ id: string; order: number; inserted: boolean }>;
  resolvedText: string;
  tokenCount: number;
  presence: PresencePromptStackStatus;
  memories: {
    memoryCount: number;
    episodeCount: number;
    topicCount: number;
  };
  codexDirectory: {
    inserted: boolean;
    reason: string;
  };
  constitution: {
    inserted: boolean;
    reason: string;
  };
  interceptorsEvaluated: Array<PromptStackInterceptorConfig & { triggered: boolean }>;
  triggeredInterceptor: string | null;
  llmCalled: boolean;
  finalResponseOrigin: "persona_llm" | "interceptor" | "fallback" | "error";
  responseBeforeSanitizer: string;
  responseAfterSanitizer: string;
  persistences: string[];
  durationMs: number;
  alert?: string | null;
};

type PromptConsoleState = {
  activePreset: PromptStackPreset;
  savedPresets: PromptStackPreset[];
  traces: PromptTurnTrace[];
};

const GLOBAL_KEY = "__nemosine_prompt_console_store__";
const MAX_TRACES = 40;

function state(): PromptConsoleState {
  const existing = (globalThis as unknown as Record<string, PromptConsoleState | undefined>)[GLOBAL_KEY];
  if (existing) return existing;

  const created: PromptConsoleState = {
    activePreset: normalizePromptStackPreset(V1_STABLE_PROMPT_STACK_PRESET),
    savedPresets: [],
    traces: [],
  };
  (globalThis as unknown as Record<string, PromptConsoleState>)[GLOBAL_KEY] = created;
  return created;
}

export function readPromptConsoleState() {
  const current = state();
  return {
    activePreset: normalizePromptStackPreset(current.activePreset),
    savedPresets: current.savedPresets.map((preset) => normalizePromptStackPreset(preset)),
    traces: current.traces,
    defaultPreset: normalizePromptStackPreset(V1_STABLE_PROMPT_STACK_PRESET),
    aprovisionadorDiagnostic: buildAprovisionadorDiagnostic(),
  };
}

export function readActivePromptStackPreset() {
  return normalizePromptStackPreset(state().activePreset);
}

export function updateActivePromptStackPreset(preset: PromptStackPreset) {
  const normalized = normalizePromptStackPreset({
    ...preset,
    updatedAt: new Date().toISOString(),
  });
  state().activePreset = normalized;
  return normalized;
}

export function savePromptStackPresetCopy(preset: PromptStackPreset) {
  const normalized = normalizePromptStackPreset({
    ...preset,
    id: `${preset.id || "v1-stable-single-persona"}-copy-${Date.now()}`,
    name: `${preset.name || "V1 Stable Single Persona"} (copia)`,
    updatedAt: new Date().toISOString(),
  });
  state().savedPresets = [normalized, ...state().savedPresets].slice(0, 12);
  return normalized;
}

export function restoreDefaultPromptStackPreset() {
  const restored = normalizePromptStackPreset(V1_STABLE_PROMPT_STACK_PRESET);
  state().activePreset = restored;
  return restored;
}

export function getPromptConsoleRuntime(input: {
  userEmail?: string | null;
  env?: NodeJS.ProcessEnv;
}): PromptConsoleRuntime {
  const env = input.env || process.env;
  const admin = isAdminEmail(input.userEmail);
  if (!admin) {
    return {
      enabled: false,
      reason: "Usuario nao e a conta Dev autorizada.",
      preset: normalizePromptStackPreset(V1_STABLE_PROMPT_STACK_PRESET),
    };
  }
  if (env.VERCEL_ENV === "production" && env.NEMOSINE_PROMPT_CONSOLE_ALLOW_PRODUCTION !== "1") {
    return {
      enabled: false,
      reason: "Preset editavel bloqueado em producao.",
      preset: normalizePromptStackPreset(V1_STABLE_PROMPT_STACK_PRESET),
    };
  }
  const previewOrLocal = env.VERCEL_ENV === "preview" || env.NODE_ENV === "development" || env.NEMOSINE_PROMPT_CONSOLE_DEV_RUNTIME === "1";
  return {
    enabled: previewOrLocal,
    reason: previewOrLocal
      ? "Conta Dev em preview/local: preset aplicado ao proximo turno."
      : "Ambiente nao-preview: preset disponivel apenas para inspecao.",
    preset: previewOrLocal
      ? readActivePromptStackPreset()
      : normalizePromptStackPreset(V1_STABLE_PROMPT_STACK_PRESET),
  };
}

export function recordPromptTurnTrace(trace: PromptTurnTrace) {
  const current = state();
  current.traces = [trace, ...current.traces].slice(0, MAX_TRACES);
  return trace;
}

export function buildTraceFromPromptStack(input: {
  requestId: string;
  personaId: string;
  threadId: string;
  model: string;
  preset: PromptStackPreset;
  modules: PromptStackResolvedModule[];
  systemPrompt: string;
  tokenCount: number;
  presence: PresencePromptStackStatus;
  memoryCount: number;
  episodeCount: number;
  topicCount: number;
  codexDirectoryInserted: boolean;
  constitutionInserted: boolean;
  interceptors: PromptStackInterceptorConfig[];
  triggeredInterceptor?: string | null;
  llmCalled: boolean;
  finalResponseOrigin: PromptTurnTrace["finalResponseOrigin"];
  responseBeforeSanitizer: string;
  responseAfterSanitizer: string;
  persistences: string[];
  durationMs: number;
}) {
  const modulesUsed = input.modules.filter((module) => module.inserted).map((module) => module.id);
  return recordPromptTurnTrace({
    requestId: input.requestId,
    createdAt: new Date().toISOString(),
    persona: input.personaId,
    thread: input.threadId,
    model: input.model,
    preset: input.preset.id,
    modulesUsed,
    order: input.modules.map((module) => ({
      id: module.id,
      order: module.order,
      inserted: module.inserted,
    })),
    resolvedText: input.systemPrompt,
    tokenCount: input.tokenCount,
    presence: input.presence,
    memories: {
      memoryCount: input.memoryCount,
      episodeCount: input.episodeCount,
      topicCount: input.topicCount,
    },
    codexDirectory: {
      inserted: input.codexDirectoryInserted,
      reason: input.codexDirectoryInserted
        ? "Modulo codex_persona_directory entrou no prompt."
        : "Modulo desabilitado ou truncado sem texto.",
    },
    constitution: {
      inserted: input.constitutionInserted,
      reason: input.constitutionInserted
        ? "Modulo constitution_compact entrou no prompt."
        : "Modulo constitucional ausente no turno.",
    },
    interceptorsEvaluated: input.interceptors.map((interceptor) => ({
      ...interceptor,
      triggered: interceptor.id === input.triggeredInterceptor,
    })),
    triggeredInterceptor: input.triggeredInterceptor || null,
    llmCalled: input.llmCalled,
    finalResponseOrigin: input.finalResponseOrigin,
    responseBeforeSanitizer: input.responseBeforeSanitizer,
    responseAfterSanitizer: input.responseAfterSanitizer,
    persistences: input.persistences,
    durationMs: input.durationMs,
    alert: input.finalResponseOrigin !== "persona_llm"
      ? "RESPOSTA NAO GERADA PELA PERSONA"
      : null,
  });
}

export function buildAprovisionadorDiagnostic() {
  return {
    observed: [
      "Foi observada a resposta iniciada por 'Deu certo. Eu continuo como Aprovisionador...'.",
      "O Ajuste de Presenca pode nao aparecer quando a API de configuracao retorna enabled=false.",
      "O Diretorio Codex nao existia como modulo real do prompt prompt-first antes desta correcao.",
    ],
    codeConfirmed: [
      "A frase 'Deu certo.' esta hardcoded em app/lib/nemosine/social_continuation.ts, funcao buildSocialContinuationAnswer().",
      "A funcao isSocialContinuationInput() aceita 'deu certo', 'boa', 'ufa' e risadas como gatilhos.",
      "No caminho legacy de app/api/chat/route.ts, social_continuation retornava antes da chamada direta ao LLM.",
      "A montagem prompt-first anterior inseria persona, regras, presenca confirmada, memorias e idioma, mas nao inseria Diretorio Codex compacto nem Constituicao compacta rastreavel.",
    ],
    inference: [
      "Se o teste local nao estava em producao/preview com prompt-first ligado, o caminho legacy ficou ativo e permitiu a resposta deterministica.",
      "Um pedido de dieta/teste feito ao Aprovisionador podia ser interceptado se a mensagem ou o turno de confirmacao fosse interpretado como celebracao/reacao social.",
      "Com o preset V1 Stable aplicado no preview/dev, social_continuation fica OFF e a resposta deve vir do LLM/persona, salvo erro explicito.",
    ],
  };
}
