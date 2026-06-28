import { PrismaClient } from "@prisma/client";
import { isPrivateMemorySpace } from "./nemosine/privacy";

const prisma = new PrismaClient();

export type UserSource = {
  id: string;
  filename: string;
  mimeType: string | null;
  personaId: string | null;
  content: string;
  createdAt: Date;
};

export type UserSourceProfileSummary = {
  content: string;
  personaId: string | null;
  createdAt: Date;
};

const profileSignalTerms = [
  "perfil",
  "usuario",
  "criador",
  "pensamento",
  "pensa",
  "modo",
  "forma",
  "necessita",
  "precisa",
  "exige",
  "valoriza",
  "rejeita",
  "risco",
  "tensao",
  "desejo",
  "sistema",
  "simbol",
  "profund",
  "persona",
  "continuidade",
  "decisao",
  "relacao",
  "divorcio",
  "familia",
  "saude",
];

function normalizeProfileText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function compactSentence(text: string, max = 240) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max - 3).trim()}...` : compact;
}

export function buildUserSourceProfileMemory(input: {
  personaId?: string | null;
  filename: string;
  content: string;
}) {
  const normalizedContent = input.content.replace(/\s+/g, " ").trim();
  if (normalizedContent.length < 12) return null;

  const sentences = normalizedContent
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24);
  const signalSentences = sentences.filter((sentence) => {
    const normalized = normalizeProfileText(sentence);
    return profileSignalTerms.some((term) => normalized.includes(term));
  });
  const selected = (signalSentences.length > 0 ? signalSentences : sentences)
    .slice(0, 3)
    .map((sentence) => compactSentence(sentence));
  if (selected.length === 0) return null;

  const sourceScope = input.personaId ? `assimilada por ${input.personaId}` : "assimilada por fonte geral";
  const synthesis = selected.join(" ");

  return [
    `PERFIL GERAL DO USUARIO (${sourceScope})`,
    `Sintese nao literal para orientar as personas sobre o usuario: ${synthesis}`,
    "Use como conhecimento gradual de perfil. Nao cite nem reproduza o documento; a fonte bruta permanece restrita ao persona de origem.",
  ].join(" | ");
}

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

  try {
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS user_sources_user_created_idx
      ON user_sources (user_id, created_at DESC)
    `;
  } catch (error) {
    console.warn("[sourceStore] Could not ensure user_sources_user_created_idx:", error);
  }

  try {
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS user_sources_user_persona_created_idx
      ON user_sources (user_id, persona_id, created_at DESC)
    `;
  } catch (error) {
    console.warn("[sourceStore] Could not ensure user_sources_user_persona_created_idx:", error);
  }
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

export async function getVisibleUserSourceProfileSummaries(
  userId: string,
  targetPersonaId: string,
  take = 6,
): Promise<UserSourceProfileSummary[]> {
  try {
    await ensureSourceTable();
  } catch (error) {
    console.warn("[sourceStore] Could not ensure user_sources table:", error);
    return [];
  }

  const rows = await prisma.$queryRaw<Array<{
    filename: string;
    persona_id: string | null;
    content: string;
    created_at: Date;
  }>>`
    SELECT filename, persona_id, content, created_at
    FROM user_sources
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 40
  `;

  const targetPrivate = isPrivateMemorySpace(targetPersonaId);
  return rows
    .filter((row) => {
      if (!row.persona_id) return true;
      if (row.persona_id === targetPersonaId) return true;
      if (isPrivateMemorySpace(row.persona_id)) return targetPrivate && row.persona_id === targetPersonaId;
      return true;
    })
    .map((row) => {
      const content = buildUserSourceProfileMemory({
        personaId: row.persona_id,
        filename: row.filename,
        content: row.content,
      });
      if (!content) return null;
      return {
        content,
        personaId: isPrivateMemorySpace(row.persona_id || "") ? row.persona_id : null,
        createdAt: row.created_at,
      };
    })
    .filter((summary): summary is UserSourceProfileSummary => Boolean(summary))
    .slice(0, take);
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
  try {
    await ensureSourceTable();
  } catch (error) {
    console.warn("[sourceStore] Could not ensure user_sources table:", error);
    return [];
  }

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
