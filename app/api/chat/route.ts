import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import {
    createThread,
    getThread,
    addMessageToThread,
    getThreadsForPersona,
    getRecentConversationThreads,
    updateThreadTitle,
    deleteThread,
    addUserMemory,
    retainConversationEpisode
} from '@/app/lib/nemosine/session_store';
import { auth } from '@/auth';
import { generateText } from 'ai';
import { openai as vercelOpenai } from '@ai-sdk/openai';
import { buildSystemPromptAssembly, DEFAULT_CHAT_MAX_OUTPUT_TOKENS, DEFAULT_CHAT_MODEL, DEFAULT_CHAT_TEMPERATURE } from '@/app/lib/nemosine/llm_client';
import { readCognitiveRuntimeConfig } from '@/app/lib/nemosine/cognitive-runtime/config';
import {
    createCognitiveRequest,
    createPromotedUIMessageStreamResponse,
    executeCognitiveRuntime,
} from '@/app/lib/nemosine/cognitive-runtime/runtime';
import { runCognitiveRuntime } from '@/app/lib/nemosine/cognitive-runtime/orchestrator';
import {
    buildDeterministicInitiativeFallback,
    classifyConversationInputRichness,
    evaluatePersonaInitiativeQuality,
    isConversationNavigationRequest,
    isPersonaMetaCritique,
    isPersonaRoleQuestion,
    isSourceReferenceRequest,
    normalizeInitiativeText,
    renderPersonaInitiativeRepairFeedback,
} from '@/app/lib/nemosine/persona-initiative';
import type { PersonaInitiativeQualityEvaluation } from '@/app/lib/nemosine/persona-initiative';
import { ENTITIES } from '@/app/data/entities';
import { isPrivateMemorySpace } from '@/app/lib/nemosine/privacy';
import { createUserRegistry } from '@/app/lib/userFeatureStore';
import { createDestinyEvent } from '@/app/lib/sovereignStore';
import {
    buildRuntimePersonaGuard,
    sanitizeConversationHistory,
    writePromptDebugAudit,
} from '@/app/lib/nemosine/payload_hygiene';
import { retainActiveTopicsFromUserMessage } from '@/app/lib/nemosine/conversation_continuity';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACTED_PDF_TEXT_LENGTH = 100_000;
const MAX_TEXT_FILE_SIZE_BYTES = 1 * 1024 * 1024;
const MAX_MESSAGE_TEXT_LENGTH = 120_000;

function hasExplicitDestinyAuthorization(text: string) {
    const normalized = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    return [
        'registre na linha do destino',
        'registrar na linha do destino',
        'inclua na linha do destino',
        'incluir na linha do destino',
        'grave na linha do destino',
        'gravar na linha do destino',
        'pode incluir',
        'pode registrar',
        'pode gravar',
        'sim, registre',
        'sim registre',
        'sim, grave',
        'sim grave',
    ].some((phrase) => normalized.includes(phrase));
}

function normalizeDestinyDate(value?: string) {
    const raw = value?.trim();
    if (!raw || raw.toLowerCase() === 'sem data') return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function normalizeDestinyIntensity(value?: string) {
    const raw = value?.trim();
    if (!raw) return null;
    const parsed = Number(raw.match(/\d+/)?.[0]);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

function stripLegacyActionTags(text: string) {
    return text
        .replace(/\[MEMORY:\s*[^\]\r\n]{1,1000}\]/gi, '')
        .replace(/\[REGISTRY:\s*[^\]\r\n]+?\]/gi, '')
        .replace(/\[DESTINY:\s*[^\]\r\n]+?\]/gi, '')
        .trim();
}

async function commitPromotedLegacyEffects(input: {
    rawText: string;
    userId: string;
    activeThreadId: string;
    memoryScope: string;
    personaId: string;
    userText: string;
}) {
    const memoryMatches = [...input.rawText.matchAll(/\[MEMORY:\s*([^\]\r\n]{1,1000})\]/gi)];

    for (const match of memoryMatches.slice(0, 3)) {
        await addUserMemory(input.userId, match[1], input.memoryScope);
    }

    const registryMatches = [...input.rawText.matchAll(/\[REGISTRY:\s*([^|\]\r\n]{1,500})(?:\|\s*([^|\]\r\n]{0,50}))?(?:\|\s*([^\]\r\n]{0,50}))?\]/gi)];
    for (const match of registryMatches) {
        const idea = match[1]?.trim();
        if (!idea) continue;

        let deadlineVal = match[2]?.trim() || null;
        if (deadlineVal && !/^\d{4}-\d{2}-\d{2}$/.test(deadlineVal)) {
            deadlineVal = null;
        }
        const statusVal = match[3]?.trim() || "Pendente";

        try {
            await createUserRegistry(input.userId, {
                id: crypto.randomUUID(),
                idea,
                chat_origin_id: input.activeThreadId,
                persona: input.personaId,
                status: statusVal,
                last_interaction: new Date().toISOString().split("T")[0],
                next_deadline: deadlineVal,
                external_links: "",
                custom_columns: "{}"
            });
        } catch (err) {
            console.error("[Chat/API] Failed to auto-create registry:", err);
        }
    }

    const destinyMatches = [...input.rawText.matchAll(/\[DESTINY:\s*([^\]\r\n]{1,1200})\]/gi)];
    const destinyAuthorized = hasExplicitDestinyAuthorization(input.userText);
    if (destinyAuthorized) {
        for (const match of destinyMatches.slice(0, 2)) {
            const parts = match[1].split('|').map((part) => part.trim());
            const title = parts[0];
            const eventDate = normalizeDestinyDate(parts[1]);
            const eventDateLabel = eventDate ? null : (parts[1] || null);
            const category = parts[2] || 'marco';
            const shortDescription = parts[3] || title;
            const symbolicIntensity = normalizeDestinyIntensity(parts[4]);
            const dominantEmotion = parts[5] || null;

            if (!title || !shortDescription) continue;

            try {
                await createDestinyEvent(input.userId, {
                    title,
                    eventDate,
                    eventDateLabel,
                    category,
                    shortDescription,
                    symbolicIntensity,
                    dominantEmotion,
                    associatedPersona: input.personaId,
                    visibility: 'private',
                    source: `persona:${input.personaId};thread:${input.activeThreadId}`,
                    tags: ['sugerido-por-persona', input.personaId],
                });
            } catch (err) {
                console.error("[Chat/API] Failed to auto-create destiny event:", err);
            }
        }
    }
}

function readInitiativeRepairLimit() {
    const parsed = Number(process.env.NEMOSINE_PERSONA_INITIATIVE_MAX_REPAIRS);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(0, Math.min(3, Math.floor(parsed)));
}

function canPromoteRejectedPersonaCandidate(evaluation: PersonaInitiativeQualityEvaluation, text: string) {
    if (text.trim().length < 80) return false;

    const nonPromotableCodes = new Set([
        "FALSE_CONTEXT_DENIAL",
        "GENERIC_ASSISTANT_MODE",
        "GENERIC_INTERVIEW_MODE",
        "INTERROGATIVE_ELICITATION",
        "EMPTY_FINAL_QUESTION",
        "UNSUPPORTED_BIOGRAPHICAL_ASSERTION",
        "PRIVATE_CONTEXT_LEAK",
        "GENERIC_CLOSING",
        "INTERNAL_CONTROL_LEAK",
    ]);

    return !evaluation.findings.some((finding) =>
        finding.severity === "critical" || nonPromotableCodes.has(finding.code)
    );
}

function getConfiguredPrimaryChatModel() {
    const model = process.env.OPENAI_CHAT_MODEL?.trim()
        || process.env.CHAT_MODEL?.trim()
        || DEFAULT_CHAT_MODEL;

    return {
        id: "primary",
        model,
        modelInstance: vercelOpenai(model),
    };
}

function buildBufferedLlmFailureMessage(error: unknown) {
    console.error("[API/Chat] LLM generation failed before buffered delivery:", error);
    return "O sistema esta instavel. Nao consigo concluir esta resposta agora.";
}

function splitConversationScope(scope: string) {
    const [personaName, placeName] = scope.split(/\s+@\s+/);
    return {
        personaName: personaName?.trim() || scope,
        placeName: placeName?.trim() || null,
    };
}

function displayConversationScope(scope: string) {
    const { personaName, placeName } = splitConversationScope(scope);
    return placeName ? `${personaName} em ${placeName}` : personaName;
}

function resolveStatedConversationPartnerName(text: string) {
    const normalized = normalizeInitiativeText(text || "");
    const partnerSegment = [
        /\b(?:estava|tava|estive|vinha|falava|conversava|acabei de)\s+(?:falando|conversando|falei|conversei|falar|conversar)?\s*com\s+(?:(?:o|a)\s+)?(.{2,80})/u,
        /\b(?:falei|conversei)\s+com\s+(?:(?:o|a)\s+)?(.{2,80})/u,
    ].map((pattern) => normalized.match(pattern)?.[1] || "")
        .find((segment) => segment && !/\bquem\b/.test(segment));
    if (!partnerSegment) return null;

    const personas = Object.values(ENTITIES).filter((entity) => entity.type === "persona");
    return personas.find((persona) => partnerSegment.includes(normalizeInitiativeText(persona.name)))?.name || null;
}

async function buildConversationNavigationAnswer(input: {
    userId: string;
    activeThreadId: string;
    personaId: string;
    memoryScope: string;
    userText: string;
}) {
    if (!isConversationNavigationRequest(input.userText)) return null;

    const normalized = normalizeInitiativeText(input.userText);
    const mentionedPersonaName = resolveStatedConversationPartnerName(input.userText);
    const recentThreads = await getRecentConversationThreads(input.userId, 8);
    const previousThread = recentThreads.find((thread) => thread.id !== input.activeThreadId) || null;
    const currentScope = displayConversationScope(input.personaId);
    const correctionTone = /\b(errou|errado|estava|tava|estive|vinha|falava|conversava)\b/.test(normalized);

    if (mentionedPersonaName) {
        return [
            correctionTone ? "Voce tem razao: vou corrigir a navegacao." : "Sim.",
            `O rastro que devo considerar e a conversa com ${mentionedPersonaName}.`,
            "Isso e metacontexto do chat, nao uma pauta para eu transformar em frente ativa.",
        ].join(" ");
    }

    if (!previousThread) {
        return `Nao encontrei uma conversa anterior registrada fora desta janela. O que aparece agora para mim e apenas esta conversa com ${currentScope}.`;
    }

    if (isPrivateMemorySpace(previousThread.personaId) && !isPrivateMemorySpace(input.memoryScope)) {
        return "Ha uma conversa privada recente fora desta janela, mas eu nao vou nomea-la dentro de uma persona publica. Se voce voltar ao espaco privado, eu consigo manter esse limite sem misturar as vozes.";
    }

    const previousScope = displayConversationScope(previousThread.personaId);
    return `Pelo registro recente, antes daqui voce estava falando com ${previousScope}. Posso ver apenas o que esta registrado no Nemosine, mas o rastro mais proximo e esse.`;
}

function shouldRetainUserInputForContinuity(userText: string) {
    const richness = classifyConversationInputRichness(userText);
    return richness.richness === "high"
        && !richness.requiresContextExpansion
        && !isConversationNavigationRequest(userText)
        && !isPersonaMetaCritique(userText)
        && !isPersonaRoleQuestion(userText)
        && !isSourceReferenceRequest(userText);
}

async function getAuthenticatedUserId(): Promise<string | null> {
    const session = await auth();
    return session?.user?.id ?? null;
}

function unauthorizedResponse() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) return unauthorizedResponse();

        const t0 = Date.now();
        const body = await req.json();
        const { messages, personaId, placeId, threadId, language, voiceTranscript } = body;

        if (!Array.isArray(messages) || messages.length === 0 || typeof personaId !== 'string' || !personaId.trim()) {
            return NextResponse.json({ error: 'Invalid request format or missing personaId' }, { status: 400 });
        }
        const activePersona = Object.values(ENTITIES).find((entity) => entity.name === personaId && entity.type === 'persona');
        const activePlace = typeof placeId === 'string' && placeId.trim()
            ? Object.values(ENTITIES).find((entity) => entity.name === placeId && entity.type === 'place')
            : undefined;
        if (!activePersona || (placeId && !activePlace)) {
            return NextResponse.json({ error: 'Invalid persona or place context' }, { status: 400 });
        }
        const normalizedPlaceId = activePlace?.name;
        const conversationScope = normalizedPlaceId ? `${personaId} @ ${normalizedPlaceId}` : personaId;
        const memoryScope = isPrivateMemorySpace(personaId)
            ? personaId
            : normalizedPlaceId && isPrivateMemorySpace(normalizedPlaceId) ? normalizedPlaceId : personaId;

        const lastMessage = messages[messages.length - 1];
        let userText = lastMessage.parts
            ? lastMessage.parts.filter((part: any) => part.type === 'text').map((part: any) => part.text).join('\n')
            : lastMessage.content || '';

        if (typeof userText !== 'string') {
            return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
        }
        const displayUserText = userText;
        if (userText.length > MAX_MESSAGE_TEXT_LENGTH) {
            return NextResponse.json({ error: 'Message content exceeds the allowed limit' }, { status: 413 });
        }

        if (lastMessage.parts) {
            const fileParts = lastMessage.parts.filter((part: any) => part.type === 'file');

            for (const filePart of fileParts) {
                try {
                    if (filePart.url && filePart.url.includes('base64,')) {
                        const base64Data = filePart.url.split(',')[1];
                        const buffer = Buffer.from(base64Data, 'base64');
                        const filename = filePart.filename || 'documento';
                        const loweredFilename = filename.toLowerCase();
                        const isPdf = filePart.mediaType === 'application/pdf' || loweredFilename.endsWith('.pdf');
                        const isTextFile = filePart.mediaType === 'text/plain'
                            || filePart.mediaType === 'text/markdown'
                            || loweredFilename.endsWith('.txt')
                            || loweredFilename.endsWith('.md');

                        if (isPdf) {
                            if (buffer.length > MAX_PDF_SIZE_BYTES) {
                                return NextResponse.json({ error: 'PDF attachment exceeds the 5 MB limit' }, { status: 413 });
                            }

                            const pdfData = await pdfParse(buffer);
                            const extractedText = pdfData.text.slice(0, MAX_EXTRACTED_PDF_TEXT_LENGTH);
                            userText += `\n\n[CONTEUDO DO ARQUIVO ANEXADO (${filename})]\n${extractedText}`;
                        } else if (isTextFile) {
                            if (buffer.length > MAX_TEXT_FILE_SIZE_BYTES) {
                                return NextResponse.json({ error: 'Text attachment exceeds the 1 MB limit' }, { status: 413 });
                            }

                            const extractedText = buffer.toString('utf8').slice(0, MAX_EXTRACTED_PDF_TEXT_LENGTH);
                            userText += `\n\n[CONTEUDO DO ARQUIVO ANEXADO (${filename})]\n${extractedText}`;
                        } else {
                            return NextResponse.json({ error: 'Unsupported attachment type' }, { status: 415 });
                        }
                    }
                } catch (err) {
                    console.error('Error parsing attachment:', err);
                    userText += '\n\n[Falha ao extrair texto do arquivo anexado.]';
                }
            }
        }

        if (typeof voiceTranscript === 'string' && voiceTranscript.trim()) {
            userText += `\n\n[TRANSCRICAO DE AUDIO ANEXADO]\n${voiceTranscript.trim()}`;
        }

        if (userText.length > MAX_MESSAGE_TEXT_LENGTH) {
            return NextResponse.json({ error: 'Message content exceeds the allowed limit' }, { status: 413 });
        }

        let activeThreadId: string;
        let priorHistory: Array<{
            id: string;
            role: 'user' | 'assistant' | 'system';
            content: string;
            timestamp: number;
        }> = [];

        if (typeof threadId !== 'string' || !threadId) {
            const titleBase = displayUserText.trim() || 'Anexo';
            const newTitle = titleBase.length > 30 ? `${titleBase.substring(0, 30).trim()}...` : titleBase;
            const thread = await createThread(userId, conversationScope, newTitle);
            activeThreadId = thread.id;
            priorHistory = thread.messages;
        } else {
            const thread = await getThread(userId, threadId);
            if (!thread) {
                return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
            }
            if (thread.personaId !== conversationScope) {
                return NextResponse.json({ error: 'Thread does not belong to this persona' }, { status: 403 });
            }
            activeThreadId = thread.id;
            priorHistory = thread.messages;
        }

        const selectedLanguage = language === 'es' || language === 'en' ? language : 'pt-BR';
        const shouldRetainConversationContinuity = shouldRetainUserInputForContinuity(userText);
        await addMessageToThread(userId, activeThreadId, 'user', displayUserText);

        const conversationNavigationAnswer = await buildConversationNavigationAnswer({
            userId,
            activeThreadId,
            personaId: conversationScope,
            memoryScope,
            userText,
        });
        if (conversationNavigationAnswer) {
            await addMessageToThread(userId, activeThreadId, 'assistant', conversationNavigationAnswer);
            return createPromotedUIMessageStreamResponse({
                text: conversationNavigationAnswer,
                headers: {
                    'x-thread-id': activeThreadId,
                    'x-conversation-navigation-answer': 'true',
                },
            });
        }

        const cognitiveRequest = createCognitiveRequest({
            userId,
            threadId: activeThreadId,
            personaId,
            placeId: normalizedPlaceId,
            language: selectedLanguage,
            userText,
            displayUserText,
            memoryScope,
            priorHistory,
        });
        const runtimeConfig = readCognitiveRuntimeConfig();

        if (runtimeConfig.mode === "enforce") {
            const runtimeResult = await executeCognitiveRuntime(cognitiveRequest);
            if (shouldRetainConversationContinuity) {
                await Promise.all([
                    retainConversationEpisode(userId, memoryScope, userText),
                    retainActiveTopicsFromUserMessage({
                        userId,
                        threadId: activeThreadId,
                        personaId,
                        memoryScope,
                        userText,
                    }),
                ]).catch((error) => {
                    console.warn("[API/Chat] Conversation continuity retention skipped after enforced runtime.", error);
                });
            }
            return createPromotedUIMessageStreamResponse({
                text: runtimeResult.answer,
                headers: {
                    'x-thread-id': activeThreadId,
                    'x-cognitive-runtime': runtimeResult.runtimeMode,
                    'x-cognitive-run-id': runtimeResult.runId,
                    'x-cognitive-promoted': String(runtimeResult.promoted),
                },
            });
        }

        const promptAssembly = await buildSystemPromptAssembly(userId, personaId, selectedLanguage, normalizedPlaceId, userText, activeThreadId);
        const systemPrompt = promptAssembly.systemPrompt;
        const { sanitizedHistory, filteredHistory } = sanitizeConversationHistory(priorHistory);
        const recentAssistantTexts = priorHistory
            .filter((message) => message.role === 'assistant')
            .slice(-4)
            .map((message) => message.content);
        const history = [
            ...sanitizedHistory,
            {
                id: 'runtime-persona-guard',
                role: 'system' as const,
                content: buildRuntimePersonaGuard(personaId, userText),
                timestamp: Date.now()
            },
            {
                id: 'current-user-message',
                role: 'user' as const,
                content: userText,
                timestamp: Date.now()
            }
        ];
        const modelMessages = history.map((message) => ({
            role: message.role as 'user' | 'assistant' | 'system',
            content: message.content
        }));

        let activeChatModel = getConfiguredPrimaryChatModel();

        await writePromptDebugAudit({
            personaId,
            threadId: activeThreadId,
            model: activeChatModel.model,
            temperature: DEFAULT_CHAT_TEMPERATURE,
            maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
            systemPrompt,
            messages: modelMessages,
            filteredHistory,
            debug: promptAssembly.debug,
        });

        const generateCandidate = async (repairFeedback: string) => {
            const result = await generateText({
                model: activeChatModel.modelInstance,
                system: [systemPrompt, repairFeedback].filter(Boolean).join("\n\n"),
                messages: modelMessages,
                temperature: DEFAULT_CHAT_TEMPERATURE,
                maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
                maxRetries: 1,
            });
            return result.text;
        };

        console.log(`[API/Chat] Starting buffered generation after ${Date.now() - t0}ms total prep time`);
        const maxAttempts = readInitiativeRepairLimit() + 1;
        let repairFeedback = "";
        let selectedRawText = "";
        let finalResponse = "";
        let promotedByFallback = false;
        let bestRejected: {
            rawText: string;
            visibleText: string;
            evaluation: PersonaInitiativeQualityEvaluation;
        } | null = null;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            let rawText: string;
            try {
                rawText = await generateCandidate(repairFeedback);
            } catch (error) {
                const failureMessage = buildBufferedLlmFailureMessage(error);
                await addMessageToThread(userId, activeThreadId, 'assistant', failureMessage);
                return NextResponse.json(
                    {
                        error: "LLM generation failed before response delivery",
                        message: failureMessage,
                    },
                    { status: 502, headers: { 'x-thread-id': activeThreadId } },
                );
            }

            const visibleCandidate = stripLegacyActionTags(rawText);
            const initiativeEvaluation = evaluatePersonaInitiativeQuality({
                responseText: visibleCandidate,
                personaId,
                userText,
                richness: promptAssembly.initiative.richness,
                snapshot: promptAssembly.initiative.snapshot,
                contract: promptAssembly.initiative.contract,
                brief: promptAssembly.initiative.brief,
                privateRun: isPrivateMemorySpace(memoryScope),
                recentAssistantTexts,
            });

            if (initiativeEvaluation.finalPass) {
                selectedRawText = rawText;
                finalResponse = visibleCandidate;
                break;
            }

            if (!bestRejected || initiativeEvaluation.initiativeScore > bestRejected.evaluation.initiativeScore) {
                bestRejected = {
                    rawText,
                    visibleText: visibleCandidate,
                    evaluation: initiativeEvaluation,
                };
            }

            repairFeedback = renderPersonaInitiativeRepairFeedback(initiativeEvaluation);
            console.warn("[API/Chat] Persona initiative candidate rejected before delivery.", {
                personaId,
                threadId: activeThreadId,
                attempt,
                findingCodes: initiativeEvaluation.findings.map((finding) => finding.code),
                initiativeScore: Number(initiativeEvaluation.initiativeScore.toFixed(3)),
            });
        }

        if (!finalResponse) {
            if (bestRejected && canPromoteRejectedPersonaCandidate(bestRejected.evaluation, bestRejected.visibleText)) {
                selectedRawText = bestRejected.rawText;
                finalResponse = bestRejected.visibleText;
            } else {
                promotedByFallback = true;
                finalResponse = buildDeterministicInitiativeFallback({
                    personaId,
                    userText,
                    richness: promptAssembly.initiative.richness,
                    snapshot: promptAssembly.initiative.snapshot,
                    brief: promptAssembly.initiative.brief,
                    contract: promptAssembly.initiative.contract,
                });
                selectedRawText = finalResponse;
            }
        }

        await commitPromotedLegacyEffects({
            rawText: selectedRawText,
            userId,
            activeThreadId,
            memoryScope,
            personaId,
            userText,
        });
        await addMessageToThread(userId, activeThreadId, 'assistant', finalResponse);

        if (shouldRetainConversationContinuity) {
            await Promise.all([
                retainConversationEpisode(userId, memoryScope, userText),
                retainActiveTopicsFromUserMessage({
                    userId,
                    threadId: activeThreadId,
                    personaId,
                    memoryScope,
                    userText,
                }),
            ]).catch((error) => {
                console.warn("[API/Chat] Conversation continuity retention skipped after response.", error);
            });
        }

        if (runtimeConfig.mode === "shadow") {
            await runCognitiveRuntime(cognitiveRequest, {
                config: runtimeConfig,
                candidateOverride: finalResponse,
            }).catch((error) => {
                console.error("[API/Chat] Cognitive runtime shadow audit failed:", error);
            });
        }

        return createPromotedUIMessageStreamResponse({
            text: finalResponse,
            headers: {
                'x-thread-id': activeThreadId,
                'x-llm-provider': activeChatModel.id,
                'x-llm-model': activeChatModel.model,
                'x-persona-initiative-buffered': 'true',
                'x-persona-initiative-fallback': String(promotedByFallback),
                'x-cognitive-runtime': runtimeConfig.mode,
            },
        });
    } catch (error) {
        console.error('[API/Chat Stream] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) return unauthorizedResponse();

        const { searchParams } = new URL(req.url);
        const personaId = searchParams.get('personaId');
        const threadId = searchParams.get('threadId');

        if (threadId) {
            const thread = await getThread(userId, threadId);
            if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
            return NextResponse.json({ thread });
        }

        if (personaId) {
            const threads = await getThreadsForPersona(userId, personaId);
            return NextResponse.json({ threads });
        }

        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    } catch (error) {
        console.error('[API/Chat GET] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) return unauthorizedResponse();

        const { threadId, title } = await req.json();
        if (typeof threadId === 'string' && typeof title === 'string' && title.trim()) {
            await updateThreadTitle(userId, threadId, title.trim());
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    } catch (error) {
        console.error('[API/Chat PATCH] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) return unauthorizedResponse();

        const { searchParams } = new URL(req.url);
        const threadId = searchParams.get('threadId');
        if (threadId) {
            await deleteThread(userId, threadId);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    } catch (error) {
        console.error('[API/Chat DELETE] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
