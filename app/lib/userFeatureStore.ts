import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MAX_FAVORITE_PERSONAS = 12;
let developerMessagesBaseTableChecked = false;
let developerMessagesColumnMigrationAttempted = false;

function runtimeDdlEnabled(scope: "favorite_personas" | "developer_messages") {
  if (process.env.USER_FEATURE_RUNTIME_DDL === "true") return true;
  if (scope === "favorite_personas") return process.env.FAVORITE_PERSONAS_AUTO_MIGRATE === "true";
  return process.env.DEVELOPER_MESSAGES_AUTO_MIGRATE === "true";
}

async function ensureFavoritePersonasTable() {
  if (!runtimeDdlEnabled("favorite_personas")) return;

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
  if (!runtimeDdlEnabled("developer_messages")) {
    developerMessagesBaseTableChecked = true;
    developerMessagesColumnMigrationAttempted = true;
    return;
  }

  if (!developerMessagesBaseTableChecked) {
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
    developerMessagesBaseTableChecked = true;
  }

  if (!developerMessagesColumnMigrationAttempted) {
    developerMessagesColumnMigrationAttempted = true;
    try {
      await prisma.$executeRaw`ALTER TABLE developer_messages ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE`;
    } catch (e) {
      console.warn("Developer messages archived column migration skipped:", e);
    }
    try {
      await prisma.$executeRaw`ALTER TABLE developer_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE`;
    } catch (e) {
      console.warn("Developer messages is_read column migration skipped:", e);
    }
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

async function ensureRegistrosTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS user_registros (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      idea TEXT NOT NULL,
      chat_origin_id TEXT,
      persona TEXT,
      status TEXT NOT NULL,
      last_interaction TEXT,
      next_deadline TEXT,
      external_links TEXT,
      custom_columns TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function getUserRegistros(userId: string) {
  await ensureRegistrosTable();
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    user_id: string;
    idea: string;
    chat_origin_id: string | null;
    persona: string | null;
    status: string;
    last_interaction: string | null;
    next_deadline: string | null;
    external_links: string | null;
    custom_columns: string | null;
    created_at: Date;
  }>>`
    SELECT id, user_id, idea, chat_origin_id, persona, status, last_interaction, next_deadline, external_links, custom_columns, created_at
    FROM user_registros
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `;

  // Bi-directional sync: fetch Agenda events and map them as Registros
  let agendaRows: any[] = [];
  try {
    agendaRows = await prisma.$queryRaw<Array<any>>`
      SELECT id, title, date, completed, created_at
      FROM sovereign_agenda
      WHERE user_id = ${userId}
    `;
  } catch (e) {
    console.error("Error fetching agenda for registries sync:", e);
  }

  const mappedAgendaEvents = agendaRows.map(e => ({
    id: 'evt-' + e.id,
    user_id: userId,
    idea: e.title || 'Compromisso da Agenda',
    chat_origin_id: null,
    persona: null,
    status: e.completed ? 'Concluído' : 'Pendente',
    last_interaction: null,
    next_deadline: e.date,
    external_links: null,
    custom_columns: '{}',
    created_at: e.created_at || new Date()
  }));

  return [...rows, ...mappedAgendaEvents].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
}

export async function createUserRegistry(
  userId: string,
  data: {
    id: string;
    idea: string;
    chat_origin_id?: string | null;
    persona?: string | null;
    status: string;
    last_interaction?: string | null;
    next_deadline?: string | null;
    external_links?: string | null;
    custom_columns?: string | null;
  }
) {
  await ensureRegistrosTable();
  await prisma.$executeRaw`
    INSERT INTO user_registros (id, user_id, idea, chat_origin_id, persona, status, last_interaction, next_deadline, external_links, custom_columns)
    VALUES (
      ${data.id},
      ${userId},
      ${data.idea},
      ${data.chat_origin_id ?? null},
      ${data.persona ?? null},
      ${data.status},
      ${data.last_interaction ?? null},
      ${data.next_deadline ?? null},
      ${data.external_links ?? null},
      ${data.custom_columns ?? null}
    )
  `;
}

export async function updateUserRegistry(
  userId: string,
  id: string,
  updates: {
    idea?: string;
    chat_origin_id?: string | null;
    persona?: string | null;
    status?: string;
    last_interaction?: string | null;
    next_deadline?: string | null;
    external_links?: string | null;
    custom_columns?: string | null;
  }
) {
  await ensureRegistrosTable();
  const existing = await prisma.$queryRaw<Array<{
    idea: string;
    chat_origin_id: string | null;
    persona: string | null;
    status: string;
    last_interaction: string | null;
    next_deadline: string | null;
    external_links: string | null;
    custom_columns: string | null;
  }>>`
    SELECT idea, chat_origin_id, persona, status, last_interaction, next_deadline, external_links, custom_columns
    FROM user_registros
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  if (existing.length === 0) return;

  const row = existing[0];
  const idea = updates.idea !== undefined ? updates.idea : row.idea;
  const chat_origin_id = updates.chat_origin_id !== undefined ? updates.chat_origin_id : row.chat_origin_id;
  const persona = updates.persona !== undefined ? updates.persona : row.persona;
  const status = updates.status !== undefined ? updates.status : row.status;
  const last_interaction = updates.last_interaction !== undefined ? updates.last_interaction : row.last_interaction;
  const next_deadline = updates.next_deadline !== undefined ? updates.next_deadline : row.next_deadline;
  const external_links = updates.external_links !== undefined ? updates.external_links : row.external_links;
  const custom_columns = updates.custom_columns !== undefined ? updates.custom_columns : row.custom_columns;

  await prisma.$executeRaw`
    UPDATE user_registros
    SET
      idea = ${idea},
      chat_origin_id = ${chat_origin_id ?? null},
      persona = ${persona ?? null},
      status = ${status},
      last_interaction = ${last_interaction ?? null},
      next_deadline = ${next_deadline ?? null},
      external_links = ${external_links ?? null},
      custom_columns = ${custom_columns ?? null}
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function deleteUserRegistry(userId: string, id: string) {
  await ensureRegistrosTable();
  await prisma.$executeRaw`
    DELETE FROM user_registros
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export interface UserDraftNote {
  id: string;
  title: string;
  type: "text" | "checklist" | "image";
  content: string;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  imageData?: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

async function ensureDraftsTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS user_drafts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'text',
      content TEXT NOT NULL DEFAULT '',
      checklist_json TEXT NOT NULL DEFAULT '[]',
      image_data TEXT,
      color TEXT NOT NULL DEFAULT '#c5a059',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS user_drafts_user_sort_idx
    ON user_drafts (user_id, sort_order, updated_at)
  `;
}

function parseChecklist(value: string | null): UserDraftNote["checklist"] {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      text: String(item.text || ""),
      done: Boolean(item.done),
    }));
  } catch {
    return [];
  }
}

function sanitizeDraftType(value: unknown): UserDraftNote["type"] {
  return value === "checklist" || value === "image" ? value : "text";
}

export async function getUserDrafts(userId: string): Promise<UserDraftNote[]> {
  await ensureDraftsTable();
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    type: string;
    content: string;
    checklist_json: string;
    image_data: string | null;
    color: string;
    created_at: Date;
    updated_at: Date;
  }>>`
    SELECT id, title, type, content, checklist_json, image_data, color, created_at, updated_at
    FROM user_drafts
    WHERE user_id = ${userId}
    ORDER BY sort_order ASC, updated_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: sanitizeDraftType(row.type),
    content: row.content,
    checklist: parseChecklist(row.checklist_json),
    imageData: row.image_data,
    color: row.color,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function upsertUserDraft(
  userId: string,
  data: {
    id: string;
    title?: string;
    type?: string;
    content?: string;
    checklist?: unknown;
    imageData?: string | null;
    color?: string;
    createdAt?: string;
    updatedAt?: string;
    sortOrder?: number;
  }
) {
  await ensureDraftsTable();
  const checklist = Array.isArray(data.checklist) ? data.checklist : [];
  const checklistJson = JSON.stringify(checklist.map((item: any) => ({
    id: String(item.id || crypto.randomUUID()),
    text: String(item.text || ""),
    done: Boolean(item.done),
  })));
  const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  const updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();

  await prisma.$executeRaw`
    INSERT INTO user_drafts (
      id, user_id, title, type, content, checklist_json, image_data, color, sort_order, created_at, updated_at
    )
    VALUES (
      ${data.id},
      ${userId},
      ${data.title ?? ""},
      ${sanitizeDraftType(data.type)},
      ${data.content ?? ""},
      ${checklistJson},
      ${data.imageData ?? null},
      ${data.color ?? "#c5a059"},
      ${data.sortOrder ?? 0},
      ${createdAt},
      ${updatedAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      type = EXCLUDED.type,
      content = EXCLUDED.content,
      checklist_json = EXCLUDED.checklist_json,
      image_data = EXCLUDED.image_data,
      color = EXCLUDED.color,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at
    WHERE user_drafts.user_id = ${userId}
  `;
}

export async function updateUserDraftOrder(userId: string, ids: string[]) {
  await ensureDraftsTable();
  for (const [index, id] of ids.entries()) {
    await prisma.$executeRaw`
      UPDATE user_drafts
      SET sort_order = ${index}, updated_at = NOW()
      WHERE user_id = ${userId} AND id = ${id}
    `;
  }
}

export async function deleteUserDraft(userId: string, id: string) {
  await ensureDraftsTable();
  await prisma.$executeRaw`
    DELETE FROM user_drafts
    WHERE id = ${id} AND user_id = ${userId}
  `;
}
