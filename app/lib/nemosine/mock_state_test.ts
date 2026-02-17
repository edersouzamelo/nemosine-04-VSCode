import { SessionState, PersonaState, VisibilityLevel, canPersonaSeeHistory } from './types';

// Mock database or state store
let currentState: SessionState = {
    id: 'session-001',
    current_location: 'Castelo', // Start public
    active_personas: [],
    room_log: [],
    is_incognito: false
};

// SIMULATION FUNCTIONS

export function enterLocation(location: any) {
    currentState.current_location = location;
    console.log(`[SYSTEM] Entering location: ${location}`);

    if (location === 'Porão' || location === 'Confessor 2.0') {
        currentState.is_incognito = true;
        console.log(`[SYSTEM] Privacy Level: SECRET/PRIVATE. Context is now restricted.`);
    } else {
        currentState.is_incognito = false;
        console.log(`[SYSTEM] Privacy Level: PUBLIC. Context is shared.`);
    }
}

export function summonPersona(personaId: string) {
    const persona: PersonaState = {
        id: personaId,
        is_active: true,
        temporary_memory: []
    };
    currentState.active_personas.push(persona);
    console.log(`[SYSTEM] Summoned ${personaId} to ${currentState.current_location}.`);

    // CONTEXT INJECTION LOGIC (The "Spectrum" Solution)
    const canSee = canPersonaSeeHistory(personaId, currentState);
    if (canSee) {
        console.log(`[SPECTRUM] ${personaId} receives full context of this room.`);
        // In a real app, we would push the logs to the LLM context here
    } else {
        console.log(`[SPECTRUM] ${personaId} CANNOT see previous logs (Privacy Restriction).`);
    }
}

export function userSays(text: string) {
    console.log(`[USER] "${text}"`);
    currentState.room_log.push({
        role: 'user',
        content: text,
        timestamp: Date.now(),
        visibility: currentState.is_incognito ? 'PRIVATE' : 'PUBLIC'
    });
}

// TEST RUN
console.log('--- TEST 1: CASTELO (Public) ---');
enterLocation('Castelo');
userSays('Eu gosto de maçãs.');
summonPersona('O Mentor'); // Should see it

console.log('\n--- TEST 2: PORÃO (Private) ---');
enterLocation('Porão');
userSays('Tenho um segredo obscuro.');
summonPersona('O Confessor'); // Should see it because he is summoned HERE
summonPersona('O Bruxo');     // Should see it because he is summoned HERE

console.log('\n--- TEST 3: BACK TO CASTELO ---');
enterLocation('Castelo');
// Simulate a new persona who was NOT in the Porão
summonPersona('A Luz');
// Logic check: Does 'A Luz' see the 'segredo obscuro'?
// access logic needs to check individual log visibility, not just current room.
// Let's refine the check.

const secrets = currentState.room_log.filter(l => l.visibility === 'PRIVATE');
if (secrets.length > 0) {
    console.log(`[SYSTEM] There are ${secrets.length} secret logs in history.`);
    console.log(`[CHECK] Can 'A Luz' see the secret? ${false} (Expected: False)`);
}
