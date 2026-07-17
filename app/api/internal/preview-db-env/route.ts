import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROJECT_REF = "jhxdlzecuqxpkiodowdf";
const REGION = "us-east-1";

function connectionTarget(value = process.env.DATABASE_URL?.trim()) {
  try {
    if (!value) return null;
    const url = new URL(value);
    return {
      host: url.hostname,
      port: url.port || "5432",
      username: decodeURIComponent(url.username),
      pooled: /pooler\.supabase\.com$/i.test(url.hostname),
    };
  } catch {
    return null;
  }
}

function sanitizeErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "unknown_error");
  return raw
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[DATABASE_URL_REDACTED]")
    .replace(/password=[^\s&]+/gi, "password=[REDACTED]")
    .replace(/:\/\/[^@\s]+@/g, "://[REDACTED]@");
}

function candidateUrl(index: number) {
  const direct = process.env.DIRECT_URL?.trim();
  if (!direct) return null;

  try {
    const url = new URL(direct);
    url.username = `postgres.${PROJECT_REF}`;
    url.hostname = `aws-${index}-${REGION}.pooler.supabase.com`;
    url.port = "6543";
    url.searchParams.set("pgbouncer", "true");
    url.searchParams.set("connection_limit", "1");
    url.searchParams.set("connect_timeout", "3");
    url.searchParams.set("pool_timeout", "3");
    url.searchParams.set("sslmode", "require");
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const { PrismaClient } = await import("@prisma/client");
  const probes: Array<{
    index: number;
    host: string;
    reachable: boolean;
    error: string | null;
  }> = [];

  let discoveredUrl: string | null = null;

  for (let index = 0; index <= 5; index += 1) {
    const url = candidateUrl(index);
    if (!url) break;

    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      await prisma.$queryRaw`SELECT 1`;
      probes.push({
        index,
        host: connectionTarget(url)?.host || `aws-${index}-${REGION}.pooler.supabase.com`,
        reachable: true,
        error: null,
      });
      discoveredUrl = url;
      break;
    } catch (error) {
      const message = sanitizeErrorMessage(error);
      probes.push({
        index,
        host: connectionTarget(url)?.host || `aws-${index}-${REGION}.pooler.supabase.com`,
        reachable: false,
        error: message.split("\n").filter(Boolean).slice(-1)[0] || "unknown_error",
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV,
    directUrl: Boolean(process.env.DIRECT_URL?.trim()),
    currentTarget: connectionTarget(),
    discoveredTarget: connectionTarget(discoveredUrl || undefined),
    databaseReachable: Boolean(discoveredUrl),
    probes,
  });
}
