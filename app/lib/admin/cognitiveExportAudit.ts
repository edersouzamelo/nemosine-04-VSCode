import { hashText } from "@/app/lib/nemosine/cognitive-runtime/audit-redaction";

export function recordCasaDeMaquinasPdfExport(input: {
  adminEmail?: string | null;
  scope: "page" | "all" | "detail";
  runId?: string | null;
  rowCount?: number | null;
}) {
  console.info("[CasaDeMaquinasPdfExport]", {
    at: new Date().toISOString(),
    adminEmailHash: input.adminEmail ? hashText(input.adminEmail) : null,
    scope: input.scope,
    runId: input.runId || null,
    rowCount: input.rowCount ?? null,
    pdfStored: false,
    contentStored: false,
  });
}
