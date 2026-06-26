import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import {
  buildCreatorObservatoryMarkdown,
  createCreatorObservatoryReport,
} from "@/app/lib/admin/creatorObservatory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function attachmentName(extension: "json" | "md") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `observatorio-do-criador-${stamp}.${extension}`;
}

export async function GET(request: Request) {
  let session: any;

  try {
    session = await auth();
  } catch (error) {
    console.error("[Creator Observatory] Auth check failed:", error);
    return NextResponse.json(
      {
        error: "Falha ao validar sessão administrativa.",
        diagnostic: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const download = url.searchParams.get("download") === "1";
  const liveChecks = url.searchParams.get("live") !== "0";

  try {
    const report = await createCreatorObservatoryReport({
      generatedBy: session?.user?.email || null,
      liveChecks,
    });

    if (format === "markdown" || format === "md") {
      return new NextResponse(buildCreatorObservatoryMarkdown(report), {
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "content-disposition": `attachment; filename="${attachmentName("md")}"`,
          "cache-control": "no-store",
        },
      });
    }

    const response = NextResponse.json(report, {
      headers: {
        "cache-control": "no-store",
      },
    });

    if (download || format === "json") {
      response.headers.set("content-disposition", `attachment; filename="${attachmentName("json")}"`);
    }

    return response;
  } catch (error) {
    console.error("[Creator Observatory] Diagnostic generation failed:", error);
    return NextResponse.json(
      {
        error: "Falha ao gerar diagnóstico sanitário.",
        diagnostic: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
