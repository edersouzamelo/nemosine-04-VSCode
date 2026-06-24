import { auth } from "@/auth";
import { prisma } from "@/app/lib/nemosine/session_store";
import { handleCognitiveRunDetailRequest } from "@/app/lib/admin/cognitiveRuns";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  return handleCognitiveRunDetailRequest(request, {
    session: await auth(),
    prisma,
    runId,
  });
}
