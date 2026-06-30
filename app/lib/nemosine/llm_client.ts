import OpenAI from 'openai';
import { assemblePersonaContext, PersonaContextDebugInfo } from './persona_context_assembler';

type ResponseLanguage = "pt-BR" | "es" | "en";

export const DEFAULT_CHAT_MODEL = "gpt-4o";
export const DEFAULT_CHAT_TEMPERATURE = 0.45;
export const DEFAULT_CHAT_MAX_OUTPUT_TOKENS = 2200;

function getOpenAIClient() {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

function logPromptDebug(debug: PersonaContextDebugInfo, model: string, temperature: number) {
    if (process.env.PROMPT_DEBUG !== "true") return;

    console.log("[PROMPT_DEBUG]", {
        activePersona: debug.personaId,
        activePlace: debug.placeId || null,
        nativePromptResolved: debug.nativePromptResolved,
        nativePromptSource: debug.nativePromptSource || null,
        nativePromptKey: debug.nativePromptKey || null,
        contractApplied: debug.contractApplied,
        personaPromptLength: debug.personaPromptLength,
        systemPromptLength: debug.systemPromptLength,
        memoriesInjected: debug.memoriesInjected,
        episodesInjected: debug.episodesInjected,
        sourcesInjected: debug.sourcesInjected,
        memoryPreview: debug.memoryPreview,
        episodePreview: debug.episodePreview,
        sourcePreview: debug.sourcePreview,
        apiWrapper: debug.apiWrapper,
        maxOutputTokens: debug.maxOutputTokens,
        presencePenalty: debug.presencePenalty,
        frequencyPenalty: debug.frequencyPenalty,
        genericHelpInstructionsFound: debug.genericHelpInstructionsFound,
        invocationMode: debug.invocationMode,
        memoryScope: debug.memoryScope,
        activeTopicsInjected: debug.activeTopicsInjected,
        contextPacketSelectedItems: debug.contextPacketSelectedItems,
        privateItemsExcluded: debug.privateItemsExcluded,
        crossPersonaContinuityUsed: debug.crossPersonaContinuityUsed,
        topContextTypes: debug.topContextTypes,
        topContextScores: debug.topContextScores,
        sourcePersonas: debug.sourcePersonas,
        destinySourceStatus: debug.destinySourceStatus,
        destinyEventsFound: debug.destinyEventsFound,
        destinyEventsSelected: debug.destinyEventsSelected,
        destinyErrorCode: debug.destinyErrorCode,
        destinyUserIdMatched: debug.destinyUserIdMatched,
        userGraphProjectionMode: debug.userGraphProjectionMode,
        userGraphProjectionCoreCount: debug.userGraphProjectionCoreCount,
        userGraphProjectionVocationalCount: debug.userGraphProjectionVocationalCount,
        userGraphProjectionBlockedCount: debug.userGraphProjectionBlockedCount,
        model,
        temperature,
    });
}

export async function buildSystemPrompt(
    userId: string,
    personaId: string,
    language: ResponseLanguage = "pt-BR",
    placeId?: string,
    userText = "",
    activeThreadId?: string,
): Promise<string> {
    return (await buildSystemPromptAssembly(userId, personaId, language, placeId, userText, activeThreadId)).systemPrompt;
}

export async function buildSystemPromptAssembly(
    userId: string,
    personaId: string,
    language: ResponseLanguage = "pt-BR",
    placeId?: string,
    userText = "",
    activeThreadId?: string,
) {
    const assembly = await assemblePersonaContext({
        userId,
        personaId,
        language,
        placeId,
        userText,
        activeThreadId,
    });

    assembly.debug.maxOutputTokens = DEFAULT_CHAT_MAX_OUTPUT_TOKENS;
    logPromptDebug(assembly.debug, DEFAULT_CHAT_MODEL, DEFAULT_CHAT_TEMPERATURE);

    return assembly;
}

export async function generatePersonaResponse(
    userId: string,
    personaId: string,
    userMessage: string,
    chatHistory: { role: string, content: string }[] = []
): Promise<string> {

    const systemPrompt = await buildSystemPrompt(userId, personaId, "pt-BR", undefined, userMessage);

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
        const completion = await getOpenAIClient().chat.completions.create({
            model: DEFAULT_CHAT_MODEL,
            messages: messages,
            temperature: DEFAULT_CHAT_TEMPERATURE,
            max_completion_tokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
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
