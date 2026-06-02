import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { 
  getUserRegistros, 
  createUserRegistry, 
  updateUserRegistry, 
  deleteUserRegistry 
} from "@/app/lib/userFeatureStore";

export const dynamic = "force-dynamic";

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const registros = await getUserRegistros(userId);
    return NextResponse.json({ registros });
  } catch (error) {
    console.error("[API/Registros GET] Error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const idea = String(body.idea !== undefined ? body.idea : "").trim();

    const registry = {
      id: String(body.id || crypto.randomUUID()),
      idea,
      chat_origin_id: body.chat_origin_id ? String(body.chat_origin_id) : null,
      persona: body.persona ? String(body.persona) : null,
      status: String(body.status || "Pendente"),
      last_interaction: body.last_interaction ? String(body.last_interaction) : null,
      next_deadline: body.next_deadline ? String(body.next_deadline) : null,
      external_links: body.external_links ? String(body.external_links) : null,
      custom_columns: body.custom_columns ? String(body.custom_columns) : null,
    };

    await createUserRegistry(userId, registry);
    return NextResponse.json({ ok: true, registry });
  } catch (error) {
    console.error("[API/Registros POST] Error:", error);
    return NextResponse.json({ error: "Erro ao criar registro" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "O ID do registro é obrigatório" }, { status: 400 });
    }

    const updates: any = {};
    if (body.idea !== undefined) updates.idea = String(body.idea).trim();
    if (body.chat_origin_id !== undefined) updates.chat_origin_id = body.chat_origin_id ? String(body.chat_origin_id) : null;
    if (body.persona !== undefined) updates.persona = body.persona ? String(body.persona) : null;
    if (body.status !== undefined) updates.status = String(body.status);
    if (body.last_interaction !== undefined) updates.last_interaction = body.last_interaction ? String(body.last_interaction) : null;
    if (body.next_deadline !== undefined) updates.next_deadline = body.next_deadline ? String(body.next_deadline) : null;
    if (body.external_links !== undefined) updates.external_links = body.external_links ? String(body.external_links) : null;
    if (body.custom_columns !== undefined) updates.custom_columns = body.custom_columns ? String(body.custom_columns) : null;

    await updateUserRegistry(userId, id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API/Registros PUT] Error:", error);
    return NextResponse.json({ error: "Erro ao atualizar registro" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "O ID do registro é obrigatório" }, { status: 400 });
    }

    await deleteUserRegistry(userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API/Registros DELETE] Error:", error);
    return NextResponse.json({ error: "Erro ao deletar registro" }, { status: 500 });
  }
}
