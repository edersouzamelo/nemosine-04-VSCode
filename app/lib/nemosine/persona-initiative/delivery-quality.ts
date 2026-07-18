import type { PersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import { normalizeInitiativeText } from "./input-richness";
import { evaluatePersonaInitiativeQuality as evaluateStrictPersonaInitiativeQuality } from "./response-quality";
import type {
  ActiveFrontSnapshot,
  ConversationInputRichness,
  PersonaInitiativeBrief,
  PersonaInitiativeQualityEvaluation,
} from "./types";

type PersonaInitiativeQualityInput = {
  responseText: string;
  personaId: string;
  userText: string;
  richness: ConversationInputRichness;
  snapshot: ActiveFrontSnapshot;
  contract: PersonaBehaviorContract;
  brief?: PersonaInitiativeBrief;
  privateRun?: boolean;
  recentAssistantTexts?: string[];
};

const conversationalRecoveryPatterns = [
  /^vamos\s+continuar(?:\s+a\s+conversa)?[.!?]*$/,
  /^pode\s+continuar[.!?]*$/,
  /^tenta\s+de\s+novo[.!?]*$/,
  /^tente\s+novamente[.!?]*$/,
  /^responda\s+de\s+novo[.!?]*$/,
  /^fala\s+comigo[.!?]*$/,
];

const deliveryBlockingCodes = new Set([
  "UNSUPPORTED_BIOGRAPHICAL_ASSERTION",
  "PRIVATE_CONTEXT_LEAK",
  "INTERNAL_CONTROL_LEAK",
  "FALSE_CONTEXT_DENIAL",
  "GENERIC_ASSISTANT_MODE",
  "GENERIC_INTERVIEW_MODE",
  "INTERROGATIVE_ELICITATION",
  "PASSIVE_CONTEXT_WITHHOLDING",
  "SELF_DESCRIPTION_INSTEAD_OF_ACTION",
  "GENERIC_CLOSING",
  "REPETITIVE_LOOP",
]);

function isConversationalOpening(input: PersonaInitiativeQualityInput) {
  const normalizedUserText = normalizeInitiativeText(input.userText || "");
  return ["greeting", "return", "continuation", "reaction"].includes(input.richness.openingType)
    || conversationalRecoveryPatterns.some((pattern) => pattern.test(normalizedUserText));
}

function hasSafeUsableText(text: string) {
  const normalized = normalizeInitiativeText(text || "");
  if (normalized.length < 8) return false;
  return !/^nao foi possivel formular uma resposta adequada/.test(normalized)
    && !/^o sistema esta instavel/.test(normalized);
}

function canDegradeToDelivery(input: PersonaInitiativeQualityInput, evaluation: PersonaInitiativeQualityEvaluation) {
  if (!hasSafeUsableText(input.responseText)) return false;
  const hasDeliveryBlocker = evaluation.findings.some((finding) =>
    finding.severity === "critical" || deliveryBlockingCodes.has(finding.code),
  );
  if (hasDeliveryBlocker) return false;

  if (isConversationalOpening(input)) return true;

  // A quality gate may request another generation, but it must not erase a
  // coherent, safe answer after repair attempts. Substantive candidates remain
  // deliverable while their quality findings are preserved as warnings/audit.
  return input.responseText.trim().length >= 40;
}

/**
 * The strict evaluator remains the source of quality findings. This wrapper
 * changes only the delivery consequence: safe conversational or substantive
 * prose is delivered instead of becoming a dead-end failure card. Privacy,
 * invented biography, internal-control leaks and false context denial remain
 * hard blockers.
 */
export function evaluatePersonaInitiativeQuality(
  input: PersonaInitiativeQualityInput,
): PersonaInitiativeQualityEvaluation {
  const evaluation = evaluateStrictPersonaInitiativeQuality(input);
  if (evaluation.finalPass || !canDegradeToDelivery(input, evaluation)) return evaluation;

  return {
    ...evaluation,
    initiativeScore: Math.max(0.64, evaluation.initiativeScore),
    findings: evaluation.findings.map((finding) =>
      finding.severity === "error" ? { ...finding, severity: "warning" as const } : finding,
    ),
    finalPass: true,
  };
}
