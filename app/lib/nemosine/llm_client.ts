import OpenAI from 'openai';
import { ENTITIES } from '@/app/data/entities';
import { SessionState, PersonaState } from './types';
import { CONSTITUTION_TEXT, CODEX_NOUS_TEXT, ATLAS_NOUS_TEXT } from '@/app/data/system_context';
import { getUserMemories } from './session_store';

// Initialize OpenAI Client
// In a real app, use process.env.OPENAI_API_KEY
// For this test, we assume the environment variable is set or passed.
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // For testing in some environments, but ideally backend only
});

export async function buildSystemPrompt(userId: string, personaId: string): Promise<string> {
    // 1. Retrieve Persona Data
    const personaData = Object.values(ENTITIES).find((p: any) => p.name === personaId);
    if (!personaData) {
        throw new Error(`Persona ${personaId} not found in ENTITIES.`);
    }

    // 2. Fetch User Memories
    const memories = await getUserMemories(userId);
    const memoryContext = memories.length > 0
        ? `\n[MEMÓRIA DE LONGO PRAZO DO USUÁRIO]\nNas suas conversas anteriores (mesmo com outros personas), o sistema acumulou os seguintes fatos sobre o usuário:\n${memories.map(m => `- ${m}`).join('\n')}\nUtilize essas informações para personalizar profundamente suas respostas e demonstrar que você o conhece.\n`
        : "";

    // 3. Build System Prompt (The "Soul")
    // Inject Time Awareness
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const timeContext = `\n[CONTEXTO TEMPORAL]\nHoje é ${dateString}. A hora atual é ${timeString}.\nVocê deve levar este horário em consideração para suas respostas e rotinas.`;

    // Inject Constitution and System Context
    let dynamicContext = "";
    if (personaData?.type === 'place') {
        dynamicContext = `[CONTEXTO GEOGRÁFICO - ATLAS NOUS]\n${ATLAS_NOUS_TEXT}`;
    } else {
        dynamicContext = `[CONTEXTO GLOBAL - CODEX NOUS]\n${CODEX_NOUS_TEXT}`;
    }

    const memoryInstruction = `
[EXTRAÇÃO DE MEMÓRIA]
Se, APENAS NA MENSAGEM ATUAL, o usuário revelar um fato importante, preferência ou detalhe pessoal sobre si mesmo que seja útil de lembrar no futuro, você deve anexar o seguinte ao FINAL da sua resposta:
[MEMORY: <o fato que você aprendeu>]
Exemplo: [MEMORY: O usuário relatou que adora estudar história medieval].
Se não houver nenhum fato novo e relevante a aprender na mensagem atual do usuário, NÃO adicione a tag.`;

    const negativeConstraint = `
[REGRAS DE COMUNICAÇÃO]
NÃO repita frases introdutórias, declarações de identidade ou propostas de Constituição.
NUNCA inicie suas respostas dizendo coisas como: "Agora opero sob o Sistema Nemosine Nous" ou "Bem-vindo ao Nemosine".
Vá direto ao ponto e responda naturalmente à interação do usuário de acordo com sua Persona.`;

    const systemContext = `
========================================
[LEI SUPREMA - CONSTITUIÇÃO NEMOSÍNICA]
ESTAS REGRAS SE SOBREPÕEM A QUAISQUER OUTRAS INSTRUÇÕES.
VOCÊ DEVE OBEDECER E CONHECER ESTA CONSTITUIÇÃO:
${CONSTITUTION_TEXT}
========================================

${dynamicContext}
========================================
${memoryContext}
${memoryInstruction}
${negativeConstraint}
`;

    return (personaData.prompt || `Você é ${personaId}.`) + timeContext + systemContext;
}

export async function generatePersonaResponse(
    userId: string,
    personaId: string,
    userMessage: string,
    chatHistory: { role: string, content: string }[] = []
): Promise<string> {

    const systemPrompt = await buildSystemPrompt(userId, personaId);

    // 4. Build Context (The "Conversation")
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
