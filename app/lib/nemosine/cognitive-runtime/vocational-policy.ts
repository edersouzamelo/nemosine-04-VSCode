import { getPersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import {
  CognitiveFinding,
  CognitiveRequest,
  ExtractionResult,
  VocationalEvaluation,
} from "./types";

type PersonaVocationalMetadata = {
  allowedTaskFamilies: string[];
  forbiddenTaskFamilies: string[];
  highConfidenceHandoffTargets: string[];
  requiredValidators: string[];
  highRiskCapabilities: string[];
  refusalBehavior: "persona-voice-refusal" | "handoff" | "warn-and-answer";
};

const familyDefaults: Record<string, PersonaVocationalMetadata> = {
  strategic: {
    allowedTaskFamilies: ["strategy", "planning", "risk", "decision", "legal-organization", "financial-organization"],
    forbiddenTaskFamilies: ["medical-diagnosis", "erotic-confession"],
    highConfidenceHandoffTargets: ["Estrategista", "Advogado", "Mordomo"],
    requiredValidators: ["scientist", "philosopher", "vigia"],
    highRiskCapabilities: ["legal", "financial", "irreversible-action"],
    refusalBehavior: "persona-voice-refusal",
  },
  operational: {
    allowedTaskFamilies: ["implementation", "debugging", "process", "technical", "routine", "health-organization"],
    forbiddenTaskFamilies: ["legal-opinion", "medical-diagnosis"],
    highConfidenceHandoffTargets: ["Engenheiro", "Cientista", "Mordomo", "Medico"],
    requiredValidators: ["scientist", "vigia"],
    highRiskCapabilities: ["security", "medical", "irreversible-action"],
    refusalBehavior: "warn-and-answer",
  },
  symbolic: {
    allowedTaskFamilies: ["narrative", "symbolic", "creative", "meaning", "humor"],
    forbiddenTaskFamilies: ["medical-diagnosis", "legal-opinion", "financial-advice"],
    highConfidenceHandoffTargets: ["Narrador", "Artista", "Filosofo", "Bobo da Corte"],
    requiredValidators: ["philosopher", "vigia"],
    highRiskCapabilities: ["manipulation", "dependency"],
    refusalBehavior: "persona-voice-refusal",
  },
  emotional: {
    allowedTaskFamilies: ["emotion", "relationship", "reflection", "confession", "self-observation"],
    forbiddenTaskFamilies: ["medical-diagnosis", "legal-opinion", "financial-advice"],
    highConfidenceHandoffTargets: ["Psicologo", "Terapeuta", "Confessor 2.0"],
    requiredValidators: ["philosopher", "privacy", "vigia"],
    highRiskCapabilities: ["mental-health", "sensitive-data"],
    refusalBehavior: "persona-voice-refusal",
  },
};

const personaOverrides: Record<string, Partial<PersonaVocationalMetadata>> = {
  advogado: {
    allowedTaskFamilies: ["legal-organization", "risk", "argument", "document-review"],
    forbiddenTaskFamilies: ["medical-diagnosis", "financial-advice"],
    highRiskCapabilities: ["legal"],
  },
  medico: {
    allowedTaskFamilies: ["health-organization", "symptom-organization", "risk-triage"],
    forbiddenTaskFamilies: ["medical-diagnosis", "prescription"],
    highRiskCapabilities: ["medical"],
  },
  cientista: {
    allowedTaskFamilies: ["evidence", "experiment", "falsification", "technical", "research"],
    forbiddenTaskFamilies: ["therapy", "legal-opinion", "medical-diagnosis"],
  },
  engenheiro: {
    allowedTaskFamilies: ["implementation", "debugging", "architecture", "process", "technical"],
    forbiddenTaskFamilies: ["therapy", "legal-opinion", "medical-diagnosis"],
  },
  confessor: {
    allowedTaskFamilies: ["confession", "emotion", "private-memory", "self-observation"],
    forbiddenTaskFamilies: ["public-summary", "export-private-content"],
    highRiskCapabilities: ["sensitive-data", "private-memory"],
  },
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getVocationalMetadata(personaId: string): PersonaVocationalMetadata {
  const contract = getPersonaBehaviorContract(personaId);
  const defaults = familyDefaults[contract.family] || familyDefaults.symbolic;
  const override = personaOverrides[normalize(personaId)] || {};

  return {
    ...defaults,
    ...override,
    allowedTaskFamilies: override.allowedTaskFamilies || defaults.allowedTaskFamilies,
    forbiddenTaskFamilies: override.forbiddenTaskFamilies || defaults.forbiddenTaskFamilies,
    highConfidenceHandoffTargets: override.highConfidenceHandoffTargets || defaults.highConfidenceHandoffTargets,
    requiredValidators: override.requiredValidators || defaults.requiredValidators,
    highRiskCapabilities: override.highRiskCapabilities || defaults.highRiskCapabilities,
  };
}

export function classifyTaskFamilies(text: string) {
  const normalized = normalize(text);
  const families: string[] = [];

  if (/\b(codigo|bug|erro|api|build|deploy|arquitetura|sistema|banco)\b/.test(normalized)) families.push("technical", "implementation");
  if (/\b(estrategia|plano|prioridade|risco|decisao|prazo)\b/.test(normalized)) families.push("strategy", "planning");
  if (/\b(contrato|processo|lei|juridico|advogado)\b/.test(normalized)) families.push("legal-opinion");
  if (/\b(sintoma|diagnostico|remedio|dose|exame|medico)\b/.test(normalized)) families.push("medical-diagnosis");
  if (/\b(investimento|dinheiro|financeiro|imposto|divida)\b/.test(normalized)) families.push("financial-advice");
  if (/\b(ansiedade|dor|relacao|sentimento|familia|terapia|confessar)\b/.test(normalized)) families.push("emotion", "reflection");
  if (/\b(historia|narrativa|imagem|simbolo|humor|piada)\b/.test(normalized)) families.push("narrative", "symbolic");

  return Array.from(new Set(families.length > 0 ? families : ["general"]));
}

function preferredNarrativeHandoff(input: CognitiveRequest) {
  const persona = normalize(input.personaId);
  const text = normalize(input.userText);
  return persona === "vidente"
    && /\b(reconstru|acontec|sequencia|o que aconteceu|relato|historia|narrar|narrativa)\b/.test(text);
}

export function evaluateVocationalPolicy(input: {
  request: CognitiveRequest;
  extraction: ExtractionResult;
}): VocationalEvaluation {
  const metadata = getVocationalMetadata(input.request.personaId);
  const classifiedTaskFamilies = classifyTaskFamilies(input.request.userText);
  const findingTexts = input.extraction.possibleVocationConflicts;
  const findings: CognitiveFinding[] = findingTexts.map((text, index) => ({
    code: `VOCATION_EXTRACTOR_CONCERN_${index + 1}`,
    severity: "warning",
    category: "vocation",
    explanation: text,
    repairInstruction: "Answer within the active persona vocation or recommend a handoff.",
  }));

  const forbidden = classifiedTaskFamilies.filter((family) => metadata.forbiddenTaskFamilies.includes(family));
  const allowed = classifiedTaskFamilies.some((family) => metadata.allowedTaskFamilies.includes(family));
  const narrativeHandoff = preferredNarrativeHandoff(input.request);

  if (forbidden.length > 0) {
    findings.push({
      code: "VOCATION_FORBIDDEN_TASK_FAMILY",
      severity: "error",
      category: "vocation",
      explanation: `Task family is outside this persona vocation: ${forbidden.join(", ")}.`,
      repairInstruction: "The active persona must refuse elegantly in its own voice or recommend a better persona.",
    });
  } else if (narrativeHandoff) {
    findings.push({
      code: "VOCATION_NARRATOR_BETTER_FIT",
      severity: "warning",
      category: "vocation",
      explanation: "The request asks for reconstruction of events, sequence or narrative form; Narrador is the higher-confidence persona.",
      repairInstruction: "Offer a first-person handoff to Narrador while preserving the active persona voice.",
    });
  } else if (!allowed && classifiedTaskFamilies[0] !== "general") {
    findings.push({
      code: "VOCATION_LOW_CONFIDENCE_MATCH",
      severity: "warning",
      category: "vocation",
      explanation: "The request does not strongly match this persona vocation.",
      repairInstruction: "Proceed with a vocational warning or recommend a handoff while preserving persona voice.",
    });
  }

  const hardPass = !findings.some((finding) => finding.severity === "error" || finding.severity === "critical");
  const decision: VocationalEvaluation["decision"] = forbidden.length > 0
    ? "refusal_required"
    : narrativeHandoff || (!allowed && classifiedTaskFamilies[0] !== "general")
      ? "handoff_recommended"
      : findings.length > 0
        ? "warning"
        : "allowed";
  const handoffTargets = narrativeHandoff
    ? ["Narrador", ...metadata.highConfidenceHandoffTargets.filter((target) => target !== "Narrador")]
    : metadata.highConfidenceHandoffTargets;

  return {
    decision,
    personaId: input.request.personaId,
    classifiedTaskFamilies,
    handoffTargets: decision === "allowed" ? [] : handoffTargets,
    hardPass,
    findings,
  };
}
