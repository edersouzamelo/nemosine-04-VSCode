import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizePresenceMode, sanitizePresenceTelemetry } from "@/app/lib/nemosine/presence_adjustment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = normalizePresenceMode(process.env.PRESENCE_ADJUSTMENT_MODE);
  const body = await request.json().catch(() => null);
  const event = sanitizePresenceTelemetry(body || {});

  console.info("[PresenceAdjustment] telemetry received", {
    mode,
    flowType: event.flowType,
    outcome: event.outcome,
    personaId: event.personaId || null,
    contractApplied: event.contractApplied,
  });

  return NextResponse.json({ ok: true });
}
