import {
  CandidateResponse,
  CognitiveContextEnvelope,
  CognitiveModelProvider,
  CognitiveRequest,
  CognitiveRuntimeError,
  ExtractionResult,
  extractionResultSchema,
  ProposedDestinyAction,
  ProposedMemoryAction,
  ProposedRegistryAction,
} from "./types";

function normalizeDestinyDate(value?: string) {
  const raw = value?.trim();
  if (!raw || raw.toLowerCase() === "sem data") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function normalizeDestinyIntensity(value?: string) {
  const raw = value?.trim();
  if (!raw) return null;
  const parsed = Number(raw.match(/\d+/)?.[0]);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

function memoryTypeFromContent(content: string): ProposedMemoryAction["memoryType"] {
  const normalized = content.toLowerCase();
  if (normalized.startsWith("fato")) return "fact";
  if (normalized.startsWith("episodio") || normalized.startsWith("episodio")) return "episode";
  if (normalized.startsWith("tema ativo")) return "active_theme";
  return "other";
}

export function extractLegacyActionTags(text: string, request: CognitiveRequest) {
  const memoryMatches = [...text.matchAll(/\[MEMORY:\s*([^\]\r\n]{1,1000})\]/gi)];
  const registryMatches = [...text.matchAll(/\[REGISTRY:\s*([^|\]\r\n]{1,500})(?:\|\s*([^|\]\r\n]{0,50}))?(?:\|\s*([^\]\r\n]{0,50}))?\]/gi)];
  const destinyMatches = [...text.matchAll(/\[DESTINY:\s*([^\]\r\n]{1,1200})\]/gi)];

  const proposedMemoryActions: ProposedMemoryAction[] = memoryMatches.slice(0, 3).map((match, index) => ({
    id: `legacy-memory-${index}`,
    kind: "memory",
    source: "legacy-tag",
    authorized: false,
    authorizationProvenance: "unauthorized",
    scope: request.memoryScope,
    content: match[1].trim(),
    memoryType: memoryTypeFromContent(match[1].trim()),
  }));

  const proposedRegistryActions: ProposedRegistryAction[] = registryMatches.map((match, index) => {
    const deadline = match[2]?.trim();
    return {
      id: `legacy-registry-${index}`,
      kind: "registry",
      source: "legacy-tag",
      authorized: false,
      authorizationProvenance: "unauthorized",
      idea: match[1].trim(),
      deadline: deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null,
      status: match[3]?.trim() || "Pendente",
    };
  });

  const proposedDestinyActions: ProposedDestinyAction[] = destinyMatches.slice(0, 2).flatMap((match, index) => {
    const parts = match[1].split("|").map((part) => part.trim());
    const title = parts[0];
    const eventDate = normalizeDestinyDate(parts[1]);
    const eventDateLabel = eventDate ? null : (parts[1] || null);
    const shortDescription = parts[3] || title;
    if (!title || !shortDescription) return [];

    return [{
      id: `legacy-destiny-${index}`,
      kind: "destiny",
      source: "legacy-tag",
      authorized: false,
      authorizationProvenance: "unauthorized",
      title,
      eventDate,
      eventDateLabel,
      category: parts[2] || "marco",
      shortDescription,
      symbolicIntensity: normalizeDestinyIntensity(parts[4]),
      dominantEmotion: parts[5] || null,
    }];
  });

  const visibleText = text
    .replace(/\[MEMORY:\s*[^\]\r\n]{1,1000}\]/gi, "")
    .replace(/\[REGISTRY:\s*[^\]\r\n]+?\]/gi, "")
    .replace(/\[DESTINY:\s*[^\]\r\n]+?\]/gi, "")
    .trim();

  return {
    visibleText,
    extraction: extractionResultSchema.parse({
      claims: [],
      proposedMemoryActions,
      proposedRegistryActions,
      proposedDestinyActions,
      possibleVocationConflicts: [],
      possiblePrivacyConcerns: [],
      legacyTagsRemoved: memoryMatches.length + registryMatches.length + destinyMatches.length,
    }),
  };
}

export function mergeExtractionResults(primary: ExtractionResult, secondary: ExtractionResult): ExtractionResult {
  return extractionResultSchema.parse({
    claims: [...primary.claims, ...secondary.claims],
    proposedMemoryActions: [...primary.proposedMemoryActions, ...secondary.proposedMemoryActions],
    proposedRegistryActions: [...primary.proposedRegistryActions, ...secondary.proposedRegistryActions],
    proposedDestinyActions: [...primary.proposedDestinyActions, ...secondary.proposedDestinyActions],
    possibleVocationConflicts: [...primary.possibleVocationConflicts, ...secondary.possibleVocationConflicts],
    possiblePrivacyConcerns: [...primary.possiblePrivacyConcerns, ...secondary.possiblePrivacyConcerns],
    legacyTagsRemoved: primary.legacyTagsRemoved + secondary.legacyTagsRemoved,
  });
}

export async function extractClaimsAndActions(input: {
  request: CognitiveRequest;
  context: CognitiveContextEnvelope;
  candidate: CandidateResponse;
  provider?: CognitiveModelProvider;
  structured: boolean;
}) {
  const legacy = extractLegacyActionTags(input.candidate.text, input.request);
  input.candidate.visibleText = legacy.visibleText;

  if (!input.structured || !input.provider) {
    return legacy.extraction;
  }

  try {
    const structuredExtraction = await input.provider.extractCandidate({
      request: input.request,
      context: input.context,
      candidate: input.candidate,
    });

    return mergeExtractionResults(legacy.extraction, extractionResultSchema.parse(structuredExtraction));
  } catch (error) {
    throw new CognitiveRuntimeError(
      "MALFORMED_STRUCTURED_OUTPUT",
      `Claim/action extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        retryable: true,
        safeMessage: "A extracao estruturada da resposta falhou.",
      },
    );
  }
}
