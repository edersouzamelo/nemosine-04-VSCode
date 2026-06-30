import { prisma } from "@/app/lib/nemosine/session_store";
import type { UserProfileNodeRecord } from "./types";

function parseJsonArray(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : null;
    } catch {
      return null;
    }
  }
  return null;
}

function mapNode(row: any): UserProfileNodeRecord {
  return {
    id: row.id,
    userId: row.userId,
    normalizedContent: row.normalizedContent,
    shortSummary: row.shortSummary,
    category: row.category,
    subtype: row.subtype || null,
    epistemicType: row.epistemicType,
    sourceType: row.sourceType,
    sourceReference: row.sourceReference || null,
    sourceDate: row.sourceDate || null,
    capturedAt: row.capturedAt || null,
    confidence: Number(row.confidence || 0),
    sensitivity: row.sensitivity,
    scopeType: row.scopeType,
    authorizedPersonas: parseJsonArray(row.authorizedPersonas),
    status: row.status,
    validFrom: row.validFrom || null,
    validUntil: row.validUntil || null,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt || null,
    removedAt: row.removedAt || null,
  };
}

export async function getUserProfileNodesForProjection(input: {
  userId: string;
  limit?: number;
}): Promise<UserProfileNodeRecord[]> {
  try {
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT
        "id",
        "userId",
        "normalizedContent",
        "shortSummary",
        "category",
        "subtype",
        "epistemicType",
        "sourceType",
        "sourceReference",
        "sourceDate",
        "capturedAt",
        "confidence",
        "sensitivity",
        "scopeType",
        "authorizedPersonas",
        "status",
        "validFrom",
        "validUntil",
        "createdBy",
        "updatedAt",
        "removedAt"
      FROM "UserProfileNode"
      WHERE "userId" = ${input.userId}
        AND "removedAt" IS NULL
        AND "status" IN ('CANDIDATE', 'CONFIRMED')
      ORDER BY "confidence" DESC, "updatedAt" DESC
      LIMIT ${Math.max(1, Math.min(input.limit || 80, 200))}
    `;
    return rows.map(mapNode);
  } catch (error) {
    return [];
  }
}

export async function getCognitiveFoundationAdminSummary() {
  try {
    const rows = await prisma.$queryRaw<Array<{
      feature: string;
      event_type: string;
      status: string;
      count: bigint | number;
    }>>`
      SELECT "feature", "eventType" AS event_type, "status", COUNT(*) AS count
      FROM "CognitiveFoundationAudit"
      GROUP BY "feature", "eventType", "status"
      ORDER BY "feature", "eventType", "status"
    `;
    return {
      migrationReady: true,
      rows: rows.map((row) => ({
        feature: row.feature,
        eventType: row.event_type,
        status: row.status,
        count: Number(row.count),
      })),
    };
  } catch {
    return {
      migrationReady: false,
      rows: [],
    };
  }
}
