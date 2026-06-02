import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type UserStorageUsage = {
  usedBytes: number;
  quotaBytes: number;
  freeBytes: number;
  usedPercent: number;
  quotaLabel: string;
  measuredAt: string;
};

const DEFAULT_USER_STORAGE_BYTES = 100 * 1024 * 1024;

const USER_STORAGE_TABLES = [
  {
    label: "Conversas",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(t)), 0)::bigint AS bytes
      FROM "Thread" t
      WHERE t."userId" = $1
    `,
  },
  {
    label: "Mensagens",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(m)), 0)::bigint AS bytes
      FROM "Message" m
      INNER JOIN "Thread" t ON t.id = m."threadId"
      WHERE t."userId" = $1
    `,
  },
  {
    label: "Memorias persistentes",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(m)), 0)::bigint AS bytes
      FROM "UserMemory" m
      WHERE m."userId" = $1
    `,
  },
  {
    label: "Registros",
    tableName: "user_registros",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(r)), 0)::bigint AS bytes
      FROM user_registros r
      WHERE r.user_id = $1
    `,
  },
  {
    label: "Rascunhos",
    tableName: "user_drafts",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(d)), 0)::bigint AS bytes
      FROM user_drafts d
      WHERE d.user_id = $1
    `,
  },
  {
    label: "Fontes",
    tableName: "user_sources",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(s)), 0)::bigint AS bytes
      FROM user_sources s
      WHERE s.user_id = $1
    `,
  },
  {
    label: "Chats compartilhados",
    tableName: "shared_chats",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(c)), 0)::bigint AS bytes
      FROM shared_chats c
      WHERE c.user_id = $1
    `,
  },
  {
    label: "Rastros ocultos",
    tableName: "user_hidden_traces",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(h)), 0)::bigint AS bytes
      FROM user_hidden_traces h
      WHERE h.user_id = $1
    `,
  },
  {
    label: "Favoritos",
    tableName: "favorite_personas",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(f)), 0)::bigint AS bytes
      FROM favorite_personas f
      WHERE f.user_id = $1
    `,
  },
  {
    label: "Agenda",
    tableName: "sovereign_agenda",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(a)), 0)::bigint AS bytes
      FROM sovereign_agenda a
      WHERE a.user_id = $1
    `,
  },
  {
    label: "Treinador medidas",
    tableName: "sovereign_treinador_measures",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(m)), 0)::bigint AS bytes
      FROM sovereign_treinador_measures m
      WHERE m.user_id = $1
    `,
  },
  {
    label: "Treinador treinos",
    tableName: "sovereign_treinador_workouts",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(w)), 0)::bigint AS bytes
      FROM sovereign_treinador_workouts w
      WHERE w.user_id = $1
    `,
  },
  {
    label: "Mordomo",
    tableName: "sovereign_mordomo_transactions",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(t)), 0)::bigint AS bytes
      FROM sovereign_mordomo_transactions t
      WHERE t.user_id = $1
    `,
  },
  {
    label: "Medico",
    tableName: "sovereign_medico_documents",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(d)), 0)::bigint AS bytes
      FROM sovereign_medico_documents d
      WHERE d.user_id = $1
    `,
  },
  {
    label: "Travessia castas",
    tableName: "sovereign_user_caste",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(c)), 0)::bigint AS bytes
      FROM sovereign_user_caste c
      WHERE c.user_id = $1
    `,
  },
  {
    label: "Travessia regioes",
    tableName: "sovereign_unlocked_regions",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(r)), 0)::bigint AS bytes
      FROM sovereign_unlocked_regions r
      WHERE r.user_id = $1
    `,
  },
  {
    label: "Reliquias",
    tableName: "sovereign_user_relics",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(r)), 0)::bigint AS bytes
      FROM sovereign_user_relics r
      WHERE r.user_id = $1
    `,
  },
  {
    label: "Boss logs",
    tableName: "sovereign_boss_logs",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(b)), 0)::bigint AS bytes
      FROM sovereign_boss_logs b
      WHERE b.user_id = $1
    `,
  },
  {
    label: "Push",
    tableName: "sovereign_push_subscriptions",
    sql: `
      SELECT COALESCE(SUM(pg_column_size(p)), 0)::bigint AS bytes
      FROM sovereign_push_subscriptions p
      WHERE p.user_id = $1
    `,
  },
] as const;

function getDefaultQuotaBytes() {
  const rawBytes = Number(process.env.NEMOSINE_DEFAULT_USER_STORAGE_BYTES);
  if (Number.isFinite(rawBytes) && rawBytes > 0) return Math.floor(rawBytes);

  const rawMb = Number(process.env.NEMOSINE_DEFAULT_USER_STORAGE_MB);
  if (Number.isFinite(rawMb) && rawMb > 0) return Math.floor(rawMb * 1024 * 1024);

  return DEFAULT_USER_STORAGE_BYTES;
}

async function ensureStorageQuotaTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS user_storage_quotas (
      user_id TEXT PRIMARY KEY,
      quota_bytes BIGINT NOT NULL,
      quota_label TEXT NOT NULL DEFAULT 'Padrao',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensureUserQuota(userId: string) {
  await ensureStorageQuotaTable();
  const defaultQuotaBytes = getDefaultQuotaBytes();

  await prisma.$executeRaw`
    INSERT INTO user_storage_quotas (user_id, quota_bytes, quota_label)
    VALUES (${userId}, ${defaultQuotaBytes}, 'Padrao')
    ON CONFLICT (user_id) DO NOTHING
  `;

  const rows = await prisma.$queryRaw<Array<{ quota_bytes: bigint; quota_label: string }>>`
    SELECT quota_bytes, quota_label
    FROM user_storage_quotas
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  return {
    quotaBytes: Number(rows[0]?.quota_bytes ?? BigInt(defaultQuotaBytes)),
    quotaLabel: rows[0]?.quota_label || "Padrao",
  };
}

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass(${tableName}) IS NOT NULL AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function getTableUsageBytes(userId: string, entry: typeof USER_STORAGE_TABLES[number]) {
  if ("tableName" in entry && entry.tableName && !(await tableExists(entry.tableName))) {
    return 0;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ bytes: bigint }>>(entry.sql, userId);
  return Number(rows[0]?.bytes ?? 0);
}

export async function getUserStorageUsage(userId: string): Promise<UserStorageUsage> {
  const [{ quotaBytes, quotaLabel }, tableBytes] = await Promise.all([
    ensureUserQuota(userId),
    Promise.all(USER_STORAGE_TABLES.map((entry) => getTableUsageBytes(userId, entry))),
  ]);

  const usedBytes = tableBytes.reduce((sum, value) => sum + value, 0);
  const freeBytes = Math.max(quotaBytes - usedBytes, 0);
  const usedPercent = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 100;

  return {
    usedBytes,
    quotaBytes,
    freeBytes,
    usedPercent,
    quotaLabel,
    measuredAt: new Date().toISOString(),
  };
}
