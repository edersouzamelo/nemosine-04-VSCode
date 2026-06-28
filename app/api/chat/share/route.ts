import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getThread, prisma } from "@/app/lib/nemosine/session_store";

export const dynamic = "force-dynamic";

async function ensureSharedChatsTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS shared_chats (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      title TEXT NOT NULL,
      persona_id TEXT NOT NULL,
      messages_json TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return unauthorized();

    const { threadId } = await request.json();
    if (typeof threadId !== "string" || !threadId.trim()) {
      return NextResponse.json({ error: "Thread obrigatório" }, { status: 400 });
    }

    const thread = await getThread(userId, threadId);
    if (!thread) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

    await ensureSharedChatsTable();
    const token = crypto.randomUUID().replace(/-/g, "");
    const messagesJson = JSON.stringify(thread.messages.filter((message) => (
      message.role !== "system" || message.messageKind === "SYSTEM_EVENT"
    )));

    await prisma.$executeRaw`
      INSERT INTO shared_chats (token, user_id, thread_id, title, persona_id, messages_json)
      VALUES (${token}, ${userId}, ${thread.id}, ${thread.title}, ${thread.personaId}, ${messagesJson})
    `;

    return NextResponse.json({ url: `/shared/chat/${token}`, token });
  } catch (error) {
    console.error("[API/Chat Share POST] Error:", error);
    return NextResponse.json({ error: "Erro ao compartilhar conversa" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

    await ensureSharedChatsTable();
    const rows = await prisma.$queryRaw<Array<{
      token: string;
      title: string;
      persona_id: string;
      messages_json: string;
      created_at: Date;
    }>>`
      SELECT token, title, persona_id, messages_json, created_at
      FROM shared_chats
      WHERE token = ${token}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Conversa compartilhada não encontrada" }, { status: 404 });

    return NextResponse.json({
      chat: {
        token: row.token,
        title: row.title,
        personaId: row.persona_id,
        messages: JSON.parse(row.messages_json || "[]"),
        createdAt: row.created_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("[API/Chat Share GET] Error:", error);
    return NextResponse.json({ error: "Erro ao carregar conversa compartilhada" }, { status: 500 });
  }
}
