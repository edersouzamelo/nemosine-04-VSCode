import { auth } from "@/auth";
import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";

export const dynamic = "force-dynamic";

function clean(value: unknown, max = 80) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sourcePersona = clean(body.sourcePersona);
  const targetPersona = clean(body.targetPersona);
  const targetSlug = clean(body.targetSlug);
  const threadId = clean(body.threadId, 120);

  if (!sourcePersona || !targetPersona || !targetSlug) {
    return Response.json({ error: "Invalid handoff metadata" }, { status: 400 });
  }

  console.info("[NemosineHandoffAudit]", {
    event: "HANDOFF_SELECTED",
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
