import { auth } from "@/auth";
import {
  createHandoffContext,
  getHandoffContext,
} from "@/app/lib/nemosine/session_store";
import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";

export const dynamic = "force-dynamic";

function clean(value: unknown, max = 4000) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email || !session.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sourceThreadId = clean(body.sourceThreadId, 120);
  const sourceMessageId = clean(body.sourceMessageId, 120);
  const originMessageId = clean(body.originMessageId, 120);
  const sourcePersona = clean(body.sourcePersona, 80);
  const targetPersona = clean(body.targetPersona, 80);
  const userAuthoredPrompt = clean(body.userAuthoredPrompt, 4000);
  const structuredSummary = clean(body.structuredSummary, 1000);
  const requiresConfirmation = Boolean(body.requiresConfirmation);

  if (!sourceThreadId || !sourcePersona || !targetPersona || !userAuthoredPrompt) {
    return Response.json({ error: "Invalid handoff context" }, { status: 400 });
  }

  const context = await createHandoffContext(session.user.id, {
    sourceThreadId,
    sourceMessageIds: [sourceMessageId, originMessageId].filter(Boolean),
    sourcePersona,
    targetPersona,
    userAuthoredPrompt,
    structuredSummary,
    requiresConfirmation,
  });

  console.info("[NemosineHandoffContext]", {
    event: "HANDOFF_CONTEXT_SOURCE",
    sourceThreadIdHash: hashText(sourceThreadId),
    sourceMessageIdHash: sourceMessageId ? hashText(sourceMessageId) : null,
    messageKind: "user-authored",
    originalLength: userAuthoredPrompt.length,
    transportedLength: context.userAuthoredPrompt.length,
    syntheticPresenceExcluded: true,
  });

  return Response.json({
    ok: true,
    handoffContextId: context.id,
    url: `/agents/${encodeURIComponent(String(body.targetSlug || targetPersona))}?handoffContextId=${encodeURIComponent(context.id)}`,
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email || !session.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = clean(searchParams.get("id"), 120);
  if (!id) return Response.json({ error: "Missing handoffContextId" }, { status: 400 });

  const context = await getHandoffContext(session.user.id, id);
  if (!context) return Response.json({ error: "Handoff context not found" }, { status: 404 });
  if ("expired" in context) return Response.json({ error: "Handoff context expired" }, { status: 410 });

  return Response.json({ context });
}
