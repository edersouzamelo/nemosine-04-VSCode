import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { storeCognitiveFoundationAudit } from "@/app/lib/nemosine/cognitive-foundation/audit";
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

  await storeCognitiveFoundationAudit({
    userId: session.user.id,
    personaId: event.personaId || null,
    feature: "presence_adjustment",
    mode,
    eventType: event.flowType,
    status: event.outcome === "CONFIRMED" ? "ok" : "attention",
    metrics: {
      triggerReason: event.triggerReason,
      questionCount: event.questionCount,
      skippedQuestions: event.skippedQuestions,
      durationMs: event.durationMs,
      outcome: event.outcome,
      scope: event.scope || null,
      activePolicies: event.activePolicies,
      genericClosingDetected: event.genericClosingDetected,
      contextRequestBlocked: event.contextRequestBlocked,
      regenerationExecuted: event.regenerationExecuted,
      contractApplied: event.contractApplied,
    },
    findingCodes: [
      event.genericClosingDetected ? "GENERIC_CLOSING_DETECTED" : "",
      event.contextRequestBlocked ? "GENERIC_CONTEXT_REQUEST_BLOCKED" : "",
      event.regenerationExecuted ? "PRESENCE_REGENERATION_EXECUTED" : "",
      event.contractApplied ? "PRESENCE_CONTRACT_APPLIED" : "PRESENCE_CONTRACT_NOT_APPLIED",
    ].filter(Boolean),
    privateRun: false,
  });

  return NextResponse.json({ ok: true });
}
