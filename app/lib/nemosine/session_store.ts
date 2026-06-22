import { SessionState, ChatThread } from './types';
import { PrismaClient } from '@prisma/client';
import { isPrivateMemorySpace, PRIVATE_MEMORY_SPACES } from './privacy';
import { getPersonaLexicalHints } from './persona_behavior_contracts';

export const prisma = new PrismaClient();

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
        include: { messages: true }
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
        include: { messages: { orderBy: { timestamp: 'asc' } } }
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
        include: { messages: true }
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
        }
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
            throw new Error("Cognitive run message idempotency conflict");
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
export const getUserMemories = async (userId: string, targetPersonaId: string): Promise<string[]> => {
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
        take: 60,
        select: { content: true }
    });
    return memories.reverse().map(m => m.content);
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

const rankRelevantSnippets = (
    snippets: string[],
    personaId: string,
    userText: string,
    limit: number,
) => {
    const terms = buildScoringTerms(personaId, userText);

    return snippets
        .map((content, index) => {
            const normalizedContent = normalizeForScoring(content);
            const score = terms.reduce((total, term) => {
                if (!normalizedContent.includes(term)) return total;
                const occurrences = normalizedContent.split(term).length - 1;
                return total + 1 + Math.min(occurrences, 3);
            }, 0);

            return { content, score, index };
        })
        .filter((item) => item.score > 0 || item.index < 4)
        .sort((a, b) => b.score - a.score || b.index - a.index)
        .slice(0, limit)
        .sort((a, b) => a.index - b.index)
        .map((item) => item.content);
};

export const getRelevantUserMemories = async (
    userId: string,
    targetPersonaId: string,
    userText: string,
    limit = 10,
): Promise<string[]> => {
    const memories = await getUserMemories(userId, targetPersonaId);
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
                take: 4
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
    return rankRelevantSnippets(candidates, targetPersonaId, userText, limit);
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
