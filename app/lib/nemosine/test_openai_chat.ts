import 'dotenv/config'; // Load .env
import { generatePersonaResponse } from './llm_client';
import { SessionState } from './types';

// Mock Session for testing
const session: SessionState = {
    id: 'test-session',
    current_location: 'Castelo',
    active_personas: [{ id: 'Mentor', is_active: true, temporary_memory: [] }],
    room_log: [],
    is_incognito: false
};

async function runTest() {
    console.log('--- TESTING OPENAI CHAT ---');

    const userMsg = "Estou perdido e não sei por onde começar.";
    console.log(`[USER] ${userMsg}`);

    try {
        const response = await generatePersonaResponse('Mentor', userMsg, session);
        console.log(`[MENTOR] ${response}`);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

runTest();
