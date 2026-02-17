import { SessionState, ChatThread } from './types';

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

// Thread Management
export const createThread = (personaId: string, title?: string): ChatThread => {
    const session = getSession();
    const id = Date.now().toString(); // Simple ID
    const newThread: ChatThread = {
        id,
        personaId,
        title: title || `Conversa com ${personaId}`,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    session.threads[id] = newThread;
    return newThread;
};

export const getThread = (threadId: string): ChatThread | undefined => {
    const session = getSession();
    return session.threads[threadId];
};

export const getThreadsForPersona = (personaId: string): ChatThread[] => {
    const session = getSession();
    return Object.values(session.threads)
        .filter(t => t.personaId === personaId)
        .sort((a, b) => b.updatedAt - a.updatedAt); // Newest first
};

export const addMessageToThread = (threadId: string, role: 'user' | 'assistant' | 'system', content: string) => {
    const session = getSession();
    const thread = session.threads[threadId];
    if (thread) {
        thread.messages.push({
            id: Date.now().toString() + Math.random().toString().slice(2, 5),
            role,
            content,
            timestamp: Date.now()
        });
        thread.updatedAt = Date.now();
    }
};

export const updateThreadTitle = (threadId: string, title: string) => {
    const session = getSession();
    const thread = session.threads[threadId];
    if (thread) {
        thread.title = title;
    }
};

export const deleteThread = (threadId: string) => {
    const session = getSession();
    delete session.threads[threadId];
};

// Legacy support (to avoid breaking other possible refs, though we are moving to threads)
export const addLog = (role: 'user' | 'assistant' | 'system', content: string) => {
    const session = getSession();
    session.room_log.push({
        role,
        content,
        timestamp: Date.now(),
        visibility: session.is_incognito ? 'PRIVATE' : 'PUBLIC'
    });
};
