import { NextRequest, NextResponse } from 'next/server';
import { generatePersonaResponse } from '@/app/lib/nemosine/llm_client';
import {
    getSession,
    createThread,
    getThread,
    addMessageToThread,
    getThreadsForPersona,
    updateThreadTitle,
    deleteThread
} from '@/app/lib/nemosine/session_store';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, personaId, threadId, message, title } = body;

        // Action: CREATE_THREAD
        if (action === 'create_thread') {
            if (!personaId) return NextResponse.json({ error: 'Missing personaId' }, { status: 400 });

            const thread = createThread(personaId, title);

            // If an initial message is provided, process it immediately
            if (message) {
                console.log(`[API/Chat] New Thread ${thread.id} init msg: ${message.substring(0, 50)}...`);

                // 1. Add User Message
                addMessageToThread(thread.id, 'user', message);

                // 2. Generate Response
                // Pass the updated thread messages (which now includes the user message)
                // We need to fetch the thread again or just push the user message to a temp array
                // getThread returns object ref, so 'thread' might not have the new msg if addMessageToThread modifies it in place?
                // session_store modifies in place.
                const updatedThreadForGen = getThread(thread.id);
                const history = updatedThreadForGen ? updatedThreadForGen.messages : [];

                const responseText = await generatePersonaResponse(personaId, message, history);

                // 3. Add Agent Response
                addMessageToThread(thread.id, 'assistant', responseText);

                // Update thread object with new messages to return
                // (Since createThread returns a ref, we just need to ensure we return the updated state)
                // Re-fetching thread content just to be safe
                const updatedThread = getThread(thread.id);
                return NextResponse.json({ thread: updatedThread });
            }

            return NextResponse.json({ thread });
        }

        // Action: SEND_MESSAGE
        if (threadId && message) {
            let thread = getThread(threadId);

            // If thread doesn't exist (maybe lost in memory), try to recreate or error
            // For now, if no threadId matches, error.
            if (!thread) {
                return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
            }

            console.log(`[API/Chat] msg to thread ${threadId}: ${message.substring(0, 50)}...`);

            // 1. Add User Message
            addMessageToThread(threadId, 'user', message);

            // 2. Generate Response 
            const history = thread.messages; // addMessageToThread modifies this array in place? Yes.
            const responseText = await generatePersonaResponse(personaId, message, history);

            // 3. Add Agent Response
            addMessageToThread(threadId, 'assistant', responseText);

            return NextResponse.json({ response: responseText });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    } catch (error: any) {
        console.error('[API/Chat] Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get('personaId');
    const threadId = searchParams.get('threadId');

    // Get specific thread history
    if (threadId) {
        const thread = getThread(threadId);
        if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        return NextResponse.json({ thread });
    }

    // List active threads for a persona
    if (personaId) {
        const threads = getThreadsForPersona(personaId);
        return NextResponse.json({ threads });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
    try {
        const { threadId, title } = await req.json();
        if (threadId && title) {
            updateThreadTitle(threadId, title);
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const threadId = searchParams.get('threadId');
        if (threadId) {
            deleteThread(threadId);
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
