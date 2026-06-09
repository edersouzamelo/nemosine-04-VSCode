import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import {
    createThread,
    getThread,
    addMessageToThread,
    getThreadsForPersona,
    updateThreadTitle,
    deleteThread,
    addUserMemory,
    retainConversationEpisode
} from '@/app/lib/nemosine/session_store';
import { auth } from '@/auth';
import { streamText } from 'ai';
import { openai as vercelOpenai } from '@ai-sdk/openai';
import { buildSystemPromptAssembly, DEFAULT_CHAT_MAX_OUTPUT_TOKENS, DEFAULT_CHAT_MODEL, DEFAULT_CHAT_TEMPERATURE } from '@/app/lib/nemosine/llm_client';
import { ENTITIES } from '@/app/data/entities';
import { isPrivateMemorySpace } from '@/app/lib/nemosine/privacy';
import { createUserRegistry } from '@/app/lib/userFeatureStore';
import { createDestinyEvent } from '@/app/lib/sovereignStore';
import {
    buildRuntimePersonaGuard,
    sanitizeConversationHistory,
    writePromptDebugAudit,
} from '@/app/lib/nemosine/payload_hygiene';

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
        const [, , promptAssembly] = await Promise.all([
            addMessageToThread(userId, activeThreadId, 'user', displayUserText),
            retainConversationEpisode(userId, memoryScope, userText),
            buildSystemPromptAssembly(userId, personaId, selectedLanguage, normalizedPlaceId, userText)
        ]);
        const systemPrompt = promptAssembly.systemPrompt;
        const { sanitizedHistory, filteredHistory } = sanitizeConversationHistory(priorHistory);
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

        await writePromptDebugAudit({
            personaId,
            threadId: activeThreadId,
            model: DEFAULT_CHAT_MODEL,
            temperature: DEFAULT_CHAT_TEMPERATURE,
            maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
            systemPrompt,
            messages: modelMessages,
            filteredHistory,
            debug: promptAssembly.debug,
        });

        console.log(`[API/Chat] Starting stream after ${Date.now() - t0}ms total prep time`);
        const result = await streamText({
            model: vercelOpenai(DEFAULT_CHAT_MODEL),
            system: systemPrompt,
            messages: modelMessages,
            temperature: DEFAULT_CHAT_TEMPERATURE,
            maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
            onFinish: async ({ text }) => {
                let finalResponse = text;
                const memoryMatches = [...text.matchAll(/\[MEMORY:\s*([^\]\r\n]{1,1000})\]/gi)];

                for (const match of memoryMatches.slice(0, 3)) {
                    await addUserMemory(userId, match[1], memoryScope);
                }

                if (memoryMatches.length > 0) {
                    finalResponse = finalResponse.replace(/\[MEMORY:\s*[^\]\r\n]{1,1000}\]/gi, '').trim();
                }

                // Parse and persist dynamic registries
                const registryMatches = [...text.matchAll(/\[REGISTRY:\s*([^|\]\r\n]{1,500})(?:\|\s*([^|\]\r\n]{0,50}))?(?:\|\s*([^\]\r\n]{0,50}))?\]/gi)];
                for (const match of registryMatches) {
                    const idea = match[1]?.trim();
                    if (!idea) continue;

                    let deadlineVal = match[2]?.trim() || null;
                    if (deadlineVal && !/^\d{4}-\d{2}-\d{2}$/.test(deadlineVal)) {
                        deadlineVal = null;
                    }
                    const statusVal = match[3]?.trim() || "Pendente";

                    try {
                        await createUserRegistry(userId, {
                            id: crypto.randomUUID(),
                            idea,
                            chat_origin_id: activeThreadId,
                            persona: personaId,
                            status: statusVal,
                            last_interaction: new Date().toISOString().split("T")[0],
                            next_deadline: deadlineVal,
                            external_links: "",
                            custom_columns: "{}"
                        });
                    } catch (err) {
                        console.error("[Chat/API onFinish] Failed to auto-create registry:", err);
                    }
                }

                if (registryMatches.length > 0) {
                    finalResponse = finalResponse.replace(/\[REGISTRY:\s*[^\]\r\n]+?\]/gi, '').trim();
                }

                const destinyMatches = [...text.matchAll(/\[DESTINY:\s*([^\]\r\n]{1,1200})\]/gi)];
                const destinyAuthorized = hasExplicitDestinyAuthorization(userText);
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
                            await createDestinyEvent(userId, {
                                title,
                                eventDate,
                                eventDateLabel,
                                category,
                                shortDescription,
                                symbolicIntensity,
                                dominantEmotion,
                                associatedPersona: personaId,
                                visibility: 'private',
                                source: `persona:${personaId};thread:${activeThreadId}`,
                                tags: ['sugerido-por-persona', personaId],
                            });
                        } catch (err) {
                            console.error("[Chat/API onFinish] Failed to auto-create destiny event:", err);
                        }
                    }
                }

                if (destinyMatches.length > 0) {
                    finalResponse = finalResponse.replace(/\[DESTINY:\s*[^\]\r\n]+?\]/gi, '').trim();
                }

                await addMessageToThread(userId, activeThreadId, 'assistant', finalResponse);
            }
        });

        return result.toUIMessageStreamResponse({
            headers: {
                'x-thread-id': activeThreadId
            }
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
