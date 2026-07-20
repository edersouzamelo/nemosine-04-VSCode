import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";
import { updateHandoffEventState } from "@/app/lib/nemosine/session_store";
import type { HandoffState } from "@/app/lib/nemosine/handoff";

export const dynamic = "force-dynamic";

function clean(value: unknown, max = 80) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email || !session.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(session.user.email)) {
    return Response.json({ error: "DEV_ONLY" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const sourcePersona = clean(body.sourcePersona);
  const targetPersona = clean(body.targetPersona);
  const targetSlug = clean(body.targetSlug);
  const threadId = clean(body.threadId, 120);
  const messageId = clean(body.messageId, 120);
  const originMessageId = clean(body.originMessageId, 120);
  const action = clean(body.action, 30);

  if (!sourcePersona || !targetPersona || !targetSlug) {
    return Response.json({ error: "Invalid handoff metadata" }, { status: 400 });
  }

  const state: HandoffState = action === "invited"
    ? "invited"
    : action === "declined"
      ? "declined"
      : action === "unavailable"
        ? "unavailable"
        : "opened";

  await updateHandoffEventState(session.user.id, {
    messageId,
    threadId,
    originMessageId,
    targetPersona,
    state,
  }).catch((error) => {
    console.warn("[NemosineHandoffAudit] State update skipped.", error);
  });

  console.info("[NemosineHandoffAudit]", {
    event: state === "invited" ? "HANDOFF_INVITED" : state === "opened" ? "HANDOFF_OPENED" : "HANDOFF_STATUS_UPDATED",
    at: new Date().toISOString(),
    userEmailHash: hashText(session.user.email),
    sourcePersona,
    targetPersona,
    targetSlug,
    threadIdHash: threadId ? hashText(threadId) : null,
    contentStored: false,
  });

  return Response.json({ ok: true });
}
