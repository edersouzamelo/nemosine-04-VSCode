import { getPersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import {
  CognitiveAuditEvent,
  CognitiveRequest,
  ExecutionProfile,
  SelectedModule,
} from "./types";

const highStakesPatterns = [
  /diagnostico|medical|medic|remedio|dose|suicidio|automutila|crise mental|me matar|mental health|self harm/i,
  /processo|contrato|juridic|legal|advogad|lei|prisao|indeniza|lawsuit/i,
  /investimento|financ|imposto|divida|criptomoeda|bolsa|aposentadoria|tax|retirement/i,
  /senha|token|credencial|seguranca|security|exploit|malware|vazamento|api key/i,
  /crianca|menor de idade|child|children|abuso|violencia|emergencia/i,
  /conflito etico|assedi|discriminacao|ameaca|risco fisico/i,
  /apagar|deletar|irreversivel|excluir permanentemente|destrutiv|wipe|delete/i,
  /dado sensivel|documento pessoal|cpf|rg|passaporte|segredo|confidencial|sensitive data/i,
];

const greetingPatterns = [
  /^(ola|oi|bom dia|boa tarde|boa noite|e ai|cheguei|hello|hi)\b/i,
];

const casualPatterns = [
  /conversar livremente|bate papo|sem pauta|estou aqui|vim conversar|queria conversar/i,
];

const simpleLowRiskPatterns = [
  /^(resuma|explique|me diga|liste|organize|traduza)\b/i,
  /\b(simples|rapido|rapida|curto|curta|breve|sem risco)\b/i,
];

const standardPatterns = [
  /aconselh|analise|planej|plano|decisao|prioridade|estrategia|comparar|avaliar|pergunta factual|fato|quando|onde|quem|como funciona|bug|build|deploy|codigo|erro|api/i,
];

const profileRank: Record<ExecutionProfile, number> = {
  light: 1,
  standard: 2,
  full: 3,
};

function normalizeRiskText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function classifyRequestRisk(text: string) {
  const normalized = normalizeRiskText(text);
  const compact = normalized.trim();
  const highStakes = highStakesPatterns.some((pattern) => pattern.test(normalized));
  const isGreeting = greetingPatterns.some((pattern) => pattern.test(compact));
  const casual = casualPatterns.some((pattern) => pattern.test(normalized));
  const simpleLowRisk = simpleLowRiskPatterns.some((pattern) => pattern.test(normalized)) && !highStakes;
  const standard = standardPatterns.some((pattern) => pattern.test(normalized));
  const recommendedProfile: ExecutionProfile = highStakes
    ? "full"
    : isGreeting || casual || (simpleLowRisk && compact.length < 180)
      ? "light"
      : standard || compact.length >= 180
        ? "standard"
        : "light";
  const profileReason = highStakes
    ? "high_stakes_full"
    : isGreeting
      ? "greeting_light"
      : casual
        ? "casual_continuity_light"
        : simpleLowRisk && compact.length < 180
          ? "simple_low_risk_light"
          : standard
            ? "standard_workload"
            : compact.length >= 180
              ? "substantive_length_standard"
              : "low_risk_light";

  return {
    highStakes,
    recommendedProfile,
    profileReason,
    matchedPatterns: highStakesPatterns
      .filter((pattern) => pattern.test(normalized))
      .map((pattern) => pattern.source),
  };
}

export function selectExecutionProfile(request: CognitiveRequest, fallback: ExecutionProfile): ExecutionProfile {
  const risk = classifyRequestRisk(request.userText);
  if (risk.highStakes) return "full";
  const recommended = risk.recommendedProfile;
  if (request.requestedProfile && profileRank[request.requestedProfile] > profileRank[recommended]) {
    return request.requestedProfile;
  }
  if (request.requestedProfile && profileRank[request.requestedProfile] < profileRank[recommended]) {
    return recommended;
  }
  if (fallback === "light" && recommended === "standard") return "standard";
  return recommended;
}

export function buildProfileAuditEvent(input: {
  requested?: ExecutionProfile;
  selected: ExecutionProfile;
  fallback: ExecutionProfile;
  highStakes: boolean;
  profileReason?: string;
  matchedPatterns?: string[];
}): CognitiveAuditEvent {
  const rebalanced = input.highStakes
    || input.fallback !== input.selected
    || (Boolean(input.requested) && input.requested !== input.selected);

  return {
    code: rebalanced ? "REBALANCING_APPLIED" : "PROFILE_SELECTED",
    at: new Date().toISOString(),
    detail: {
      requestedProfile: input.requested || null,
      fallbackProfile: input.fallback,
      selectedProfile: input.selected,
      highStakes: input.highStakes,
      profileReason: input.profileReason || (input.highStakes ? "high_stakes_full" : "default_profile"),
      matchedHighStakesPatterns: (input.matchedPatterns || []).slice(0, 3).join(","),
      symbolicConfigurationChanged: false,
    },
  };
}

export function selectRuntimeModules(request: CognitiveRequest, profile: ExecutionProfile): SelectedModule[] {
  const contract = getPersonaBehaviorContract(request.personaId);
  const structuredValidators = profile !== "light";

  return [
    {
      id: "orchestrator",
      kind: "typescript",
      purpose: "Controls technical execution state, retries and final promotion without changing symbolic configuration.",
      enabled: true,
    },
    {
      id: "persona-generator",
      kind: "llm",
      personaId: request.personaId,
      purpose: `Generates candidate prose using the user-selected visible persona and contract ${contract.id}.`,
      enabled: true,
    },
    {
      id: "claim-extractor",
      kind: structuredValidators ? "llm" : "deterministic",
      purpose: "Extracts claims and proposed side effects from candidate text without writing to the user.",
      enabled: true,
    },
    {
      id: "scientist",
      kind: structuredValidators ? "llm" : "deterministic",
      purpose: "Applies veritative criteria associated with Scientist evaluation.",
      enabled: true,
    },
    {
      id: "vigia",
      kind: "deterministic",
      purpose: "Calculates the operational promotion-coherence index in TypeScript.",
      enabled: true,
    },
    {
      id: "philosopher",
      kind: structuredValidators ? "llm" : "deterministic",
      purpose: "Applies ethical-epistemological criteria associated with Philosopher evaluation.",
      enabled: true,
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
