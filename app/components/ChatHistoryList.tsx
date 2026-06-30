"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

interface ChatThread {
    id: string;
    title: string;
    updatedAt: number;
    participants?: Array<{
        personaId: string;
        role: "HOST" | "GUEST";
        active: boolean;
    }>;
}

interface ChatHistoryListProps {
    personaId: string;
    onSelectThread: (threadId: string) => void;
    currentThreadId: string | null;
    refreshTrigger: number; // Increment to force refresh
    expanded?: boolean;
}

const THREAD_CACHE_TTL_MS = 60_000;
const threadCache = new Map<string, { threads: ChatThread[]; fetchedAt: number }>();

function formatThreadDate(updatedAt: number) {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function ChatHistoryList({ personaId, onSelectThread, currentThreadId, refreshTrigger, expanded = false }: ChatHistoryListProps) {
    const { entityName } = useLanguage();
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const cacheKey = personaId;
        const cached = threadCache.get(cacheKey);
        if (cached && Date.now() - cached.fetchedAt < THREAD_CACHE_TTL_MS) {
            setThreads(cached.threads);
            setLoaded(true);
        } else {
            setThreads([]);
            setLoaded(false);
            setLoading(true);
        }

        const fetchThreads = async () => {
            try {
                const res = await fetch(`/api/chat?personaId=${encodeURIComponent(personaId)}`);
                const data = await res.json();
                if (cancelled) return;
                if (data.threads) {
                    threadCache.set(cacheKey, { threads: data.threads, fetchedAt: Date.now() });
                    setThreads(data.threads);
                }
            } catch (e) {
                console.error("Failed to load threads", e);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setLoaded(true);
                }
            }
        };
        fetchThreads();

        return () => {
            cancelled = true;
        };
    }, [personaId, refreshTrigger]);

    return (
        <div className={expanded ? "w-full min-h-0 flex flex-col" : "w-full"}>
            <div className={expanded
                ? "flex max-h-[calc(100dvh-390px)] min-h-[160px] flex-col gap-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#c5a059]/30"
                : "flex max-h-[260px] flex-col gap-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#c5a059]/30"}
            >
                {loading && threads.length === 0 && (
                    <div className="space-y-2 p-2">
                        <div className="h-9 animate-pulse rounded-md border border-[#c5a059]/10 bg-[#c5a059]/10" />
                        <div className="h-9 animate-pulse rounded-md border border-[#c5a059]/10 bg-[#c5a059]/5" />
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#c5a059]/45">Carregando memorias...</p>
                    </div>
                )}
                {!loading && loaded && threads.length === 0 && (
                    <p className="p-2 text-xs italic text-[#c5a059]/55">Nenhuma memoria recente.</p>
                )}
                {threads.map(thread => (
                    <button
                        key={thread.id}
                        onClick={() => onSelectThread(thread.id)}
                        className={`w-full rounded-md border px-2.5 py-2 text-left font-serif text-xs transition-all ${currentThreadId === thread.id
                                ? "bg-[#c5a059]/20 text-[#c5a059] font-bold"
                                : "border-[#c5a059]/10 bg-black/20 text-[#e1e1e6]/70 hover:border-[#c5a059]/30 hover:text-[#c5a059] hover:bg-[#c5a059]/5"
                            }`}
                    >
                        <span className="line-clamp-2 whitespace-normal break-words leading-snug">
                            {thread.title.replaceAll("Confessor 2.0", entityName("Confessor 2.0"))}
                        </span>
                        <span className="mt-1 block text-[9px] uppercase tracking-[0.14em] text-[#c5a059]/40">
                            {formatThreadDate(thread.updatedAt)}
                        </span>
                        {thread.participants && thread.participants.length > 1 && (
                            <span className="mt-1 line-clamp-1 break-words text-[9px] uppercase tracking-[0.16em] text-[#c5a059]/45">
                                Conselho: {thread.participants.map((participant) => participant.personaId).join(", ")}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
