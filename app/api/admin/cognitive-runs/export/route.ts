import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import { prisma } from "@/app/lib/nemosine/session_store";
import { getSafeCognitiveRuntimeConfig } from "@/app/lib/admin/cognitiveRuntimeConfig";
import { getCognitiveRunsExport, parseCognitiveRunQuery } from "@/app/lib/admin/cognitiveRuns";
import { generateCognitiveRunsReportPdf } from "@/app/lib/admin/cognitiveRunsPdf";
import { recordCasaDeMaquinasPdfExport } from "@/app/lib/admin/cognitiveExportAudit";

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

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return jsonResponse({ error: "Acesso negado" }, 403);
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "page";
  const parsed = parseCognitiveRunQuery(url.searchParams);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, parsed.status);
  }

  try {
    const data = await getCognitiveRunsExport(prisma, parsed.filters, parsed.activeFilters, scope);
    const runtimeConfig = getSafeCognitiveRuntimeConfig();
    const pdf = generateCognitiveRunsReportPdf({
      data,
      runtimeConfig,
      activeFilters: parsed.activeFilters,
      exportScope: scope,
      origin: url.origin,
    });
    recordCasaDeMaquinasPdfExport({
      adminEmail: session?.user?.email,
      scope,
      rowCount: data.rows.length,
    });
    return new Response(pdf, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="casa-de-maquinas-${scope}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return jsonResponse({
      error: "Falha ao exportar PDF da Casa de Maquinas.",
      diagnostic: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
