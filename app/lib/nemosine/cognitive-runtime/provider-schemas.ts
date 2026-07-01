import { z } from "zod";
import {
  extractionResultSchema,
  findingSeverities,
  philosopherEvaluationSchema,
  scientistEvaluationSchema,
} from "./types";

export const extractionProviderSchemaId = "nemosine_extraction_v1";
export const scientistProviderSchemaId = "nemosine_scientist_v1";
export const philosopherProviderSchemaId = "nemosine_philosopher_v1";

const scoreSchema = z.number().min(0).max(1);
const requiredString = (max: number) => z.string().max(max);
const nullableString = (max: number) => z.string().max(max).nullable();

const providerFindingSchema = z.object({
  code: requiredString(80),
  severity: z.enum(findingSeverities),
  category: requiredString(80),
  explanation: requiredString(1200),
  affectedExcerpt: nullableString(500),
  claimId: nullableString(80),
  repairInstruction: nullableString(1200),
}).strict();

const providerActionBaseSchema = z.object({
  id: requiredString(80),
  source: z.enum(["structured-extractor"]),
  authorized: z.boolean(),
  authorizationProvenance: z.enum(["unauthorized"]),
  reason: nullableString(500),
}).strict();

const providerMemoryActionSchema = providerActionBaseSchema.extend({
  kind: z.enum(["memory"]),
  scope: requiredString(120),
  content: requiredString(1000),
  memoryType: z.enum(["fact", "episode", "active_theme", "other"]),
}).strict();

const providerRegistryActionSchema = providerActionBaseSchema.extend({
  kind: z.enum(["registry"]),
  idea: requiredString(500),
  deadline: nullableString(10),
  status: requiredString(80),
}).strict();

const providerDestinyActionSchema = providerActionBaseSchema.extend({
  kind: z.enum(["destiny"]),
  title: requiredString(200),
  eventDate: nullableString(10),
  eventDateLabel: nullableString(120),
  category: requiredString(80),
  shortDescription: requiredString(600),
  symbolicIntensity: z.number().int().min(1).max(5).nullable(),
  dominantEmotion: nullableString(80),
}).strict();

export const extractionProviderSchema = z.object({
  claims: z.array(z.object({
    id: requiredString(80),
    type: z.enum(["factual", "inferential", "uncertainty", "access_or_verification"]),
    text: requiredString(1200),
    support: z.enum([
      "current_user_message",
      "authorized_context",
      "inferential",
      "candidate_only",
      "unknown",
      "contradicted",
      "externally_unverifiable",
    ]),
    confidence: scoreSchema,
  }).strict()).max(16),
  proposedMemoryActions: z.array(providerMemoryActionSchema).max(6),
  proposedRegistryActions: z.array(providerRegistryActionSchema).max(6),
  proposedDestinyActions: z.array(providerDestinyActionSchema).max(4),
  possibleVocationConflicts: z.array(requiredString(300)).max(8),
  possiblePrivacyConcerns: z.array(requiredString(300)).max(8),
  legacyTagsRemoved: z.number().int().min(0).max(100),
}).strict();

export const scientistProviderSchema = z.object({
  logicalConsistency: scoreSchema,
  factualSupport: scoreSchema,
  contradictionRisk: scoreSchema,
  honestUncertainty: scoreSchema,
  biographicalSafety: scoreSchema,
  accessClaimSafety: scoreSchema,
  internalConsistency: scoreSchema,
  responseRelevance: scoreSchema,
  externalVerificationAvailable: z.boolean(),
  evidenceSummary: requiredString(1200),
  approved: z.boolean(),
  findings: z.array(providerFindingSchema).max(12),
}).strict();

export const philosopherProviderSchema = z.object({
  constitutionalConformity: scoreSchema,
  userSovereignty: scoreSchema,
  nonIdolatry: scoreSchema,
  ethicalLegitimacy: scoreSchema,
  epistemologicalHumility: scoreSchema,
  vocationIntegrity: scoreSchema,
  manipulationDependencyRisk: scoreSchema,
  approved: z.boolean(),
  findings: z.array(providerFindingSchema).max(12),
}).strict();

export const providerSchemaDescriptors = [
  { id: extractionProviderSchemaId, schema: extractionProviderSchema },
  { id: scientistProviderSchemaId, schema: scientistProviderSchema },
  { id: philosopherProviderSchemaId, schema: philosopherProviderSchema },
] as const;

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNullableString(value: unknown, maxLength: number) {
  const cleaned = cleanString(value, maxLength);
  return cleaned || null;
}

function normalizeDateString(value: unknown) {
  const cleaned = cleanString(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : null;
}

function normalizeProviderFinding(value: z.infer<typeof providerFindingSchema>, index: number) {
  const code = cleanString(value.code, 80) || `STRUCTURED_FINDING_${index}`;
  const category = cleanString(value.category, 80) || "structured-output";
  const explanation = cleanString(value.explanation, 1200) || "Structured evaluator returned a finding without explanatory text.";
  const affectedExcerpt = cleanNullableString(value.affectedExcerpt, 500);
  const claimId = cleanNullableString(value.claimId, 80);
  const repairInstruction = cleanNullableString(value.repairInstruction, 1200);

  return {
    code,
    severity: value.severity,
    category,
    explanation,
    ...(affectedExcerpt ? { affectedExcerpt } : {}),
    ...(claimId ? { claimId } : {}),
    ...(repairInstruction ? { repairInstruction } : {}),
  };
}

export function normalizeProviderExtraction(
  value: z.infer<typeof extractionProviderSchema>,
  memoryScope: string,
) {
  const normalized = {
    claims: value.claims
      .map((claim, index) => ({
        id: cleanString(claim.id, 80) || `claim-${index}`,
        type: claim.type,
        text: cleanString(claim.text, 1200),
        support: claim.support,
        confidence: claim.confidence,
      }))
      .filter((claim) => claim.text.length > 0),
    proposedMemoryActions: value.proposedMemoryActions
      .map((action, index) => ({
        id: cleanString(action.id, 80) || `memory-${index}`,
        kind: "memory" as const,
        source: "structured-extractor" as const,
        authorized: false,
        authorizationProvenance: "unauthorized" as const,
        ...(cleanNullableString(action.reason, 500) ? { reason: cleanNullableString(action.reason, 500) || undefined } : {}),
        scope: cleanString(action.scope, 120) || memoryScope,
        content: cleanString(action.content, 1000),
        memoryType: action.memoryType,
      }))
      .filter((action) => action.content.length > 0),
    proposedRegistryActions: value.proposedRegistryActions
      .map((action, index) => ({
        id: cleanString(action.id, 80) || `registry-${index}`,
        kind: "registry" as const,
        source: "structured-extractor" as const,
        authorized: false,
        authorizationProvenance: "unauthorized" as const,
        ...(cleanNullableString(action.reason, 500) ? { reason: cleanNullableString(action.reason, 500) || undefined } : {}),
        idea: cleanString(action.idea, 500),
        deadline: normalizeDateString(action.deadline),
        status: cleanString(action.status, 80) || "Pendente",
      }))
      .filter((action) => action.idea.length > 0),
    proposedDestinyActions: value.proposedDestinyActions
      .map((action, index) => {
        const title = cleanString(action.title, 200);
        const shortDescription = cleanString(action.shortDescription, 600) || title;
        return {
          id: cleanString(action.id, 80) || `destiny-${index}`,
          kind: "destiny" as const,
          source: "structured-extractor" as const,
          authorized: false,
          authorizationProvenance: "unauthorized" as const,
          ...(cleanNullableString(action.reason, 500) ? { reason: cleanNullableString(action.reason, 500) || undefined } : {}),
          title,
          eventDate: normalizeDateString(action.eventDate),
          eventDateLabel: cleanNullableString(action.eventDateLabel, 120),
          category: cleanString(action.category, 80) || "marco",
          shortDescription,
          symbolicIntensity: action.symbolicIntensity,
          dominantEmotion: cleanNullableString(action.dominantEmotion, 80),
        };
      })
      .filter((action) => action.title.length > 0 && action.shortDescription.length > 0),
    possibleVocationConflicts: value.possibleVocationConflicts.map((item) => cleanString(item, 300)).filter(Boolean),
    possiblePrivacyConcerns: value.possiblePrivacyConcerns.map((item) => cleanString(item, 300)).filter(Boolean),
    legacyTagsRemoved: 0,
  };

  return extractionResultSchema.parse(normalized);
}

export function normalizeProviderScientist(
  value: z.infer<typeof scientistProviderSchema>,
  modelId: string,
) {
  return scientistEvaluationSchema.parse({
    ...value,
    findings: value.findings.map(normalizeProviderFinding),
    modelId,
  });
}

export function normalizeProviderPhilosopher(
  value: z.infer<typeof philosopherProviderSchema>,
  modelId: string,
) {
  return philosopherEvaluationSchema.parse({
    ...value,
    findings: value.findings.map(normalizeProviderFinding),
    modelId,
  });
}
