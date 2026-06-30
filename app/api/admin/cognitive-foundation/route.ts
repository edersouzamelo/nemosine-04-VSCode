import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import {
  getCognitiveFoundationAdminSummary,
  readCognitiveFoundationConfig,
} from "@/app/lib/nemosine/cognitive-foundation";

export const dynamic = "force-dynamic";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return jsonResponse({ error: "Acesso negado" }, 403);
  }

  const config = readCognitiveFoundationConfig();
  const summary = await getCognitiveFoundationAdminSummary();

  return jsonResponse({
    config,
    summary,
    privacy: {
      rawPromptsReturned: false,
      rawMessagesReturned: false,
      confessorContentReturned: false,
      metadataOnly: true,
    },
  });
}
