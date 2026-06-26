import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

type TraceItem = {
  id: string;
  type: "chat" | "registro" | "memoria";
  title: string;
  summary: string;
  occurredAt: string;
  sourceHref?: string | null;
};

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}

async function ensureHiddenTracesTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS user_hidden_traces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      trace_id TEXT NOT NULL,
      hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, trace_id)
    )
  `;
}

function compactText(value: string | null | undefined, limit = 620) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trim()}…`;
}

function getEntitySlug(name: string) {
  const baseName = name.split(" @ ")[0]?.trim() || name;
  if (baseName === "Bobo") return "bobo-da-corte";
  if (baseName === "Confessor") return "confessor-2.0";
  if (baseName === "Orquestrador") return "orquestrador-arquiteto";
  return baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    await ensureHiddenTracesTable();

    const hiddenRows = await prisma.$queryRaw<Array<{ trace_id: string }>>`
      SELECT trace_id
      FROM user_hidden_traces
      WHERE user_id = ${userId}
    `;
    const hidden = new Set(hiddenRows.map((row) => row.trace_id));

    const [threads, registros, memories] = await Promise.all([
      prisma.thread.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 80,
        include: {
          messages: {
            orderBy: { timestamp: "desc" },
            take: 5,
            select: {
              id: true,
              role: true,
              content: true,
              timestamp: true,
            },
          },
        },
      }),
      prisma.$queryRaw<Array<{
        id: string;
        idea: string;
        persona: string | null;
        status: string;
        last_interaction: string | null;
        next_deadline: string | null;
        created_at: Date;
      }>>`
        SELECT id, idea, persona, status, last_interaction, next_deadline, created_at
        FROM user_registros
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 80
      `.catch(() => []),
      prisma.userMemory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 80,
        select: {
          id: true,
          content: true,
          personaId: true,
          createdAt: true,
        },
      }),
    ]);

    const traces: TraceItem[] = [];

    for (const thread of threads) {
      const traceId = `chat:${thread.id}`;
      if (hidden.has(traceId) || thread.messages.length === 0) continue;

      const chronological = [...thread.messages].reverse();
      const summary = chronological
        .map((message) => `${message.role === "user" ? "Usuário" : "Nemosine"}: ${compactText(message.content, 220)}`)
        .join("\n");

      traces.push({
        id: traceId,
        type: "chat",
        title: thread.title || `Conversa com ${thread.personaId}`,
        summary: compactText(summary, 860),
        occurredAt: thread.updatedAt.toISOString(),
        sourceHref: `/agents/${getEntitySlug(thread.personaId)}?threadId=${encodeURIComponent(thread.id)}`,
      });
    }

    for (const registro of registros) {
      const traceId = `registro:${registro.id}`;
      if (hidden.has(traceId)) continue;

      const details = [
        registro.persona ? `Persona: ${registro.persona}` : null,
        registro.status ? `Status: ${registro.status}` : null,
        registro.next_deadline ? `Prazo: ${registro.next_deadline}` : null,
      ].filter(Boolean).join(" · ");

      traces.push({
        id: traceId,
        type: "registro",
        title: "Registro criado ou atualizado",
        summary: compactText(`${registro.idea}${details ? `\n${details}` : ""}`),
        occurredAt: (registro.created_at || new Date()).toISOString(),
        sourceHref: "/space/registros",
      });
    }

    for (const memory of memories) {
      const traceId = `memoria:${memory.id}`;
      if (hidden.has(traceId)) continue;

      traces.push({
        id: traceId,
        type: "memoria",
        title: memory.personaId ? `Memória em ${memory.personaId}` : "Memória persistente",
        summary: compactText(memory.content),
        occurredAt: memory.createdAt.toISOString(),
        sourceHref: null,
      });
    }

    traces.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return NextResponse.json({ rastros: traces.slice(0, 160) });
  } catch (error) {
    console.error("[API/Rastros GET] Error:", error);
    return NextResponse.json({ error: "Erro ao carregar rastros" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    await ensureHiddenTracesTable();
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.map((id: unknown) => String(id)).filter(Boolean) : [];

    for (const traceId of ids.slice(0, 100)) {
      await prisma.$executeRaw`
        INSERT INTO user_hidden_traces (id, user_id, trace_id)
        VALUES (${crypto.randomUUID()}, ${userId}, ${traceId})
        ON CONFLICT (user_id, trace_id) DO NOTHING
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API/Rastros DELETE] Error:", error);
    return NextResponse.json({ error: "Erro ao excluir rastros" }, { status: 500 });
  }
}
