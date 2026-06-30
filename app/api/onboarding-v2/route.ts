import { auth } from "@/auth";
import {
  buildOnboardingV2Mirror,
  isOnboardingV2Active,
  readCognitiveFoundationConfig,
} from "@/app/lib/nemosine/cognitive-foundation";

export const dynamic = "force-dynamic";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const config = readCognitiveFoundationConfig();
  if (!isOnboardingV2Active(config.onboardingV2Mode)) {
    return jsonResponse({
      error: "ONBOARDING_V2_DISABLED",
      mode: config.onboardingV2Mode,
    }, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Invalid body" }, 400);
  }

  const mirror = buildOnboardingV2Mirror({
    userId: session.user.id,
    entryReason: typeof body.entryReason === "string" ? body.entryReason : null,
    timelineEvents: Array.isArray(body.timelineEvents) ? body.timelineEvents : [],
    choicesUnderTension: Array.isArray(body.choicesUnderTension) ? body.choicesUnderTension : [],
    freeReport: typeof body.freeReport === "string" ? body.freeReport : null,
    optionalImports: Array.isArray(body.optionalImports) ? body.optionalImports : [],
    personaAccess: Array.isArray(body.personaAccess) ? body.personaAccess : null,
  });

  return jsonResponse({
    mode: config.onboardingV2Mode,
    persisted: false,
    mirror,
  });
}
