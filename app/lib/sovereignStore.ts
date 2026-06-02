import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Dynamic table initializations (CREATE TABLE IF NOT EXISTS)
async function ensureAgendaTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_agenda (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      note TEXT,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`ALTER TABLE sovereign_agenda ADD COLUMN IF NOT EXISTS start_time TEXT DEFAULT '00:00'`;
  await prisma.$executeRaw`ALTER TABLE sovereign_agenda ADD COLUMN IF NOT EXISTS end_time TEXT DEFAULT '23:59'`;
  await prisma.$executeRaw`ALTER TABLE sovereign_agenda ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#c5a059'`;
  await prisma.$executeRaw`ALTER TABLE sovereign_agenda ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none'`;
  await prisma.$executeRaw`ALTER TABLE sovereign_agenda ADD COLUMN IF NOT EXISTS recurrence_end TEXT`;
  await prisma.$executeRaw`ALTER TABLE sovereign_agenda ADD COLUMN IF NOT EXISTS recurrence_days TEXT`;
  await prisma.$executeRaw`ALTER TABLE sovereign_agenda ADD COLUMN IF NOT EXISTS notification_minutes INTEGER DEFAULT 0`;
  await prisma.$executeRaw`ALTER TABLE sovereign_agenda ADD COLUMN IF NOT EXISTS notification_sound BOOLEAN DEFAULT FALSE`;
}

async function ensureTreinadorTables() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_treinador_measures (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      weight NUMERIC NOT NULL,
      chest NUMERIC,
      biceps NUMERIC,
      waist NUMERIC,
      hips NUMERIC,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_treinador_workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      exercises TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensureMordomoTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_mordomo_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensureMedicoTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_medico_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      filename TEXT NOT NULL,
      text_content TEXT NOT NULL,
      ai_analysis TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensureTravessiaTables() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_user_caste (
      user_id TEXT PRIMARY KEY,
      caste TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_unlocked_regions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      region_id TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_user_relics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      origin TEXT NOT NULL,
      date_obtained TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_boss_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      crossing_id TEXT NOT NULL,
      boss_id TEXT NOT NULL,
      date TEXT NOT NULL,
      context TEXT NOT NULL,
      strategy TEXT NOT NULL,
      outcome TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensurePushSubscriptionsTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

// ==========================================
// AGENDA OPERATIONS
// ==========================================

export interface AgendaEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  note?: string | null;
  completed: boolean;
  startTime?: string | null;
  endTime?: string | null;
  color?: string | null;
  recurrence?: string | null;
  recurrenceEnd?: string | null;
  recurrenceDays?: string | null;
  notificationMinutes?: number | null;
  notificationSound?: boolean | null;
}

export async function getAgendaEvents(userId: string): Promise<AgendaEvent[]> {
  await ensureAgendaTable();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, title, date, type, note, completed, start_time, end_time, color, recurrence, recurrence_end, recurrence_days, notification_minutes, notification_sound, created_at
    FROM sovereign_agenda
    WHERE user_id = ${userId}
    ORDER BY date ASC, created_at ASC
  `;
  const agendaEvents = rows.map(r => ({
    id: r.id,
    title: r.title,
    date: r.date,
    type: r.type,
    note: r.note,
    completed: !!r.completed,
    startTime: r.start_time,
    endTime: r.end_time,
    color: r.color,
    recurrence: r.recurrence,
    recurrenceEnd: r.recurrence_end,
    recurrenceDays: r.recurrence_days,
    notificationMinutes: r.notification_minutes !== null ? Number(r.notification_minutes) : 0,
    notificationSound: !!r.notification_sound,
    created_at: r.created_at
  }));

  // Bi-directional sync: fetch Registros and map them as Agenda events
  let regRows: any[] = [];
  try {
    regRows = await prisma.$queryRaw<Array<any>>`
      SELECT id, idea, next_deadline, status, created_at
      FROM user_registros
      WHERE user_id = ${userId} AND next_deadline IS NOT NULL AND next_deadline != ''
    `;
  } catch (e) {
    console.error("Error fetching registries for agenda sync:", e);
  }

  const mappedRegEvents = regRows.map(r => ({
    id: 'reg-' + r.id,
    title: r.idea || 'Registro sem Título',
    date: r.next_deadline,
    type: 'Lembrete',
    completed: r.status === 'Concluído',
    note: 'Sincronizado do módulo Registros',
    startTime: '00:00',
    endTime: '23:59',
    color: '#6b2c9e', // Purple color for registries
    recurrence: 'none',
    recurrenceEnd: null,
    recurrenceDays: null,
    notificationMinutes: 0,
    notificationSound: false,
    created_at: r.created_at || new Date()
  }));

  return [...agendaEvents, ...mappedRegEvents].sort((a: any, b: any) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.created_at.getTime() - b.created_at.getTime();
  });
}

export async function saveAgendaEvent(
  userId: string,
  event: Omit<AgendaEvent, "completed">
): Promise<AgendaEvent> {
  await ensureAgendaTable();
  
  const startTime = event.startTime || '00:00';
  const endTime = event.endTime || '23:59';
  const color = event.color || '#c5a059';
  const recurrence = event.recurrence || 'none';
  const recurrenceEnd = event.recurrenceEnd ?? null;
  const recurrenceDays = event.recurrenceDays ?? null;
  const notificationMinutes = event.notificationMinutes !== undefined && event.notificationMinutes !== null ? Number(event.notificationMinutes) : 0;
  const notificationSound = event.notificationSound ?? false;

  await prisma.$executeRaw`
    INSERT INTO sovereign_agenda (
      id, user_id, title, date, type, note, completed, 
      start_time, end_time, color, recurrence, recurrence_end, recurrence_days, 
      notification_minutes, notification_sound
    )
    VALUES (
      ${event.id}, ${userId}, ${event.title}, ${event.date}, ${event.type}, ${event.note ?? null}, FALSE,
      ${startTime}, ${endTime}, ${color}, ${recurrence}, ${recurrenceEnd}, ${recurrenceDays},
      ${notificationMinutes}, ${notificationSound}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      date = EXCLUDED.date,
      type = EXCLUDED.type,
      note = EXCLUDED.note,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      color = EXCLUDED.color,
      recurrence = EXCLUDED.recurrence,
      recurrence_end = EXCLUDED.recurrence_end,
      recurrence_days = EXCLUDED.recurrence_days,
      notification_minutes = EXCLUDED.notification_minutes,
      notification_sound = EXCLUDED.notification_sound
  `;
  return { 
    ...event, 
    completed: false,
    startTime,
    endTime,
    color,
    recurrence,
    recurrenceEnd,
    recurrenceDays,
    notificationMinutes,
    notificationSound
  };
}

export async function toggleAgendaEvent(userId: string, eventId: string, completed: boolean): Promise<void> {
  await ensureAgendaTable();
  await prisma.$executeRaw`
    UPDATE sovereign_agenda
    SET completed = ${completed}
    WHERE id = ${eventId} AND user_id = ${userId}
  `;
}

export async function deleteAgendaEvent(userId: string, eventId: string): Promise<void> {
  await ensureAgendaTable();
  await prisma.$executeRaw`
    DELETE FROM sovereign_agenda
    WHERE id = ${eventId} AND user_id = ${userId}
  `;
}

// ==========================================
// TREINADOR OPERATIONS
// ==========================================

export interface GymMeasure {
  id: string;
  date: string;
  weight: number;
  chest?: number | null;
  biceps?: number | null;
  waist?: number | null;
  hips?: number | null;
}

export interface GymWorkout {
  id: string;
  date: string;
  title: string;
  exercises: string; // JSON string
}

export async function getGymMeasures(userId: string): Promise<GymMeasure[]> {
  await ensureTreinadorTables();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, date, weight, chest, biceps, waist, hips
    FROM sovereign_treinador_measures
    WHERE user_id = ${userId}
    ORDER BY date ASC, created_at ASC
  `;
  return rows.map(r => ({
    id: r.id,
    date: r.date,
    weight: Number(r.weight),
    chest: r.chest ? Number(r.chest) : null,
    biceps: r.biceps ? Number(r.biceps) : null,
    waist: r.waist ? Number(r.waist) : null,
    hips: r.hips ? Number(r.hips) : null
  }));
}

export async function saveGymMeasure(userId: string, measure: GymMeasure): Promise<GymMeasure> {
  await ensureTreinadorTables();
  await prisma.$executeRaw`
    INSERT INTO sovereign_treinador_measures (id, user_id, date, weight, chest, biceps, waist, hips)
    VALUES (
      ${measure.id}, 
      ${userId}, 
      ${measure.date}, 
      ${measure.weight}, 
      ${measure.chest ?? null}, 
      ${measure.biceps ?? null}, 
      ${measure.waist ?? null}, 
      ${measure.hips ?? null}
    )
  `;
  return measure;
}

export async function deleteGymMeasure(userId: string, measureId: string): Promise<void> {
  await ensureTreinadorTables();
  await prisma.$executeRaw`
    DELETE FROM sovereign_treinador_measures
    WHERE id = ${measureId} AND user_id = ${userId}
  `;
}

export async function getGymWorkouts(userId: string): Promise<GymWorkout[]> {
  await ensureTreinadorTables();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, date, title, exercises
    FROM sovereign_treinador_workouts
    WHERE user_id = ${userId}
    ORDER BY date DESC, created_at DESC
  `;
  return rows.map(r => ({
    id: r.id,
    date: r.date,
    title: r.title,
    exercises: r.exercises
  }));
}

export async function saveGymWorkout(userId: string, workout: GymWorkout): Promise<GymWorkout> {
  await ensureTreinadorTables();
  await prisma.$executeRaw`
    INSERT INTO sovereign_treinador_workouts (id, user_id, date, title, exercises)
    VALUES (${workout.id}, ${userId}, ${workout.date}, ${workout.title}, ${workout.exercises})
  `;
  return workout;
}

export async function deleteGymWorkout(userId: string, workoutId: string): Promise<void> {
  await ensureTreinadorTables();
  await prisma.$executeRaw`
    DELETE FROM sovereign_treinador_workouts
    WHERE id = ${workoutId} AND user_id = ${userId}
  `;
}

// ==========================================
// MORDOMO OPERATIONS
// ==========================================

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string; // 'income' | 'expense'
  category: string;
}

export async function getTransactions(userId: string): Promise<FinancialTransaction[]> {
  await ensureMordomoTable();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, date, description, amount, type, category
    FROM sovereign_mordomo_transactions
    WHERE user_id = ${userId}
    ORDER BY date DESC, created_at DESC
  `;
  return rows.map(r => ({
    id: r.id,
    date: r.date,
    description: r.description,
    amount: Number(r.amount),
    type: r.type,
    category: r.category
  }));
}

export async function saveTransaction(userId: string, tx: FinancialTransaction): Promise<FinancialTransaction> {
  await ensureMordomoTable();
  await prisma.$executeRaw`
    INSERT INTO sovereign_mordomo_transactions (id, user_id, date, description, amount, type, category)
    VALUES (${tx.id}, ${userId}, ${tx.date}, ${tx.description}, ${tx.amount}, ${tx.type}, ${tx.category})
  `;
  return tx;
}

export async function deleteTransaction(userId: string, txId: string): Promise<void> {
  await ensureMordomoTable();
  await prisma.$executeRaw`
    DELETE FROM sovereign_mordomo_transactions
    WHERE id = ${txId} AND user_id = ${userId}
  `;
}

// ==========================================
// MÉDICO OPERATIONS
// ==========================================

export interface MedicalDocument {
  id: string;
  date: string;
  filename: string;
  textContent: string;
  aiAnalysis?: string | null;
}

export async function getMedicalDocuments(userId: string): Promise<MedicalDocument[]> {
  await ensureMedicoTable();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, date, filename, text_content, ai_analysis
    FROM sovereign_medico_documents
    WHERE user_id = ${userId}
    ORDER BY date DESC, created_at DESC
  `;
  return rows.map(r => ({
    id: r.id,
    date: r.date,
    filename: r.filename,
    textContent: r.text_content,
    aiAnalysis: r.ai_analysis
  }));
}

export async function saveMedicalDocument(userId: string, doc: MedicalDocument): Promise<MedicalDocument> {
  await ensureMedicoTable();
  await prisma.$executeRaw`
    INSERT INTO sovereign_medico_documents (id, user_id, date, filename, text_content, ai_analysis)
    VALUES (${doc.id}, ${userId}, ${doc.date}, ${doc.filename}, ${doc.textContent}, ${doc.aiAnalysis ?? null})
  `;
  return doc;
}

export async function deleteMedicalDocument(userId: string, docId: string): Promise<void> {
  await ensureMedicoTable();
  await prisma.$executeRaw`
    DELETE FROM sovereign_medico_documents
    WHERE id = ${docId} AND user_id = ${userId}
  `;
}

// ==========================================
// TRAVESSIA OPERATIONS
// ==========================================

export interface UserRelic {
  id: string;
  name: string;
  description: string;
  origin: string;
  dateObtained: string;
}

export interface BossLog {
  id: string;
  crossingId: string;
  bossId: string;
  date: string;
  context: string;
  strategy: string;
  outcome: string;
}

export async function getTravessiaData(userId: string) {
  await ensureTravessiaTables();
  
  // 1. Get caste
  const casteRows = await prisma.$queryRaw<Array<{ caste: string }>>`
    SELECT caste
    FROM sovereign_user_caste
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const caste = casteRows[0]?.caste || "Peregrino";

  // 2. Get unlocked regions
  const regionRows = await prisma.$queryRaw<Array<{ region_id: string }>>`
    SELECT region_id
    FROM sovereign_unlocked_regions
    WHERE user_id = ${userId}
  `;
  const unlockedRegions = regionRows.map(r => r.region_id);

  // 3. Get relics
  const relicRows = await prisma.$queryRaw<Array<any>>`
    SELECT id, name, description, origin, date_obtained
    FROM sovereign_user_relics
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  const relics: UserRelic[] = relicRows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    origin: r.origin,
    dateObtained: r.date_obtained
  }));

  // 4. Get boss logs
  const bossRows = await prisma.$queryRaw<Array<any>>`
    SELECT id, crossing_id, boss_id, date, context, strategy, outcome
    FROM sovereign_boss_logs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  const bossLogs: BossLog[] = bossRows.map(r => ({
    id: r.id,
    crossingId: r.crossing_id,
    bossId: r.boss_id,
    date: r.date,
    context: r.context,
    strategy: r.strategy,
    outcome: r.outcome
  }));

  return {
    caste,
    unlockedRegions,
    relics,
    bossLogs
  };
}

export async function updateCaste(userId: string, caste: string): Promise<void> {
  await ensureTravessiaTables();
  await prisma.$executeRaw`
    INSERT INTO sovereign_user_caste (user_id, caste, updated_at)
    VALUES (${userId}, ${caste}, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET caste = ${caste}, updated_at = NOW()
  `;
}

export async function unlockRegion(userId: string, regionId: string): Promise<void> {
  await ensureTravessiaTables();
  const id = Math.random().toString(36).substring(2, 9);
  
  const existing = await prisma.$queryRaw<Array<any>>`
    SELECT id FROM sovereign_unlocked_regions
    WHERE user_id = ${userId} AND region_id = ${regionId}
    LIMIT 1
  `;
  if (existing.length > 0) return;

  await prisma.$executeRaw`
    INSERT INTO sovereign_unlocked_regions (id, user_id, region_id, unlocked_at)
    VALUES (${id}, ${userId}, ${regionId}, NOW())
  `;
}

export async function saveBossLog(userId: string, log: BossLog): Promise<void> {
  await ensureTravessiaTables();
  await prisma.$executeRaw`
    INSERT INTO sovereign_boss_logs (id, user_id, crossing_id, boss_id, date, context, strategy, outcome)
    VALUES (${log.id}, ${userId}, ${log.crossingId}, ${log.bossId}, ${log.date}, ${log.context}, ${log.strategy}, ${log.outcome})
  `;
}

export async function saveUserRelic(userId: string, relic: UserRelic): Promise<void> {
  await ensureTravessiaTables();
  await prisma.$executeRaw`
    INSERT INTO sovereign_user_relics (id, user_id, name, description, origin, date_obtained)
    VALUES (${relic.id}, ${userId}, ${relic.name}, ${relic.description}, ${relic.origin}, ${relic.dateObtained})
  `;
}

// ==========================================
// PUSH SUBSCRIPTION OPERATIONS
// ==========================================

export interface PushSubscriptionData {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }
): Promise<PushSubscriptionData> {
  await ensurePushSubscriptionsTable();
  const id = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  
  // Upsert: se o endpoint já existe, atualiza auth/p256dh e updated_at
  await prisma.$executeRaw`
    INSERT INTO sovereign_push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, updated_at)
    VALUES (${id}, ${userId}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, ${sub.userAgent ?? null}, NOW())
    ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = ${sub.p256dh},
        auth = ${sub.auth},
        user_id = ${userId},
        user_agent = ${sub.userAgent ?? null},
        updated_at = NOW()
  `;
  
  return { id, userId, ...sub };
}

export async function getPushSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
  await ensurePushSubscriptionsTable();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, user_id, endpoint, p256dh, auth, user_agent
    FROM sovereign_push_subscriptions
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
    userAgent: r.user_agent,
  }));
}

export async function getAllPushSubscriptions(): Promise<PushSubscriptionData[]> {
  await ensurePushSubscriptionsTable();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, user_id, endpoint, p256dh, auth, user_agent
    FROM sovereign_push_subscriptions
    ORDER BY updated_at DESC
  `;
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
    userAgent: r.user_agent,
  }));
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await ensurePushSubscriptionsTable();
  await prisma.$executeRaw`
    DELETE FROM sovereign_push_subscriptions
    WHERE endpoint = ${endpoint}
  `;
}
