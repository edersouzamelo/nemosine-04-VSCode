import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import { normalizePresenceMode } from "@/app/lib/nemosine/presence_adjustment";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const configuredMode = normalizePresenceMode(process.env.PRESENCE_ADJUSTMENT_MODE);
  const localOrPreview = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const mode = configuredMode === "off" && isAdminEmail(session?.user?.email) && localOrPreview
    ? "internal"
    : configuredMode;
  const internalAllowed = mode === "internal" && isAdminEmail(session?.user?.email);
  const enabled = Boolean(session?.user?.id) && (mode === "enforce" || mode === "shadow" || internalAllowed);

  return NextResponse.json({
    mode,
    enabled,
    appliesToRuntime: enabled && mode !== "shadow",
    userId: session?.user?.id || null,
    internal: isAdminEmail(session?.user?.email),
    staleDays: Number(process.env.PRESENCE_STALE_DAYS || 7),
    minDaysBetweenPulses: Number(process.env.PRESENCE_MIN_DAYS_BETWEEN_PULSES || 7),
    maxQuestions: Number(process.env.PRESENCE_MAX_QUESTIONS || 3),
  }, {
    headers: { "cache-control": "no-store" },
  });
}
