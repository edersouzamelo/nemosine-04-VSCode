import { auth } from "@/auth";
import { prisma } from "@/app/lib/nemosine/session_store";
import { handleCognitiveRunsListRequest } from "@/app/lib/admin/cognitiveRuns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleCognitiveRunsListRequest(request, {
    session: await auth(),
    prisma,
  });
}
