import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";
import { isConfessorLikeScope } from "./privacy";
import type {
  MemoryCandidate,
  MemoryCandidateExtractionResult,
  UserProfileEpistemicType,
  UserProfileSensitivity,
} from "./types";

function compact(value: string, maxLength = 420) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const secretPatterns = [
  /\bsk-[a-z0-9_-]{12,}/i,
  /\b(api[_-]?key|token|secret|senha|password|private key)\b/i,
  /\b[A-Za-z0-9+/]{32,}={0,2}\b/,
];

const speculativePatterns = [
  /\b(talvez|acho que|imagino que|se eu|se fosse|hipotese|hipotese|supondo|pode ser)\b/i,
];

const humorPatterns = [
  /\b(brincadeira|zoeira|ironia|sarcasmo|kkk|haha|rsrs)\b/i,
];

const sensitivePatterns = [
  /\b(saude|sintoma|diagnostico|medicacao|remedio|sexo|sexual|religiao|politica|processo|advogado|juridico)\b/i,
];

type CandidateRule = {
  pattern: RegExp;
  category: string;
  epistemicType: UserProfileEpistemicType;
  sourceLabel: string;
};

const rules: CandidateRule[] = [
  { pattern: /\b(meu objetivo|minha meta|quero conseguir|preciso terminar|pretendo)\b/i, category: "goal", epistemicType: "GOAL", sourceLabel: "goal-declaration" },
  { pattern: /\b(meu projeto|estou construindo|estou trabalhando em|o projeto)\b/i, category: "project", epistemicType: "PROJECT", sourceLabel: "project-declaration" },
  { pattern: /\b(prefiro|nao gosto|não gosto|gosto de|me incomoda|funciona melhor para mim)\b/i, category: "preference", epistemicType: "USER_PREFERENCE", sourceLabel: "preference-declaration" },
  { pattern: /\b(valorizo|para mim e importante|meus valores|nao abro mao|não abro mão)\b/i, category: "value", epistemicType: "VALUE", sourceLabel: "value-declaration" },
  { pattern: /\b(sou|moro|trabalho como|trabalho com|tenho|minha familia|meu filho|minha filha)\b/i, category: "declared_fact", epistemicType: "DECLARED_FACT", sourceLabel: "declared-fact" },
  { pattern: /\b(nao posso|não posso|tenho que|limite|restricao|restrição|prazo|sem tempo|sem dinheiro)\b/i, category: "constraint", epistemicType: "CONSTRAINT", sourceLabel: "constraint-declaration" },
  { pattern: /\b(tenho repetido|sempre acabo|costumo|voltei a fazer|padrao|padrão)\b/i, category: "pattern", epistemicType: "OBSERVED_BEHAVIOR", sourceLabel: "self-observed-pattern" },
  { pattern: /\b(relacao com|relação com|minha esposa|meu marido|minha mae|minha mãe|meu pai|cliente|socio|sócio)\b/i, category: "relationship", epistemicType: "RELATIONSHIP", sourceLabel: "relationship-declaration" },
];

function classifyCandidate(text: string): CandidateRule | null {
  return rules.find((rule) => rule.pattern.test(text)) || null;
}

function sensitivityFor(text: string, memoryScope: string): UserProfileSensitivity {
  if (isConfessorLikeScope(memoryScope)) return "CONFESSOR_ONLY";
  if (sensitivePatterns.some((pattern) => pattern.test(text))) return "SENSITIVE";
  if (/\b(familia|filho|filha|relacao|relacionamento|dinheiro|divida)\b/i.test(text)) return "PERSONAL";
  return "NORMAL";
}

function epistemicTypeFor(rule: CandidateRule, text: string): UserProfileEpistemicType {
  if (speculativePatterns.some((pattern) => pattern.test(text))) return "HYPOTHESIS";
  if (rule.epistemicType === "OBSERVED_BEHAVIOR") return "OBSERVED_BEHAVIOR";
  return rule.epistemicType;
}

export function extractMemoryCandidates(input: {
  userText: string;
  personaId: string;
  memoryScope: string;
  sourceId?: string | null;
  sourceReference?: string | null;
}): MemoryCandidateExtractionResult {
  const raw = input.userText || "";
  const text = compact(raw, 1200);
  const findingCodes: string[] = [];

  if (!text) {
    return { candidates: [], skipped: true, skipReason: "empty-input", findingCodes: ["EMPTY_INPUT"] };
  }

  if (isConfessorLikeScope(input.memoryScope) || isConfessorLikeScope(input.personaId)) {
    return { candidates: [], skipped: true, skipReason: "confessor-scope", findingCodes: ["CONFESSOR_SCOPE_SKIPPED"] };
  }

  if (secretPatterns.some((pattern) => pattern.test(text))) {
    return { candidates: [], skipped: true, skipReason: "secret-like-input", findingCodes: ["SECRET_PATTERN_SKIPPED"] };
  }

  const rule = classifyCandidate(text);
  if (!rule) {
    return { candidates: [], skipped: false, findingCodes: ["NO_MEMORY_CANDIDATE"] };
  }

  const hasHumor = humorPatterns.some((pattern) => pattern.test(text));
  const epistemicType = hasHumor ? "HYPOTHESIS" : epistemicTypeFor(rule, text);
  const sensitivity = sensitivityFor(text, input.memoryScope);
  if (sensitivity === "SENSITIVE") findingCodes.push("SENSITIVE_CANDIDATE_REQUIRES_CONFIRMATION");
  if (epistemicType === "HYPOTHESIS") findingCodes.push("HYPOTHESIS_NOT_FACT");
  if (hasHumor) findingCodes.push("HUMOR_OR_IRONY_DOWNGRADED");

  const confidence = epistemicType === "HYPOTHESIS"
    ? 0.35
    : sensitivity === "SENSITIVE"
      ? 0.45
      : 0.72;

  const candidate: MemoryCandidate = {
    normalizedContent: text,
    shortSummary: compact(text, 180),
    category: rule.category,
    subtype: rule.sourceLabel,
    epistemicType,
    sourceType: "conversation",
    sourceReference: input.sourceReference || input.sourceId || null,
    sourceDate: new Date().toISOString(),
    confidence,
    sensitivity,
    scopeType: sensitivity === "CONFESSOR_ONLY" ? "CONFESSOR" : "GLOBAL",
    authorizedPersonas: null,
    status: "CANDIDATE",
    validFrom: null,
    validUntil: null,
    createdBy: "memory-extractor-shadow",
    evidence: [{
      sourceType: "conversation",
      sourceId: input.sourceId || null,
      redactedSummary: compact(text, 220),
      contentHash: hashText(text),
      evidenceWeight: confidence,
      evidenceDate: new Date().toISOString(),
      origin: input.personaId,
      allowedAccess: sensitivity === "CONFESSOR_ONLY" ? ["Confessor 2.0"] : ["metadata", "authorized-personas"],
    }],
    riskOfError: epistemicType === "HYPOTHESIS" || hasHumor ? "high" : sensitivity === "SENSITIVE" ? "medium" : "low",
    requiresConfirmation: true,
    conflictPossible: /\b(agora|antes|nao mais|não mais|mudei|atualizou|troquei)\b/i.test(text),
    shouldPersistAutomatically: false,
  };

  return {
    candidates: [candidate],
    skipped: false,
    findingCodes: Array.from(new Set(findingCodes)),
  };
}
