import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type UserSource = {
  id: string;
  filename: string;
  mimeType: string | null;
  personaId: string | null;
  content: string;
  createdAt: Date;
};

async function ensureSourceTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS user_sources (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      persona_id TEXT,
      filename TEXT NOT NULL,
      mime_type TEXT,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS user_sources_user_created_idx
    ON user_sources (user_id, created_at DESC)
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS user_sources_user_persona_created_idx
    ON user_sources (user_id, persona_id, created_at DESC)
  `;
}

export async function createUserSource({
  userId,
  personaId,
  filename,
  mimeType,
  content,
}: {
  userId: string;
  personaId?: string | null;
  filename: string;
  mimeType?: string | null;
  content: string;
}) {
  await ensureSourceTable();
  const normalizedContent = content.replace(/\s+/g, " ").trim();

  if (normalizedContent.length < 12) {
    throw new Error("Não foi possível extrair texto suficiente deste arquivo.");
  }

  await prisma.$executeRaw`
    INSERT INTO user_sources (id, user_id, persona_id, filename, mime_type, content)
    VALUES (
      ${crypto.randomUUID()},
      ${userId},
      ${personaId ?? null},
      ${filename.slice(0, 220)},
      ${mimeType ?? null},
      ${normalizedContent.slice(0, 80_000)}
    )
  `;
}

export async function listUserSources(userId: string, personaId?: string | null): Promise<UserSource[]> {
  await ensureSourceTable();
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    filename: string;
    mime_type: string | null;
    persona_id: string | null;
    content: string;
    created_at: Date;
  }>>`
    SELECT id, filename, mime_type, persona_id, content, created_at
    FROM user_sources
    WHERE user_id = ${userId}
      AND persona_id = ${personaId ?? null}
    ORDER BY created_at DESC
    LIMIT 30
  `;

  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    mimeType: row.mime_type,
    personaId: row.persona_id,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function deleteUserSource(userId: string, sourceId: string) {
  await ensureSourceTable();
  await prisma.$executeRaw`
    DELETE FROM user_sources
    WHERE user_id = ${userId} AND id = ${sourceId}
  `;
}

export async function getVisibleUserSources(userId: string, targetPersonaId: string): Promise<string[]> {
  await ensureSourceTable();
  const rows = await prisma.$queryRaw<Array<{
    filename: string;
    persona_id: string | null;
    content: string;
    created_at: Date;
  }>>`
    SELECT filename, persona_id, content, created_at
    FROM user_sources
    WHERE user_id = ${userId}
      AND persona_id = ${targetPersonaId}
    ORDER BY created_at DESC
    LIMIT 12
  `;

  return rows.map((row) => {
    const origin = `Fonte do persona ${row.persona_id || targetPersonaId}`;
    const excerpt = row.content.slice(0, 2600);
    return `[${origin} | ${row.filename}]\n${excerpt}`;
  });
}
