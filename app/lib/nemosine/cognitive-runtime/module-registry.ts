import { getPersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import {
  CognitiveRequest,
  ExecutionProfile,
  SelectedModule,
} from "./types";

const highStakesPatterns = [
  /diagnostico|medic[ao]|remedio|dose|suic[ií]dio|automutila/i,
  /processo|contrato|jur[ií]dic|advogad|lei|pris[aã]o/i,
  /investimento|financ|imposto|d[ií]vida|criptomoeda|bolsa/i,
  /senha|token|credencial|seguran[cç]a|exploit|malware|vazamento/i,
  /apagar|deletar|irrevers[ií]vel|excluir permanentemente/i,
  /dado sens[ií]vel|documento pessoal|cpf|rg|passaporte/i,
];

export function classifyRequestRisk(text: string) {
  return {
    highStakes: highStakesPatterns.some((pattern) => pattern.test(text)),
    matchedPatterns: highStakesPatterns
      .filter((pattern) => pattern.test(text))
      .map((pattern) => pattern.source),
  };
}

export function selectExecutionProfile(request: CognitiveRequest, fallback: ExecutionProfile): ExecutionProfile {
  if (request.requestedProfile) return request.requestedProfile;
  if (classifyRequestRisk(request.userText).highStakes) return "full";
  if (request.runtimeMode === "enforce") return fallback === "light" ? "standard" : fallback;
  return fallback;
}

export function selectRuntimeModules(request: CognitiveRequest, profile: ExecutionProfile): SelectedModule[] {
  const contract = getPersonaBehaviorContract(request.personaId);

  return [
    {
      id: "orchestrator",
      kind: "typescript",
      purpose: "Controls state transitions, profile selection, retries and final promotion.",
      enabled: true,
    },
    {
      id: "persona-generator",
      kind: "llm",
      personaId: request.personaId,
      purpose: `Generates candidate prose using the active persona and contract ${contract.id}.`,
      enabled: true,
    },
    {
      id: "claim-extractor",
      kind: profile === "light" ? "deterministic" : "llm",
      purpose: "Extracts claims and proposed side effects from candidate text without writing to the user.",
      enabled: true,
    },
    {
      id: "scientist",
      kind: profile === "light" ? "deterministic" : "llm",
      purpose: "Evaluates logical, factual and veritative dimensions as structured scores.",
      enabled: profile !== "light" || request.runtimeMode === "enforce",
    },
    {
      id: "vigia",
      kind: "deterministic",
      purpose: "Calculates weighted coherence and hard-failure overrides in TypeScript.",
      enabled: true,
    },
    {
      id: "philosopher",
      kind: profile === "light" ? "deterministic" : "llm",
      purpose: "Evaluates ethical and epistemological vigilance as a separate axis.",
      enabled: profile !== "light" || request.runtimeMode === "enforce",
    },
    {
      id: "promotion-gate",
      kind: "deterministic",
      purpose: "Combines coherence, Scientist, Philosopher, privacy, vocation and side-effect authorization results.",
      enabled: true,
    },
    {
      id: "side-effect-committer",
      kind: "typescript",
      purpose: "Commits approved memory, registry and Destiny actions only after promotion.",
      enabled: true,
    },
  ];
}
