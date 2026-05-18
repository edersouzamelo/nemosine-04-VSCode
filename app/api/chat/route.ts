import { NextRequest, NextResponse } from 'next/server';
import { generatePersonaResponse } from '@/app/lib/nemosine/llm_client';
import pdfParse from 'pdf-parse';
import {
    createThread,
    getThread,
    addMessageToThread,
    getThreadsForPersona,
    updateThreadTitle,
    deleteThread,
    addUserMemory,
    prisma
} from '@/app/lib/nemosine/session_store';
import { auth } from '@/auth';

import { streamText } from 'ai';
import { openai as vercelOpenai } from '@ai-sdk/openai';
import { buildSystemPrompt } from '@/app/lib/nemosine/llm_client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const log = (msg: string) => {
            console.log(msg);
        };

        const t0 = Date.now();
        const body = await req.json();
        const { messages, personaId, threadId } = body;
        log(`[API/Chat] Received request. threadId: ${threadId}, messages count: ${messages?.length}`);

        // Ensure we are receiving array of messages and personaId
        if (!messages || !Array.isArray(messages) || !personaId) {
            log('[API/Chat] Error: Invalid request format');
            return NextResponse.json({ error: 'Invalid request format or missing personaId' }, { status: 400 });
        }

        // Vercel AI SDK 6.x uses `parts` instead of `content` in UIMessage
        const lastMessage = messages[messages.length - 1];
        let userText = lastMessage.parts
            ? lastMessage.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n')
            : lastMessage.content || '';
        log(`[API/Chat] User text length: ${userText.length}`);

        // Process any attached PDF files
        if (lastMessage.parts) {
            const fileParts = lastMessage.parts.filter((p: any) => p.type === 'file' && p.mediaType === 'application/pdf');
            for (const filePart of fileParts) {
                try {
                    if (filePart.url && filePart.url.includes('base64,')) {
                        const base64Data = filePart.url.split(',')[1];
                        const buffer = Buffer.from(base64Data, 'base64');
                        const pdfData = await pdfParse(buffer);
                        userText += `\n\n[CONTEÚDO DO ARQUIVO ANEXADO (${filePart.filename || 'documento.pdf'})]\n${pdfData.text}`;
                    }
                } catch (err) {
                    console.error("Error parsing PDF attachment:", err);
                    userText += `\n\n[Falha ao extrair texto do PDF anexado.]`;
                }
            }
        }

        let activeThreadId = threadId;

        // 1. Create thread if it doesn't exist
        if (!activeThreadId) {
            const newTitle = userText.length > 30 ? userText.substring(0, 30).trim() + '...' : userText;
            const thread = await createThread(userId, personaId, newTitle);
            activeThreadId = thread.id;
        }

        // 2. Save user message to our persistent DB
        await addMessageToThread(userId, activeThreadId, 'user', userText);

        // 3. Fetch canonical history from DB to ensure it has all previous context
        const t1 = Date.now();
        const threadData = await getThread(userId, activeThreadId);
        const history = threadData?.messages || [];
        log(`[API/Chat] DB fetch took ${Date.now() - t1}ms`);

        // 4. Build the dynamic system prompt (Constitution + Memory + Persona)
        const t2 = Date.now();
        const systemPrompt = await buildSystemPrompt(userId, personaId);
        log(`[API/Chat] System prompt build took ${Date.now() - t2}ms`);

        // 5. Format messages for Vercel AI SDK
        const coreMessages = history.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
        }));

        // 6. Start the stream
        log(`[API/Chat] Starting stream after ${Date.now() - t0}ms total prep time`);
        const result = await streamText({
            model: vercelOpenai('gpt-4o'), // updated to gpt-4o since preview is deprecated
            system: systemPrompt,
            messages: coreMessages,
            temperature: 0.7,
            onFinish: async ({ text }) => {
                // Background execution when stream finishes
                let finalResponse = text;
                const memoryMatch = text.match(/\[MEMORY:\s*(.*?)\]/i);
                if (memoryMatch && memoryMatch[1]) {
                    const fact = memoryMatch[1].trim();
                    await addUserMemory(userId, fact, personaId);
                    console.log(`[Memory Extracted from Stream Finish] ${fact}`);
                    finalResponse = text.replace(/\[MEMORY:\s*.*?\]/ig, '').trim();
                }
                // Save AI response to DB
                await addMessageToThread(userId, activeThreadId, 'assistant', finalResponse);
            }
        });

        // 7. Return the stream, injecting the thread ID via headers so the client knows it
        return result.toUIMessageStreamResponse({
            headers: {
                'x-thread-id': activeThreadId
            }
        });

    } catch (error: any) {
        console.error('[API/Chat Stream] Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        let user = await prisma.user.findUnique({ where: { email: "edersouzamelo@gmail.com" } });
        if (!user) user = await prisma.user.create({ data: { email: "edersouzamelo@gmail.com", name: "Eder" } });
        const userId = user.id;

        const { searchParams } = new URL(req.url);
        const personaId = searchParams.get('personaId');
        const threadId = searchParams.get('threadId');

        // Get specific thread history
        if (threadId) {
            const thread = await getThread(userId, threadId);
            if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
            return NextResponse.json({ thread });
        }

        // List active threads for a persona
        if (personaId) {
            const threads = await getThreadsForPersona(userId, personaId);
            return NextResponse.json({ threads });
        }

        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    } catch (error: any) {
        console.error('[API/Chat GET] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        let user = await prisma.user.findUnique({ where: { email: "edersouzamelo@gmail.com" } });
        if (!user) user = await prisma.user.create({ data: { email: "edersouzamelo@gmail.com", name: "Eder" } });
        const userId = user.id;

        const { threadId, title } = await req.json();
        if (threadId && title) {
            await updateThreadTitle(userId, threadId, title);
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        let user = await prisma.user.findUnique({ where: { email: "edersouzamelo@gmail.com" } });
        if (!user) user = await prisma.user.create({ data: { email: "edersouzamelo@gmail.com", name: "Eder" } });
        const userId = user.id;

        const { searchParams } = new URL(req.url);
        const threadId = searchParams.get('threadId');
        if (threadId) {
            await deleteThread(userId, threadId);
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
