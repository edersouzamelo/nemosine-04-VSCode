import { getPersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";
import { canProjectUserProfileNode } from "./privacy";
import type { PersonaContextProjection, UserProfileNodeRecord } from "./types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categorySet(values: string[]) {
  return new Set(values.map(normalize));
}

const coreCategories = categorySet([
  "goal",
  "project",
  "constraint",
  "preference",
  "value",
]);

const personaCategoryProfiles: Record<string, Set<string>> = {
  mentor: categorySet([
    "value",
    "goal",
    "project",
    "constraint",
    "decision",
    "pattern",
    "relationship",
    "long_term_direction",
  ]),
  estrategista: categorySet([
    "goal",
    "project",
    "constraint",
    "resource",
    "risk",
    "timeline",
    "decision",
    "execution_pattern",
  ]),
  psicologo: categorySet([
    "emotional_pattern",
    "pattern",
    "relationship",
    "trigger",
    "defense",
    "hypothesis",
    "declared_fact",
  ]),
  medico: categorySet([
    "health",
    "symptom",
    "exam",
    "medication",
    "clinical_context",
    "safety_alert",
  ]),
  inimigo: categorySet([
    "risk",
    "vulnerability",
    "exposure",
    "self_sabotage",
    "constraint",
    "pattern",
    "contradiction",
  ]),
  luz: categorySet([
    "value",
    "aspiration",
    "goal",
    "ethical_choice",
    "courage",
    "resource",
    "project",
  ]),
  sombra: categorySet([
    "contradiction",
    "denial",
    "impulse",
    "shame_pattern",
    "hypothesis",
    "pattern",
    "relationship",
  ]),
};

const epistemicProfiles: Record<string, Set<string>> = {
  mentor: new Set(["DECLARED_FACT", "USER_PREFERENCE", "GOAL", "VALUE", "PROJECT", "CONSTRAINT", "INFERRED_PATTERN", "HYPOTHESIS"]),
  estrategista: new Set(["DECLARED_FACT", "GOAL", "PROJECT", "CONSTRAINT", "OBSERVED_BEHAVIOR", "USER_PREFERENCE"]),
  psicologo: new Set(["DECLARED_FACT", "OBSERVED_BEHAVIOR", "INFERRED_PATTERN", "RELATIONSHIP", "HYPOTHESIS", "VALUE"]),
  medico: new Set(["DECLARED_FACT", "OBSERVED_BEHAVIOR"]),
  inimigo: new Set(["DECLARED_FACT", "OBSERVED_BEHAVIOR", "INFERRED_PATTERN", "CONSTRAINT", "HYPOTHESIS"]),
  luz: new Set(["DECLARED_FACT", "USER_PREFERENCE", "GOAL", "VALUE", "PROJECT", "RELATIONSHIP"]),
  sombra: new Set(["DECLARED_FACT", "OBSERVED_BEHAVIOR", "INFERRED_PATTERN", "HYPOTHESIS", "RELATIONSHIP"]),
};

function personaKey(personaId: string) {
  const normalized = normalize(personaId);
  if (normalized.includes("mentor")) return "mentor";
  if (normalized.includes("estrategista")) return "estrategista";
  if (normalized.includes("psicologo")) return "psicologo";
  if (normalized.includes("medico")) return "medico";
  if (normalized.includes("inimigo")) return "inimigo";
  if (normalized === "luz" || normalized.includes("a luz")) return "luz";
  if (normalized === "sombra" || normalized.includes("a sombra")) return "sombra";
  return normalized;
}

function nodeMatchesCategory(node: UserProfileNodeRecord, allowed: Set<string>) {
  const category = normalize(node.category);
  const subtype = normalize(node.subtype || "");
  return allowed.has(category) || Boolean(subtype && allowed.has(subtype));
}

function nodeMatchesEpistemic(node: UserProfileNodeRecord, persona: string) {
  const allowed = epistemicProfiles[persona];
  if (!allowed) return true;
  return allowed.has(node.epistemicType);
}

function byConfidenceAndFreshness(a: UserProfileNodeRecord, b: UserProfileNodeRecord) {
  if (b.confidence !== a.confidence) return b.confidence - a.confidence;
  const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  return bTime - aTime;
}

function projectionProhibitions(personaId: string) {
  const contract = getPersonaBehaviorContract(personaId);
  return [
    "Nao transformar inferencias em fatos.",
    "Nao usar dados CONFESSOR_ONLY fora do Confessor.",
    "Nao apresentar candidatos publicos como identidade confirmada.",
    "Nao fundir a voz desta persona com outras personas da cena.",
    ...contract.prohibitions.slice(0, 5),
  ];
}

export function buildPersonaContextProjection(input: {
  personaId: string;
  memoryScope: string;
  nodes: UserProfileNodeRecord[];
  maxCore?: number;
  maxVocational?: number;
}): PersonaContextProjection {
  const persona = personaKey(input.personaId);
  const allowedCategories = personaCategoryProfiles[persona] || categorySet(getPersonaBehaviorContract(input.personaId).contextToSeek);
  const blockedReasons: string[] = [];
  const authorized = input.nodes.filter((node) => {
    const decision = canProjectUserProfileNode({
      node,
      personaId: input.personaId,
      memoryScope: input.memoryScope,
    });
    if (!decision.allowed) blockedReasons.push(decision.reason);
    return decision.allowed;
  });

  const core = authorized
    .filter((node) => node.status === "CONFIRMED")
    .filter((node) => nodeMatchesCategory(node, coreCategories))
    .sort(byConfidenceAndFreshness)
    .slice(0, input.maxCore ?? 4);

  const vocational = authorized
    .filter((node) => nodeMatchesCategory(node, allowedCategories))
    .filter((node) => nodeMatchesEpistemic(node, persona))
    .filter((node) => !core.some((coreNode) => coreNode.id === node.id))
    .sort(byConfidenceAndFreshness)
    .slice(0, input.maxVocational ?? 8);

  return {
    personaId: input.personaId,
    memoryScope: input.memoryScope,
    core,
    vocational,
    blockedCount: input.nodes.length - authorized.length,
    blockedReasons: Array.from(new Set(blockedReasons)),
    projectionSummary: {
      totalInputNodes: input.nodes.length,
      coreCount: core.length,
      vocationalCount: vocational.length,
      categories: Array.from(new Set([...core, ...vocational].map((node) => node.category))).sort(),
      epistemicTypes: Array.from(new Set([...core, ...vocational].map((node) => node.epistemicType))).sort(),
    },
    prohibitions: projectionProhibitions(input.personaId),
  };
}

function renderNode(node: UserProfileNodeRecord) {
  const epistemicLabel = node.epistemicType === "HYPOTHESIS" || node.epistemicType === "INFERRED_PATTERN"
    ? ` (${node.epistemicType.toLowerCase()}, confidence=${node.confidence.toFixed(2)})`
    : ` (${node.epistemicType.toLowerCase()})`;
  return `- ${node.shortSummary}${epistemicLabel}`;
}

export function renderPersonaContextProjection(projection: PersonaContextProjection) {
  if (projection.core.length === 0 && projection.vocational.length === 0) return "";

  return [
    "Projecao vocacional do User Graph. Use como contexto interno; nao cite como banco, grafo ou sistema.",
    projection.core.length > 0 ? ["Nucleo comum minimo:", ...projection.core.map(renderNode)].join("\n") : "",
    projection.vocational.length > 0 ? ["Dados vocacionais para esta persona:", ...projection.vocational.map(renderNode)].join("\n") : "",
    projection.prohibitions.length > 0 ? ["Proibicoes especificas:", ...projection.prohibitions.map((item) => `- ${item}`)].join("\n") : "",
  ].filter(Boolean).join("\n\n");
}
