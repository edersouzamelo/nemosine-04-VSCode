import { isAdminEmail } from "@/app/lib/accessControl";
import {
  buildRunNarrative,
  doubleVigilanceMessage,
  insufficientDoubleVigilanceTelemetry,
  isLegacyShadowObservation,
} from "@/app/lib/admin/cognitiveRunsUi";
import { classifyFindingCode, isInfrastructureDegradationCode } from "@/app/lib/nemosine/cognitive-runtime/finding-classification";

type AdminSession = {
  user?: {
    email?: string | null;
  } | null;
} | null | undefined;

type PrimitiveDetail = string | number | boolean | null;

type PrismaLike = {
  cognitiveRunAudit: {
    count(input?: unknown): Promise<number>;
    findMany(input?: unknown): Promise<any[]>;
    findUnique(input?: unknown): Promise<any | null>;
    aggregate?(input?: unknown): Promise<any>;
    groupBy?(input?: unknown): Promise<any[]>;
  };
};

export const cognitiveRunSorts = [
  "newest",
  "oldest",
  "coherence_desc",
  "coherence_asc",
] as const;

const runtimeModes = ["off", "shadow", "enforce"] as const;
const executionProfiles = ["light", "standard", "full"] as const;
const promotionDecisions = ["promoted", "rejected", "failed_safe", "shadow_only", "recovery_delivered"] as const;
const deliveryStatuses = ["not_attempted", "persisted", "failed", "shadow_external"] as const;
const sideEffectStatuses = ["none", "skipped", "blocked", "committed", "failed_rolled_back"] as const;

export type CognitiveRunSort = typeof cognitiveRunSorts[number];

export type CognitiveRunFilters = {
  page: number;
  pageSize: number;
  dateFrom?: Date;
  dateTo?: Date;
  personaId?: string;
  placeId?: string;
  runtimeMode?: string;
  executionProfile?: string;
  promotionDecision?: string;
  deliveryStatus?: string;
  sideEffectStatus?: string;
  privateRun?: boolean;
  minCoherence?: number;
  maxCoherence?: number;
  findingCode?: string;
  sort: CognitiveRunSort;
};

export type CognitiveRunQueryResult =
  | { ok: true; filters: CognitiveRunFilters; activeFilters: Record<string, string | number | boolean> }
  | { ok: false; status: 400; error: string };

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function isAllowed(value: string | null, allowed: readonly string[]) {
  return !value || allowed.includes(value);
}

function stringFilter(value: string | null, maxLength = 120) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
}

function numberFilter(value: string | null, fieldName: string, min?: number, max?: number) {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number.`);
  }
  if (typeof min === "number" && parsed < min) {
    throw new Error(`${fieldName} must be at least ${min}.`);
  }
  if (typeof max === "number" && parsed > max) {
    throw new Error(`${fieldName} must be at most ${max}.`);
  }
  return parsed;
}

function integerFilter(value: string | null, fieldName: string, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${fieldName} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function dateFilter(value: string | null, fieldName: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }
  return parsed;
}

function booleanFilter(value: string | null, fieldName: string) {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${fieldName} must be true or false.`);
}

export function parseCognitiveRunQuery(searchParams: URLSearchParams): CognitiveRunQueryResult {
  try {
    const page = integerFilter(searchParams.get("page"), "page", 1, 1, 100000);
    const pageSize = integerFilter(searchParams.get("pageSize"), "pageSize", 25, 1, 100);
    const dateFrom = dateFilter(searchParams.get("dateFrom"), "dateFrom");
    const dateTo = dateFilter(searchParams.get("dateTo"), "dateTo");
    const minCoherence = numberFilter(searchParams.get("minCoherence"), "minCoherence", 0, 1);
    const maxCoherence = numberFilter(searchParams.get("maxCoherence"), "maxCoherence", 0, 1);
    const privateRun = booleanFilter(searchParams.get("privateRun"), "privateRun");
    const sortCandidate = searchParams.get("sort") || "newest";

    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new Error("dateFrom must be earlier than dateTo.");
    }
    if (typeof minCoherence === "number" && typeof maxCoherence === "number" && minCoherence > maxCoherence) {
      throw new Error("minCoherence must be less than or equal to maxCoherence.");
    }
    if (!isAllowed(searchParams.get("runtimeMode"), runtimeModes)) throw new Error("runtimeMode is invalid.");
    if (!isAllowed(searchParams.get("executionProfile"), executionProfiles)) throw new Error("executionProfile is invalid.");
    if (!isAllowed(searchParams.get("promotionDecision"), promotionDecisions)) throw new Error("promotionDecision is invalid.");
    if (!isAllowed(searchParams.get("deliveryStatus"), deliveryStatuses)) throw new Error("deliveryStatus is invalid.");
    if (!isAllowed(searchParams.get("sideEffectStatus"), sideEffectStatuses)) throw new Error("sideEffectStatus is invalid.");
    if (!isAllowed(sortCandidate, cognitiveRunSorts)) throw new Error("sort is invalid.");

    const filters: CognitiveRunFilters = {
      page,
      pageSize,
      dateFrom,
      dateTo,
      personaId: stringFilter(searchParams.get("personaId")),
      placeId: stringFilter(searchParams.get("placeId")),
      runtimeMode: stringFilter(searchParams.get("runtimeMode")),
      executionProfile: stringFilter(searchParams.get("executionProfile")),
      promotionDecision: stringFilter(searchParams.get("promotionDecision")),
      deliveryStatus: stringFilter(searchParams.get("deliveryStatus")),
      sideEffectStatus: stringFilter(searchParams.get("sideEffectStatus")),
      privateRun,
      minCoherence,
      maxCoherence,
      findingCode: stringFilter(searchParams.get("findingCode"), 80),
      sort: sortCandidate as CognitiveRunSort,
    };

    const activeFilters = Object.fromEntries(
      Object.entries(filters)
        .filter(([key, value]) => key !== "page" && key !== "pageSize" && value !== undefined && value !== "")
        .map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]),
    ) as Record<string, string | number | boolean>;

    return { ok: true, filters, activeFilters };
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : "Invalid query parameters.",
    };
  }
}

function buildWhere(filters: CognitiveRunFilters) {
  const where: Record<string, any> = {};
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
    if (filters.dateTo) where.createdAt.lte = filters.dateTo;
  }
  if (filters.personaId) where.personaId = filters.personaId;
  if (filters.placeId) where.placeId = filters.placeId;
  if (filters.runtimeMode) where.runtimeMode = filters.runtimeMode;
  if (filters.executionProfile) where.executionProfile = filters.executionProfile;
  if (filters.promotionDecision) where.promotionDecision = filters.promotionDecision;
  if (filters.deliveryStatus) where.deliveryStatus = filters.deliveryStatus;
  if (filters.sideEffectStatus) where.sideEffectStatus = filters.sideEffectStatus;
  if (typeof filters.privateRun === "boolean") where.privateRun = filters.privateRun;
  if (typeof filters.minCoherence === "number" || typeof filters.maxCoherence === "number") {
    where.coherence = {};
    if (typeof filters.minCoherence === "number") where.coherence.gte = filters.minCoherence;
    if (typeof filters.maxCoherence === "number") where.coherence.lte = filters.maxCoherence;
  }
  if (filters.findingCode) {
    where.findingCodes = { array_contains: [filters.findingCode] };
  }
  return where;
}

function buildOrderBy(sort: CognitiveRunSort) {
  if (sort === "oldest") return { createdAt: "asc" };
  if (sort === "coherence_desc") return { coherence: "desc" };
  if (sort === "coherence_asc") return { coherence: "asc" };
  return { createdAt: "desc" };
}

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asObject(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function safeString(value: unknown, maxLength = 180) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function safeBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function sanitizeTransition(value: unknown) {
  const item = asObject(value);
  const from = safeString(item.from, 80);
  const to = safeString(item.to, 80);
  if (!from || !to) return null;
  return {
    from,
    to,
    at: safeString(item.at, 80) || null,
    allowed: safeBoolean(item.allowed) ?? false,
    latencyMs: safeNumber(item.latencyMs) ?? null,
    note: safeString(item.note, 180) || null,
  };
}

function sanitizeTransitions(value: unknown) {
  return asArray(value).map(sanitizeTransition).filter(Boolean);
}

function sanitizePrimitiveDetail(value: unknown): PrimitiveDetail | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.slice(0, 180);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return undefined;
}

function sanitizeAuditEvent(value: unknown) {
  const item = asObject(value);
  const code = safeString(item.code, 80);
  if (!code) return null;
  const rawDetail = asObject(item.detail);
  const detail: Record<string, PrimitiveDetail> = {};
  for (const [key, rawValue] of Object.entries(rawDetail)) {
    if (/prompt|candidate|content|message|text|raw/i.test(key) && key !== "rawContentStored") {
      continue;
    }
    const safeValue = sanitizePrimitiveDetail(rawValue);
    if (safeValue !== undefined) detail[key.slice(0, 80)] = safeValue;
  }
  return {
    code,
    at: safeString(item.at, 80) || null,
    detail,
  };
}

function sanitizeAuditEvents(value: unknown) {
  return asArray(value).map(sanitizeAuditEvent).filter(Boolean);
}

function sanitizeFindingCodes(value: unknown) {
  return Array.from(new Set(asArray(value)
    .filter((item) => typeof item === "string")
    .map((item) => item.slice(0, 80))));
}

function totalLatencyMs(row: any) {
  const created = row.createdAt instanceof Date ? row.createdAt.getTime() : new Date(row.createdAt).getTime();
  const completed = row.completedAt instanceof Date ? row.completedAt.getTime() : new Date(row.completedAt).getTime();
  const wallClockTotal = Number.isFinite(created) && Number.isFinite(completed) && completed >= created
    ? completed - created
    : null;
  const latencyMap = asObject(row.latencyPerStageMs);
  const stageTotal = Object.values(latencyMap).reduce((sum, value) => {
    return sum + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
  return Math.max(wallClockTotal || 0, stageTotal || 0) || null;
}

function latencyBreakdown(row: any) {
  const totalMs = totalLatencyMs(row);
  const stageLatencyMs = asObject(row.latencyPerStageMs);
  const sanitizedStageLatencyMs = Object.fromEntries(
    Object.entries(stageLatencyMs)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
      .map(([key, value]) => [key.slice(0, 120), value as number]),
  );
  const stageTotal = Object.values(sanitizedStageLatencyMs).reduce((sum, value) => sum + value, 0);
  const legacyShadow = isLegacyShadowObservation({
    runtimeMode: row.runtimeMode,
    promotionDecision: row.promotionDecision,
    deliveryStatus: row.deliveryStatus,
    iterationCount: row.iterationCount,
    coherence: safeNumber(row.coherence) ?? null,
  });

  return {
    totalMs,
    runtimeMs: legacyShadow ? null : (stageTotal || totalMs),
    legacyRouteMs: legacyShadow ? totalMs : null,
    stageLatencyMs: sanitizedStageLatencyMs,
  };
}

function retryRequested(row: any) {
  return sanitizeTransitions(row.stateTransitions).some((transition: any) => transition.to === "OCV_RETRY_REQUESTED");
}

function latestAuditEvent(row: any, code: string) {
  return sanitizeAuditEvents(row.auditEvents).filter((event: any) => event.code === code).at(-1) || null;
}

function recoveryDelivered(row: any) {
  return row.promotionDecision === "recovery_delivered"
    || Boolean(latestAuditEvent(row, "RECOVERY_DELIVERED")?.detail?.recoveryDelivered);
}

function dominantCause(row: any) {
  const recovery = latestAuditEvent(row, "RECOVERY_DELIVERED");
  const rejection = latestAuditEvent(row, "REJECTION_CLASSIFIED");
  const value = recovery?.detail?.dominantCause || rejection?.detail?.dominantCause || row.failureReason || null;
  return typeof value === "string" ? value.slice(0, 80) : null;
}

function infrastructureDegraded(row: any) {
  return sanitizeFindingCodes(row.findingCodes).some(isInfrastructureDegradationCode)
    || sanitizeAuditEvents(row.auditEvents).some((event: any) =>
      event.code === "STRUCTURED_VALIDATOR_DEGRADED" || event.detail?.classification === "infrastructure_degradation"
    );
}

function blockingCategory(row: any) {
  const cause = dominantCause(row);
  if (cause === "infrastructure") return "infrastructure_degradation";
  if (cause === "privacy") return "privacy_failure";
  if (cause === "vocation") return "vocational_failure";
  if (cause === "safety") return "hard_safety_failure";
  return sanitizeFindingCodes(row.findingCodes).map((code) => classifyFindingCode(code))[0] || null;
}

function distributionFromGroups(groups: any[], field: string) {
  return Object.fromEntries(
    groups.map((group) => [String(group[field] || "unknown"), Number(group._count?._all || group._count?.id || group._count || 0)]),
  );
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeRowsForJsonMetrics(rows: any[]) {
  const coherenceValues = rows.map((row) => safeNumber(row.coherence)).filter((value): value is number => typeof value === "number");
  const latencyValues = rows.map(totalLatencyMs).filter((value): value is number => typeof value === "number");
  const cognitiveRows = rows.filter((row) => Number(row.iterationCount || 0) > 0 && row.promotionDecision !== "shadow_only");
  const iterationValues = cognitiveRows
    .map((row) => safeNumber(row.iterationCount))
    .filter((value): value is number => typeof value === "number");
  const retryCount = rows.filter(retryRequested).length;
  const auditPersistenceFailureCount = rows.filter((row) =>
    sanitizeAuditEvents(row.auditEvents).some((event: any) => event.code === "AUDIT_PERSISTENCE_FAILURE"),
  ).length;
  const stageLatencyBuckets = new Map<string, number[]>();
  let runtimeLatencyValues: number[] = [];
  let legacyRouteLatencyValues: number[] = [];

  for (const row of rows) {
    const breakdown = latencyBreakdown(row);
    if (typeof breakdown.runtimeMs === "number") runtimeLatencyValues.push(breakdown.runtimeMs);
    if (typeof breakdown.legacyRouteMs === "number") legacyRouteLatencyValues.push(breakdown.legacyRouteMs);
    for (const [stage, value] of Object.entries(breakdown.stageLatencyMs)) {
      if (!stageLatencyBuckets.has(stage)) stageLatencyBuckets.set(stage, []);
      stageLatencyBuckets.get(stage)?.push(value);
    }
  }

  return {
    averageCoherence: average(coherenceValues),
    coherenceValidCount: coherenceValues.length,
    medianCoherence: median(coherenceValues),
    averageIterations: average(iterationValues),
    cognitiveExecutionCount: cognitiveRows.length,
    averageLatencyMs: average(latencyValues),
    latency: {
      averageTotalMs: average(latencyValues),
      averageRuntimeMs: average(runtimeLatencyValues),
      averageLegacyRouteMs: average(legacyRouteLatencyValues),
      stageAveragesMs: Object.fromEntries([...stageLatencyBuckets.entries()].map(([stage, values]) => [stage, average(values)])),
    },
    retryCount,
    auditPersistenceFailureCount,
    aggregationLimit: rows.length,
  };
}

function safeRow(row: any) {
  const latency = latencyBreakdown(row);
  return {
    runId: row.id,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
    completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : new Date(row.completedAt).toISOString(),
    personaId: row.personaId,
    placeId: row.placeId || null,
    runtimeMode: row.runtimeMode,
    executionProfile: row.executionProfile,
    coherence: safeNumber(row.coherence) ?? null,
    coherenceThreshold: safeNumber(row.coherenceThreshold) ?? null,
    iterationCount: row.iterationCount,
    promotionDecision: row.promotionDecision,
    deliveryStatus: row.deliveryStatus || "not_attempted",
    sideEffectStatus: row.sideEffectStatus || "none",
    privateRun: Boolean(row.privateRun),
    metadataOnly: Boolean(row.metadataOnly),
    finalStatus: row.finalStatus,
    latencyMs: latency.totalMs,
    latency,
    retryRequested: retryRequested(row),
    findingCodes: sanitizeFindingCodes(row.findingCodes).slice(0, 12),
    recoveryDelivered: recoveryDelivered(row),
    dominantCause: dominantCause(row),
    infrastructureDegraded: infrastructureDegraded(row),
    blockingCategory: blockingCategory(row),
    assistantMessagePersisted: Boolean(row.assistantMessagePersisted),
    auditPersisted: Boolean(row.auditPersisted),
    memoryEffectCount: row.memoryEffectCount || 0,
    registryEffectCount: row.registryEffectCount || 0,
    destinyEffectCount: row.destinyEffectCount || 0,
  };
}

function buildSummary(input: {
  total: number;
  averageCoherence: number | null;
  averageCoherenceValidCount: number;
  promotionDistribution: Record<string, number>;
  runtimeModeDistribution: Record<string, number>;
  executionProfileDistribution: Record<string, number>;
  deliveryDistribution: Record<string, number>;
  sideEffectDistribution: Record<string, number>;
  privateRunCount: number;
  jsonMetrics: ReturnType<typeof summarizeRowsForJsonMetrics>;
}) {
  const total = input.total;
  const promoted = input.promotionDistribution.promoted || 0;
  const rejected = input.promotionDistribution.rejected || 0;
  const failedSafe = input.promotionDistribution.failed_safe || 0;
  const recovered = input.promotionDistribution.recovery_delivered || 0;
  const shadowOnly = input.promotionDistribution.shadow_only || 0;
  const governedDecisionDenominator = Math.max(0, total - shadowOnly);
  const cognitiveExecutionCount = input.jsonMetrics.cognitiveExecutionCount;
  const retryCount = input.jsonMetrics.retryCount;

  return {
    hasData: total > 0,
    totalRuns: total,
    governedDecisionDenominator,
    shadowOnlyCount: shadowOnly,
    promotionRate: governedDecisionDenominator > 0 ? promoted / governedDecisionDenominator : null,
    rejectionRate: governedDecisionDenominator > 0 ? rejected / governedDecisionDenominator : null,
    failedSafeRate: governedDecisionDenominator > 0 ? failedSafe / governedDecisionDenominator : null,
    recoveryRate: governedDecisionDenominator > 0 ? recovered / governedDecisionDenominator : null,
    averageCoherence: input.averageCoherence,
    averageCoherenceValidCount: input.averageCoherenceValidCount,
    medianCoherence: input.jsonMetrics.medianCoherence,
    averageIterations: input.jsonMetrics.averageIterations,
    cognitiveExecutionCount,
    retryRate: cognitiveExecutionCount > 0 ? retryCount / cognitiveExecutionCount : null,
    averageLatencyMs: input.jsonMetrics.averageLatencyMs,
    latency: input.jsonMetrics.latency,
    executionProfileDistribution: input.executionProfileDistribution,
    runtimeModeDistribution: input.runtimeModeDistribution,
    deliveryPersistenceFailureCount: input.deliveryDistribution.failed || 0,
    auditPersistenceFailureCount: input.jsonMetrics.auditPersistenceFailureCount,
    optionalEffectBlockedCount: input.sideEffectDistribution.blocked || 0,
    optionalEffectRollbackCount: input.sideEffectDistribution.failed_rolled_back || 0,
    privateRunCount: input.privateRunCount,
    aggregation: {
      jsonSampleLimit: input.jsonMetrics.aggregationLimit,
      note: "Metricas derivadas de JSON, retries, auditoria e latencias por etapa usam uma amostra limitada de ate 5000 registros V1.",
    },
    provenance: {
      totalRuns: {
        field: "cognitive_run_audits.id",
        calculation: "count(*) apos filtros",
        denominator: "registros filtrados",
        validRecords: total,
        limitations: [],
      },
      promotionRate: {
        field: "promotion_decision",
        calculation: "count(promoted) / (total - count(shadow_only))",
        denominator: governedDecisionDenominator,
        validRecords: promoted,
        limitations: ["shadow_only e observacao, nao promocao governada"],
      },
      rejectionRate: {
        field: "promotion_decision",
        calculation: "count(rejected) / (total - count(shadow_only))",
        denominator: governedDecisionDenominator,
        validRecords: rejected,
        limitations: ["shadow_only nao conta como rejeicao"],
      },
      averageCoherence: {
        field: "coherence",
        calculation: "avg(coherence) ignorando null",
        denominator: input.averageCoherenceValidCount,
        validRecords: input.averageCoherenceValidCount,
        limitations: ["C(m) null significa nao calculado ou nao armazenado, nao zero"],
      },
      averageIterations: {
        field: "iteration_count",
        calculation: "avg(iteration_count) em execucoes com iteration_count > 0 e promotion_decision != shadow_only",
        denominator: cognitiveExecutionCount,
        validRecords: cognitiveExecutionCount,
        limitations: ["calculado a partir da amostra JSON-safe V1"],
      },
      retryRate: {
        field: "state_transitions",
        calculation: "count(transicao OCV_RETRY_REQUESTED) / execucoes cognitivas reais",
        denominator: cognitiveExecutionCount,
        validRecords: retryCount,
        limitations: ["depende da preservacao de stateTransitions"],
      },
      failedSafeRate: {
        field: "promotion_decision",
        calculation: "count(failed_safe) / (total - count(shadow_only))",
        denominator: governedDecisionDenominator,
        validRecords: failedSafe,
        limitations: [],
      },
      recoveryRate: {
        field: "promotion_decision, audit_events",
        calculation: "count(recovery_delivered) / (total - count(shadow_only))",
        denominator: governedDecisionDenominator,
        validRecords: recovered,
        limitations: ["recuperacao entregue nao equivale a promocao da candidata original"],
      },
      latency: {
        field: "created_at, completed_at, latency_per_stage_ms",
        calculation: "completed_at - created_at; etapas quando latency_per_stage_ms existe",
        denominator: input.jsonMetrics.aggregationLimit,
        validRecords: input.jsonMetrics.aggregationLimit,
        limitations: ["latencia de rota legada so e distinguida quando o padrao shadow legado e detectado"],
      },
    },
  };
}

async function groupDistribution(prisma: PrismaLike, where: Record<string, any>, field: string) {
  if (!prisma.cognitiveRunAudit.groupBy) return {};
  const groups = await prisma.cognitiveRunAudit.groupBy({
    by: [field],
    where,
    _count: { _all: true },
  });
  return distributionFromGroups(groups, field);
}

function tableUnavailableResponse(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as any).code) : "AUDIT_TABLE_UNAVAILABLE";
  return jsonResponse({
    error: "Cognitive runtime audit store is unavailable.",
    diagnostic: {
      code,
      message: "The CognitiveRunAudit table may be missing or the persistence migration may not have been applied.",
    },
  }, 503);
}

export async function getCognitiveRunsList(prisma: PrismaLike, filters: CognitiveRunFilters, activeFilters: Record<string, string | number | boolean>) {
  const where = buildWhere(filters);
  const orderBy = buildOrderBy(filters.sort);
  const skip = (filters.page - 1) * filters.pageSize;
  const baseSelect = {
    id: true,
    personaId: true,
    placeId: true,
    runtimeMode: true,
    executionProfile: true,
    stateTransitions: true,
    auditEvents: true,
    deliveryStatus: true,
    sideEffectStatus: true,
    memoryEffectCount: true,
    registryEffectCount: true,
    destinyEffectCount: true,
    assistantMessagePersisted: true,
    auditPersisted: true,
    iterationCount: true,
    coherence: true,
    coherenceThreshold: true,
    findingCodes: true,
    promotionDecision: true,
    failureReason: true,
    latencyPerStageMs: true,
    privateRun: true,
    metadataOnly: true,
    createdAt: true,
    completedAt: true,
    finalStatus: true,
  };

  const [total, rows, aggregate, coherenceValidCount, promotionGroups, runtimeGroups, profileGroups, deliveryGroups, sideEffectGroups, privateRunCount, jsonMetricRows] = await Promise.all([
    prisma.cognitiveRunAudit.count({ where }),
    prisma.cognitiveRunAudit.findMany({
      where,
      orderBy,
      skip,
      take: filters.pageSize,
      select: baseSelect,
    }),
    prisma.cognitiveRunAudit.aggregate
      ? prisma.cognitiveRunAudit.aggregate({ where, _avg: { coherence: true, iterationCount: true } })
      : Promise.resolve({ _avg: { coherence: null, iterationCount: null } }),
    prisma.cognitiveRunAudit.count({ where: { ...where, coherence: { not: null } } }),
    groupDistribution(prisma, where, "promotionDecision"),
    groupDistribution(prisma, where, "runtimeMode"),
    groupDistribution(prisma, where, "executionProfile"),
    groupDistribution(prisma, where, "deliveryStatus"),
    groupDistribution(prisma, where, "sideEffectStatus"),
    prisma.cognitiveRunAudit.count({ where: { ...where, privateRun: true } }),
    prisma.cognitiveRunAudit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        coherence: true,
        coherenceThreshold: true,
        iterationCount: true,
        promotionDecision: true,
        runtimeMode: true,
        deliveryStatus: true,
        createdAt: true,
        completedAt: true,
        stateTransitions: true,
        auditEvents: true,
        latencyPerStageMs: true,
      },
    }),
  ]);

  const summary = buildSummary({
    total,
    averageCoherence: aggregate?._avg?.coherence ?? null,
    averageCoherenceValidCount: coherenceValidCount,
    promotionDistribution: promotionGroups,
    runtimeModeDistribution: runtimeGroups,
    executionProfileDistribution: profileGroups,
    deliveryDistribution: deliveryGroups,
    sideEffectDistribution: sideEffectGroups,
    privateRunCount,
    jsonMetrics: summarizeRowsForJsonMetrics(jsonMetricRows),
  });

  return {
    summary,
    rows: rows.map(safeRow),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
      hasNextPage: skip + rows.length < total,
      hasPreviousPage: filters.page > 1,
    },
    activeFilters,
  };
}

function contentPresence(contentHashes: unknown) {
  const hashes = asObject(contentHashes);
  return {
    userText: typeof hashes.userText === "string" && hashes.userText.length > 0,
    displayUserText: typeof hashes.displayUserText === "string" && hashes.displayUserText.length > 0,
    finalCandidate: typeof hashes.finalCandidate === "string" && hashes.finalCandidate.length > 0,
  };
}

function contentLengths(contentLengthsValue: unknown, privateRun: boolean) {
  const lengths = asObject(contentLengthsValue);
  return {
    userText: privateRun ? safeNumber(lengths.userText) ?? null : safeNumber(lengths.userText) ?? null,
    displayUserText: privateRun ? safeNumber(lengths.displayUserText) ?? null : safeNumber(lengths.displayUserText) ?? null,
    finalCandidate: safeNumber(lengths.finalCandidate) ?? null,
  };
}

function dimensionsFromScores(dimensionScores: unknown) {
  return Object.entries(asObject(dimensionScores)).map(([name, value]) => {
    const objectValue = asObject(value);
    const hasStructuredValue = Object.keys(objectValue).length > 0;
    const status = hasStructuredValue && objectValue.status === "NOT_APPLICABLE"
      ? "NOT_APPLICABLE"
      : "SCORED";
    return {
      name: name.slice(0, 80),
      score: hasStructuredValue ? safeNumber(objectValue.score) ?? null : safeNumber(value) ?? null,
      weight: hasStructuredValue ? safeNumber(objectValue.weight) ?? null : null,
      status,
      reason: hasStructuredValue ? safeString(objectValue.reason, 240) || null : null,
    };
  });
}

export async function getCognitiveRunsExport(prisma: PrismaLike, filters: CognitiveRunFilters, activeFilters: Record<string, string | number | boolean>, scope: "page" | "all" = "page") {
  const exportFilters = {
    ...filters,
    page: scope === "all" ? 1 : filters.page,
    pageSize: scope === "all" ? 1000 : filters.pageSize,
  };
  const result = await getCognitiveRunsList(prisma, exportFilters, activeFilters);
  return {
    ...result,
    exportScope: scope,
    exportLimit: exportFilters.pageSize,
    exportTruncated: scope === "all" && result.pagination.total > exportFilters.pageSize,
  };
}

function deriveIterations(row: any) {
  const transitions = sanitizeTransitions(row.stateTransitions);
  const findingCodes = sanitizeFindingCodes(row.findingCodes);
  return Array.from({ length: Math.max(0, Number(row.iterationCount) || 0) }).map((_, index) => {
    const iterationTransitions = transitions.filter((transition: any) => String(transition.note || "").includes(`iteration:${index}`));
    const isFinalIteration = index === Math.max(0, Number(row.iterationCount) || 0) - 1;
    return {
      index,
      coherence: isFinalIteration ? safeNumber(row.coherence) ?? null : null,
      coherenceUnavailableReason: isFinalIteration ? null : "C(m) final armazenado somente na ultima iteracao deste registro.",
      passed: isFinalIteration ? row.promotionDecision === "promoted" : false,
      findingCodes,
      retryRequested: iterationTransitions.some((transition: any) => transition.to === "OCV_RETRY_REQUESTED"),
      rebalancingEvents: sanitizeAuditEvents(row.auditEvents).filter((event: any) => event.code === "REBALANCING_APPLIED"),
      candidateModelIdentifier: asArray(row.modelIdentifiers).find((model) => typeof model === "string") || null,
      stageLatencyMs: iterationTransitions.reduce((sum: number, transition: any) => sum + (transition.latencyMs || 0), 0),
    };
  });
}

function persistenceReason(events: any[]) {
  const event = events.find((item) => item.code === "SIDE_EFFECTS_ROLLED_BACK")
    || events.find((item) => item.code === "SIDE_EFFECTS_BLOCKED")
    || events.find((item) => item.code === "DELIVERY_PERSISTENCE_FAILED");
  return event?.detail?.reason || event?.code || null;
}

export async function getCognitiveRunDetail(prisma: PrismaLike, runId: string) {
  const row = await prisma.cognitiveRunAudit.findUnique({
    where: { id: runId },
    select: {
      id: true,
      personaId: true,
      placeId: true,
      runtimeMode: true,
      executionProfile: true,
      stateTransitions: true,
      auditEvents: true,
      deliveryStatus: true,
      sideEffectStatus: true,
      memoryEffectCount: true,
      registryEffectCount: true,
      destinyEffectCount: true,
      assistantMessagePersisted: true,
      auditPersisted: true,
      iterationCount: true,
      coherence: true,
      coherenceThreshold: true,
      dimensionScores: true,
      findingCodes: true,
      promotionDecision: true,
      failureReason: true,
      latencyPerStageMs: true,
      modelIdentifiers: true,
      contentHashes: true,
      contentLengths: true,
      privateRun: true,
      metadataOnly: true,
      createdAt: true,
      completedAt: true,
      finalStatus: true,
    },
  });

  if (!row) {
    return null;
  }

  const auditEvents = sanitizeAuditEvents(row.auditEvents);
  const findingCodes = sanitizeFindingCodes(row.findingCodes);
  const recoveryEvent = auditEvents.filter((event: any) => event.code === "RECOVERY_DELIVERED").at(-1);
  const basalRecoveryEvent = auditEvents.filter((event: any) => event.code === "RECOVERY_BASAL_GATE").at(-1);
  const classifiedRejectionEvent = auditEvents.filter((event: any) => event.code === "REJECTION_CLASSIFIED").at(-1);
  const privacyFindingCodes = findingCodes.filter((code) => /PRIVACY|PRIVATE|SCOPE|CONTEXT/i.test(code));
  const scientistFindingCodes = findingCodes.filter((code) => /^SCIENTIST_/i.test(code));
  const philosopherFindingCodes = findingCodes.filter((code) => /^PHILOSOPHER_/i.test(code));
  const modelIdentifiers = asArray(row.modelIdentifiers)
    .filter((model) => typeof model === "string")
    .map((model) => model.slice(0, 120));
  const dimensions = dimensionsFromScores(row.dimensionScores);
  const latency = latencyBreakdown(row);
  const iterations = deriveIterations(row);
  const doubleVigilanceTelemetry = doubleVigilanceMessage({
    iterationCount: row.iterationCount,
    dimensionCount: dimensions.length,
    scientistFindingCodes,
    philosopherFindingCodes,
    modelIdentifiers,
  });

  const detail = {
    identity: {
      runId: row.id,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
      completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : new Date(row.completedAt).toISOString(),
      personaId: row.personaId,
      placeId: row.placeId || null,
      runtimeMode: row.runtimeMode,
      executionProfile: row.executionProfile,
      modelIdentifiers,
      privateRun: Boolean(row.privateRun),
      metadataOnly: Boolean(row.metadataOnly),
      finalStatus: row.finalStatus,
      promotionDecision: row.promotionDecision,
      deliveryStatus: row.deliveryStatus || "not_attempted",
      failureReason: row.failureReason || null,
    },
    timeline: sanitizeTransitions(row.stateTransitions),
    iterations,
    vigia: {
      finalCoherence: safeNumber(row.coherence) ?? null,
      threshold: safeNumber(row.coherenceThreshold) ?? null,
      dimensions,
      weights: {},
      hardFailures: findingCodes.filter((code) => /HARD|VIOLATION|PRIVACY|VOCATION/i.test(code)),
      formula: "C(m) e o indice operacional de coerencia armazenado na auditoria redigida. Theta e preservado por execucao quando registrado.",
      profile: row.executionProfile,
    },
    doubleVigilance: {
      telemetryStatus: doubleVigilanceTelemetry === insufficientDoubleVigilanceTelemetry ? "insufficient" : "partial",
      telemetryMessage: doubleVigilanceTelemetry,
      scientist: {
        roleLabel: "Cientista - logica, fatos, contradicoes e incerteza honesta",
        approved: null,
        findingCodes: scientistFindingCodes,
        severity: scientistFindingCodes.length > 0 ? "finding-recorded" : "none-recorded",
        dimensionScores: dimensions.filter((dimension) => /factual|logical|uncertainty|access|biographical|relevance|consistency/i.test(dimension.name)),
        externalVerificationAvailable: null,
      },
      philosopher: {
        roleLabel: "Filosofo - etica, epistemologia e conformidade constitucional",
        approved: null,
        findingCodes: philosopherFindingCodes,
        severity: philosopherFindingCodes.length > 0 ? "finding-recorded" : "none-recorded",
        userSovereigntyStatus: findingCodes.some((code) => /SOVEREIGNTY/i.test(code)) ? "finding-recorded" : "no-finding-recorded",
        nonIdolatryStatus: findingCodes.some((code) => /IDOLATRY/i.test(code)) ? "finding-recorded" : "no-finding-recorded",
        dependencyManipulationStatus: findingCodes.some((code) => /DEPENDENCY|MANIPULATION/i.test(code)) ? "finding-recorded" : "no-finding-recorded",
      },
    },
    recovery: {
      delivered: row.promotionDecision === "recovery_delivered" || Boolean(recoveryEvent?.detail?.recoveryDelivered),
      dominantCause: safeString(recoveryEvent?.detail?.dominantCause || classifiedRejectionEvent?.detail?.dominantCause, 80) || null,
      basalGatePromoted: safeBoolean(basalRecoveryEvent?.detail?.promoted) ?? null,
      basalGateFindingCodes: safeString(basalRecoveryEvent?.detail?.findingCodes, 500) || "",
      infrastructureDegraded: findingCodes.some(isInfrastructureDegradationCode)
        || auditEvents.some((event: any) => event.code === "STRUCTURED_VALIDATOR_DEGRADED"),
      blockingCategory: blockingCategory(row),
    },
    latency,
    persistence: {
      deliveryStatus: row.deliveryStatus || "not_attempted",
      assistantMessagePersisted: Boolean(row.assistantMessagePersisted),
      auditPersisted: Boolean(row.auditPersisted),
      sideEffectStatus: row.sideEffectStatus || "none",
      memoryEffectCount: row.memoryEffectCount || 0,
      registryEffectCount: row.registryEffectCount || 0,
      destinyEffectCount: row.destinyEffectCount || 0,
      reason: persistenceReason(auditEvents),
      authorizationProvenanceCategories: findingCodes.filter((code) => /SIDE_EFFECT|AUTH|SCOPE|PRIVATE/i.test(code)),
    },
    privacy: {
      privateRun: Boolean(row.privateRun),
      metadataOnly: Boolean(row.metadataOnly),
      blockedContextCount: privacyFindingCodes.filter((code) => /CONTEXT|SCOPE|PRIVATE/i.test(code)).length,
      privacyFindingCodes,
      contentHashPresence: contentPresence(row.contentHashes),
      contentLengths: contentLengths(row.contentLengths, Boolean(row.privateRun)),
      privateNotice: row.privateRun ? "Execucao privada: somente metadados tecnicos sao exibidos." : null,
    },
    auditEvents,
    findingCodes,
    provenance: {
      redaction: "Somente metadados, hashes, comprimentos, estados e codigos seguros sao retornados.",
      missingSchemaFields: [
        "coherence_weights por execucao",
        "temperatura por chamada",
        "avaliacoes completas por iteracao",
        "aprovacao explicita por eixo da Double Vigilance",
      ],
    },
  };

  return {
    ...detail,
    narrative: buildRunNarrative(detail),
  };
}

export async function handleCognitiveRunsListRequest(request: Request, deps: { session: AdminSession; prisma: PrismaLike }) {
  if (!isAdminEmail(deps.session?.user?.email)) {
    return jsonResponse({ error: "Acesso negado" }, 403);
  }

  const url = new URL(request.url);
  const parsed = parseCognitiveRunQuery(url.searchParams);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, parsed.status);
  }

  try {
    const body = await getCognitiveRunsList(deps.prisma, parsed.filters, parsed.activeFilters);
    return jsonResponse(body);
  } catch (error) {
    return tableUnavailableResponse(error);
  }
}

export async function handleCognitiveRunDetailRequest(_request: Request, deps: { session: AdminSession; prisma: PrismaLike; runId: string }) {
  if (!isAdminEmail(deps.session?.user?.email)) {
    return jsonResponse({ error: "Acesso negado" }, 403);
  }

  try {
    const detail = await getCognitiveRunDetail(deps.prisma, deps.runId);
    if (!detail) {
      return jsonResponse({ error: "Cognitive run audit not found." }, 404);
    }
    return jsonResponse(detail);
  } catch (error) {
    return tableUnavailableResponse(error);
  }
}
