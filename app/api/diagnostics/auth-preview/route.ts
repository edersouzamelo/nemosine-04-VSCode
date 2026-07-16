import { NextResponse } from "next/server";

function describe(value: string | undefined) {
  const normalized = String(value || "").trim();
  return {
    present: normalized.length > 0,
    length: normalized.length,
    googleClientIdShape: normalized.endsWith(".apps.googleusercontent.com"),
  };
}

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  return NextResponse.json({
    environment: process.env.VERCEL_ENV,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7),
    authGoogleId: describe(process.env.AUTH_GOOGLE_ID),
    authGoogleSecret: {
      present: Boolean(String(process.env.AUTH_GOOGLE_SECRET || "").trim()),
      length: String(process.env.AUTH_GOOGLE_SECRET || "").trim().length,
    },
    authSecret: {
      present: Boolean(String(process.env.AUTH_SECRET || "").trim()),
      length: String(process.env.AUTH_SECRET || "").trim().length,
    },
    authUrl: {
      present: Boolean(String(process.env.AUTH_URL || "").trim()),
      pointsToProduction: /app\.nemosinenous\.com/i.test(String(process.env.AUTH_URL || "")),
    },
  });
}
