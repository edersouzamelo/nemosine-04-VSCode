"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { UIMessage, DefaultChatTransport } from "ai";

interface MedievalChatProps {
    personaId: string;
    currentThreadId: string | null;
    onThreadCreated: (threadId: string) => void;
    onNewChat: () => void;
}

export default function MedievalChat({ personaId, currentThreadId, onThreadCreated, onNewChat }: MedievalChatProps) {
    const [threadTitle, setThreadTitle] = useState("");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Feature: Speech to Text & File Upload
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const { messages, sendMessage, status, setMessages } = useChat({
        id: currentThreadId || 'new-thread',
        transport: new DefaultChatTransport({
            api: '/api/chat',
            body: {
                personaId,
                threadId: currentThreadId || undefined
            },
            fetch: async (url, init) => {
                const res = await fetch(url, init);
                const newThreadId = res.headers.get('x-thread-id');
                if (newThreadId && newThreadId !== currentThreadId) {
                    onThreadCreated(newThreadId);
                }
                return res;
            }
        })
    });

    const isLoading = status !== 'ready';

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && !selectedFile) return;

        const request: any = { role: 'user', text: input };

        if (selectedFile) {
            request.files = [selectedFile];
        }

        sendMessage(request);
        setInput("");
        setSelectedFile(null);
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    // Speech Recognition Setup
    useEffect(() => {
        if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'pt-BR'; // Portuguese

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

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

            try {
                const res = await fetch(`/api/chat?threadId=${currentThreadId}`);
                const data = await res.json();
                if (data.thread) {
                    setMessages(data.thread.messages.map((m: any) => ({
                        id: m.id,
                        role: m.role,
                        content: m.content
                    })));
                    setThreadTitle(data.thread.title);
                }
            } catch (e) {
                console.error("Load thread error:", e);
            }
        };
        loadThread();
    }, [currentThreadId, personaId, setMessages]);

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

    // Helper to clean up response text from hidden tags
    const cleanContent = (text: string) => {
        return text.replace(/\[MEMORY:\s*.*?\]/ig, '').trim();
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

                {messages.map((msg: UIMessage) => (msg.role !== 'system' && (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div className={`max-w-[85%] p-5 text-lg leading-relaxed shadow-lg font-serif whitespace-pre-wrap ${msg.role === "user"
                            ? "bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#f0ebe3] rounded-2xl rounded-tr-sm"
                            : "bg-[#0a0a0c] border border-[#c5a059]/10 text-[#e1e1e6] rounded-2xl rounded-tl-sm"
                            }`}
                            style={{ fontFamily: '"Garamond", "EB Garamond", serif', fontWeight: 600 }}
                        >
                            {cleanContent(msg.parts ? msg.parts.filter(p => p.type === 'text').map(p => (p as any).text).join('\n') : (msg as any).content || '')}
                        </div>
                    </div>
                )))}

                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
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
            <form onSubmit={handleSend} className="shrink-0 p-4 bg-black/80 backdrop-blur-md border-t border-[#c5a059]/20 flex flex-col gap-2">

                {/* File Preview */}
                {selectedFile && (
                    <div className="flex items-center gap-2 p-2 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-lg text-sm text-[#e1e1e6]">
                        📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        <button type="button" onClick={() => setSelectedFile(null)} className="ml-auto text-red-500 hover:text-red-400">✕</button>
                    </div>
                )}

                <div className="relative flex gap-3 items-center">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-[#c5a059] bg-black/50 border border-[#c5a059]/30 hover:bg-[#c5a059]/10 transition-colors rounded-xl"
                        title="Anexar PDF"
                    >
                        📎
                    </button>
                    <input
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                setSelectedFile(e.target.files[0]);
                            }
                        }}
                    />

                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' : 'bg-black/50 border border-[#c5a059]/30 text-[#c5a059] hover:bg-[#c5a059]/10'}`}
                        title={isListening ? "Parar Gravação" : "Ditado (🎤)"}
                    >
                        🎤
                    </button>

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite ou dite sua mensagem..."
                        className="flex-1 bg-black/50 border border-[#c5a059]/30 p-4 text-base text-[#e1e1e6] placeholder-[#c5a059]/30 focus:outline-none focus:border-[#c5a059] transition-all rounded-xl font-serif"
                        style={{ fontFamily: '"Garamond", "EB Garamond", serif' }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || (!input.trim() && !selectedFile)}
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
