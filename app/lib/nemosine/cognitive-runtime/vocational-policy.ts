import { getPersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import {
  CognitiveFinding,
  CognitiveRequest,
  ExtractionResult,
  VocationalEvaluation,
} from "./types";

type PersonaVocationalMetadata = {
  allowedTaskFamilies: string[];
  allowedOperations: string[];
  forbiddenTaskFamilies: string[];
  forbiddenOperations: string[];
  highConfidenceHandoffTargets: string[];
  requiredValidators: string[];
  highRiskCapabilities: string[];
  refusalBehavior: "persona-voice-refusal" | "handoff" | "warn-and-answer";
};

const familyDefaults: Record<string, PersonaVocationalMetadata> = {
  strategic: {
    allowedTaskFamilies: ["strategy", "planning", "risk", "decision", "legal-organization", "financial-organization"],
    allowedOperations: ["plan", "advise", "decide", "organize", "confront", "understand"],
    forbiddenTaskFamilies: ["medical-diagnosis", "erotic-confession"],
    forbiddenOperations: ["diagnose"],
    highConfidenceHandoffTargets: ["Estrategista", "Advogado", "Mordomo"],
    requiredValidators: ["scientist", "philosopher", "vigia"],
    highRiskCapabilities: ["legal", "financial", "irreversible-action"],
    refusalBehavior: "persona-voice-refusal",
  },
  operational: {
    allowedTaskFamilies: ["implementation", "debugging", "process", "technical", "routine", "health-organization"],
    allowedOperations: ["organize", "diagnose-system", "implement", "plan", "understand"],
    forbiddenTaskFamilies: ["legal-opinion", "medical-diagnosis"],
    forbiddenOperations: ["medical-diagnose", "legal-opinion"],
    highConfidenceHandoffTargets: ["Engenheiro", "Cientista", "Mordomo", "Medico"],
    requiredValidators: ["scientist", "vigia"],
    highRiskCapabilities: ["security", "medical", "irreversible-action"],
    refusalBehavior: "warn-and-answer",
  },
  symbolic: {
    allowedTaskFamilies: ["narrative", "symbolic", "creative", "meaning", "humor"],
    allowedOperations: ["narrate", "understand", "create", "reflect", "forecast", "converse"],
    forbiddenTaskFamilies: ["medical-diagnosis", "legal-opinion", "financial-advice"],
    forbiddenOperations: ["medical-diagnose", "legal-opinion", "financial-prescribe"],
    highConfidenceHandoffTargets: ["Narrador", "Artista", "Filosofo", "Bobo da Corte"],
    requiredValidators: ["philosopher", "vigia"],
    highRiskCapabilities: ["manipulation", "dependency"],
    refusalBehavior: "persona-voice-refusal",
  },
  emotional: {
    allowedTaskFamilies: ["emotion", "relationship", "reflection", "confession", "self-observation"],
    allowedOperations: ["understand", "reflect", "advise", "converse", "organize"],
    forbiddenTaskFamilies: ["medical-diagnosis", "legal-opinion", "financial-advice"],
    forbiddenOperations: ["medical-diagnose", "legal-opinion", "financial-prescribe"],
    highConfidenceHandoffTargets: ["Psicologo", "Terapeuta", "Confessor 2.0"],
    requiredValidators: ["philosopher", "privacy", "vigia"],
    highRiskCapabilities: ["mental-health", "sensitive-data"],
    refusalBehavior: "persona-voice-refusal",
  },
};

const personaOverrides: Record<string, Partial<PersonaVocationalMetadata>> = {
  advogado: {
    allowedTaskFamilies: ["legal-organization", "risk", "argument", "document-review"],
    allowedOperations: ["organize", "advise", "argue", "review", "understand"],
    forbiddenTaskFamilies: ["medical-diagnosis", "financial-advice"],
    forbiddenOperations: ["medical-diagnose", "financial-prescribe"],
    highRiskCapabilities: ["legal"],
  },
  medico: {
    allowedTaskFamilies: ["health-organization", "symptom-organization", "risk-triage"],
    allowedOperations: ["organize", "risk-triage", "understand"],
    forbiddenTaskFamilies: ["medical-diagnosis", "prescription"],
    forbiddenOperations: ["prescribe"],
    highRiskCapabilities: ["medical"],
  },
  cientista: {
    allowedTaskFamilies: ["evidence", "experiment", "falsification", "technical", "research"],
    allowedOperations: ["understand", "test", "research", "diagnose-system", "organize"],
    forbiddenTaskFamilies: ["therapy", "legal-opinion", "medical-diagnosis"],
    forbiddenOperations: ["therapy", "legal-opinion", "medical-diagnose"],
  },
  engenheiro: {
    allowedTaskFamilies: ["implementation", "debugging", "architecture", "process", "technical"],
    allowedOperations: ["implement", "diagnose-system", "organize", "plan"],
    forbiddenTaskFamilies: ["therapy", "legal-opinion", "medical-diagnosis"],
    forbiddenOperations: ["therapy", "legal-opinion", "medical-diagnose"],
  },
  confessor: {
    allowedTaskFamilies: ["confession", "emotion", "private-memory", "self-observation"],
    allowedOperations: ["understand", "reflect", "converse"],
    forbiddenTaskFamilies: ["public-summary", "export-private-content"],
    forbiddenOperations: ["public-summary", "export-private-content"],
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
    allowedOperations: override.allowedOperations || defaults.allowedOperations,
    forbiddenTaskFamilies: override.forbiddenTaskFamilies || defaults.forbiddenTaskFamilies,
    forbiddenOperations: override.forbiddenOperations || defaults.forbiddenOperations,
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

export function classifySubjectDomains(text: string) {
  const normalized = normalize(text);
  const domains: string[] = [];
  if (/\b(trabalho|profissional|chefe|equipe|carreira|empresa)\b/.test(normalized)) domains.push("work");
  if (/\b(casamento|conjugal|conjugais|esposa|marido|relacao|familia)\b/.test(normalized)) domains.push("relationship");
  if (/\b(estresse|ansiedade|sentimento|medo|dor emocional|reajo)\b/.test(normalized)) domains.push("emotion");
  if (/\b(sintoma|saude|exame|remedio|medico|diagnostico)\b/.test(normalized)) domains.push("health");
  if (/\b(jogo|time|argentina|espanha|placar|futebol|esporte)\b/.test(normalized)) domains.push("sport");
  if (/\b(codigo|bug|api|deploy|build|banco|sistema)\b/.test(normalized)) domains.push("technology");
  return Array.from(new Set(domains.length > 0 ? domains : ["general"]));
}

export function classifyRequestedOperations(input: string | {
  pureUserText: string;
  presenceObjective?: string | null;
  principalQuestion?: string | null;
}) {
  const text = typeof input === "string" ? input : input.pureUserText;
  const explicitObjective = typeof input === "string" ? "" : [input.presenceObjective || "", input.principalQuestion || ""].join(" ");
  const normalized = normalize([explicitObjective, text].join(" "));
  const normalizedTextOnly = normalize(text);
  const operations: string[] = [];
  if (/\b(desabafar|desabafo|so quero falar|s[oó] quero falar|quero falar do que aconteceu|preciso falar)\b/.test(normalized)) {
    operations.push("converse", "reflect");
    return Array.from(new Set(operations));
  }
  if (/\b(narrar|narrativa|reconstruir|historia|sequencia|como .* chegou|relato|contei|vivi)\b/.test(normalized)) operations.push("narrate");
  if (/\b(compreender|entender|sentido|conversar livremente|conversa livre|o que estou vivendo|por que reajo|padroes emocionais)\b/.test(normalized)) operations.push("understand", "reflect");
  if (/\b(plano|planejar|montar|estrategia|prioridade|proximo passo)\b/.test(normalized)) operations.push("plan");
  if (/\b(aconselhar|conselho|orientar|como conversar|como falar)\b/.test(normalized)) operations.push("advise");
  if (/\b(diagnostico|diagnosticar|qual doenca|remedio|dose|prescrever)\b/.test(normalized)) operations.push("medical-diagnose");
  if (/\b(organizar|estruturar|mapear|ordenar)\b/.test(normalized)) operations.push("organize");
  if (/\b(confrontar|cobrar|enfrentar|pressionar)\b/.test(normalized)) operations.push("confront");
  if (/\b(prever|previsao|palpite|quem ganha|cenario provavel|projetar)\b/.test(normalized)) operations.push("forecast");
  if (/\b(criar|escrever|inventar|desenhar|compor)\b/.test(normalized)) operations.push("create");
  if (/\b(decidir|escolher|decisao)\b/.test(normalized)) operations.push("decide");
  if (/\b(parecer juridico|opinia[oã] juridica|legalmente|processo)\b/.test(normalized)) operations.push("legal-opinion");
  if (/\b(debugar|corrigir|implementar|diagnosticar sistema)\b/.test(normalizedTextOnly)
    || /\b(ajude|preciso|quero|vamos|pode)\s+(a\s+)?(corrigir|debugar|implementar|programar|mexer no codigo|resolver o deploy)\b/.test(normalizedTextOnly)
  ) operations.push("diagnose-system", "implement");
  return Array.from(new Set(operations.length > 0 ? operations : ["converse"]));
}

function preferredNarrativeHandoff(input: CognitiveRequest) {
  const persona = normalize(input.personaId);
  const text = normalize(input.userText);
  return persona === "vidente"
    && /\b(reconstru|acontec|sequencia|o que aconteceu|relato|historia|narrar|narrativa)\b/.test(text);
}

function targetsForIncompatibility(input: {
  forbidden: string[];
  forbiddenOperations: string[];
  fallbackTargets: string[];
}) {
  const combined = [...input.forbidden, ...input.forbiddenOperations];
  const targets: string[] = [];
  if (combined.some((item) => /medical|diagnos|prescription|prescribe/.test(item))) targets.push("Medico");
  if (combined.some((item) => /legal|juridic/.test(item))) targets.push("Advogado");
  if (combined.some((item) => /financial|finance/.test(item))) targets.push("Mordomo");
  if (combined.some((item) => /technical|implementation|debug/.test(item))) targets.push("Engenheiro");
  return Array.from(new Set([...targets, ...input.fallbackTargets]));
}

export function evaluateVocationalPolicy(input: {
  request: CognitiveRequest;
  extraction: ExtractionResult;
}): VocationalEvaluation {
  const metadata = getVocationalMetadata(input.request.personaId);
  const classifiedTaskFamilies = classifyTaskFamilies(input.request.userText);
  const subjectDomains = classifySubjectDomains(input.request.userText);
  const requestedOperations = classifyRequestedOperations(input.request.userText);
  const findingTexts = input.extraction.possibleVocationConflicts;
  const findings: CognitiveFinding[] = findingTexts.map((text, index) => ({
    code: `VOCATION_EXTRACTOR_CONCERN_${index + 1}`,
    severity: "warning",
    category: "vocation",
    explanation: text,
    repairInstruction: "Answer within the active persona vocation or recommend a handoff.",
  }));

  const forbidden = classifiedTaskFamilies.filter((family) => metadata.forbiddenTaskFamilies.includes(family));
  const forbiddenOperations = requestedOperations.filter((operation) => metadata.forbiddenOperations.includes(operation));
  const allowedOperation = requestedOperations.some((operation) => metadata.allowedOperations.includes(operation));
  const allowedSubject = classifiedTaskFamilies.some((family) => metadata.allowedTaskFamilies.includes(family));
  const narrativeHandoff = preferredNarrativeHandoff(input.request);
  const currentPersonaFit: VocationalEvaluation["currentPersonaFit"] = forbidden.length > 0 || forbiddenOperations.length > 0
    ? "incompatible"
    : allowedOperation
      ? "primary"
      : allowedSubject
        ? "valid"
        : "partial";

  if (forbidden.length > 0 || forbiddenOperations.length > 0) {
    findings.push({
      code: "VOCATION_FORBIDDEN_TASK_FAMILY",
      severity: "error",
      category: "vocation",
      explanation: `Task operation is outside this persona vocation: ${[...forbidden, ...forbiddenOperations].join(", ")}.`,
      repairInstruction: "The active persona must refuse elegantly in its own voice or recommend a better persona.",
    });
  } else if (narrativeHandoff && input.request.personaId !== "Narrador") {
    findings.push({
      code: "VOCATION_NARRATOR_BETTER_FIT",
      severity: "warning",
      category: "vocation",
      explanation: "The request asks for reconstruction of events, sequence or narrative form; Narrador is the higher-confidence persona.",
      repairInstruction: "Offer a first-person handoff to Narrador while preserving the active persona voice.",
    });
  } else if (currentPersonaFit === "partial" && classifiedTaskFamilies[0] !== "general") {
    findings.push({
      code: "VOCATION_SECONDARY_FIT",
      severity: "warning",
      category: "vocation_audit",
      explanation: "The subject is secondary to this persona, but the requested operation can still be answered without blocking.",
      repairInstruction: "Proceed through the active persona operation; do not create recovery or handoff from this finding alone.",
    });
  }

  const hardPass = !findings.some((finding) => finding.severity === "error" || finding.severity === "critical");
  const decision: VocationalEvaluation["decision"] = currentPersonaFit === "incompatible"
    ? "refusal_required"
    : findings.length > 0 ? "warning" : "allowed";
  const handoffTargets = currentPersonaFit === "incompatible"
    ? targetsForIncompatibility({ forbidden, forbiddenOperations, fallbackTargets: metadata.highConfidenceHandoffTargets })
    : narrativeHandoff
    ? ["Narrador", ...metadata.highConfidenceHandoffTargets.filter((target) => target !== "Narrador")]
    : metadata.highConfidenceHandoffTargets;
  const safeTargets = handoffTargets.filter((target) => normalize(target) !== normalize(input.request.personaId));

  return {
    decision,
    personaId: input.request.personaId,
    classifiedTaskFamilies,
    subjectDomains,
    requestedOperations,
    currentPersonaFit,
    handoffTrigger: currentPersonaFit === "incompatible" ? "incompatible_operation" : null,
    handoffTargets: currentPersonaFit === "incompatible" ? safeTargets : [],
    hardPass,
    findings,
  };
}
