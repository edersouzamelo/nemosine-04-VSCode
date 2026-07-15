import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";

export function recordCasaDeMaquinasPdfExport(input: {
  adminEmail?: string | null;
  scope: "page" | "all" | "detail";
  runId?: string | null;
  rowCount?: number | null;
  status?: "success" | "failed";
  failureCode?: string | null;
}) {
  console.info("[CasaDeMaquinasPdfExport]", {
    event: input.status === "failed" ? "PDF_EXPORT_FAILED" : "PDF_EXPORT_SUCCEEDED",
    at: new Date().toISOString(),
    adminEmailHash: input.adminEmail ? hashText(input.adminEmail) : null,
    scope: input.scope,
    runId: input.runId || null,
    rowCount: input.rowCount ?? null,
    status: input.status || "success",
    failureCode: input.failureCode || null,
    pdfStored: false,
    contentStored: false,
  });
}
