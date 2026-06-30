import { extractMemoryCandidates } from "./memory_candidate_extractor";
import type { MemoryCandidate } from "./types";

export const onboardingV2Steps = [
  "entry_reason",
  "timeline",
  "choices_under_tension",
  "free_report",
  "optional_imports",
  "initial_mirror",
  "review",
] as const;

export type OnboardingV2Input = {
  userId: string;
  entryReason?: string | null;
  timelineEvents?: string[];
  choicesUnderTension?: string[];
  freeReport?: string | null;
  optionalImports?: Array<{ kind: string; reference: string; authorized: boolean }>;
  personaAccess?: string[] | null;
};

export type OnboardingV2Mirror = {
  progress: {
    completedSteps: number;
    totalSteps: number;
    skippedAllowed: true;
  };
  understoodSoFar: string[];
  candidates: MemoryCandidate[];
  reviewActions: string[];
  warnings: string[];
};

function cleanList(values: unknown, maxItems: number) {
  return Array.isArray(values)
    ? values.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.replace(/\s+/g, " ").trim().slice(0, 700))
      .slice(0, maxItems)
    : [];
}

function compact(value: string | null | undefined, maxLength = 900) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function buildOnboardingV2Mirror(input: OnboardingV2Input): OnboardingV2Mirror {
  const timelineEvents = cleanList(input.timelineEvents, 3);
  const choices = cleanList(input.choicesUnderTension, 5);
  const freeReport = compact(input.freeReport, 1600);
  const entryReason = compact(input.entryReason, 160);
  const imports = (input.optionalImports || [])
    .filter((item) => item && typeof item.kind === "string" && typeof item.reference === "string")
    .slice(0, 6);
  const warnings: string[] = [];

  if (imports.some((item) => !item.authorized)) {
    warnings.push("unauthorized-imports-ignored");
  }

  const sourceText = [
    entryReason ? `Motivo de entrada: ${entryReason}` : "",
    ...timelineEvents.map((event, index) => `Acontecimento ${index + 1}: ${event}`),
    ...choices.map((choice) => `Escolha sob tensao: ${choice}`),
    freeReport ? `Relato livre: ${freeReport}` : "",
  ].filter(Boolean).join("\n");

  const extraction = extractMemoryCandidates({
    userText: sourceText,
    personaId: "Onboarding V2",
    memoryScope: "Onboarding V2",
    sourceReference: "onboarding-v2-local",
  });

  const candidates = extraction.candidates.map((candidate) => ({
    ...candidate,
    sourceType: "onboarding" as const,
    scopeType: input.personaAccess && input.personaAccess.length > 0 ? "AUTHORIZED_PERSONAS" as const : candidate.scopeType,
    authorizedPersonas: input.personaAccess || null,
    createdBy: "onboarding-v2",
    requiresConfirmation: true,
    shouldPersistAutomatically: false as const,
  }));

  const completedSteps = [
    entryReason,
    timelineEvents.length > 0,
    choices.length > 0,
    freeReport,
    imports.some((item) => item.authorized),
  ].filter(Boolean).length;

  return {
    progress: {
      completedSteps,
      totalSteps: onboardingV2Steps.length,
      skippedAllowed: true,
    },
    understoodSoFar: [
      entryReason ? `Motivo declarado: ${entryReason}` : "",
      timelineEvents.length > 0 ? `Linha do tempo inicial com ${timelineEvents.length} acontecimento(s).` : "",
      choices.length > 0 ? `Tensoes mapeadas: ${choices.length}.` : "",
      freeReport ? "Ha um relato livre para revisao do usuario." : "",
      imports.some((item) => item.authorized) ? `Importacoes autorizadas: ${imports.filter((item) => item.authorized).length}.` : "",
    ].filter(Boolean),
    candidates,
    reviewActions: ["confirm", "correct", "reject", "delete", "limit-personas"],
    warnings: Array.from(new Set([...warnings, ...extraction.findingCodes.filter((code) => code !== "NO_MEMORY_CANDIDATE")])),
  };
}
