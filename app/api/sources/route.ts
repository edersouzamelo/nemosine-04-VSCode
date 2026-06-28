import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { auth } from "@/auth";
import { createUserSource, deleteUserSource, listUserSources, buildUserSourceProfileMemory } from "@/app/lib/sourceStore";
import { addUserMemory } from "@/app/lib/nemosine/session_store";
import { isPrivateMemorySpace } from "@/app/lib/nemosine/privacy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

async function getUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function extractText(file: File) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Arquivo acima do limite de 8 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name.toLowerCase();
  const mime = file.type;

  if (mime === "application/pdf" || filename.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || filename.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (
    mime.startsWith("text/")
    || filename.endsWith(".txt")
    || filename.endsWith(".md")
    || filename.endsWith(".csv")
  ) {
    return buffer.toString("utf8");
  }

  throw new Error("Formato ainda não suportado. Envie PDF, DOCX, TXT, MD ou CSV.");
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get("personaId")?.trim() || null;
    const sources = await listUserSources(userId, personaId);
    return NextResponse.json({
      sources: sources.map((source) => ({
        id: source.id,
        filename: source.filename,
        mimeType: source.mimeType,
        personaId: source.personaId,
        createdAt: source.createdAt,
        preview: source.content.slice(0, 280),
      })),
    });
  } catch (error) {
    console.error("[Sources GET]", error);
    return NextResponse.json({ error: "Não foi possível carregar as fontes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const formData = await req.formData();
    const file = formData.get("file");
    const personaId = String(formData.get("personaId") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie um arquivo válido." }, { status: 400 });
    }

    const content = await extractText(file);
    await createUserSource({
      userId,
      personaId: personaId || null,
      filename: file.name || "fonte",
      mimeType: file.type || null,
      content,
    });
    const profileMemory = buildUserSourceProfileMemory({
      personaId: personaId || null,
      filename: file.name || "fonte",
      content,
    });
    if (profileMemory) {
      await addUserMemory(
        userId,
        profileMemory,
        personaId && isPrivateMemorySpace(personaId) ? personaId : undefined,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sources POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível processar este arquivo." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Fonte não informada." }, { status: 400 });
    }

    await deleteUserSource(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sources DELETE]", error);
    return NextResponse.json({ error: "Não foi possível excluir a fonte." }, { status: 500 });
  }
}
