import { SessionState, ChatThread } from './types';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { isPrivateMemorySpace, PRIVATE_MEMORY_SPACES } from './privacy';
import { getPersonaLexicalHints } from './persona_behavior_contracts';
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
    generationStatus: true
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
    const thread = await prisma.thread.create({
        data: {
            userId,
            personaId,
            placeId: options.placeId || null,
            mode: options.mode || 'SINGLE',
            title: title || `Conversa com ${personaId}`,
        },
        include: {
            messages: { select: chatMessageSelect },
            participants: { orderBy: { joinedAt: 'asc' }, select: chatParticipantSelect },
        }
    });

    return mapChatThread(thread);
};

export const getThread = async (userId: string, threadId: string): Promise<ChatThread | null> => {
    const thread = await prisma.thread.findFirst({
        where: { id: threadId, userId },
        include: {
            messages: { orderBy: { timestamp: 'asc' }, select: chatMessageSelect },
            participants: { orderBy: { joinedAt: 'asc' }, select: chatParticipantSelect },
        }
    });

    if (!thread) return null;

    return mapChatThread(thread);
};

export const getThreadsForPersona = async (userId: string, personaId: string): Promise<ChatThread[]> => {
    const [legacyPersonaName, legacyPlaceName] = personaId.split(/\s+@\s+/).map((part) => part?.trim()).filter(Boolean);
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
        include: {
            messages: { select: chatMessageSelect },
            participants: { orderBy: { joinedAt: 'asc' }, select: chatParticipantSelect },
        }
    });

    return threads.map(mapChatThread);
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
    return prisma.thread.findMany({
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
    });
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
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId } });
    if (!thread) throw new Error("Thread not found or unauthorized");

    const message = await prisma.message.create({
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

    // Update thread updatedAt
    await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() }
    });

    return mapChatMessage(message);
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
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId } });
    if (!thread) throw new Error("Thread not found or unauthorized");

    const message = await prisma.message.create({
        data: {
            threadId,
            role: 'assistant',
            content,
            messageKind: 'PERSONA',
            generationStatus: 'COMPLETED',
        },
        select: chatMessageSelect,
    });

    await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
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
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId } });
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
    });

    return mapChatMessage(message);
};

export const updateThreadTitle = async (userId: string, threadId: string, title: string): Promise<void> => {
    // Verify ownership
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId } });
    if (!thread) return;

    await prisma.thread.update({
        where: { id: threadId },
        data: { title }
    });
};

export const deleteThread = async (userId: string, threadId: string): Promise<void> => {
    // Verify ownership
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId } });
    if (!thread) return;

    await prisma.thread.delete({
        where: { id: threadId }
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
    const [threads, personaEpisodes] = await Promise.all([
        prisma.thread.findMany({
        where: {
            userId,
            ...(options.excludeThreadId ? { id: { not: options.excludeThreadId } } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        include: {
            messages: {
                orderBy: { timestamp: 'desc' },
                take: 4,
                select: chatMessageSelect
            }
        }
        }),
        prisma.personaConversationEpisode.findMany({
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
        }),
    ]);

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
