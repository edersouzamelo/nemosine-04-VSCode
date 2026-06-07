import { PrismaClient } from "@prisma/client";
import type { RastroEvent, RastroEventInput, RastroStatus, RastroTipo } from "./types";

const prisma = new PrismaClient();

async function ensureRastrosTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS user_rastros (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      origem TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      payload_json TEXT,
      data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      evidencia TEXT,
      status TEXT NOT NULL DEFAULT 'bruto',
      tags TEXT NOT NULL DEFAULT '[]',
      source_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, source_key)
    )
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS user_rastros_user_time_idx
    ON user_rastros (user_id, data_hora DESC)
  `;
}

function parseTags(value: string | null): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map((tag) => String(tag)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parsePayload(value: string | null): unknown | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapRow(row: {
  id: string;
  user_id: string;
  tipo: string;
  origem: string;
  titulo: string;
  descricao: string;
  payload_json: string | null;
  data_hora: Date;
  evidencia: string | null;
  status: string;
  tags: string | null;
}): RastroEvent {
  return {
    id: row.id,
    userId: row.user_id,
    tipo: row.tipo as RastroTipo,
    origem: row.origem,
    titulo: row.titulo,
    descricao: row.descricao,
    payload: parsePayload(row.payload_json),
    dataHora: row.data_hora.toISOString(),
    evidencia: row.evidencia,
    status: row.status as RastroStatus,
    tags: parseTags(row.tags),
  };
}

export async function trackRastroEvent(input: RastroEventInput & { sourceKey?: string }) {
  await ensureRastrosTable();

  const id = crypto.randomUUID();
  const tags = JSON.stringify(input.tags || []);
  const payload = input.payload === undefined ? null : JSON.stringify(input.payload);
  const sourceKey = input.sourceKey || id;

  await prisma.$executeRaw`
    INSERT INTO user_rastros (id, user_id, tipo, origem, titulo, descricao, payload_json, evidencia, tags, source_key)
    VALUES (
      ${id},
      ${input.userId},
      ${input.tipo},
      ${input.origem},
      ${input.titulo},
      ${input.descricao},
      ${payload},
      ${input.evidencia ?? null},
      ${tags},
      ${sourceKey}
    )
    ON CONFLICT (user_id, source_key) DO NOTHING
  `;
}

export async function getRecentRastros(userId: string, limit = 80): Promise<RastroEvent[]> {
  await ensureRastrosTable();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, user_id, tipo, origem, titulo, descricao, payload_json, data_hora, evidencia, status, tags
    FROM user_rastros
    WHERE user_id = ${userId}
    ORDER BY data_hora DESC
    LIMIT ${limit}
  `;

  return rows.map(mapRow);
}

export async function updateRastroStatus(userId: string, rastroId: string, status: RastroStatus) {
  await ensureRastrosTable();
  await prisma.$executeRaw`
    UPDATE user_rastros
    SET status = ${status}
    WHERE user_id = ${userId} AND id = ${rastroId}
  `;
}

function compact(value: string | null | undefined, limit = 260) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1).trim()}...` : normalized;
}

export async function syncRastrosFromExistingActivity(userId: string) {
  await ensureRastrosTable();

  const threads = await prisma.thread.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      personaId: true,
      title: true,
      updatedAt: true,
      messages: {
        orderBy: { timestamp: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  for (const thread of threads) {
    await trackRastroEvent({
      userId,
      tipo: "uso_persona",
      origem: `persona:${thread.personaId}`,
      titulo: thread.title || `Interacao com ${thread.personaId}`,
      descricao: compact(thread.messages[0]?.content || `Usuario consultou ${thread.personaId}.`),
      payload: { threadId: thread.id, personaId: thread.personaId, updatedAt: thread.updatedAt.toISOString() },
      evidencia: thread.id,
      tags: [thread.personaId.toLowerCase(), "persona"],
      sourceKey: `thread:${thread.id}`,
    });
  }

  const registros = await prisma.$queryRaw<Array<any>>`
    SELECT id, idea, persona, status, next_deadline, created_at
    FROM user_registros
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 40
  `.catch(() => []);

  for (const registro of registros) {
    const isDone = String(registro.status || "").toLowerCase().includes("concl");
    await trackRastroEvent({
      userId,
      tipo: isDone ? "meta_concluida" : "registro_manual",
      origem: "memorias:registros",
      titulo: isDone ? "Meta concluida em Memorias" : "Registro criado em Memorias",
      descricao: compact(registro.idea),
      payload: { registroId: registro.id, persona: registro.persona, status: registro.status, prazo: registro.next_deadline },
      evidencia: registro.id,
      tags: [isDone ? "conclusao" : "registro", registro.persona || ""].filter(Boolean),
      sourceKey: `registro:${registro.id}`,
    });
  }

  const agenda = await prisma.$queryRaw<Array<any>>`
    SELECT id, title, type, completed, created_at
    FROM sovereign_agenda
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 30
  `.catch(() => []);

  for (const item of agenda) {
    await trackRastroEvent({
      userId,
      tipo: item.completed ? "meta_concluida" : "meta_criada",
      origem: "dominios:agenda",
      titulo: item.completed ? "Compromisso concluido" : "Compromisso criado",
      descricao: compact(item.title),
      payload: { agendaId: item.id, type: item.type, completed: item.completed },
      evidencia: item.id,
      tags: ["agenda", item.completed ? "constancia" : "planejamento"],
      sourceKey: `agenda:${item.id}`,
    });
  }
}
