import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import { prisma } from "@/app/lib/nemosine/session_store";
import { getSafeCognitiveRuntimeConfig } from "@/app/lib/admin/cognitiveRuntimeConfig";
import { getCognitiveRunDetail } from "@/app/lib/admin/cognitiveRuns";
import { PdfValidationError, generateCognitiveRunDetailPdf } from "@/app/lib/admin/cognitiveRunsPdf";
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return jsonResponse({ error: "Acesso negado" }, 403);
  }

  const { runId } = await params;
  try {
    const detail = await getCognitiveRunDetail(prisma, runId);
    if (!detail) {
      return jsonResponse({ error: "Cognitive run audit not found." }, 404);
    }
    const runtimeConfig = getSafeCognitiveRuntimeConfig();
    const pdf = await generateCognitiveRunDetailPdf({
      detail,
      runtimeConfig,
      origin: new URL(request.url).origin,
    });
    recordCasaDeMaquinasPdfExport({
      adminEmail: session?.user?.email,
      scope: "detail",
      runId,
      rowCount: 1,
      status: "success",
    });
    return new Response(pdf, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="casa-de-maquinas-${encodeURIComponent(runId)}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    recordCasaDeMaquinasPdfExport({
      adminEmail: session?.user?.email,
      scope: "detail",
      runId,
      rowCount: 1,
      status: "failed",
      failureCode: error instanceof PdfValidationError ? error.code : "PDF_EXPORT_ERROR",
    });
    return jsonResponse({
      error: "Nao foi possivel gerar um PDF valido desta execucao. Nenhum arquivo foi baixado.",
      code: error instanceof PdfValidationError ? error.code : "PDF_EXPORT_ERROR",
      diagnostic: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
