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
}

export async function getAgendaEvents(userId: string): Promise<AgendaEvent[]> {
  await ensureAgendaTable();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, title, date, type, note, completed
    FROM sovereign_agenda
    WHERE user_id = ${userId}
    ORDER BY date ASC, created_at ASC
  `;
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    date: r.date,
    type: r.type,
    note: r.note,
    completed: !!r.completed
  }));
}

export async function saveAgendaEvent(
  userId: string,
  event: Omit<AgendaEvent, "completed">
): Promise<AgendaEvent> {
  await ensureAgendaTable();
  await prisma.$executeRaw`
    INSERT INTO sovereign_agenda (id, user_id, title, date, type, note, completed)
    VALUES (${event.id}, ${userId}, ${event.title}, ${event.date}, ${event.type}, ${event.note ?? null}, FALSE)
  `;
  return { ...event, completed: false };
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
