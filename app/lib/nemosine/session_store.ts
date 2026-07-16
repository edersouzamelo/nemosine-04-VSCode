import { SessionState, ChatThread } from './types';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { isPrivateMemorySpace, PRIVATE_MEMORY_SPACES } from './privacy';
import { getPersonaLexicalHints } from './persona_behavior_contracts';
import type { HandoffState, PersonaHandoffOffer } from './handoff';
import {
    classifyConversationInputRichness,
    isConversationNavigationRequest,
    isPersonaMetaCritique,
    isPersonaRoleQuestion,
    isSourceReferenceRequest,
} from './persona-initiative';

export const prisma = new PrismaClient();

const chatMessageSelect = {
    id: true,
    threadId: true,
    role: true,
    content: true,
    timestamp: true,
    speakerPersonaId: true,
    turnGroupId: true,
    messageKind: true,
    generationStatus: true,
} as const;

const legacyChatMessageSelect = {
    id: true,
    threadId: true,
    role: true,
    content: true,
    timestamp: true,
} as const;

const chatParticipantSelect = {
    id: true,
    personaId: true,
    role: true,
    joinedAt: true,
    leftAt: true,
    active: true,
} as const;

type SelectedMessage = {
    id: string;
    role: string;
    content: string;
    timestamp: Date;
    speakerPersonaId?: string | null;
    turnGroupId?: string | null;
    messageKind?: string | null;
    generationStatus?: string | null;
};

const HANDOFF_EVENT_CONTENT_PREFIX = '[[NEMOSINE_EVENT:HANDOFF:';
const HANDOFF_CONTEXT_CONTENT_PREFIX = '[[NEMOSINE_EVENT:HANDOFF_CONTEXT:';

function encodeHandoffEventContent(metadata: HandoffEventMetadata) {
    return `${HANDOFF_EVENT_CONTENT_PREFIX}${encodeURIComponent(JSON.stringify(metadata))}]]`;
}

function decodeHandoffEventContent(content: string): HandoffEventMetadata | null {
    if (!content.startsWith(HANDOFF_EVENT_CONTENT_PREFIX) || !content.endsWith(']]')) return null;
    const encoded = content.slice(HANDOFF_EVENT_CONTENT_PREFIX.length, -2);
    try {
        return parseHandoffMetadata(JSON.parse(decodeURIComponent(encoded)));
    } catch {
        return null;
    }
}

type SelectedParticipant = {
    id: string;
    personaId: string;
    role: string;
    joinedAt: Date;
    leftAt?: Date | null;
    active: boolean;
};

const mapChatMessage = (m: SelectedMessage) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    timestamp: m.timestamp.getTime(),
    speakerPersonaId: m.speakerPersonaId ?? null,
    turnGroupId: m.turnGroupId ?? null,
    messageKind: (m.messageKind ?? null) as 'USER' | 'PERSONA' | 'SYSTEM_EVENT' | null,
    generationStatus: (m.generationStatus ?? null) as 'PENDING' | 'STREAMING' | 'COMPLETED' | 'FAILED' | null,
    metadata: decodeHandoffEventContent(m.content),
});

const mapChatParticipant = (participant: SelectedParticipant) => ({
    id: participant.id,
    personaId: participant.personaId,
    role: participant.role as 'HOST' | 'GUEST',
    joinedAt: participant.joinedAt.getTime(),
    leftAt: participant.leftAt?.getTime() ?? null,
    active: participant.active,
});

const mapChatThread = (thread: {
    id: string;
    personaId: string;
    placeId?: string | null;
    mode?: string;
    title: string;
    messages: SelectedMessage[];
    participants?: SelectedParticipant[];
    createdAt: Date;
    updatedAt: Date;
}): ChatThread => ({
    id: thread.id,
    personaId: thread.personaId,
    placeId: thread.placeId ?? null,
    mode: (thread.mode || 'SINGLE') as 'SINGLE' | 'COLLECTIVE',
    title: thread.title,
    messages: thread.messages.map(mapChatMessage),
    participants: thread.participants?.map(mapChatParticipant) || [],
    createdAt: thread.createdAt.getTime(),
    updatedAt: thread.updatedAt.getTime()
});

const mapLegacyChatThread = (thread: {
    id: string;
    personaId: string;
    title: string;
    messages: SelectedMessage[];
    createdAt: Date;
    updatedAt: Date;
}): ChatThread => ({
    id: thread.id,
    personaId: thread.personaId,
    placeId: thread.personaId.split(/\s+@\s+/)[1]?.trim() || null,
    mode: 'SINGLE',
    title: thread.title,
    messages: thread.messages.map(mapChatMessage),
    participants: [],
    createdAt: thread.createdAt.getTime(),
    updatedAt: thread.updatedAt.getTime()
});

const threadSelect = {
    id: true,
    personaId: true,
    placeId: true,
    mode: true,
    title: true,
    createdAt: true,
    updatedAt: true,
    messages: { select: chatMessageSelect },
    participants: { orderBy: { joinedAt: 'asc' as const }, select: chatParticipantSelect },
} as const;

const legacyThreadSelect = {
    id: true,
    personaId: true,
    title: true,
    createdAt: true,
    updatedAt: true,
    messages: { select: legacyChatMessageSelect },
} as const;

const isMissingMigratedSchemaError = (error: unknown) => {
    const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";
    const metaCause = typeof error === "object" && error !== null && "meta" in error
        ? String((error as { meta?: { cause?: unknown; column?: unknown } }).meta?.cause
            || (error as { meta?: { cause?: unknown; column?: unknown } }).meta?.column
            || "")
        : "";
    const message = [
        error instanceof Error ? error.message : String(error || ""),
        metaCause,
    ].join("\n");
    return code === "P2021"
        || code === "P2022"
        || message.includes("does not exist in the current database")
        || message.includes("The column")
        || message.includes("Unknown arg")
        || message.includes("P2021")
        || message.includes("P2022");
};

const createLegacyThread = async (
    userId: string,
    personaId: string,
    title: string,
) => {
    const now = new Date();
    const id = randomUUID();
    const rows = await prisma.$queryRaw<Array<{
        id: string;
        personaId: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
    }>>`
        INSERT INTO "Thread" ("id", "userId", "personaId", "title", "createdAt", "updatedAt")
        VALUES (${id}, ${userId}, ${personaId}, ${title}, ${now}, ${now})
        RETURNING "id", "personaId", "title", "createdAt", "updatedAt"
    `;
    return { ...rows[0], messages: [] };
};

const createLegacyMessage = async (
    threadId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
) => {
    const now = new Date();
    const id = randomUUID();
    const rows = await prisma.$queryRaw<Array<{
        id: string;
        threadId: string;
        role: string;
        content: string;
        timestamp: Date;
    }>>`
        INSERT INTO "Message" ("id", "threadId", "role", "content", "timestamp")
        VALUES (${id}, ${threadId}, ${role}, ${content}, ${now})
        RETURNING "id", "threadId", "role", "content", "timestamp"
    `;
    return rows[0];
};

// Use a global variable to persist state across hot reloads in development
const globalForNemosine = globalThis as unknown as { nemosineSession: SessionState };

export const getSession = (): SessionState => {
    if (!globalForNemosine.nemosineSession) {
        globalForNemosine.nemosineSession = {
            id: 'global-dev-session',
            current_location: 'Castelo', // Default start
            active_personas: [],
            room_log: [],
            threads: {}, // Initialize threads
            is_incognito: false
        };
    }
    // Migration for hot-reload: ensure threads exists
    if (!globalForNemosine.nemosineSession.threads) {
        globalForNemosine.nemosineSession.threads = {};
    }
    return globalForNemosine.nemosineSession;
};

// Thread Management (Now Async via Prisma)
export const createThread = async (
    userId: string,
    personaId: string,
    title?: string,
    options: { placeId?: string | null; mode?: 'SINGLE' | 'COLLECTIVE' } = {},
): Promise<ChatThread> => {
    try {
        const thread = await prisma.thread.create({
            data: {
                userId,
                personaId,
                placeId: options.placeId || null,
                mode: options.mode || 'SINGLE',
                title: title || `Conversa com ${personaId}`,
            },
            select: threadSelect,
        });

        return mapChatThread(thread);
    } catch (error) {
        if (!isMissingMigratedSchemaError(error)) throw error;
        const legacyPersonaId = options.placeId ? `${personaId} @ ${options.placeId}` : personaId;
        const thread = await createLegacyThread(
            userId,
            legacyPersonaId,
            title || `Conversa com ${legacyPersonaId}`,
        );
        return mapLegacyChatThread(thread);
    }
};

export const getThread = async (userId: string, threadId: string): Promise<ChatThread | null> => {
    let thread;
    try {
        thread = await prisma.thread.findFirst({
            where: { id: threadId, userId },
            select: {
                ...threadSelect,
                messages: { orderBy: { timestamp: 'asc' }, select: chatMessageSelect },
            },
        });
    } catch (error) {
        if (!isMissingMigratedSchemaError(error)) throw error;
        const legacyThread = await prisma.thread.findFirst({
            where: { id: threadId, userId },
            select: {
                ...legacyThreadSelect,
                messages: { orderBy: { timestamp: 'asc' }, select: legacyChatMessageSelect },
            },
        });
        return legacyThread ? mapLegacyChatThread(legacyThread) : null;
    }

    if (!thread) return null;

    return mapChatThread(thread);
};

export const getThreadsForPersona = async (userId: string, personaId: string): Promise<ChatThread[]> => {
    const [legacyPersonaName, legacyPlaceName] = personaId.split(/\s+@\s+/).map((part) => part?.trim()).filter(Boolean);
    try {
        const threads = await prisma.thread.findMany({
            where: {
                userId,
                OR: [
                    { personaId },
                    legacyPersonaName && legacyPlaceName ? { personaId: legacyPersonaName, placeId: legacyPlaceName } : undefined,
                    { participants: { some: { personaId } } },
                    legacyPersonaName ? { participants: { some: { personaId: legacyPersonaName } } } : undefined,
                ].filter(Boolean) as any,
            },
            orderBy: { updatedAt: 'desc' },
            select: threadSelect,
        });

        return threads.map(mapChatThread);
    } catch (error) {
        if (!isMissingMigratedSchemaError(error)) throw error;
        const threads = await prisma.thread.findMany({
            where: { userId, personaId },
            orderBy: { updatedAt: 'desc' },
            select: legacyThreadSelect,
        });

        return threads.map(mapLegacyChatThread);
    }
};

export type RecentConversationThread = {
    id: string;
    personaId: string;
    placeId: string | null;
    mode: 'SINGLE' | 'COLLECTIVE';
    title: string;
    updatedAt: Date;
};

export const getRecentConversationThreads = async (userId: string, take = 8): Promise<RecentConversationThread[]> => {
    try {
        return await prisma.thread.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take,
            select: {
                id: true,
                personaId: true,
                placeId: true,
                mode: true,
                title: true,
                updatedAt: true,
            },
        }) as RecentConversationThread[];
    } catch (error) {
        if (!isMissingMigratedSchemaError(error)) throw error;
        const threads = await prisma.thread.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take,
            select: {
                id: true,
                personaId: true,
                title: true,
                updatedAt: true,
            },
        });
        return threads.map((thread) => ({
            ...thread,
            placeId: thread.personaId.split(/\s+@\s+/)[1]?.trim() || null,
            mode: 'SINGLE',
        }));
    }
};

export type AddMessageOptions = {
    speakerPersonaId?: string | null;
    turnGroupId?: string | null;
    messageKind?: 'USER' | 'PERSONA' | 'SYSTEM_EVENT' | null;
    generationStatus?: 'PENDING' | 'STREAMING' | 'COMPLETED' | 'FAILED' | null;
};

export const addMessageToThread = async (
    userId: string,
    threadId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    options: AddMessageOptions = {},
) => {
    // Verify ownership
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId }, select: { id: true } });
    if (!thread) throw new Error("Thread not found or unauthorized");

    let message;
    try {
        message = await prisma.message.create({
            data: {
                threadId,
                role,
                content,
                speakerPersonaId: options.speakerPersonaId ?? null,
                turnGroupId: options.turnGroupId ?? null,
                messageKind: options.messageKind ?? (role === 'user' ? 'USER' : role === 'assistant' ? 'PERSONA' : 'SYSTEM_EVENT'),
                generationStatus: options.generationStatus ?? null,
            },
            select: chatMessageSelect
        });
    } catch (error) {
        if (!isMissingMigratedSchemaError(error)) throw error;
        message = await createLegacyMessage(threadId, role, content);
    }

    // Update thread updatedAt
    await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
        select: { id: true },
    });

    return mapChatMessage(message);
};

export type HandoffEventMetadata = {
    eventType: 'HANDOFF_OFFERED';
    state: HandoffState;
    originMessageId: string | null;
    sourcePersona: string;
    targetPersona: string;
    targetSlug: string;
    title: string;
    reason: string;
    summary: string;
    draft: string;
    handoffContextId?: string | null;
    userAuthoredPrompt?: string | null;
    structuredSummary?: string | null;
    presenceContractSnapshot?: string | null;
    decisionId?: string | null;
    trigger?: PersonaHandoffOffer["trigger"];
    currentPersonaFit?: PersonaHandoffOffer["currentPersonaFit"];
    requiresConfirmation: boolean;
    actions: {
        open: boolean;
        invite: boolean;
    };
    offeredAt: string;
    updatedAt: string;
    openedAt?: string | null;
    invitedAt?: string | null;
    declinedAt?: string | null;
    unavailableAt?: string | null;
};

function handoffMetadataFromOffer(input: {
    offer: PersonaHandoffOffer;
    originMessageId?: string | null;
    existing?: Partial<HandoffEventMetadata> | null;
    state?: HandoffState;
}): HandoffEventMetadata {
    const now = new Date().toISOString();
    const existing = input.existing || {};
    const state = input.state || existing.state || input.offer.state || 'offered';
    return {
        eventType: 'HANDOFF_OFFERED',
        state,
        originMessageId: input.originMessageId ?? existing.originMessageId ?? input.offer.originMessageId ?? null,
        sourcePersona: input.offer.sourcePersona,
        targetPersona: input.offer.targetPersona,
        targetSlug: input.offer.targetSlug,
        title: input.offer.title,
        reason: input.offer.reason,
        summary: input.offer.summary,
        draft: input.offer.draft,
        handoffContextId: input.offer.handoffContextId || existing.handoffContextId || null,
        userAuthoredPrompt: input.offer.userAuthoredPrompt || existing.userAuthoredPrompt || null,
        structuredSummary: input.offer.structuredSummary || input.offer.summary || existing.structuredSummary || null,
        presenceContractSnapshot: existing.presenceContractSnapshot || null,
        decisionId: input.offer.decisionId || existing.decisionId || null,
        trigger: input.offer.trigger || existing.trigger || null,
        currentPersonaFit: input.offer.currentPersonaFit || existing.currentPersonaFit || null,
        requiresConfirmation: Boolean(input.offer.requiresConfirmation),
        actions: {
            open: true,
            invite: true,
        },
        offeredAt: existing.offeredAt || input.offer.offeredAt || now,
        updatedAt: now,
        openedAt: existing.openedAt ?? (state === 'opened' ? now : null),
        invitedAt: existing.invitedAt ?? (state === 'invited' ? now : null),
        declinedAt: existing.declinedAt ?? (state === 'declined' ? now : null),
        unavailableAt: existing.unavailableAt ?? (state === 'unavailable' ? now : null),
    };
}

function parseHandoffMetadata(value: unknown): HandoffEventMetadata | null {
    if (!value || typeof value !== 'object') return null;
    const item = value as Partial<HandoffEventMetadata>;
    if (item.eventType !== 'HANDOFF_OFFERED' || !item.sourcePersona || !item.targetPersona) return null;
    return item as HandoffEventMetadata;
}

export const upsertHandoffEventMessage = async (
    userId: string,
    threadId: string,
    input: {
        originMessageId?: string | null;
        offer: PersonaHandoffOffer;
        state?: HandoffState;
    },
) => {
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId }, select: { id: true } });
    if (!thread) throw new Error("Thread not found or unauthorized");

    const originMessageId = input.originMessageId || null;
    const existingRows = await prisma.message.findMany({
        where: {
            threadId,
            messageKind: 'SYSTEM_EVENT',
            content: { startsWith: HANDOFF_EVENT_CONTENT_PREFIX },
        },
        orderBy: { timestamp: 'asc' },
        select: chatMessageSelect,
    });
    const existing = existingRows.find((row) => {
        const metadata = decodeHandoffEventContent(row.content);
        return metadata?.originMessageId === originMessageId && metadata.targetPersona === input.offer.targetPersona;
    }) || null;
    const metadata = handoffMetadataFromOffer({
        offer: input.offer,
        originMessageId,
        existing: decodeHandoffEventContent(existing?.content || ''),
        state: input.state,
    });

    const message = existing
        ? await prisma.message.update({
            where: { id: existing.id },
            data: {
                content: encodeHandoffEventContent(metadata),
            },
            select: chatMessageSelect,
        })
        : await prisma.message.create({
            data: {
                threadId,
                role: 'system',
                content: encodeHandoffEventContent(metadata),
                messageKind: 'SYSTEM_EVENT',
            },
            select: chatMessageSelect,
        });

    await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
        select: { id: true },
    });

    return mapChatMessage(message);
};

export const updateHandoffEventState = async (
    userId: string,
    input: {
        messageId?: string | null;
        threadId?: string | null;
        originMessageId?: string | null;
        targetPersona?: string | null;
        state: HandoffState;
    },
) => {
    const now = new Date().toISOString();
    const rows = input.messageId
        ? await prisma.message.findMany({
            where: {
                id: input.messageId,
                thread: { userId },
                messageKind: 'SYSTEM_EVENT',
                content: { startsWith: HANDOFF_EVENT_CONTENT_PREFIX },
            },
            take: 1,
            select: chatMessageSelect,
        })
        : await prisma.message.findMany({
            where: {
                threadId: input.threadId || '',
                thread: { userId },
                messageKind: 'SYSTEM_EVENT',
                content: { startsWith: HANDOFF_EVENT_CONTENT_PREFIX },
            },
            orderBy: { timestamp: 'asc' },
            select: chatMessageSelect,
        });
    const row = rows.find((item) => {
        if (input.messageId) return true;
        const metadata = decodeHandoffEventContent(item.content);
        return metadata?.originMessageId === (input.originMessageId || null)
            && metadata.targetPersona === input.targetPersona;
    });
    if (!row) return null;
    const metadata = decodeHandoffEventContent(row.content);
    if (!metadata) return null;
    const nextMetadata: HandoffEventMetadata = {
        ...metadata,
        state: input.state,
        updatedAt: now,
        openedAt: input.state === 'opened' ? now : metadata.openedAt ?? null,
        invitedAt: input.state === 'invited' ? now : metadata.invitedAt ?? null,
        declinedAt: input.state === 'declined' ? now : metadata.declinedAt ?? null,
        unavailableAt: input.state === 'unavailable' ? now : metadata.unavailableAt ?? null,
    };
    const message = await prisma.message.update({
        where: { id: row.id },
        data: { content: encodeHandoffEventContent(nextMetadata) },
        select: chatMessageSelect,
    });
    await prisma.thread.update({
        where: { id: row.threadId },
        data: { updatedAt: new Date() },
        select: { id: true },
    });
    return mapChatMessage(message);
};

export type HandoffContextRecord = {
    id: string;
    sourceThreadId: string;
    sourceMessageIds: string[];
    sourcePersona: string;
    targetPersona: string;
    userAuthoredPrompt: string;
    structuredSummary: string;
    presenceContractSnapshot: string | null;
    createdAt: string;
    expiresAt: string;
    consumedAt: string | null;
    requiresConfirmation: boolean;
};

function encodeHandoffContextContent(context: HandoffContextRecord) {
    return `${HANDOFF_CONTEXT_CONTENT_PREFIX}${encodeURIComponent(JSON.stringify(context))}]]`;
}

function decodeHandoffContextContent(content: string): HandoffContextRecord | null {
    if (!content.startsWith(HANDOFF_CONTEXT_CONTENT_PREFIX) || !content.endsWith(']]')) return null;
    const encoded = content.slice(HANDOFF_CONTEXT_CONTENT_PREFIX.length, -2);
    try {
        const parsed = JSON.parse(decodeURIComponent(encoded)) as HandoffContextRecord;
        return parsed?.id && parsed?.sourceThreadId ? parsed : null;
    } catch {
        return null;
    }
}

function sanitizeHandoffPrompt(text: string, maxLength: number) {
    return String(text || "")
        .replace(/\[\[NEMOSINE_[^\]]+\]\]/g, " ")
        .replace(/^Ajuste de Presen[cç]a confirmado[\s\S]*$/i, " ")
        .replace(/\bNEMOSINE_PRESENCE_OPENING\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}

export const createHandoffContext = async (
    userId: string,
    input: {
        sourceThreadId: string;
        sourceMessageIds?: string[];
        sourcePersona: string;
        targetPersona: string;
        userAuthoredPrompt: string;
        structuredSummary?: string | null;
        presenceContractSnapshot?: string | null;
        requiresConfirmation?: boolean;
    },
): Promise<HandoffContextRecord> => {
    const thread = await prisma.thread.findFirst({ where: { id: input.sourceThreadId, userId }, select: { id: true } });
    if (!thread) throw new Error("Thread not found or unauthorized");

    const now = new Date();
    const context: HandoffContextRecord = {
        id: randomUUID(),
        sourceThreadId: input.sourceThreadId,
        sourceMessageIds: (input.sourceMessageIds || []).filter(Boolean).slice(0, 8),
        sourcePersona: input.sourcePersona,
        targetPersona: input.targetPersona,
        userAuthoredPrompt: sanitizeHandoffPrompt(input.userAuthoredPrompt, 4000),
        structuredSummary: sanitizeHandoffPrompt(input.structuredSummary || input.userAuthoredPrompt, 1000),
        presenceContractSnapshot: input.presenceContractSnapshot ? sanitizeHandoffPrompt(input.presenceContractSnapshot, 1000) : null,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        consumedAt: null,
        requiresConfirmation: Boolean(input.requiresConfirmation),
    };
    if (!context.userAuthoredPrompt || /^ajuste de presen/i.test(context.userAuthoredPrompt)) {
        throw new Error("INVALID_HANDOFF_CONTEXT_SOURCE");
    }

    await prisma.message.create({
        data: {
            threadId: input.sourceThreadId,
            role: 'system',
            content: encodeHandoffContextContent(context),
            messageKind: 'SYSTEM_EVENT',
        },
        select: { id: true },
    });
    return context;
};

export const getHandoffContext = async (userId: string, contextId: string) => {
    const rows = await prisma.message.findMany({
        where: {
            thread: { userId },
            messageKind: 'SYSTEM_EVENT',
            content: { startsWith: HANDOFF_CONTEXT_CONTENT_PREFIX },
        },
        orderBy: { timestamp: 'desc' },
        take: 80,
        select: chatMessageSelect,
    });
    const row = rows.find((message) => decodeHandoffContextContent(message.content)?.id === contextId);
    const context = row ? decodeHandoffContextContent(row.content) : null;
    if (!context) return null;
    if (new Date(context.expiresAt).getTime() < Date.now()) return { ...context, expired: true as const };
    return context;
};

export type PersistedAssistantMessage = {
    id: string;
    threadId: string;
    cognitiveRunId: string;
};

export const persistAssistantMessageForCognitiveRun = async (
    userId: string,
    threadId: string,
    cognitiveRunId: string,
    content: string,
): Promise<PersistedAssistantMessage> => {
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId }, select: { id: true } });
    if (!thread) throw new Error("Thread not found or unauthorized");

    let message;
    try {
        message = await prisma.message.create({
            data: {
                threadId,
                role: 'assistant',
                content,
                messageKind: 'PERSONA',
                generationStatus: 'COMPLETED',
            },
            select: chatMessageSelect,
        });
    } catch (error) {
        if (!isMissingMigratedSchemaError(error)) throw error;
        message = await createLegacyMessage(threadId, 'assistant', content);
    }

    await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
        select: { id: true },
    });

    return {
        id: message.id,
        threadId,
        cognitiveRunId,
    };
};

export const createPendingPersonaMessage = async (
    userId: string,
    threadId: string,
    speakerPersonaId: string,
    turnGroupId: string,
) => {
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId }, select: { id: true } });
    if (!thread) throw new Error("Thread not found or unauthorized");

    const message = await prisma.message.create({
        data: {
            threadId,
            role: 'assistant',
            content: '',
            speakerPersonaId,
            turnGroupId,
            messageKind: 'PERSONA',
            generationStatus: 'PENDING',
        },
        select: chatMessageSelect,
    });

    await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
        select: { id: true },
    });

    return mapChatMessage(message);
};

export const updatePersonaMessageGeneration = async (
    userId: string,
    messageId: string,
    content: string,
    generationStatus: 'STREAMING' | 'COMPLETED' | 'FAILED',
) => {
    const existing = await prisma.message.findFirst({
        where: {
            id: messageId,
            thread: { userId },
        },
        select: { id: true, threadId: true },
    });
    if (!existing) throw new Error("Message not found or unauthorized");

    const message = await prisma.message.update({
        where: { id: messageId },
        data: { content, generationStatus },
        select: chatMessageSelect,
    });

    await prisma.thread.update({
        where: { id: existing.threadId },
        data: { updatedAt: new Date() },
        select: { id: true },
    });

    return mapChatMessage(message);
};

export const updateThreadTitle = async (userId: string, threadId: string, title: string): Promise<void> => {
    // Verify ownership
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId }, select: { id: true } });
    if (!thread) return;

    await prisma.thread.update({
        where: { id: threadId },
        data: { title },
        select: { id: true },
    });
};

export const deleteThread = async (userId: string, threadId: string): Promise<void> => {
    // Verify ownership
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId }, select: { id: true } });
    if (!thread) return;

    await prisma.thread.delete({
        where: { id: threadId },
        select: { id: true },
    });
};

// Memory Management (Cross-Session)
// Memories created inside private spaces may return only to their originating space.
export type UserMemoryRecord = {
    id: string;
    content: string;
    personaId: string | null;
    createdAt: Date;
};

export const getUserMemoryRecords = async (
    userId: string,
    targetPersonaId: string,
    take = 60,
): Promise<UserMemoryRecord[]> => {
    const visibleSources = isPrivateMemorySpace(targetPersonaId)
        ? [
            { personaId: null },
            { personaId: { notIn: [...PRIVATE_MEMORY_SPACES] } },
            { personaId: targetPersonaId }
        ]
        : [
            { personaId: null },
            { personaId: { notIn: [...PRIVATE_MEMORY_SPACES] } }
        ];

    const memories = await prisma.userMemory.findMany({
        where: {
            userId,
            OR: visibleSources
        },
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, content: true, personaId: true, createdAt: true }
    });
    return memories;
};

export const getUserMemories = async (userId: string, targetPersonaId: string): Promise<string[]> => {
    const memories = await getUserMemoryRecords(userId, targetPersonaId);
    return memories.map(m => m.content);
};

const normalizeForScoring = (text: string) => text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildScoringTerms = (personaId: string, userText: string) => {
    const stopwords = new Set([
        "a", "o", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "e", "em",
        "para", "por", "com", "que", "como", "qual", "quais", "me", "meu", "minha",
        "voce", "hoje", "agora", "sobre", "isso", "esse", "essa", "este", "esta",
    ]);
    const normalizedTextTerms = normalizeForScoring(`${personaId} ${userText}`)
        .split(" ")
        .filter((term) => term.length > 2 && !stopwords.has(term));
    const contractTerms = getPersonaLexicalHints(personaId)
        .flatMap((hint) => normalizeForScoring(hint).split(" "))
        .filter((term) => term.length > 2 && !stopwords.has(term));

    return Array.from(new Set([...normalizedTextTerms, ...contractTerms]));
};

type SnippetRecord = {
    content: string;
    createdAt?: Date | string | number | null;
};

const snippetTime = (value?: Date | string | number | null) => {
    if (!value) return null;
    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
};

const rankRelevantSnippets = (
    snippets: SnippetRecord[],
    personaId: string,
    userText: string,
    limit: number,
) => {
    const terms = buildScoringTerms(personaId, userText);
    const richness = classifyConversationInputRichness(userText);
    const continuityMode = richness.requiresContextExpansion && richness.richness === "low";
    const denominator = Math.max(snippets.length - 1, 1);

    return snippets
        .map((content, index) => {
            const normalizedContent = normalizeForScoring(content.content);
            const lexicalScore = terms.reduce((total, term) => {
                if (!normalizedContent.includes(term)) return total;
                const occurrences = normalizedContent.split(term).length - 1;
                return total + 1 + Math.min(occurrences, 3);
            }, 0);
            const recencyScore = 1 - index / denominator;
            const score = continuityMode
                ? recencyScore * 3 + lexicalScore * 0.15
                : lexicalScore * 2 + recencyScore * 0.35;

            return { content: content.content, createdAt: content.createdAt, score, lexicalScore, index };
        })
        .filter((item) => item.lexicalScore > 0 || (continuityMode && item.index < Math.max(limit * 2, 4)) || item.index < 4)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, limit)
        .sort((a, b) => {
            const aTime = snippetTime(a.createdAt);
            const bTime = snippetTime(b.createdAt);
            if (aTime !== null && bTime !== null) return aTime - bTime;
            return b.index - a.index;
        })
        .map((item) => item.content);
};

export const getRelevantUserMemories = async (
    userId: string,
    targetPersonaId: string,
    userText: string,
    limit = 10,
): Promise<string[]> => {
    const memories = await getUserMemoryRecords(userId, targetPersonaId);
    return rankRelevantSnippets(memories, targetPersonaId, userText, limit);
};

type ConversationEpisodeLookupOptions = {
    excludeThreadId?: string | null;
};

const getVisibleConversationEpisodeCandidates = async (
    userId: string,
    targetPersonaId: string,
    options: ConversationEpisodeLookupOptions = {},
): Promise<string[]> => {
    const threads = await prisma.thread.findMany({
        where: {
            userId,
            ...(options.excludeThreadId ? { id: { not: options.excludeThreadId } } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        select: {
            id: true,
            personaId: true,
            updatedAt: true,
            messages: {
                orderBy: { timestamp: 'desc' },
                take: 4,
                select: legacyChatMessageSelect
            }
        }
    });
    const personaEpisodes = await prisma.personaConversationEpisode.findMany({
            where: {
                userId,
                personaId: targetPersonaId,
                ...(options.excludeThreadId ? { threadId: { not: options.excludeThreadId } } : {}),
                ...(isPrivateMemorySpace(targetPersonaId)
                    ? {}
                    : { visibilityPolicy: { not: 'CONFESSOR_SEALED' } }),
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                content: true,
                visibilityPolicy: true,
                createdAt: true,
            },
        }).catch((error) => {
            if (isMissingMigratedSchemaError(error)) return [];
            throw error;
        });

    const legacyEpisodes = threads
        .filter((thread) => {
            if (!isPrivateMemorySpace(thread.personaId)) return true;
            if (!isPrivateMemorySpace(targetPersonaId)) return false;
            return thread.personaId === targetPersonaId
                || thread.personaId.startsWith(`${targetPersonaId} @ `)
                || thread.personaId.endsWith(` @ ${targetPersonaId}`);
        })
        .filter(thread => thread.messages.some((message) => message.role === 'user'))
        .map(thread => {
            const excerpt = [...thread.messages]
                .filter((message) => message.role === 'user')
                .reverse()
                .map(message => `Usuario: ${message.content.slice(0, 280)}`)
                .join('\n');

            return `[Conversa com ${thread.personaId}]\n${excerpt}`;
        });

    return [
        ...personaEpisodes.map((episode) => {
            const label = episode.visibilityPolicy === 'CONFESSOR_SEALED'
                ? 'Episodio coletivo privado selado'
                : 'Episodio coletivo';
            return `[${label} de ${targetPersonaId}]\n${episode.content}`;
        }),
        ...legacyEpisodes,
    ];
};

export const getVisibleConversationEpisodes = async (
    userId: string,
    targetPersonaId: string,
    options: ConversationEpisodeLookupOptions = {},
): Promise<string[]> => {
    const candidates = await getVisibleConversationEpisodeCandidates(userId, targetPersonaId, options);
    return candidates.slice(0, 8);
};

export const getRelevantConversationEpisodes = async (
    userId: string,
    targetPersonaId: string,
    userText: string,
    limit = 6,
    options: ConversationEpisodeLookupOptions = {},
): Promise<string[]> => {
    const candidates = await getVisibleConversationEpisodeCandidates(userId, targetPersonaId, options);
    return rankRelevantSnippets(
        candidates.map((content) => ({ content })),
        targetPersonaId,
        userText,
        limit,
    );
};

export const addUserMemory = async (userId: string, content: string, personaId?: string): Promise<void> => {
    const normalizedContent = content.trim().slice(0, 1000);
    if (!normalizedContent) return;

    const existingMemory = await prisma.userMemory.findFirst({
        where: {
            userId,
            personaId: personaId ?? null,
            content: normalizedContent
        }
    });

    if (existingMemory) return;

    await prisma.userMemory.create({
        data: {
            userId,
            content: normalizedContent,
            personaId
        }
    });
};

export const retainConversationEpisode = async (userId: string, personaId: string, content: string): Promise<void> => {
    const normalizedMessage = content.replace(/\s+/g, ' ').trim();
    if (normalizedMessage.length < 12) return;
    const richness = classifyConversationInputRichness(normalizedMessage);
    if (
        isConversationNavigationRequest(normalizedMessage)
        || isPersonaMetaCritique(normalizedMessage)
        || isPersonaRoleQuestion(normalizedMessage)
        || isSourceReferenceRequest(normalizedMessage)
        || richness.richness !== "high"
        || richness.requiresContextExpansion
    ) {
        return;
    }

    // Retain the user's public trail without presenting every utterance as an established fact.
    await addUserMemory(
        userId,
        `EPISODIO COM ${personaId} | O usuario escreveu: ${normalizedMessage.slice(0, 900)}`,
        personaId
    );
};

export const retainPersonaConversationEpisode = async (input: {
    userId: string;
    personaId: string;
    threadId: string;
    turnGroupId?: string | null;
    content: string;
    visibilityPolicy: 'SHARED' | 'PERSONA_PRIVATE' | 'CONFESSOR_SEALED';
}): Promise<boolean> => {
    const normalizedContent = input.content.replace(/\s+/g, ' ').trim().slice(0, 2400);
    if (normalizedContent.length < 24) return false;

    const sourceHash = createHash('sha256')
        .update(`${input.threadId}:${input.personaId}:${normalizedContent}`)
        .digest('hex');

    try {
        await prisma.personaConversationEpisode.create({
            data: {
                userId: input.userId,
                personaId: input.personaId,
                threadId: input.threadId,
                turnGroupId: input.turnGroupId || null,
                content: normalizedContent,
                sourceHash,
                visibilityPolicy: input.visibilityPolicy,
            },
        });
        return true;
    } catch (error: any) {
        if (error?.code === 'P2002') return false;
        throw error;
    }
};

// Legacy support
export const addLog = (role: 'user' | 'assistant' | 'system', content: string) => {
    const session = getSession();
    session.room_log.push({
        role,
        content,
        timestamp: Date.now(),
        visibility: session.is_incognito ? 'PRIVATE' : 'PUBLIC'
    });
};
