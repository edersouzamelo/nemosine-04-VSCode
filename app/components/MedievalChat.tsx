"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { UIMessage, DefaultChatTransport } from "ai";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "./LanguageProvider";

interface MedievalChatProps {
    personaId: string;
    placeId?: string;
    currentThreadId: string | null;
    onThreadCreated: (threadId: string) => void;
    onNewChat: () => void;
}

const FEMININE_PLACES_PT = new Set([
    "Masmorra",
    "Biblioteca",
    "Galeria",
    "Oficina",
    "Sala do Trono",
    "Ponte"
]);

function getMessageText(message: UIMessage): string {
    return message.parts
        ? message.parts.filter(part => part.type === "text").map(part => part.text).join("")
        : (message as UIMessage & { content?: string }).content || "";
}

function RichAssistantMessage({ content }: { content: string }) {
    return (
        <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
                p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-[#ecd49c]">{children}</strong>,
                em: ({ children }) => <em className="italic text-[#eee2c9]">{children}</em>,
                h1: ({ children }) => <h1 className="mb-3 mt-1 font-serif text-xl font-semibold text-[#ecd49c]">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-2 mt-4 font-serif text-lg font-semibold text-[#ecd49c]">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-2 mt-3 font-semibold text-[#ecd49c]">{children}</h3>,
                ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
                li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                    <blockquote className="my-3 border-l-2 border-[#c5a059]/55 pl-3 italic text-[#d6cdbd]">
                        {children}
                    </blockquote>
                ),
                a: ({ children, href }) => (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e0bb69] underline decoration-[#c5a059]/50 underline-offset-2 hover:text-[#efd18b]"
                    >
                        {children}
                    </a>
                ),
                code: ({ children }) => (
                    <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.92em] text-[#f0ddaf]">
                        {children}
                    </code>
                ),
                pre: ({ children }) => (
                    <pre className="my-3 overflow-x-auto rounded-lg border border-[#c5a059]/15 bg-black/50 p-3 text-sm">
                        {children}
                    </pre>
                ),
                hr: () => <hr className="my-4 border-[#c5a059]/20" />,
                table: ({ children }) => (
                    <div className="my-3 overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">{children}</table>
                    </div>
                ),
                th: ({ children }) => <th className="border border-[#c5a059]/20 px-2 py-1 text-left text-[#ecd49c]">{children}</th>,
                td: ({ children }) => <td className="border border-[#c5a059]/15 px-2 py-1">{children}</td>
            }}
        >
            {content}
        </Markdown>
    );
}

export default function MedievalChat({ personaId, placeId, currentThreadId, onThreadCreated, onNewChat }: MedievalChatProps) {
    const { language, t } = useLanguage();
    const placeArticle = placeId && FEMININE_PLACES_PT.has(placeId) ? "na" : "no";
    const conversationTitle = !placeId
        ? `${t("conversationWith")} ${personaId}`
        : language === "pt-BR"
            ? `Conversa ${placeArticle} ${placeId} com ${personaId}`
            : language === "es"
                ? `Conversación en ${placeId} con ${personaId}`
                : `Conversation in ${placeId} with ${personaId}`;
    const journeyInvitation = !placeId
        ? `${t("startJourney")} ${personaId}`
        : language === "pt-BR"
            ? `Inicie uma nova jornada ${placeArticle} ${placeId} com ${personaId}`
            : language === "es"
                ? `Inicia un nuevo viaje en ${placeId} con ${personaId}`
                : `Begin a new journey in ${placeId} with ${personaId}`;
    const [threadTitle, setThreadTitle] = useState("");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem("nemosine-onboarding-entry");
            if (!stored) return;
            const entry = JSON.parse(stored) as { destination?: string; text?: string };
            if (entry.destination === personaId && entry.text?.trim()) {
                setInput(entry.text.trim());
                window.localStorage.removeItem("nemosine-onboarding-entry");
            }
        } catch {
            window.localStorage.removeItem("nemosine-onboarding-entry");
        }
    }, [personaId]);

    // Feature: Speech to Text & File Upload
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const speechInputBaseRef = useRef("");
    const lastDictationTranscriptRef = useRef("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const currentThreadIdRef = useRef(currentThreadId);
    useEffect(() => {
        currentThreadIdRef.current = currentThreadId;
    }, [currentThreadId]);

    const transport = React.useMemo(() => new DefaultChatTransport({
        api: '/api/chat',
        fetch: async (url, init) => {
            if (init && init.body) {
                try {
                    if (typeof init.body === 'string') {
                        const bodyObj = JSON.parse(init.body);
                        bodyObj.personaId = personaId;
                        bodyObj.placeId = placeId;
                        bodyObj.threadId = currentThreadIdRef.current || undefined;
                        bodyObj.language = language;
                        init.body = JSON.stringify(bodyObj);
                    } else if (init.body instanceof FormData) {
                        init.body.append('personaId', personaId);
                        if (placeId) {
                            init.body.append('placeId', placeId);
                        }
                        init.body.append('language', language);
                        if (currentThreadIdRef.current) {
                            init.body.append('threadId', currentThreadIdRef.current);
                        }
                    }
                } catch (e) {
                    console.error("Interceptor failed to append body params:", e);
                }
            }
            const res = await fetch(url, init);
            const newThreadId = res.headers.get('x-thread-id');
            if (newThreadId && newThreadId !== currentThreadIdRef.current) {
                onThreadCreated(newThreadId);
            }
            return res;
        }
    }), [personaId, placeId, onThreadCreated, language]);

    const { messages, sendMessage, status, setMessages, error, clearError } = useChat({
        id: placeId ? `${personaId}@${placeId}` : personaId,
        transport
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && !selectedFile) return;

        const messageText = input;
        let files: FileList | undefined;
        if (selectedFile) {
            const transfer = new DataTransfer();
            transfer.items.add(selectedFile);
            files = transfer.files;
        }
        clearError();
        setInput("");
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        await sendMessage({ text: messageText, files });
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            speechInputBaseRef.current = input.trim();
            lastDictationTranscriptRef.current = "";
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
            recognitionRef.current.lang = language;

            recognitionRef.current.onresult = (event: any) => {
                const segments: string[] = [];
                for (let i = 0; i < event.results.length; ++i) {
                    const segment = event.results[i][0].transcript.trim();
                    const previousSegment = segments[segments.length - 1];
                    if (segment && (!previousSegment || previousSegment.toLowerCase() !== segment.toLowerCase())) {
                        segments.push(segment);
                    }
                }

                const transcript = segments.join(' ').trim();
                if (transcript && transcript !== lastDictationTranscriptRef.current) {
                    lastDictationTranscriptRef.current = transcript;
                    setInput([speechInputBaseRef.current, transcript].filter(Boolean).join(' '));
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            return () => {
                recognitionRef.current?.abort();
                recognitionRef.current = null;
            };
        }
    }, [language]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const [lastLoadedThreadId, setLastLoadedThreadId] = useState<string | null>(null);

    // Load thread when ID changes
    useEffect(() => {
        const loadThread = async () => {
            if (!currentThreadId) {
                setMessages([]);
                setThreadTitle(conversationTitle);
                setLastLoadedThreadId(null);
                return;
            }

            if (currentThreadId === lastLoadedThreadId) return;

            // If we already have messages (from sending the first prompt), do not overwrite them!
            // We only fetch history if we are genuinely switching to an existing thread.
            if (messages.length > 0 && !lastLoadedThreadId) {
                setLastLoadedThreadId(currentThreadId);
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
                    setLastLoadedThreadId(currentThreadId);
                }
            } catch (e) {
                console.error("Load thread error:", e);
            }
        };
        loadThread();
    }, [currentThreadId, personaId, placeId, conversationTitle, setMessages, lastLoadedThreadId, messages.length, t]);

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
        <div className="w-full h-full flex flex-col relative overflow-hidden bg-black/20 rounded-lg border border-[#c5a059]/10 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">

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
                            {threadTitle || t("newChat")}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onNewChat}
                        className="p-2 hover:bg-[#c5a059]/20 rounded-full transition-colors text-[#c5a059] flex items-center gap-2 group"
                        title={t("newChat")}
                    >
                        <span className="text-[10px] uppercase font-bold hidden group-hover:block transition-all">{t("newChat")}</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages Area - SCROLLABLE CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#c5a059]/30 scrollbar-track-transparent bg-black/40">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-[#c5a059]/30 gap-4">
                        <div className="w-16 h-16 rounded-full border border-[#c5a059]/20 flex items-center justify-center">
                            <span className="text-3xl">✦</span>
                        </div>
                        <p className="text-sm font-serif italic">{journeyInvitation}...</p>
                    </div>
                )}

                {messages.map((msg: UIMessage) => (msg.role !== 'system' && (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div className={`chat-readable max-w-[92%] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${msg.role === "user"
                            ? "whitespace-pre-wrap bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#f0ebe3] rounded-2xl rounded-tr-sm"
                            : "chat-rich-assistant bg-[#0a0a0c] border border-[#c5a059]/10 text-[#e1e1e6] rounded-2xl rounded-tl-sm"
                            }`}
                        >
                            {msg.role === "assistant"
                                ? <RichAssistantMessage content={cleanContent(getMessageText(msg))} />
                                : cleanContent(getMessageText(msg))}
                        </div>
                    </div>
                )))}

                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                    <div className="flex justify-start">
                        <div className="bg-[#0a0a0c] border border-[#c5a059]/10 p-3 rounded-2xl rounded-tl-sm flex gap-2 items-center">
                            <div className="w-1.5 h-1.5 bg-[#c5a059] rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-[#c5a059] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1.5 h-1.5 bg-[#c5a059] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="shrink-0 p-3 bg-black/80 backdrop-blur-md border-t border-[#c5a059]/20 flex flex-col gap-2">
                {error && (
                    <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                        {t("responseError")}
                    </div>
                )}

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
                        title="Anexar PDF ou arquivo de texto"
                    >
                        📎
                    </button>
                    <input
                        type="file"
                        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
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
                        placeholder={t("messagePlaceholder")}
                        className="chat-readable-input flex-1 bg-black/50 border border-[#c5a059]/30 p-4 text-[#e1e1e6] placeholder-[#c5a059]/30 focus:outline-none focus:border-[#c5a059] transition-all rounded-xl"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || (!input.trim() && !selectedFile)}
                        className="px-6 py-3 bg-[#c5a059] hover:bg-[#b08d48] text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
