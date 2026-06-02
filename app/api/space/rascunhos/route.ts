import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  deleteUserDraft,
  getUserDrafts,
  updateUserDraftOrder,
  upsertUserDraft,
} from "@/app/lib/userFeatureStore";

export const dynamic = "force-dynamic";

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}

function normalizeDraftBody(body: any) {
  return {
    id: String(body.id || crypto.randomUUID()),
    title: String(body.title || ""),
    type: String(body.type || "text"),
    content: String(body.content || ""),
    checklist: Array.isArray(body.checklist) ? body.checklist : [],
    imageData: body.imageData ? String(body.imageData) : null,
    color: String(body.color || "#c5a059"),
    createdAt: body.createdAt ? String(body.createdAt) : undefined,
    updatedAt: body.updatedAt ? String(body.updatedAt) : new Date().toISOString(),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
  };
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const drafts = await getUserDrafts(userId);
    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("[API/Rascunhos GET] Error:", error);
    return NextResponse.json({ error: "Erro ao carregar rascunhos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const draft = normalizeDraftBody(body);
    await upsertUserDraft(userId, draft);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    console.error("[API/Rascunhos POST] Error:", error);
    return NextResponse.json({ error: "Erro ao salvar rascunho" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    if (Array.isArray(body.order)) {
      await updateUserDraftOrder(userId, body.order.map((id: unknown) => String(id)).filter(Boolean));
      return NextResponse.json({ ok: true });
    }

    const draft = normalizeDraftBody(body);
    await upsertUserDraft(userId, draft);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    console.error("[API/Rascunhos PUT] Error:", error);
    return NextResponse.json({ error: "Erro ao atualizar rascunho" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "O ID do rascunho é obrigatório" }, { status: 400 });
    }

    await deleteUserDraft(userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API/Rascunhos DELETE] Error:", error);
    return NextResponse.json({ error: "Erro ao excluir rascunho" }, { status: 500 });
  }
}
