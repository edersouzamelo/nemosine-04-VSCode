import { auth } from "@/auth";
import { handleCognitiveRuntimeConfigRequest } from "@/app/lib/admin/cognitiveRuntimeConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleCognitiveRuntimeConfigRequest({
    session: await auth(),
  });
}
