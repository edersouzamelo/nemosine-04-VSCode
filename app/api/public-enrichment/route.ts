import { auth } from "@/auth";
import { isIntegrationOwner } from "@/app/lib/integration_capabilities";
import {
  buildPublicEnrichmentPlan,
  isWebEnrichmentActive,
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
  if (!isIntegrationOwner(session.user.email)) {
    return jsonResponse({ error: "WEB_ENRICHMENT_DEV_ONLY" }, 403);
  }

  const config = readCognitiveFoundationConfig();
  if (!isWebEnrichmentActive(config.webEnrichmentMode)) {
    return jsonResponse({
      error: "WEB_ENRICHMENT_DISABLED",
      mode: config.webEnrichmentMode,
    }, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Invalid body" }, 400);
  }

  const plan = buildPublicEnrichmentPlan({
    consent: body.consent === true,
    providedName: typeof body.providedName === "string" ? body.providedName : null,
    identifiers: Array.isArray(body.identifiers) ? body.identifiers : [],
    links: Array.isArray(body.links) ? body.links : [],
    authorizedDomains: Array.isArray(body.authorizedDomains) ? body.authorizedDomains : [],
  });

  return jsonResponse({
    mode: config.webEnrichmentMode,
    networkFetchPerformed: false,
    persisted: false,
    plan,
  });
}
