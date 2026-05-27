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
import { buildSystemPrompt } from '@/app/lib/nemosine/llm_client';
import { ENTITIES } from '@/app/data/entities';
import { isPrivateMemorySpace } from '@/app/lib/nemosine/privacy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACTED_PDF_TEXT_LENGTH = 100_000;
const MAX_TEXT_FILE_SIZE_BYTES = 1 * 1024 * 1024;
const MAX_MESSAGE_TEXT_LENGTH = 120_000;

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
        const { messages, personaId, placeId, threadId, language } = body;

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
            const newTitle = userText.length > 30 ? `${userText.substring(0, 30).trim()}...` : userText;
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
        const [, , systemPrompt] = await Promise.all([
            addMessageToThread(userId, activeThreadId, 'user', userText),
            retainConversationEpisode(userId, memoryScope, userText),
            buildSystemPrompt(userId, personaId, selectedLanguage, normalizedPlaceId)
        ]);
        const history = [
            ...priorHistory,
            {
                id: 'current-user-message',
                role: 'user' as const,
                content: userText,
                timestamp: Date.now()
            }
        ];

        console.log(`[API/Chat] Starting stream after ${Date.now() - t0}ms total prep time`);
        const result = await streamText({
            model: vercelOpenai('gpt-4o'),
            system: systemPrompt,
            messages: history.map((message) => ({
                role: message.role as 'user' | 'assistant' | 'system',
                content: message.content
            })),
            temperature: 0.7,
            onFinish: async ({ text }) => {
                let finalResponse = text;
                const memoryMatches = [...text.matchAll(/\[MEMORY:\s*([^\]\r\n]{1,1000})\]/gi)];

                for (const match of memoryMatches.slice(0, 3)) {
                    await addUserMemory(userId, match[1], memoryScope);
                }

                if (memoryMatches.length > 0) {
                    finalResponse = text.replace(/\[MEMORY:\s*[^\]\r\n]{1,1000}\]/gi, '').trim();
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
