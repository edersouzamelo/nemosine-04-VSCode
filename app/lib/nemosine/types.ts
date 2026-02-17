import { EntityData } from '@/app/data/entities';

export type LocationType = 'Castelo' | 'Porão' | 'Masmorra' | 'Claustro' | 'Biblioteca' | 'Observatório' | 'Jardim' | 'Teatro' | 'Oficina' | 'Galeria' | 'Sala do Trono' | 'Campanário' | 'Torreão' | 'Ponte' | 'Solar' | 'Mercado Real' | 'Tribunal' | 'Núcleo' | 'Não-Lugar' | 'Labirinto' | 'Arquivo';

export type VisibilityLevel = 'PUBLIC' | 'RESTRICTED' | 'PRIVATE' | 'SECRET';

export interface PersonaState {
    id: string; // The persona name (e.g., "O Bruxo")
    is_active: boolean; // Is currently "in the room"?
    // "Spectral" memory: what this instance knows from THIS session
    // This is temporary memory, lost when they leave the room context if not saved
    temporary_memory: string[];
}

export interface SessionState {
    id: string;
    current_location: LocationType;
    active_personas: PersonaState[];

    // "Spectral" memory (legacy/active room context)
    room_log: {
        role: 'user' | 'system' | 'assistant';
        content: string;
        timestamp: number;
        visibility: VisibilityLevel;
    }[];

    // New: Persistent Chat Threads (ChatGPT-style)
    threads: Record<string, ChatThread>;

    // Global flags
    is_incognito: boolean; // True if in Confessor/Porão mode
}

export interface ChatThread {
    id: string;
    personaId: string;
    title: string;
    messages: {
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: number;
    }[];
    createdAt: number;
    updatedAt: number;
}

// Logic helper to determine visibility
export function getVisibilityForLocation(location: LocationType): VisibilityLevel {
    switch (location) {
        case 'Porão':
        case 'Masmorra':
            return 'PRIVATE'; // Only shared with those present
        case 'Confessor 2.0': // If location is actually a persona-space (metaphor)
            return 'SECRET';
        default:
            return 'PUBLIC'; // Castelo memory (shared)
    }
}

// Logic to check if a persona can see the history
export function canPersonaSeeHistory(
    personaId: string,
    session: SessionState
): boolean {
    const visibility = getVisibilityForLocation(session.current_location);

    if (visibility === 'PUBLIC') return true; // Everyone sees Castelo

    // If private/secret, ONLY those active in the room can see
    const isPresent = session.active_personas.some(p => p.id === personaId && p.is_active);

    if (visibility === 'PRIVATE' || visibility === 'SECRET') {
        return isPresent;
    }

    return false;
}
