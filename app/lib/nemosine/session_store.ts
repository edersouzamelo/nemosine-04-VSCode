import { SessionState, ChatThread } from './types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
export const getUserMemories = async (userId: string): Promise<string[]> => {
    const memories = await prisma.userMemory.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' }
    });
    return memories.map(m => m.content);
};

export const addUserMemory = async (userId: string, content: string, personaId?: string): Promise<void> => {
    await prisma.userMemory.create({
        data: {
            userId,
            content,
            personaId
        }
    });
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
