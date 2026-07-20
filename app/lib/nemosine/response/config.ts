import {
  ResponsePipelineConfig,
  ResponsePipelineMode,
  responsePipelineModes,
} from "./types";
import { releaseOneProductionRuntimeMode } from "../release_config";

function parseMode(value?: string): ResponsePipelineMode {
  return responsePipelineModes.includes(value as ResponsePipelineMode)
    ? value as ResponsePipelineMode
    : "off";
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function readResponsePipelineConfig(env: NodeJS.ProcessEnv = process.env): ResponsePipelineConfig {
  return {
    mode: releaseOneProductionRuntimeMode(parseMode(env.NEMOSINE_RESPONSE_PIPELINE_V2), env),
    maxRegenerations: parseInteger(env.NEMOSINE_RESPONSE_PIPELINE_V2_MAX_REGENERATIONS, 1, 0, 1),
    auditEnabled: parseBoolean(env.NEMOSINE_RESPONSE_PIPELINE_V2_AUDIT, true),
  };
}

export function shouldUseResponsePipeline(config: ResponsePipelineConfig) {
  return config.mode === "shadow" || config.mode === "enforce";
}
