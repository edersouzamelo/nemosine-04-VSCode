"use client";

import React, { useState, useEffect, useRef } from "react";

interface Message {
    id: string;
    text: string;
    sender: "user" | "persona";
}

interface ChatThread {
    id: string;
    title: string;
    messages: {
        id: string;
        role: "user" | "assistant" | "system";
        content: string;
    }[];
}

interface MedievalChatProps {
    personaId: string;
    currentThreadId: string | null;
    onThreadCreated: (threadId: string) => void;
    onNewChat: () => void;
}

export default function MedievalChat({ personaId, currentThreadId, onThreadCreated, onNewChat }: MedievalChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [threadTitle, setThreadTitle] = useState("");
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    // Track the active thread Internal ID. 
    // If props.currentThreadId is null, we are in "Draft" mode (no thread ID yet).
    // Once message sent -> create thread -> get ID.

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Load thread when ID changes
    useEffect(() => {
        const loadThread = async () => {
            if (!currentThreadId) {
                setMessages([]);
                setThreadTitle(`Conversa com ${personaId}`);
                return;
            }

            setIsLoading(true);
            try {
                const res = await fetch(`/api/chat?threadId=${currentThreadId}`);
                const data = await res.json();
                if (data.thread) {
                    setMessages(data.thread.messages.map((m: any) => ({
                        id: m.id,
                        text: m.content,
                        sender: m.role === 'assistant' ? 'persona' : 'user'
                    })));
                    setThreadTitle(data.thread.title);
                }
            } catch (e) {
                console.error("Load thread error:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadThread();
    }, [currentThreadId, personaId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input;
        setInput("");

        // Optimistic update
        const tempId = Date.now().toString();
        setMessages(prev => [...prev, { id: tempId, text: userText, sender: "user" }]);
        setIsLoading(true);

        try {
            // Determine action: Create Thread or Send Message?
            let activeId = currentThreadId;

            if (!activeId) {
                // Create Thread AND Send Message in one go
                const createRes = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create_thread',
                        personaId,
                        title: userText.substring(0, 30),
                        message: userText // Include message
                    })
                });
                const createData = await createRes.json();

                if (createData.thread) {
                    activeId = createData.thread.id;
                    // Update messages with whatever the server returned (User + Agent)
                    setMessages(createData.thread.messages.map((m: any) => ({
                        id: m.id,
                        text: m.content,
                        sender: m.role === 'assistant' ? 'persona' : 'user'
                    })));

                    // Notify parent to change URL/State
                    onThreadCreated(activeId!);
                    // We are done for this turn
                    return;
                } else {
                    throw new Error("Could not create thread");
                }
            }

            // Existing Thread: Send Message normally
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threadId: activeId,
                    message: userText,
                    personaId // REQUIRED for response generation
                }),
            });

            const data = await response.json();

            if (data.error) {
                const detailedError = data.details ? `${data.error}: ${data.details}` : data.error;
                throw new Error(detailedError);
            }

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: data.response || "...",
                sender: "persona"
            }]);

        } catch (error) {
            console.error("Chat Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: `Erro: ${errorMessage}`,
                sender: "persona"
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTitleUpdate = async () => {
        setIsEditingTitle(false);
        if (currentThreadId) {
            await fetch('/api/chat', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId: currentThreadId, title: threadTitle })
            });
            onThreadCreated(currentThreadId); // Force refresh list
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden bg-black/20 rounded-lg border border-[#c5a059]/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">

            {/* Header / Toolbar */}
            <div className="shrink-0 border-b border-[#c5a059]/20 p-3 bg-black/80 backdrop-blur-md flex items-center justify-between z-10 h-16">

                {/* Editable Title */}
                <div className="flex-1 mr-4">
                    {isEditingTitle ? (
                        <input
                            value={threadTitle}
                            onChange={(e) => setThreadTitle(e.target.value)}
                            onBlur={handleTitleUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleUpdate()}
                            autoFocus
                            className="bg-black/50 border border-[#c5a059]/50 text-[#c5a059] text-sm px-2 py-1 w-full rounded font-serif"
                        />
                    ) : (
                        <div
                            onClick={() => currentThreadId && setIsEditingTitle(true)}
                            className={`text-sm uppercase tracking-widest font-bold medieval-text-gold truncate cursor-pointer hover:text-white transition-colors ${!currentThreadId ? 'opacity-50 cursor-default' : ''}`}
                        >
                            {threadTitle || "Nova Conversa"}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onNewChat}
                        className="p-2 hover:bg-[#c5a059]/20 rounded-full transition-colors text-[#c5a059] flex items-center gap-2 group"
                        title="Nova Conversa"
                    >
                        <span className="text-[10px] uppercase font-bold hidden group-hover:block transition-all">Novo Chat</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages Area - SCROLLABLE CONTAINER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#c5a059]/30 scrollbar-track-transparent bg-black/40">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-[#c5a059]/30 gap-4">
                        <div className="w-16 h-16 rounded-full border border-[#c5a059]/20 flex items-center justify-center">
                            <span className="text-3xl">✦</span>
                        </div>
                        <p className="text-sm font-serif italic">Inicie uma nova jornada com {personaId}...</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div className={`max-w-[85%] p-5 text-lg leading-relaxed shadow-lg font-serif ${msg.sender === "user"
                            ? "bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#f0ebe3] rounded-2xl rounded-tr-sm"
                            : "bg-[#0a0a0c] border border-[#c5a059]/10 text-[#e1e1e6] rounded-2xl rounded-tl-sm"
                            }`}
                            style={{ fontFamily: '"Garamond", "EB Garamond", serif', fontWeight: 600 }}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-[#0a0a0c] border border-[#c5a059]/10 p-4 rounded-2xl rounded-tl-sm flex gap-2 items-center">
                            <div className="w-1.5 h-1.5 bg-[#c5a059] rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-[#c5a059] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1.5 h-1.5 bg-[#c5a059] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="shrink-0 p-4 bg-black/80 backdrop-blur-md border-t border-[#c5a059]/20">
                <div className="relative flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 bg-black/50 border border-[#c5a059]/30 p-4 text-base text-[#e1e1e6] placeholder-[#c5a059]/30 focus:outline-none focus:border-[#c5a059] transition-all rounded-xl font-serif"
                        style={{ fontFamily: '"Garamond", "EB Garamond", serif' }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 bg-[#c5a059] hover:bg-[#b08d48] text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
