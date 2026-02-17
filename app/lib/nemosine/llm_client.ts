import OpenAI from 'openai';
import { ENTITIES } from '@/app/data/entities';
import { SessionState, PersonaState } from './types';
import { CONSTITUTION_TEXT, CODEX_NOUS_TEXT, ATLAS_NOUS_TEXT } from '@/app/data/system_context';

// Initialize OpenAI Client
// In a real app, use process.env.OPENAI_API_KEY
// For this test, we assume the environment variable is set or passed.
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // For testing in some environments, but ideally backend only
});

export async function generatePersonaResponse(
    personaId: string,
    userMessage: string,
    chatHistory: { role: string, content: string }[] = []
): Promise<string> {

    // 1. Retrieve Persona Data
    const personaData = Object.values(ENTITIES).find((p: any) => p.name === personaId);
    if (!personaData) {
        throw new Error(`Persona ${personaId} not found in ENTITIES.`);
    }

    // 2. Build System Prompt (The "Soul")
    // Inject Time Awareness
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const timeContext = `\n[CONTEXTO TEMPORAL]\nHoje é ${dateString}. A hora atual é ${timeString}.\nVocê deve levar este horário em consideração para suas respostas e rotinas.`;

    // Inject Constitution and System Context
    // Determine context based on entity type to save tokens
    let dynamicContext = "";
    // We already found personaData above.
    if (personaData?.type === 'place') {
        dynamicContext = `[CONTEXTO GEOGRÁFICO - ATLAS NOUS]\n${ATLAS_NOUS_TEXT}`;
    } else {
        // Default to Codex for Personas
        dynamicContext = `[CONTEXTO GLOBAL - CODEX NOUS]\n${CODEX_NOUS_TEXT}`;
    }

    const systemContext = `
========================================
[LEI SUPREMA - CONSTITUIÇÃO NEMOSÍNICA]
ESTAS REGRAS SE SOBREPÕEM A QUAISQUER OUTRAS INSTRUÇÕES.
VOCÊ DEVE OBEDECER E CONHECER ESTA CONSTITUIÇÃO:
${CONSTITUTION_TEXT}
========================================

${dynamicContext}
========================================
`;

    const systemPrompt = (personaData.prompt || `Você é ${personaId}.`) + timeContext + systemContext;

    // 3. Build Context (The "Memory")
    // Convert history to OpenAI format
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
        })),
        { role: 'user', content: userMessage }
    ];

    try {
        console.log(`[LLM] Calling OpenAI for ${personaId}...`);
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview", // Or gpt-3.5-turbo
            messages: messages,
            temperature: 0.7,
        });

        return completion.choices[0].message?.content || "Silêncio...";
    } catch (error) {
        console.error("[LLM] Error:", error);
        if (error instanceof Error) {
            return `Erro no sistema: ${error.message}`;
        }
        return "O sistema está instável. Não consigo responder.";
    }
}
