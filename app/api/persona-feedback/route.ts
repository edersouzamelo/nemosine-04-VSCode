import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { storeCognitiveFoundationAudit } from "@/app/lib/nemosine/cognitive-foundation/audit";

export const dynamic = "force-dynamic";

function sanitizeToken(value: unknown, maxLength = 160) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/[^\p{L}\p{N}@._:\-/\s]/gu, "").slice(0, maxLength);
}

function sanitizeNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return Math.min(Math.floor(numeric), 100_000);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rating = body?.rating === "up" || body?.rating === "down" ? body.rating : null;
  if (!rating) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  const personaId = sanitizeToken(body?.personaId, 80);
  const threadId = sanitizeToken(body?.threadId, 160);
  const messageId = sanitizeToken(body?.messageId, 160);
  const hostPersonaId = sanitizeToken(body?.hostPersonaId, 80);
  const turnGroupId = sanitizeToken(body?.turnGroupId, 160);

  await storeCognitiveFoundationAudit({
    userId: session.user.id,
    threadId,
    personaId,
    feature: "persona-feedback",
    mode: "observe",
    eventType: "message-rating",
    status: rating === "up" ? "ok" : "attention",
    metrics: {
      rating,
      messageId,
      hostPersonaId,
      turnGroupId,
      messageLength: sanitizeNumber(body?.messageLength),
      source: "chat-message-controls",
    },
    findingCodes: [
      rating === "up" ? "PERSONA_RESPONSE_APPROVED" : "PERSONA_RESPONSE_REJECTED",
    ],
    privateRun: false,
  });

  return NextResponse.json({ ok: true });
}
