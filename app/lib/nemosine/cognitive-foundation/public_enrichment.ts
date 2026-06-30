import type { MemoryCandidate } from "./types";

export type PublicEnrichmentInput = {
  consent: boolean;
  providedName?: string | null;
  identifiers?: string[];
  links?: string[];
  authorizedDomains?: string[];
};

export type PublicEnrichmentPlan = {
  allowed: boolean;
  blockedReason?: string;
  searchPerformed: false;
  authorizedDomains: string[];
  identityResolutionRequired: boolean;
  candidates: MemoryCandidate[];
  reviewRequired: true;
  warnings: string[];
};

function normalizeDomain(value: string) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "")
    .toLowerCase()
    .trim();
}

function safeUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildPublicEnrichmentPlan(input: PublicEnrichmentInput): PublicEnrichmentPlan {
  const authorizedDomains = Array.from(new Set((input.authorizedDomains || [])
    .filter((item) => typeof item === "string" && item.trim())
    .map(normalizeDomain)
    .filter(Boolean)));
  const warnings: string[] = [];

  if (!input.consent) {
    return {
      allowed: false,
      blockedReason: "missing-consent",
      searchPerformed: false,
      authorizedDomains,
      identityResolutionRequired: false,
      candidates: [],
      reviewRequired: true,
      warnings: ["PUBLIC_ENRICHMENT_REQUIRES_OPT_IN"],
    };
  }

  const links = (input.links || [])
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => safeUrl(item))
    .filter((item): item is URL => Boolean(item));

  if (authorizedDomains.length === 0 && links.length === 0) {
    return {
      allowed: false,
      blockedReason: "no-authorized-source",
      searchPerformed: false,
      authorizedDomains,
      identityResolutionRequired: true,
      candidates: [],
      reviewRequired: true,
      warnings: ["NO_AUTHORIZED_PUBLIC_SOURCE"],
    };
  }

  const allowedLinks = links.filter((link) => {
    const domain = normalizeDomain(link.hostname);
    const allowed = authorizedDomains.length === 0 || authorizedDomains.includes(domain);
    if (!allowed) warnings.push(`domain-not-authorized:${domain}`);
    return allowed;
  });

  const candidates: MemoryCandidate[] = allowedLinks.map((link) => ({
    normalizedContent: `Fonte publica autorizada fornecida pelo usuario: ${link.toString()}`,
    shortSummary: `Fonte publica autorizada: ${normalizeDomain(link.hostname)}`,
    category: "public_source",
    subtype: normalizeDomain(link.hostname),
    epistemicType: "PUBLIC_SOURCE_CANDIDATE",
    sourceType: "authorized_public_source",
    sourceReference: link.toString(),
    sourceDate: new Date().toISOString(),
    confidence: 0.3,
    sensitivity: "PUBLIC",
    scopeType: "GLOBAL",
    authorizedPersonas: null,
    status: "CANDIDATE",
    validFrom: null,
    validUntil: null,
    createdBy: "public-enrichment-foundation",
    evidence: [{
      sourceType: "authorized_public_source",
      sourceId: link.toString(),
      redactedSummary: `Link autorizado pelo usuario em ${normalizeDomain(link.hostname)}.`,
      contentHash: null,
      evidenceWeight: 0.3,
      evidenceDate: new Date().toISOString(),
      origin: "user-provided-link",
      allowedAccess: ["review-only"],
    }],
    riskOfError: "high",
    requiresConfirmation: true,
    conflictPossible: true,
    shouldPersistAutomatically: false,
  }));

  return {
    allowed: true,
    searchPerformed: false,
    authorizedDomains,
    identityResolutionRequired: true,
    candidates,
    reviewRequired: true,
    warnings: Array.from(new Set(warnings)),
  };
}
