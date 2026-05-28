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

export async function getDeveloperMessages() {
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
  }>>`
    SELECT id, name, email, subject, message, user_id, user_email, created_at
    FROM developer_messages
    ORDER BY created_at DESC
    LIMIT 100
  `;
}
