import { ENTITIES } from "@/app/data/entities";
import { addMessageToThread, createThread, prisma } from "./session_store";
import type { ChatThread } from "./types";

export const MAX_ACTIVE_GUEST_PERSONAS = 4;

export type ConversationParticipantRole = "HOST" | "GUEST";

export type ConversationParticipant = {
  id: string;
  threadId: string;
  personaId: string;
  role: ConversationParticipantRole;
  joinedAt: Date;
  leftAt: Date | null;
  active: boolean;
  muted: boolean;
};

export type ParticipantSnapshot = {
  threadId: string;
  hostPersonaId: string;
  placeId: string | null;
  mode: "SINGLE" | "COLLECTIVE";
  participants: ConversationParticipant[];
  guestCount: number;
};

function splitLegacyScope(scope: string) {
  const [personaName, placeName] = scope.split(/\s+@\s+/);
  return {
    personaId: personaName?.trim() || scope,
    placeId: placeName?.trim() || null,
  };
}

export function getThreadHostAndPlace(thread: { personaId: string; placeId?: string | null }) {
  const legacy = splitLegacyScope(thread.personaId);
  return {
    hostPersonaId: legacy.personaId,
    placeId: thread.placeId || legacy.placeId,
  };
}

export function isMultiPersonaEnabled() {
  return process.env.MULTI_PERSONA_ENABLED === "true";
}

export type CollectiveSchemaStatus = {
  ready: boolean;
  missing: string[];
};

let collectiveSchemaStatusCache: { checkedAt: number; status: CollectiveSchemaStatus } | null = null;
const COLLECTIVE_SCHEMA_STATUS_CACHE_MS = 60_000;

export async function getCollectiveSchemaStatus(): Promise<CollectiveSchemaStatus> {
  const now = Date.now();
  if (
    collectiveSchemaStatusCache
    && now - collectiveSchemaStatusCache.checkedAt < COLLECTIVE_SCHEMA_STATUS_CACHE_MS
  ) {
    return collectiveSchemaStatusCache.status;
  }

  try {
    const rows = await prisma.$queryRaw<Array<{
      thread_place_id: boolean;
      thread_mode: boolean;
      message_speaker_persona_id: boolean;
      message_turn_group_id: boolean;
      presence_table: boolean;
      episode_table: boolean;
      audit_table: boolean;
    }>>`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Thread' AND column_name = 'placeId'
        ) AS thread_place_id,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Thread' AND column_name = 'mode'
        ) AS thread_mode,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Message' AND column_name = 'speakerPersonaId'
        ) AS message_speaker_persona_id,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Message' AND column_name = 'turnGroupId'
        ) AS message_turn_group_id,
        EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'ThreadPersonaPresence'
        ) AS presence_table,
        EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'PersonaConversationEpisode'
        ) AS episode_table,
        EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'CollectiveGenerationAudit'
        ) AS audit_table
    `;
    const row = rows[0];
    const checks: Record<string, boolean> = {
      "Thread.placeId": Boolean(row?.thread_place_id),
      "Thread.mode": Boolean(row?.thread_mode),
      "Message.speakerPersonaId": Boolean(row?.message_speaker_persona_id),
      "Message.turnGroupId": Boolean(row?.message_turn_group_id),
      "ThreadPersonaPresence": Boolean(row?.presence_table),
      "PersonaConversationEpisode": Boolean(row?.episode_table),
      "CollectiveGenerationAudit": Boolean(row?.audit_table),
    };
    const missing = Object.entries(checks)
      .filter(([, present]) => !present)
      .map(([name]) => name);
    const status = { ready: missing.length === 0, missing };
    collectiveSchemaStatusCache = { checkedAt: now, status };
    return status;
  } catch (error) {
    console.warn("[CollectiveParticipants] Schema preflight failed.", {
      errorCode: error instanceof Error ? error.name : "unknown",
    });
    const status = { ready: false, missing: ["schema_preflight_failed"] };
    collectiveSchemaStatusCache = { checkedAt: now, status };
    return status;
  }
}

export function isMissingCollectiveSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("does not exist in the current database")
    || message.includes("column")
    || message.includes("table")
    || message.includes("P2021")
    || message.includes("P2022");
}

function getPersonaEntity(personaId: string) {
  return Object.values(ENTITIES).find((entity) => entity.name === personaId && entity.type === "persona") || null;
}

export function assertPersonaCanParticipate(personaId: string) {
  const persona = getPersonaEntity(personaId);
  if (!persona) {
    throw new Error(`INVALID_PERSONA:${personaId}`);
  }
  return persona;
}

async function getOwnedThread(userId: string, threadId: string) {
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, userId },
    select: {
      id: true,
      personaId: true,
      placeId: true,
      mode: true,
      participants: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        select: {
          id: true,
          threadId: true,
          personaId: true,
          role: true,
          joinedAt: true,
          leftAt: true,
          active: true,
        },
      },
    },
  });
  if (!thread) throw new Error("THREAD_NOT_FOUND");
  return thread;
}

function mapPresence(presence: {
  id: string;
  threadId: string;
  personaId: string;
  role: string;
  joinedAt: Date;
  leftAt: Date | null;
  active: boolean;
}, muted = false): ConversationParticipant {
  return {
    id: presence.id,
    threadId: presence.threadId,
    personaId: presence.personaId,
    role: presence.role as ConversationParticipantRole,
    joinedAt: presence.joinedAt,
    leftAt: presence.leftAt,
    active: presence.active,
    muted,
  };
}

async function getMutedPresenceIds(threadId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ThreadPersonaPresence"
      WHERE "threadId" = ${threadId}
        AND "active" = true
        AND "muted" = true
    `;
    return new Set(rows.map((row) => row.id));
  } catch (error) {
    if (isMissingCollectiveSchemaError(error)) return new Set<string>();
    throw error;
  }
}

function sortParticipants(participants: ConversationParticipant[]) {
  return [...participants].sort((a, b) => {
    if (a.role !== b.role) return a.role === "HOST" ? -1 : 1;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });
}

export function assertParticipantLimit(participants: Array<{ role: string; active: boolean }>) {
  const guestCount = participants.filter((participant) => participant.active && participant.role === "GUEST").length;
  if (guestCount > MAX_ACTIVE_GUEST_PERSONAS) {
    throw new Error("PARTICIPANT_LIMIT_EXCEEDED");
  }
}

export async function ensureHostPresence(userId: string, threadId: string) {
  const thread = await getOwnedThread(userId, threadId);
  const { hostPersonaId } = getThreadHostAndPlace(thread);
  assertPersonaCanParticipate(hostPersonaId);

  const activeHost = thread.participants.find((participant) =>
    participant.active && participant.role === "HOST" && participant.personaId === hostPersonaId
  );
  if (activeHost) return mapPresence(activeHost);

  const presence = await prisma.threadPersonaPresence.create({
    data: {
      threadId,
      personaId: hostPersonaId,
      role: "HOST",
      active: true,
    },
  });
  return mapPresence(presence);
}

export async function getActiveParticipants(userId: string, threadId: string) {
  await ensureHostPresence(userId, threadId);
  const presences = await prisma.threadPersonaPresence.findMany({
    where: { threadId, active: true },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: {
      id: true,
      threadId: true,
      personaId: true,
      role: true,
      joinedAt: true,
      leftAt: true,
      active: true,
    },
  });
  const mutedIds = await getMutedPresenceIds(threadId);
  const participants = sortParticipants(presences.map((presence) => mapPresence(presence, mutedIds.has(presence.id))));
  assertParticipantLimit(participants);
  return participants;
}

export async function getParticipantSnapshot(userId: string, threadId: string): Promise<ParticipantSnapshot> {
  const thread = await getOwnedThread(userId, threadId);
  const { hostPersonaId, placeId } = getThreadHostAndPlace(thread);
  const participants = await getActiveParticipants(userId, threadId);
  const guestCount = participants.filter((participant) => participant.role === "GUEST").length;

  return {
    threadId,
    hostPersonaId,
    placeId,
    mode: guestCount > 0 ? "COLLECTIVE" : (thread.mode as "SINGLE" | "COLLECTIVE"),
    participants,
    guestCount,
  };
}

export async function invitePersona(userId: string, threadId: string, personaId: string) {
  assertPersonaCanParticipate(personaId);
  const thread = await getOwnedThread(userId, threadId);
  const { hostPersonaId } = getThreadHostAndPlace(thread);
  if (personaId === hostPersonaId) {
    throw new Error("HOST_ALREADY_PRESENT");
  }

  await ensureHostPresence(userId, threadId);
  const activeParticipants = await getActiveParticipants(userId, threadId);
  if (activeParticipants.some((participant) => participant.personaId === personaId && participant.active)) {
    throw new Error("PERSONA_ALREADY_PRESENT");
  }
  const guestCount = activeParticipants.filter((participant) => participant.role === "GUEST").length;
  if (guestCount >= MAX_ACTIVE_GUEST_PERSONAS) {
    throw new Error("PARTICIPANT_LIMIT_EXCEEDED");
  }

  const presence = await prisma.threadPersonaPresence.create({
    data: {
      threadId,
      personaId,
      role: "GUEST",
      active: true,
    },
  });
  await prisma.thread.update({
    where: { id: threadId },
    data: { mode: "COLLECTIVE", updatedAt: new Date() },
  });
  await addMessageToThread(userId, threadId, "system", `${personaId} entrou na conversa.`, {
    speakerPersonaId: personaId,
    messageKind: "SYSTEM_EVENT",
  });
  return mapPresence(presence);
}

export async function setPersonaMuted(userId: string, threadId: string, personaId: string, muted: boolean) {
  assertPersonaCanParticipate(personaId);
  await ensureHostPresence(userId, threadId);

  const activePresence = await prisma.threadPersonaPresence.findFirst({
    where: {
      threadId,
      personaId,
      active: true,
    },
    orderBy: { joinedAt: "desc" },
    select: {
      id: true,
      threadId: true,
      personaId: true,
      role: true,
      joinedAt: true,
      leftAt: true,
      active: true,
    },
  });
  if (!activePresence) {
    throw new Error("PERSONA_NOT_PRESENT");
  }

  try {
    await prisma.$executeRaw`
      UPDATE "ThreadPersonaPresence"
      SET "muted" = ${muted}
      WHERE "id" = ${activePresence.id}
    `;
  } catch (error) {
    if (isMissingCollectiveSchemaError(error)) {
      throw new Error("MUTING_MIGRATION_REQUIRED");
    }
    throw error;
  }

  await prisma.thread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
    select: { id: true },
  });
  await addMessageToThread(userId, threadId, "system", muted ? `${personaId} foi silenciado.` : `${personaId} voltou a falar.`, {
    speakerPersonaId: personaId,
    messageKind: "SYSTEM_EVENT",
  });

  return mapPresence(activePresence, muted);
}

export async function removePersona(userId: string, threadId: string, personaId: string) {
  assertPersonaCanParticipate(personaId);
  const thread = await getOwnedThread(userId, threadId);
  const { hostPersonaId } = getThreadHostAndPlace(thread);
  if (personaId === hostPersonaId) {
    throw new Error("HOST_CANNOT_BE_REMOVED");
  }

  const activePresence = await prisma.threadPersonaPresence.findFirst({
    where: {
      threadId,
      personaId,
      active: true,
      role: "GUEST",
    },
    orderBy: { joinedAt: "desc" },
  });
  if (!activePresence) {
    throw new Error("PERSONA_NOT_PRESENT");
  }

  const leftAt = new Date();
  const presence = await prisma.threadPersonaPresence.update({
    where: { id: activePresence.id },
    data: { active: false, leftAt },
  });
  const remainingGuests = await prisma.threadPersonaPresence.count({
    where: { threadId, active: true, role: "GUEST" },
  });
  await prisma.thread.update({
    where: { id: threadId },
    data: { mode: remainingGuests > 0 ? "COLLECTIVE" : "SINGLE", updatedAt: new Date() },
  });
  await addMessageToThread(userId, threadId, "system", `${personaId} deixou a conversa.`, {
    speakerPersonaId: personaId,
    messageKind: "SYSTEM_EVENT",
  });
  return mapPresence(presence);
}

function normalizeAddressText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@,;:.?!\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

export function detectAddressedParticipantIds(text: string, participants: Array<{ personaId: string; active: boolean }>) {
  const normalizedText = normalizeAddressText(text);
  if (!normalizedText) return [];

  return participants
    .filter((participant) => participant.active)
    .map((participant) => {
      const normalizedName = normalizeAddressText(participant.personaId);
      const namePattern = escapeRegExp(normalizedName);
      const startsWithName = new RegExp(`^@?${namePattern}(?:\\s|,|:|;|$)`, "u").test(normalizedText);
      const sentenceVocative = new RegExp(`(?:^|[.!?;]\\s+)@?${namePattern}\\s*(?:,|:|;)`, "u").test(normalizedText);
      const explicitTarget = new RegExp(`\\b(?:para|pra|pro|ao|a)\\s+(?:o\\s+|a\\s+)?${namePattern}\\b`, "u").test(normalizedText)
        || new RegExp(`\\b(?:pergunta|duvida|questao)\\s+(?:e\\s+)?(?:para|pra|pro|ao|a)\\s+(?:o\\s+|a\\s+)?${namePattern}\\b`, "u").test(normalizedText);
      return startsWithName || sentenceVocative || explicitTarget ? participant.personaId : null;
    })
    .filter((personaId): personaId is string => Boolean(personaId));
}

export function selectSpeakingParticipantsForRound(
  participants: ConversationParticipant[],
  userText: string,
) {
  const available = participants.filter((participant) => participant.active && !participant.muted);
  const addressed = new Set(detectAddressedParticipantIds(userText, participants));
  if (addressed.size === 0) return available;
  return available.filter((participant) => addressed.has(participant.personaId));
}

export async function isPersonaPresentAt(threadId: string, personaId: string, timestamp: Date) {
  const presence = await prisma.threadPersonaPresence.findFirst({
    where: {
      threadId,
      personaId,
      joinedAt: { lte: timestamp },
      OR: [{ leftAt: null }, { leftAt: { gt: timestamp } }],
    },
  });
  return Boolean(presence);
}

export async function listThreadsForParticipant(userId: string, personaId: string): Promise<ChatThread[]> {
  const { getThreadsForPersona } = await import("./session_store");
  return getThreadsForPersona(userId, personaId);
}

export async function createCollectiveThreadWithHost(input: {
  userId: string;
  hostPersonaId: string;
  placeId?: string | null;
  title?: string;
}) {
  assertPersonaCanParticipate(input.hostPersonaId);
  const thread = await createThread(input.userId, input.hostPersonaId, input.title, {
    placeId: input.placeId || null,
    mode: "COLLECTIVE",
  });
  await ensureHostPresence(input.userId, thread.id);
  return thread;
}
