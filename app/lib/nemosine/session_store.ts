import { SessionState, ChatThread } from './types';
import { PrismaClient } from '@prisma/client';
import { isPrivateMemorySpace, PRIVATE_MEMORY_SPACES } from './privacy';
import { getPersonaLexicalHints } from './persona_behavior_contracts';
import { classifyConversationInputRichness } from './persona-initiative';

export const prisma = new PrismaClient();

const chatMessageSelect = {
    id: true,
    threadId: true,
    role: true,
    content: true,
    timestamp: true
} as const;

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
export const createThread = async (userId: string, personaId: string, title?: string): Promise<ChatThread> => {
    const thread = await prisma.thread.create({
        data: {
            userId,
            personaId,
            title: title || `Conversa com ${personaId}`,
        },
        include: { messages: { select: chatMessageSelect } }
    });

    // Convert to ChatThread format
    return {
        id: thread.id,
        personaId: thread.personaId,
        title: thread.title,
        messages: thread.messages.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: m.timestamp.getTime()
        })),
        createdAt: thread.createdAt.getTime(),
        updatedAt: thread.updatedAt.getTime()
    };
};

export const getThread = async (userId: string, threadId: string): Promise<ChatThread | null> => {
    const thread = await prisma.thread.findFirst({
        where: { id: threadId, userId },
        include: { messages: { orderBy: { timestamp: 'asc' }, select: chatMessageSelect } }
    });

    if (!thread) return null;

    return {
        id: thread.id,
        personaId: thread.personaId,
        title: thread.title,
        messages: thread.messages.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: m.timestamp.getTime()
        })),
        createdAt: thread.createdAt.getTime(),
        updatedAt: thread.updatedAt.getTime()
    };
};

export const getThreadsForPersona = async (userId: string, personaId: string): Promise<ChatThread[]> => {
    const threads = await prisma.thread.findMany({
        where: { userId, personaId },
        orderBy: { updatedAt: 'desc' },
        include: { messages: { select: chatMessageSelect } }
    });

    return threads.map(thread => ({
        id: thread.id,
        personaId: thread.personaId,
        title: thread.title,
        messages: thread.messages.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: m.timestamp.getTime()
        })),
        createdAt: thread.createdAt.getTime(),
        updatedAt: thread.updatedAt.getTime()
    }));
};

export const addMessageToThread = async (userId: string, threadId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> => {
    // Verify ownership
    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId } });
    if (!thread) throw new Error("Thread not found or unauthorized");

    await prisma.message.create({
        data: {
            threadId,
            role,
            content
        },
        select: chatMessageSelect
    });

    // Update thread updatedAt
    await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() }
    });
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
    const existing = await prisma.message.findUnique({
        where: { cognitiveRunId },
        include: { thread: true },
    });

    if (existing) {
        if (existing.thread.userId !== userId || existing.threadId !== threadId || existing.role !== 'assistant') {
            throw new Error("Cognitive run id is already linked to another message");
        }
        return {
            id: existing.id,
            threadId: existing.threadId,
            cognitiveRunId,
        };
    }

    const thread = await prisma.thread.findFirst({ where: { id: threadId, userId } });
    if (!thread) throw new Error("Thread not found or unauthorized");

    try {
        const message = await prisma.message.create({
            data: {
                threadId,
                role: 'assistant',
                content,
                cognitiveRunId,
            },
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
    } catch (error: any) {
        if (error?.code !== "P2002") throw error;
        const racedExisting = await prisma.message.findUnique({
            where: { cognitiveRunId },
            include: { thread: true },
        });
        if (!racedExisting || racedExisting.thread.userId !== userId || racedExisting.threadId !== threadId || racedExisting.role !== 'assistant') {
            throw error;
        }
        return {
            id: racedExisting.id,
            threadId: racedExisting.threadId,
            cognitiveRunId,
        };
    }
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

const getVisibleConversationEpisodeCandidates = async (userId: string, targetPersonaId: string): Promise<string[]> => {
    const threads = await prisma.thread.findMany({
        where: {
            userId
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
    });

    return threads
        .filter((thread) => {
            if (!isPrivateMemorySpace(thread.personaId)) return true;
            if (!isPrivateMemorySpace(targetPersonaId)) return false;
            return thread.personaId === targetPersonaId
                || thread.personaId.startsWith(`${targetPersonaId} @ `)
                || thread.personaId.endsWith(` @ ${targetPersonaId}`);
        })
        .filter(thread => thread.messages.length > 0)
        .map(thread => {
            const excerpt = [...thread.messages]
                .reverse()
                .map(message => {
                    const speaker = message.role === 'user' ? 'Usuário' : thread.personaId;
                    return `${speaker}: ${message.content.slice(0, 280)}`;
                })
                .join('\n');

            return `[Conversa com ${thread.personaId}]\n${excerpt}`;
        });
};

export const getVisibleConversationEpisodes = async (userId: string, targetPersonaId: string): Promise<string[]> => {
    const candidates = await getVisibleConversationEpisodeCandidates(userId, targetPersonaId);
    return candidates.slice(0, 8);
};

export const getRelevantConversationEpisodes = async (
    userId: string,
    targetPersonaId: string,
    userText: string,
    limit = 6,
): Promise<string[]> => {
    const candidates = await getVisibleConversationEpisodeCandidates(userId, targetPersonaId);
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

    // Retain the user's public trail without presenting every utterance as an established fact.
    await addUserMemory(
        userId,
        `EPISODIO COM ${personaId} | O usuario escreveu: ${normalizedMessage.slice(0, 900)}`,
        personaId
    );
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
