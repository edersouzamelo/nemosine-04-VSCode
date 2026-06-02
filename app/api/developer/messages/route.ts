import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import { 
  createDeveloperMessage, 
  getDeveloperMessages, 
  archiveDeveloperMessage, 
  deleteDeveloperMessage, 
  markDeveloperMessageRead, 
  getUnreadDeveloperMessagesCount 
} from "@/app/lib/userFeatureStore";

export async function GET(request: Request) {
  const session = await auth();

  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("archived") === "true";

  const messages = await getDeveloperMessages(includeArchived);
  const unreadCount = await getUnreadDeveloperMessagesCount();
  return NextResponse.json({ messages, unreadCount });
}

export async function POST(request: Request) {
  const session = await auth();

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const city = String(body.city || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Preencha nome, email e mensagem." }, { status: 400 });
    }

    let formattedMessage = message;
    if (city || whatsapp) {
      formattedMessage = `--- INFO CONTATO ADICIONAL ---\n${city ? `Cidade: ${city}\n` : ""}${whatsapp ? `WhatsApp: ${whatsapp}\n` : ""}------------------------------\n\n${message}`;
    }

    await createDeveloperMessage({
      name,
      email,
      subject,
      message: formattedMessage,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar a mensagem." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || "");
    const action = String(body.action || ""); // 'archive' | 'markRead'

    if (!id) {
      return NextResponse.json({ error: "ID da mensagem não fornecido." }, { status: 400 });
    }

    if (action === "archive") {
      const archived = Boolean(body.archived);
      await archiveDeveloperMessage(id, archived);
    } else if (action === "markRead") {
      const isRead = Boolean(body.isRead);
      await markDeveloperMessageRead(id, isRead);
    } else {
      return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar mensagem." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID da mensagem não fornecido." }, { status: 400 });
    }

    await deleteDeveloperMessage(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao apagar mensagem." }, { status: 500 });
  }
}
