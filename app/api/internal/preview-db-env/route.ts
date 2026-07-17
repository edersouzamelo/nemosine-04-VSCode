import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function connectionTarget() {
  try {
    const value = process.env.DATABASE_URL?.trim();
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

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  let databaseReachable = false;
  let databaseError: string | null = null;

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    databaseError = sanitizeErrorMessage(error)
      .split("\n")
      .filter(Boolean)
      .slice(-1)[0] || "unknown_error";
  }

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV,
    directUrl: Boolean(process.env.DIRECT_URL?.trim()),
    target: connectionTarget(),
    databaseReachable,
    databaseError,
  });
}
