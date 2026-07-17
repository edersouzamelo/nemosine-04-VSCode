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

/**
 * Keeps the strict initiative evaluator for substantive turns, but prevents it
 * from turning greetings and recovery clicks into dead-end failure cards.
 * Integrity/privacy findings remain blocking in every case.
 */
export function evaluatePersonaInitiativeQuality(
  input: PersonaInitiativeQualityInput,
): PersonaInitiativeQualityEvaluation {
  const evaluation = evaluateStrictPersonaInitiativeQuality(input);
  if (evaluation.finalPass) return evaluation;

  const hasDeliveryBlocker = evaluation.findings.some((finding) =>
    finding.severity === "critical" || deliveryBlockingCodes.has(finding.code),
  );

  if (
    isConversationalOpening(input)
    && hasSafeUsableText(input.responseText)
    && !hasDeliveryBlocker
  ) {
    return {
      ...evaluation,
      initiativeScore: Math.max(0.64, evaluation.initiativeScore),
      findings: evaluation.findings.map((finding) =>
        finding.severity === "error" ? { ...finding, severity: "warning" as const } : finding,
      ),
      finalPass: true,
    };
  }

  return evaluation;
}
