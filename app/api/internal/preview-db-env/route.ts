import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const isPreview = process.env.VERCEL_ENV === "preview";
  if (!isPreview) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV ?? null,
    databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    directUrl: Boolean(process.env.DIRECT_URL?.trim()),
    postgresUrl: Boolean(process.env.POSTGRES_URL?.trim()),
    postgresPrismaUrl: Boolean(process.env.POSTGRES_PRISMA_URL?.trim()),
    supabaseDatabaseUrl: Boolean(process.env.SUPABASE_DATABASE_URL?.trim()),
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
  });
}
