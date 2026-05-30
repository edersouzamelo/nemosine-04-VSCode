import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MAX_FAVORITE_PERSONAS = 12;

async function ensureFavoritePersonasTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS favorite_personas (
      user_id TEXT NOT NULL,
      persona_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, persona_id)
    )
  `;
}

async function ensureDeveloperMessagesTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS developer_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  try {
    await prisma.$executeRaw`ALTER TABLE developer_messages ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE`;
  } catch (e) {
    console.error("Error adding archived column:", e);
  }
  try {
    await prisma.$executeRaw`ALTER TABLE developer_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE`;
  } catch (e) {
    console.error("Error adding is_read column:", e);
  }
}

export async function getFavoritePersonas(userId: string): Promise<string[]> {
  await ensureFavoritePersonasTable();
  const rows = await prisma.$queryRaw<Array<{ persona_id: string }>>`
    SELECT persona_id
    FROM favorite_personas
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `;

  return rows.map((row) => row.persona_id);
}

export async function setFavoritePersona(userId: string, personaId: string, favorite: boolean) {
  await ensureFavoritePersonasTable();

  if (!favorite) {
    await prisma.$executeRaw`
      DELETE FROM favorite_personas
      WHERE user_id = ${userId} AND persona_id = ${personaId}
    `;
    return { favorite: false };
  }

  const existing = await prisma.$queryRaw<Array<{ persona_id: string }>>`
    SELECT persona_id
    FROM favorite_personas
    WHERE user_id = ${userId} AND persona_id = ${personaId}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return { favorite: true };
  }

  const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM favorite_personas
    WHERE user_id = ${userId}
  `;
  const favoriteCount = Number(countRows[0]?.count ?? 0);

  if (favoriteCount >= MAX_FAVORITE_PERSONAS) {
    throw new Error("escolha até 12 favoritos");
  }

  await prisma.$executeRaw`
    INSERT INTO favorite_personas (user_id, persona_id)
    VALUES (${userId}, ${personaId})
  `;

  return { favorite: true };
}

export async function createDeveloperMessage({
  name,
  email,
  subject,
  message,
  userId,
  userEmail,
}: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  userId?: string | null;
  userEmail?: string | null;
}) {
  await ensureDeveloperMessagesTable();
  await prisma.$executeRaw`
    INSERT INTO developer_messages (id, name, email, subject, message, user_id, user_email)
    VALUES (${crypto.randomUUID()}, ${name}, ${email}, ${subject ?? null}, ${message}, ${userId ?? null}, ${userEmail ?? null})
  `;
}

export async function getDeveloperMessages(includeArchived = false) {
  await ensureDeveloperMessagesTable();
  return prisma.$queryRaw<Array<{
    id: string;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    user_id: string | null;
    user_email: string | null;
    created_at: Date;
    archived: boolean;
    is_read: boolean;
  }>>`
    SELECT id, name, email, subject, message, user_id, user_email, created_at, archived, is_read
    FROM developer_messages
    WHERE archived = ${includeArchived}
    ORDER BY created_at DESC
    LIMIT 100
  `;
}

export async function archiveDeveloperMessage(id: string, archived: boolean) {
  await ensureDeveloperMessagesTable();
  await prisma.$executeRaw`
    UPDATE developer_messages
    SET archived = ${archived}
    WHERE id = ${id}
  `;
}

export async function deleteDeveloperMessage(id: string) {
  await ensureDeveloperMessagesTable();
  await prisma.$executeRaw`
    DELETE FROM developer_messages
    WHERE id = ${id}
  `;
}

export async function markDeveloperMessageRead(id: string, isRead: boolean) {
  await ensureDeveloperMessagesTable();
  await prisma.$executeRaw`
    UPDATE developer_messages
    SET is_read = ${isRead}
    WHERE id = ${id}
  `;
}

export async function getUnreadDeveloperMessagesCount(): Promise<number> {
  await ensureDeveloperMessagesTable();
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM developer_messages
    WHERE is_read = false AND archived = false
  `;
  return Number(rows[0]?.count ?? 0);
}
