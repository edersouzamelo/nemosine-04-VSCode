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
    actionMenu?: React.ReactNode;
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

function normalizeSpeechSegment(value: string): string {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function AttachmentChip({ icon, label }: { icon: string; label: string }) {
    return (
        <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#c5a059]/35 bg-black/35 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[#ecd49c]">
            <span className="material-icons text-[16px] leading-none">{icon}</span>
            <span className="truncate">{label}</span>
        </span>
    );
}

function UserMessageContent({ content }: { content: string }) {
    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const hasAttachment = lines.some((line) => line.startsWith("[NEMOSINE_FILE:") || line === "[NEMOSINE_AUDIO]");

    if (!hasAttachment) return <>{content}</>;

    return (
        <div className="flex flex-col items-end gap-2">
            {lines.map((line, index) => {
                const fileMatch = line.match(/^\[NEMOSINE_FILE:(.*)\]$/);
                if (fileMatch) {
                    return <AttachmentChip key={`${line}-${index}`} icon="description" label={fileMatch[1] || "Arquivo anexado"} />;
                }
                if (line === "[NEMOSINE_AUDIO]") {
                    return <AttachmentChip key={`${line}-${index}`} icon="graphic_eq" label="Audio anexado" />;
                }
                return (
                    <span key={`${line}-${index}`} className="whitespace-pre-wrap text-left">
                        {line}
                    </span>
                );
            })}
        </div>
    );
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

function ThinkingIndicator() {
    return (
        <div
            role="status"
            aria-label="Processando resposta"
            className="chat-readable inline-flex items-center gap-2 rounded-2xl rounded-tl-sm border border-[#c5a059]/10 bg-[#0a0a0c] px-4 py-3 text-[#d9c28b] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
        >
            <span className="material-icons animate-spin text-[20px] leading-none" aria-hidden="true">hourglass_empty</span>
            <span className="flex items-center gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c5a059]"></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c5a059] [animation-delay:0.2s]"></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c5a059] [animation-delay:0.4s]"></span>
            </span>
        </div>
    );
}

export default function MedievalChat({ personaId, placeId, currentThreadId, onThreadCreated, onNewChat, actionMenu }: MedievalChatProps) {
    const { language, t, entityName } = useLanguage();
    const displayedPersonaName = entityName(personaId);
    const placeArticle = placeId && FEMININE_PLACES_PT.has(placeId) ? "na" : "no";
    const conversationTitle = !placeId
        ? `${t("conversationWith")} ${displayedPersonaName}`
        : language === "pt-BR"
            ? `Conversa ${placeArticle} ${placeId} com ${displayedPersonaName}`
            : language === "es"
                ? `Conversación en ${placeId} con ${displayedPersonaName}`
                : `Conversation in ${placeId} with ${displayedPersonaName}`;
    const journeyInvitation = !placeId
        ? `${t("startJourney")} ${displayedPersonaName}`
        : language === "pt-BR"
            ? `Inicie uma nova jornada ${placeArticle} ${placeId} com ${displayedPersonaName}`
            : language === "es"
                ? `Inicia un nuevo viaje en ${placeId} con ${displayedPersonaName}`
                : `Begin a new journey in ${placeId} with ${displayedPersonaName}`;
    const [threadTitle, setThreadTitle] = useState("");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [input, setInput] = useState("");
    const [actionsOpen, setActionsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const openMenuForTourStep = (event: Event) => {
            const target = (event as CustomEvent<{ tourId?: string; target?: string }>).detail?.target;
            if (target === "chat-actions" || target === "chat-guide-button" || target === "chat-new-thread") {
                setActionsOpen(true);
            }
        };
        window.addEventListener("nemosine:onboarding-step", openMenuForTourStep);
        return () => window.removeEventListener("nemosine:onboarding-step", openMenuForTourStep);
    }, []);

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
    const shouldKeepListeningRef = useRef(false);
    const finalVoiceSegmentsRef = useRef<string[]>([]);
    const finalVoiceSegmentKeysRef = useRef<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [voiceTranscript, setVoiceTranscript] = useState("");
    const [liveVoiceTranscript, setLiveVoiceTranscript] = useState("");

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
    const showThinkingIndicator = status === 'submitted'
        || (status === 'streaming' && (messages.length === 0 || messages[messages.length - 1].role === 'user'));

    useEffect(() => {
        const textArea = textInputRef.current;
        if (!textArea) return;
        textArea.style.height = "auto";
        textArea.style.height = `${Math.min(textArea.scrollHeight, 128)}px`;
    }, [input]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const hiddenVoiceTranscript = voiceTranscript.trim();
        if (!input.trim() && !selectedFile && !hiddenVoiceTranscript) return;

        const messageText = [
            input.trim(),
            selectedFile ? `[NEMOSINE_FILE:${selectedFile.name || "Arquivo anexado"}]` : "",
            hiddenVoiceTranscript ? "[NEMOSINE_AUDIO]" : ""
        ].filter(Boolean).join("\n");
        let files: FileList | undefined;
        if (selectedFile) {
            const transfer = new DataTransfer();
            transfer.items.add(selectedFile);
            files = transfer.files;
        }
        clearError();
        shouldKeepListeningRef.current = false;
        recognitionRef.current?.stop();
        setInput("");
        setSelectedFile(null);
        setVoiceTranscript("");
        setLiveVoiceTranscript("");
        finalVoiceSegmentsRef.current = [];
        finalVoiceSegmentKeysRef.current = new Set();
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        await sendMessage({ text: messageText, files }, { body: { voiceTranscript: hiddenVoiceTranscript || undefined } });
    };

    const toggleListening = () => {
        if (isListening) {
            shouldKeepListeningRef.current = false;
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            shouldKeepListeningRef.current = true;
            setVoiceTranscript("");
            setLiveVoiceTranscript("");
            finalVoiceSegmentsRef.current = [];
            finalVoiceSegmentKeysRef.current = new Set();
            try {
                recognitionRef.current?.start();
            } catch {
                // Browsers can throw if recognition is already starting.
            }
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
                const interimSegments: string[] = [];
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const segment = event.results[i][0].transcript.trim();
                    if (!segment) continue;

                    if (event.results[i].isFinal) {
                        const key = normalizeSpeechSegment(segment);
                        if (!finalVoiceSegmentKeysRef.current.has(key)) {
                            finalVoiceSegmentKeysRef.current.add(key);
                            finalVoiceSegmentsRef.current.push(segment);
                        }
                    } else {
                        interimSegments.push(segment);
                    }
                }

                setVoiceTranscript(finalVoiceSegmentsRef.current.join(" ").trim());
                setLiveVoiceTranscript(interimSegments.join(" ").trim());
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                    shouldKeepListeningRef.current = false;
                }
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setLiveVoiceTranscript("");
                if (shouldKeepListeningRef.current) {
                    window.setTimeout(() => {
                        if (!shouldKeepListeningRef.current || !recognitionRef.current) return;
                        try {
                            recognitionRef.current.start();
                            setIsListening(true);
                        } catch {
                            window.setTimeout(() => {
                                if (!shouldKeepListeningRef.current || !recognitionRef.current) return;
                                try {
                                    recognitionRef.current.start();
                                    setIsListening(true);
                                } catch {
                                    setIsListening(false);
                                }
                            }, 500);
                        }
                    }, 180);
                    return;
                }
                setIsListening(false);
            };

            return () => {
                shouldKeepListeningRef.current = false;
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
    }, [messages, isLoading, showThinkingIndicator]);

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
        return text
            .replace(/\[MEMORY:\s*.*?\]/ig, '')
            .replace(/\[REGISTRY:\s*.*?\]/ig, '')
            .replace(/\[DESTINY:\s*.*?\]/ig, '')
            .trim();
    };

    const restartGuide = () => {
        window.dispatchEvent(new Event("nemosine:restart-onboarding-tour", { cancelable: true }));
        setActionsOpen(false);
    };

    return (
        <div data-tour="chat-shell" className="w-full h-full flex flex-col relative overflow-hidden bg-black/20 rounded-lg border border-[#c5a059]/10 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">

            {/* Header / Toolbar */}
            <div data-tour="chat-header" className="shrink-0 border-b border-[#c5a059]/20 p-3 bg-black/80 backdrop-blur-md flex items-center justify-between z-10 h-16">

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
                <div className="relative flex gap-2">
                    <button
                        type="button"
                        onClick={() => setActionsOpen((open) => !open)}
                        data-tour="chat-actions-trigger"
                        className="grid h-10 w-10 place-items-center rounded-full border border-[#c5a059]/25 bg-black/45 text-[#c5a059] transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10"
                        title="Opcoes"
                        aria-label="Abrir opcoes do chat"
                    >
                        <span className="material-icons text-[22px]">more_horiz</span>
                    </button>

                    {actionsOpen && (
                        <div
                            data-tour="chat-actions"
                            className="absolute right-0 top-full z-[70] mt-3 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-[#c5a059]/25 bg-[#050507]/95 p-3 shadow-2xl backdrop-blur-md lg:w-48"
                        >
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:justify-items-center">
                                <button
                                    type="button"
                                    data-tour="chat-new-thread"
                                    onClick={() => {
                                        onNewChat();
                                        setActionsOpen(false);
                                    }}
                                    title={t("newChat")}
                                    aria-label={t("newChat")}
                                    className="group/action relative flex h-10 w-full items-center gap-3 rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5a059] transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10 lg:w-10 lg:justify-center lg:gap-0 lg:px-0"
                                >
                                    <span className="material-icons text-[18px]">add_comment</span>
                                    <span className="lg:hidden">{t("newChat")}</span>
                                    <span className="pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#c5a059]/25 bg-[#07070a]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#c5a059] opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 lg:block">
                                        {t("newChat")}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    data-tour="chat-guide-button"
                                    onClick={restartGuide}
                                    title="Guia do chat"
                                    aria-label="Guia do chat"
                                    className="group/action relative flex h-10 w-full items-center gap-3 rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5a059] transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10 lg:w-10 lg:justify-center lg:gap-0 lg:px-0"
                                >
                                    <span className="material-icons text-[18px]">explore</span>
                                    <span className="lg:hidden">Guia</span>
                                    <span className="pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#c5a059]/25 bg-[#07070a]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#c5a059] opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 lg:block">
                                        Guia
                                    </span>
                                </button>
                                {actionMenu}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area - SCROLLABLE CONTAINER */}
            <div data-tour="chat-messages" className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#c5a059]/30 scrollbar-track-transparent bg-black/40">
                {messages.length === 0 && !showThinkingIndicator && (
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
                                : <UserMessageContent content={cleanContent(getMessageText(msg))} />}
                        </div>
                    </div>
                )))}

                {showThinkingIndicator && (
                    <div className={`flex ${messages.length === 0 ? "h-full items-center justify-center" : "justify-start"}`}>
                        <ThinkingIndicator />
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
                        <span className="material-icons text-[18px] text-[#c5a059]">description</span>
                        <span className="truncate">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                        <button type="button" onClick={() => setSelectedFile(null)} className="ml-auto text-red-500 hover:text-red-400"><span className="material-icons text-[18px]">close</span></button>
                    </div>
                )}

                {voiceTranscript && (
                    <div className="flex items-center gap-2 p-2 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-lg text-sm text-[#e1e1e6]">
                        <span className="material-icons text-[18px] text-[#c5a059]">graphic_eq</span>
                        <span className="truncate">Audio capturado como anexo de contexto</span>
                        <button
                            type="button"
                            onClick={() => {
                                setVoiceTranscript("");
                                setLiveVoiceTranscript("");
                                finalVoiceSegmentsRef.current = [];
                                finalVoiceSegmentKeysRef.current = new Set();
                            }}
                            className="ml-auto text-red-500 hover:text-red-400"
                        >
                            <span className="material-icons text-[18px]">close</span>
                        </button>
                    </div>
                )}

                {isListening && liveVoiceTranscript && (
                    <div className="rounded-lg border border-[#c5a059]/20 bg-black/40 px-3 py-2 text-xs italic text-[#c5a059]/70">
                        Ouvindo: {liveVoiceTranscript}
                    </div>
                )}

                <div className="relative flex items-end gap-2 sm:gap-3">
                    <button
                        type="button"
                        data-tour="chat-attachments"
                        onClick={() => fileInputRef.current?.click()}
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#c5a059]/35 bg-black/50 text-[0px] text-[#c5a059] shadow-[inset_0_0_18px_rgba(197,160,89,0.08)] transition-colors hover:bg-[#c5a059]/10"
                        title="Anexar PDF ou arquivo de texto"
                    >
                        <span className="material-icons text-[22px]">attach_file</span>
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
                        data-tour="chat-voice"
                        onClick={toggleListening}
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[0px] transition-all ${isListening ? 'animate-pulse border border-red-500/50 bg-red-500/20 text-red-300 shadow-[0_0_18px_rgba(239,68,68,0.15)]' : 'border border-[#c5a059]/35 bg-black/50 text-[#c5a059] shadow-[inset_0_0_18px_rgba(197,160,89,0.08)] hover:bg-[#c5a059]/10'}`}
                        title={isListening ? "Parar gravacao" : "Anexar audio"}
                    >
                        <span className="material-icons text-[22px]">{isListening ? "stop_circle" : "mic"}</span>
                    </button>

                    <textarea
                        ref={textInputRef}
                        data-tour="chat-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                e.currentTarget.form?.requestSubmit();
                            }
                        }}
                        placeholder={t("messagePlaceholder")}
                        rows={1}
                        className="chat-readable-input max-h-32 min-h-12 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-[#c5a059]/30 bg-black/50 px-4 py-3 text-[#e1e1e6] transition-all placeholder-[#c5a059]/30 focus:border-[#c5a059] focus:outline-none"
                    />
                    <button
                        type="submit"
                        data-tour="chat-send"
                        disabled={isLoading || (!input.trim() && !selectedFile && !voiceTranscript.trim())}
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#c5a059] text-black transition-colors hover:bg-[#b08d48] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Enviar mensagem"
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
